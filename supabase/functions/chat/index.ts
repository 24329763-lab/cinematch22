import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractTasteSignals(messages: { role: string; content: string }[], userId: string, apiKey: string) {
  try {
    // Only analyze if there are at least 2 messages (user + assistant)
    if (messages.length < 2) return;

    // Take last 6 messages for context
    const recentMessages = messages.slice(-6);
    const conversation = recentMessages.map(m => `${m.role}: ${m.content}`).join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
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
- "avoid" = quer evitar

Categorias: genre, movie, mood, era, director, actor, theme, style, pace, origin

Responda APENAS em JSON válido:
{
  "signals": [
    {"signal_type": "like", "category": "genre", "value": "terror psicológico", "confidence": 0.9},
    {"signal_type": "preference", "category": "mood", "value": "tenso", "confidence": 0.8}
  ]
}

Se não houver sinais claros, retorne {"signals": []}`,
        }],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return;

    const { signals } = JSON.parse(content);
    if (!signals || signals.length === 0) return;

    // Save signals using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

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
  } catch (e) {
    console.error("Taste extraction error (non-blocking):", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

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

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre.

Seja direto. Nada de introduções longas ou explicações óbvias. Fale como um amigo que manja de cinema, não como um robô.

RECOMENDAÇÕES: Quando pedirem filmes:
- OBRIGATÓRIO: **Título (Ano)** — sempre com ano entre parênteses
- 1 frase curta dizendo POR QUE a pessoa vai curtir
- Plataforma se souber (Netflix, Prime, Disney+)
- 3-5 filmes, sem enrolação
- 1 pergunta curta no final

CONVERSA: Quando quiserem falar sobre gosto:
- Seja curioso, não interrogador
- Pergunte o que a pessoa SENTIU, não só o que assistiu
- Conecte padrões ("você curte protagonistas obsessivos, né?")

REGRAS: Sem notas de IMDb/RT. Sem inventar filmes. Sem textão.`,
            },
            ...messages,
          ],
          stream: true,
          max_tokens: 4096,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fire taste extraction in the background (non-blocking)
    if (userId && messages.length >= 2) {
      // We extract from the messages sent (which include user's latest message)
      // The assistant response isn't available yet since we're streaming, 
      // but we can still analyze what the user has said
      extractTasteSignals(messages, userId, OPENAI_API_KEY).catch(() => {});
    }

    return new Response(response.body, {
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
