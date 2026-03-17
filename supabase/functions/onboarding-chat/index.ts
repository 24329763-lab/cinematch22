import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { messages, complete } = await req.json();

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // If the client signals onboarding is complete, extract final signals and mark profile
    if (complete) {
      // Extract taste signals from the full conversation
      const allMessages = (messages || []).map((m: any) => `${m.role}: ${m.content}`).join("\n");

      const extractResp = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: `Analise esta conversa de onboarding sobre filmes e extraia TODOS os sinais de gosto do usuário.

CONVERSA:
${allMessages}

Extraia sinais claros e explícitos mencionados pelo usuário.

Tipos de sinal: "like", "dislike", "preference", "interest", "avoid"
Categorias: genre, movie, mood, era, director, actor, theme, style, pace, origin, element, setting, topic, animal

Responda APENAS em JSON:
{
  "signals": [
    {"signal_type": "like", "category": "genre", "value": "terror psicológico", "confidence": 0.9}
  ],
  "blocked_elements": ["jump scares", "gore"],
  "mood_signals": [
    {"mood": "contemplativo", "intensity": 0.8}
  ]
}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (extractResp.ok) {
        const extractData = await extractResp.json();
        const text = extractData.choices?.[0]?.message?.content;
        if (text) {
          let jsonStr = text;
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];

          try {
            const parsed = JSON.parse(jsonStr.trim());

            // Insert taste signals
            if (parsed.signals?.length) {
              const rows = parsed.signals.map((s: any) => ({
                user_id: userId,
                signal_type: s.signal_type,
                category: s.category,
                value: s.value,
                confidence: s.confidence || 0.7,
                source: "onboarding",
              }));
              await serviceClient.from("taste_signals").insert(rows);
            }

            // Insert mood signals
            if (parsed.mood_signals?.length) {
              const moodRows = parsed.mood_signals.map((m: any) => ({
                user_id: userId,
                mood: m.mood,
                intensity: m.intensity || 0.5,
                source: "onboarding",
              }));
              await serviceClient.from("user_mood_signals").insert(moodRows);
            }

            // Update blocked elements on profile
            if (parsed.blocked_elements?.length) {
              await serviceClient
                .from("profiles")
                .update({ blocked_elements: parsed.blocked_elements })
                .eq("user_id", userId);
            }
          } catch (parseErr) {
            console.error("Signal extraction parse error:", parseErr);
          }
        }
      }

      // Mark onboarding complete
      await serviceClient
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normal chat mode — stream AI response for onboarding conversation
    const systemPrompt = `Você é o CineMatch, um assistente de onboarding amigável e cinematográfico. Português brasileiro.

Seu objetivo é conhecer o gosto cinematográfico do usuário em 4-6 trocas de mensagem.

FLUXO:
1. Comece perguntando os últimos 3 filmes que a pessoa assistiu e o que achou
2. Explore gêneros, diretores, atores favoritos
3. Pergunte sobre moods — quando e como ela assiste filmes
4. Pergunte sobre coisas que IRRITAM em filmes (clichês, elementos indesejados)
5. Explore interesses fora do cinema que possam influenciar o gosto
6. Ao final, resuma o que entendeu e pergunte se quer adicionar algo

REGRAS:
- Máximo 2 perguntas por mensagem
- Seja casual e empolgado, como um amigo cinéfilo
- NÃO recomende filmes durante o onboarding
- Capture preferências sutis (ritmo, visual, temas)
- Quando sentir que já tem info suficiente, diga "Acho que já te conheço bem! Vou montar sua experiência personalizada 🎬"`;

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
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("onboarding-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
