import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

function toGeminiMessages(messages: { role: string; content: string }[]) {
  return messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

async function extractTasteSignals(messages: { role: string; content: string }[], userId: string, apiKey: string) {
  try {
    if (messages.length < 1) return;
    const recentMessages = messages.slice(-6);
    const conversation = recentMessages.map(m => `${m.role}: ${m.content}`).join("\n");

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
               text: `Analise esta conversa sobre filmes e extraia sinais de gosto do USUÁRIO (não do assistente).

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

IMPORTANTE: Capture TUDO que a pessoa mencionar gostar ou não gostar, incluindo coisas não-cinematográficas como animais, objetos, cenários específicos, personagens arquetípicos, temas que a pessoa odeia.

Responda APENAS em JSON válido:
{
  "signals": [
    {"signal_type": "like", "category": "genre", "value": "terror psicológico", "confidence": 0.9},
    {"signal_type": "avoid", "category": "element", "value": "violência com animais", "confidence": 0.95}
  ]
}

Se não houver sinais claros, retorne {"signals": []}`,
            }],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500, responseMimeType: "application/json" },
        }),
      }
    );

    if (!resp.ok) return;
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return;

    const { signals } = JSON.parse(text);
    if (!signals || signals.length === 0) return;

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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

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

    const systemInstruction = `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre.

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

REGRAS: Sem notas de IMDb/RT. Sem inventar filmes. Sem textão.`;

    const geminiMessages = toGeminiMessages(messages);

    const response = await fetch(`${GEMINI_URL}&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: geminiMessages,
        generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Taste extraction will run inside the stream block after streaming completes
    const shouldExtract = !!userId && messages.length >= 1;

    // Transform Gemini SSE stream to OpenAI-compatible SSE stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                // Convert to OpenAI-compatible format
                const openAIChunk = {
                  choices: [{ delta: { content: text }, index: 0 }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
              }
            } catch { /* skip malformed */ }
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        // Extract taste signals AFTER streaming completes (runtime still alive)
        if (shouldExtract) {
          await extractTasteSignals(messages, userId!, GEMINI_API_KEY);
        }
      } catch (e) {
        console.error("Stream transform error:", e);
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
