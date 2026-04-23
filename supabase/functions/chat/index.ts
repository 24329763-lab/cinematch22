import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway (uses LOVABLE_API_KEY auto-provisioned in Cloud)
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_MODEL_MAIN = "google/gemini-2.5-flash";
const LOVABLE_MODEL_LIGHT = "google/gemini-2.5-flash-lite";

async function callLovableAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  apiKey: string,
  model = LOVABLE_MODEL_MAIN,
) {
  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Lovable AI error:", response.status, t);
    const status = response.status === 429 ? 429 : response.status === 402 ? 402 : 500;
    const message =
      status === 429
        ? "Muitas requisições. Aguarde alguns segundos."
        : status === 402
          ? "Créditos insuficientes. Adicione créditos ao workspace."
          : "Erro no serviço de IA.";
    return { error: message, status, text: null as string | null };
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content?.trim?.() || "";
  return { error: null, status: 200, text };
}

async function extractTasteSignals(messages: { role: string; content: string }[], userId: string) {
  try {
    if (messages.length < 1) return;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return;

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

    const resp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LOVABLE_MODEL_LIGHT,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      console.error("Lovable AI extract failed:", resp.status, await resp.text());
      return;
    }
    const data = await resp.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
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
    const { messages, mode, stream = true } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const shouldExtract = !!userId && messages.length >= 1;

    let systemPrompt: string;

    if (isOnboarding) {
      systemPrompt = `Você é o CineMatch — assistente pessoal de cinema E séries. Português brasileiro sempre.

Você está no MODO ONBOARDING — seu objetivo é conhecer o gosto do usuário em filmes e séries de TV de forma natural e divertida.

REGRAS DO ONBOARDING:
- Reaja GENUINAMENTE ao que o usuário diz. Se mencionar um filme ou série, comente algo específico sobre ele(a).
- Trate filmes E séries de TV como igualmente importantes. Não foque só em filmes.
- Se a resposta for vaga ou errada, ajude gentilmente.
- Faça 1-2 perguntas por mensagem, máximo. Não interrogue.
- IMPORTANTE: Pergunte EXPLICITAMENTE sobre coisas que ele NÃO gosta ou tem medo (ex: aranhas, palhaços, violência com animais, jumpscare). Isso vai pra blacklist.
- Explore: gêneros favoritos, filmes/séries marcantes, o que irrita, moods preferidos, fobias visuais, formato preferido (filme curto, série longa, minissérie...)
- Seja curto e direto. Nada de textão.
- Use emojis com moderação (1-2 por mensagem)
- Quando sentir que já tem info suficiente (4-5 trocas), inclua "[ONBOARDING_COMPLETE]" no final da sua resposta
- NÃO recomende títulos no onboarding, foque em conhecer o gosto

Responda de forma NATURAL e PERSONALIZADA. Nunca dê respostas genéricas.`;
    } else if (isTasteMode) {
      systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo e seriéfilo. Português brasileiro sempre.

MODO PERFIL DE GOSTO:
- NÃO recomende filmes nem séries. Zero. Nenhum título em negrito.
- Faça perguntas sobre o que a pessoa sente ao assistir filmes E séries
- Pergunte sobre coisas que IRRITAM ou que ela NÃO suporta ver
- Seja curioso e natural, não interrogador
- Máximo 2 perguntas por mensagem`;
    } else {
      systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo e seriéfilo. Português brasileiro sempre.

Seja direto. Nada de introduções longas.

MODO RECOMENDAÇÃO:
- OBRIGATÓRIO: Recomende entre **6 e 10 títulos** por resposta (misture filmes E séries de TV quando fizer sentido)
- Formato: **Título (Ano)** — sempre com ano entre parênteses. Para séries indique "(Série, Ano)" ou similar.
- 1 frase curta dizendo POR QUE a pessoa vai curtir
- Plataforma se souber (Netflix, Prime, Disney+, HBO Max, Apple TV+)
- Varie gêneros, estilos e formatos (filme/série)
- 1 pergunta curta no final pra refinar

REGRAS GERAIS: Sem notas de IMDb/RT. Sem inventar títulos. Sem textão.`;
    }

    // Use Lovable AI Gateway (non-streaming for stability with supabase.functions.invoke)
    const result = await callLovableAI(messages, systemPrompt, LOVABLE_API_KEY);
    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (shouldExtract && result.text) {
      const allMsgs = [...messages, { role: "assistant", content: result.text }];
      await extractTasteSignals(allMsgs, userId!);
    }

    return new Response(JSON.stringify({ content: result.text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
