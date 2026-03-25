import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractTasteSignals(messages: { role: string; content: string }[], userId: string, apiKey: string) {
  try {
    if (messages.length < 1) return;
    const recentMessages = messages.slice(-6);
    const conversation = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analise esta conversa sobre filmes e extraia sinais de gosto do USUÁRIO (não do assistente).\nCONVERSA:\n${conversation}\n\nResponda APENAS em JSON válido:\n{\n  "signals": [\n    {"signal_type": "like", "category": "genre", "value": "terror psicológico", "confidence": 0.9}\n  ]\n}\nSe não houver sinais claros, retorne {"signals": []}`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
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
  } catch (e) {
    console.error("Taste extraction error:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const {
          data: { user },
        } = await userClient.auth.getUser();
        userId = user?.id || null;
      } catch {
        /* ignore */
      }
    }

    const lastUserMsg =
      messages
        .filter((m: any) => m.role === "user")
        .pop()
        ?.content?.toLowerCase() || "";
    const isTasteMode =
      /\b(meu gosto|gosto em filmes|que tipo de filme|me conhecer|perfil|preferências|o que eu curto|entender meu gosto|conversar sobre|quero conversar)\b/i.test(
        lastUserMsg,
      );

    const systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre. SEJA DIRETO. MODO ATUAL: ${isTasteMode ? "PERFIL DE GOSTO" : "RECOMENDAÇÃO"}`;

    const geminiMessages = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullResponse = "";

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: geminiMessages }),
            },
          );

          if (!response.ok) throw new Error("Erro no serviço de IA");

          const reader = response.body?.getReader();
          if (!reader) throw new Error("Falha ao ler stream da IA");

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              try {
                const cleanedLine = line.replace(/^\s*,/, "").trim();
                if (!cleanedLine || !cleanedLine.startsWith("{")) continue;
                const parsed = JSON.parse(cleanedLine);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                  fullResponse += text;
                  const sseData = JSON.stringify({ choices: [{ delta: { content: text } }] });
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }
              } catch {
                /* chunk fragment */
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

          if (userId && fullResponse) {
            extractTasteSignals([...messages, { role: "assistant", content: fullResponse }], userId, GEMINI_API_KEY);
          }
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
