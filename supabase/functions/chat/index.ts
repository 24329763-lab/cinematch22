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
  ]
}

Se não houver sinais claros, retorne {"signals": []}`,
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

    // Extract JSON from possible markdown code blocks
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const { signals } = JSON.parse(jsonStr.trim());
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
    const isTasteMode = /\b(meu gosto|gosto em filmes|que tipo de filme|me conhecer|perfil|preferências|o que eu curto|entender meu gosto|conversar sobre|quero conversar)\b/i.test(lastUserMsg);

    const systemPrompt = `Você é o CineMatch — conciso, esperto, cinéfilo. Português brasileiro sempre.

Seja direto. Nada de introduções longas ou explicações óbvias. Fale como um amigo que manja de cinema, não como um robô.

MODO ATUAL: ${isTasteMode ? "PERFIL DE GOSTO" : "RECOMENDAÇÃO"}

${isTasteMode ? `MODO PERFIL DE GOSTO (ativo agora):
- NÃO recomende filmes. Zero. Nenhum título em negrito.
- Faça perguntas sobre o que a pessoa sente ao assistir filmes
- Explore moods, cenários, temas, elementos que ela curte ou não
- Pergunte "em que momento você assiste?" — chuva, sozinho, casal, noite, etc.
- Conecte padrões: "parece que você curte histórias de superação, né?"
- Pergunte sobre coisas que IRRITAM em filmes (clichês, finais, ritmo)
- Explore fora do cinema: animais, viagens, hobbies — tudo ajuda a entender
- Seja curioso e natural, não interrogador
- Máximo 2 perguntas por mensagem` : `MODO RECOMENDAÇÃO (ativo agora):
- OBRIGATÓRIO: **Título (Ano)** — sempre com ano entre parênteses
- 1 frase curta dizendo POR QUE a pessoa vai curtir
- Plataforma se souber (Netflix, Prime, Disney+)
- 3-5 filmes, sem enrolação
- 1 pergunta curta no final pra refinar`}

REGRAS GERAIS: Sem notas de IMDb/RT. Sem inventar filmes. Sem textão.`;

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

    // Taste extraction runs after stream completes
    const shouldExtract = !!userId && messages.length >= 1;

    // Gateway already returns OpenAI-compatible SSE, pass through directly
    // but we need to tap into the stream for taste extraction
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Pass through to client
          await writer.write(encoder.encode(chunk));

          // Collect full response for taste extraction
          let newlineIdx: number;
          const tempBuf = buffer;
          buffer = "";
          for (const line of tempBuf.split("\n")) {
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

        // Extract taste signals after streaming completes
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
