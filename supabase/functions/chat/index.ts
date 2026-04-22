import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function extractTasteSignals(messages: { role: string; content: string }[], userId: string) {
  try {
    if (messages.length < 1) return;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return;

    const recentMessages = messages.slice(-6);
    const conversation = recentMessages.map(m => `${m.role}: ${m.content}`).join("\n");

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: `Analise esta conversa sobre filmes e extraia sinais de gosto do USUÁRIO (não do assistente).

CONVERSA:
${conversation}

Extraia APENAS sinais claros e explícitos. Não invente preferências que não foram mencionadas.

Tipos de sinal:
- "like" = gosta de algo
- "dislike" = não gosta de algo  
- "preference" = prefere um estilo/tipo
- "interest" = demonstrou interesse
- "avoid" = quer evitar / não suporta

Categorias:
- genre, movie, mood, era, director, actor, theme, style, pace, origin
- element (cachorros, gatos, trens, carros, etc)
- setting (guerra, espaço, floresta, cidade, etc)
- topic (política, filosofia, romance, etc)

IMPORTANTE: Capture TUDO que a pessoa mencionar gostar ou não gostar.

Responda APENAS em JSON válido:
{
  "signals": [
    {"signal_type": "like", "category": "genre", "value": "terror psicológico", "confidence": 0.9}
  ],
  "blocked_elements": ["violência com animais", "aranhas"]
}

O campo "blocked_elements" deve conter APENAS coisas que o usuário disse EXPLICITAMENTE que NÃO QUER ver ou não suporta. Exemplos: "não aguento filme com aranha", "odeio violência gratuita", "não quero ver nada com palhaço".
Se não houver bloqueios explícitos, retorne "blocked_elements": []
Se não houver sinais claros, retorne {"signals": [], "blocked_elements": []}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!resp.ok) return;
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return;

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());
    const { signals, blocked_elements } = parsed;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Save taste signals
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

    // Save blocked elements to profile
    if (blocked_elements && blocked_elements.length > 0) {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("blocked_elements")
        .eq("user_id", userId)
        .maybeSingle();

      const existing: string[] = profile?.blocked_elements || [];
      const newBlocked = blocked_elements.filter((b: string) => !existing.includes(b.toLowerCase()));
      if (newBlocked.length > 0) {
        const merged = [...existing, ...newBlocked.map((b: string) => b.toLowerCase())];
        await serviceClient
          .from("profiles")
          .update({ blocked_elements: merged })
          .eq("user_id", userId);
        console.log(`Added ${newBlocked.length} blocked elements for user ${userId}: ${newBlocked.join(", ")}`);
      }
    }
  } catch (e) {
    console.error("Taste extraction error (non-blocking):", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isOnboarding = mode === "onboarding";

    // Try to get user ID for taste extraction
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

    // Detect conversation mode
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content?.toLowerCase() || "";
    const isTasteMode = isOnboarding || /\b(meu gosto|gosto em filmes|que tipo de filme|me conhecer|perfil|preferências|o que eu curto|entender meu gosto|conversar sobre|quero conversar)\b/i.test(lastUserMsg);

    let systemPrompt: string;

    if (isOnboarding) {
      systemPrompt = `Você é o CineMatch — assistente pessoal de cinema. Português brasileiro sempre.

Você está no MODO ONBOARDING — seu objetivo é conhecer o gosto do usuário em cinema de forma natural e divertida.

REGRAS DO ONBOARDING:
- Reaja GENUINAMENTE ao que o usuário diz. Se ele mencionar um filme, comente algo específico sobre esse filme.
- Se o usuário der uma resposta vaga ou errada, ajude gentilmente. Ex: se confundir nomes de filmes, sugira: "Será que você quis dizer X?"
- Faça 1-2 perguntas por mensagem, máximo. Não interrogue.
- Explore: gêneros favoritos, filmes marcantes, o que irrita em filmes, moods preferidos, quando/como assiste
- Seja curto e direto. Nada de textão.
- Use emojis com moderação (1-2 por mensagem)
- Conecte padrões: "Ah, você curte histórias de superação com protagonistas fortes, né?"
- Depois de 3-4 trocas de mensagem, encerre dizendo algo como: "Já tenho uma boa ideia do seu gosto! Vou preparar recomendações perfeitas pra você 🎬"
- Quando sentir que já tem info suficiente (3-4 mensagens do usuário), inclua a frase exata "[ONBOARDING_COMPLETE]" no final da sua resposta (isso será detectado pelo app)
- NÃO recomende filmes no onboarding, foque em conhecer o gosto

IMPORTANTE: Responda de forma NATURAL e PERSONALIZADA. Nunca dê respostas genéricas ou pré-fabricadas.`;
    } else if (isTasteMode) {
      systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre.

MODO PERFIL DE GOSTO:
- NÃO recomende filmes. Zero. Nenhum título em negrito.
- Faça perguntas sobre o que a pessoa sente ao assistir filmes
- Explore moods, cenários, temas, elementos que ela curte ou não
- Pergunte "em que momento você assiste?" — chuva, sozinho, casal, noite, etc.
- Conecte padrões: "parece que você curte histórias de superação, né?"
- Pergunte sobre coisas que IRRITAM em filmes (clichês, finais, ritmo)
- Seja curioso e natural, não interrogador
- Máximo 2 perguntas por mensagem

REGRAS GERAIS: Sem notas de IMDb/RT. Sem inventar filmes. Sem textão. Seja direto.`;
    } else {
      systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre.

Seja direto. Nada de introduções longas ou explicações óbvias. Fale como um amigo que manja de cinema, não como um robô.

MODO RECOMENDAÇÃO:
- OBRIGATÓRIO: Recomende entre **6 e 10 filmes** por resposta
- Formato: **Título (Ano)** — sempre com ano entre parênteses
- 1 frase curta dizendo POR QUE a pessoa vai curtir
- Plataforma se souber (Netflix, Prime, Disney+)
- Varie os gêneros e estilos dentro das recomendações
- 1 pergunta curta no final pra refinar as próximas sugestões

REGRAS GERAIS: Sem notas de IMDb/RT. Sem inventar filmes. Sem textão.`;
    }

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shouldExtract = !!userId && messages.length >= 1;

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          await writer.write(encoder.encode(chunk));

          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullResponse += content;
            } catch { /* skip */ }
          }
        }

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
