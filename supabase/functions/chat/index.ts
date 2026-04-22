import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Direct Google Gemini API (no Lovable AI gateway)
const GEMINI_MODEL_STREAM = "gemini-2.5-flash";
const GEMINI_MODEL_LIGHT = "gemini-2.5-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function buildGeminiContents(messages: { role: string; content: string }[], systemPrompt: string) {
  // Gemini uses "user" / "model" roles. System goes via systemInstruction.
  return {
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  };
}

async function extractTasteSignals(messages: { role: string; content: string }[], userId: string) {
  try {
    if (messages.length < 1) return;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return;

    const recentMessages = messages.slice(-8);
    const conversation = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const prompt = `Analise esta conversa sobre filmes e extraia sinais de gosto do USUÁRIO (não do assistente).

CONVERSA:
${conversation}

Extraia APENAS sinais claros e explícitos. Não invente preferências que não foram mencionadas.

Tipos de sinal: "like", "dislike", "preference", "interest", "avoid"
Categorias: genre, movie, mood, era, director, actor, theme, style, pace, origin, element, setting, topic

IMPORTANTE: Capture TUDO que a pessoa mencionar gostar ou não gostar.

Responda APENAS em JSON válido:
{
  "signals": [{"signal_type": "like", "category": "genre", "value": "terror psicológico", "confidence": 0.9}],
  "blocked_elements": ["aranhas", "palhaços", "violência com animais"]
}

O campo "blocked_elements" deve conter APENAS coisas que o usuário disse EXPLICITAMENTE que NÃO QUER ver, não suporta, tem medo ou nojo. Exemplos: "tenho medo de aranha", "odeio palhaço", "não suporto violência gratuita".
Se nada, retorne {"signals": [], "blocked_elements": []}`;

    const url = `${GEMINI_BASE}/${GEMINI_MODEL_LIGHT}:generateContent?key=${GEMINI_API_KEY}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600, responseMimeType: "application/json" },
      }),
    });

    if (!resp.ok) {
      console.error("Gemini extract failed:", resp.status, await resp.text());
      return;
    }
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return;

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());
    const { signals, blocked_elements } = parsed;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    if (signals && signals.length > 0) {
      const rows = signals.map((s: any) => ({
        user_id: userId,
        signal_type: s.signal_type,
        category: s.category,
        value: s.value,
        confidence: s.confidence || 0.7,
        source: "chat",
      }));
      await serviceClient.from("taste_signals").insert(rows);
      console.log(`Extracted ${rows.length} taste signals for user ${userId}`);
    }

    if (blocked_elements && blocked_elements.length > 0) {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("blocked_elements")
        .eq("user_id", userId)
        .maybeSingle();

      const existing: string[] = profile?.blocked_elements || [];
      const newBlocked = blocked_elements
        .map((b: string) => b.toLowerCase().trim())
        .filter((b: string) => b && !existing.includes(b));
      if (newBlocked.length > 0) {
        const merged = [...existing, ...newBlocked];
        await serviceClient.from("profiles").update({ blocked_elements: merged }).eq("user_id", userId);
        console.log(`Added ${newBlocked.length} blocked elements for user ${userId}: ${newBlocked.join(", ")}`);
      }
    }
  } catch (e) {
    console.error("Taste extraction error (non-blocking):", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const isOnboarding = mode === "onboarding";

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id || null;
      } catch { /* ignore */ }
    }

    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content?.toLowerCase() || "";
    const isTasteMode = isOnboarding || /\b(meu gosto|gosto em filmes|que tipo de filme|me conhecer|perfil|preferências|o que eu curto|entender meu gosto|conversar sobre|quero conversar)\b/i.test(lastUserMsg);

    let systemPrompt: string;

    if (isOnboarding) {
      systemPrompt = `Você é o CineMatch — assistente pessoal de cinema. Português brasileiro sempre.

Você está no MODO ONBOARDING — seu objetivo é conhecer o gosto do usuário em cinema de forma natural e divertida.

REGRAS DO ONBOARDING:
- Reaja GENUINAMENTE ao que o usuário diz. Se ele mencionar um filme, comente algo específico sobre esse filme.
- Se o usuário der uma resposta vaga ou errada, ajude gentilmente.
- Faça 1-2 perguntas por mensagem, máximo. Não interrogue.
- IMPORTANTE: Pergunte EXPLICITAMENTE sobre coisas que ele NÃO gosta ou tem medo (ex: aranhas, palhaços, violência com animais, jumpscare). Isso vai pra blacklist.
- Explore: gêneros favoritos, filmes marcantes, o que irrita em filmes, moods preferidos, fobias visuais
- Seja curto e direto. Nada de textão.
- Use emojis com moderação (1-2 por mensagem)
- Quando sentir que já tem info suficiente (4-5 trocas), inclua "[ONBOARDING_COMPLETE]" no final da sua resposta
- NÃO recomende filmes no onboarding, foque em conhecer o gosto

Responda de forma NATURAL e PERSONALIZADA. Nunca dê respostas genéricas.`;
    } else if (isTasteMode) {
      systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre.

MODO PERFIL DE GOSTO:
- NÃO recomende filmes. Zero. Nenhum título em negrito.
- Faça perguntas sobre o que a pessoa sente ao assistir filmes
- Pergunte sobre coisas que IRRITAM ou que ela NÃO suporta ver
- Seja curioso e natural, não interrogador
- Máximo 2 perguntas por mensagem`;
    } else {
      systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre.

Seja direto. Nada de introduções longas.

MODO RECOMENDAÇÃO:
- OBRIGATÓRIO: Recomende entre **6 e 10 filmes** por resposta
- Formato: **Título (Ano)** — sempre com ano entre parênteses
- 1 frase curta dizendo POR QUE a pessoa vai curtir
- Plataforma se souber (Netflix, Prime, Disney+)
- Varie gêneros e estilos
- 1 pergunta curta no final pra refinar

REGRAS GERAIS: Sem notas de IMDb/RT. Sem inventar filmes. Sem textão.`;
    }

    // Direct call to Google Gemini with streaming (SSE)
    const { systemInstruction, contents } = buildGeminiContents(messages, systemPrompt);
    const url = `${GEMINI_BASE}/${GEMINI_MODEL_STREAM}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction,
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      const status = response.status === 429 ? 429 : response.status === 403 ? 402 : 500;
      const message =
        status === 429
          ? "Limite da API do Google atingido. Tente em alguns segundos."
          : status === 402
            ? "Chave da API do Gemini sem quota ou inválida."
            : "Erro no serviço de IA do Google.";
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shouldExtract = !!userId && messages.length >= 1;

    // Convert Gemini SSE to OpenAI-compatible SSE format that the frontend already parses
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      let fullResponse = "";
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).replace(/\r$/, "");
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullResponse += text;
                // Re-emit in OpenAI-compatible delta format
                const chunk = {
                  choices: [{ index: 0, delta: { content: text, role: "assistant" } }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch { /* skip */ }
          }
        }

        // Final flush
        if (buffer.trim().startsWith("data: ")) {
          const jsonStr = buffer.trim().slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullResponse += text;
              const chunk = { choices: [{ index: 0, delta: { content: text, role: "assistant" } }] };
              await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          } catch { /* skip */ }
        }

        await writer.write(encoder.encode("data: [DONE]\n\n"));

        if (shouldExtract && fullResponse) {
          const allMsgs = [...messages, { role: "assistant", content: fullResponse }];
          await extractTasteSignals(allMsgs, userId!);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
