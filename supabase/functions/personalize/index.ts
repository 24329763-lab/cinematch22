import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Get user from token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get taste signals
    const { data: signals } = await serviceClient
      .from("taste_signals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    // Get existing cached recs
    const { data: existingRecs } = await serviceClient
      .from("home_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const signalCount = signals?.length || 0;
    if (existingRecs && existingRecs.signals_count === signalCount && signalCount > 0) {
      return new Response(JSON.stringify(existingRecs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signals || signals.length === 0) {
      return new Response(JSON.stringify({ sections: [], taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's profile for extra context
    const { data: profile } = await serviceClient
      .from("profiles").select("*").eq("user_id", user.id).single();

    const [{ data: watchlist }, { data: watched }] = await Promise.all([
      serviceClient.from("watchlist").select("title, genres, year, rating").eq("user_id", user.id).limit(50),
      serviceClient.from("watched").select("title, genres, year, user_rating").eq("user_id", user.id).limit(50),
    ]);

    const signalSummary = signals.map(s =>
      `${s.signal_type}: ${s.category}="${s.value}" (confiança: ${s.confidence}, fonte: ${s.source})`
    ).join("\n");

    const watchlistSummary = watchlist?.map(w => `${w.title} (${w.year}) [${w.genres?.join(", ")}]`).join(", ") || "vazia";
    const watchedSummary = watched?.map(w => `${w.title} (${w.year}) nota:${w.user_rating || "?"}`).join(", ") || "vazio";

    const profileContext = profile ? `
Gêneros favoritos: ${profile.favorite_genres?.join(", ") || "não definidos"}
Humor preferido: ${profile.preferred_mood || "não definido"}
Era preferida: ${profile.preferred_era || "não definida"}
Origem preferida: ${profile.preferred_origin || "não definida"}
Plataformas: ${profile.platforms?.join(", ") || "todas"}
` : "";

    const prompt = `Você é um sistema de recomendação de filmes. Analise o perfil de gosto deste usuário e gere recomendações PERSONALIZADAS.

SINAIS DE GOSTO DO USUÁRIO:
${signalSummary}

PERFIL:
${profileContext}

WATCHLIST: ${watchlistSummary}
ASSISTIDOS: ${watchedSummary}

TAREFA: Gere exatamente 4 seções de recomendação para a home page, cada uma com 5-6 filmes REAIS.

REGRAS CRÍTICAS:
- APENAS filmes REAIS que existem de verdade
- Filmes devem estar disponíveis em Netflix, Prime Video ou Disney+ no Brasil
- NÃO repita filmes entre seções
- NÃO inclua filmes que o usuário já assistiu
- Cada filme deve ter: title, year, rating (IMDB aproximado), genres (em português), platforms (netflix/prime/disney), description (1 frase em PT-BR), matchPercent (60-99 baseado na compatibilidade real)

SEÇÕES OBRIGATÓRIAS (adapte títulos ao gosto do usuário):
1. "Perfeito pra Você" — filmes com maior match baseado nos sinais
2. Uma seção temática baseada no padrão mais forte (ex: "Thrillers Psicológicos" se curte suspense)
3. "Expandindo Horizontes" — filmes que o usuário PODE curtir mas são de gêneros/estilos que ainda não explorou
4. "Clássicos Essenciais" — obras importantes que combinam com o perfil

Também gere um taste_summary de 1-2 frases descrevendo o perfil de gosto do usuário em PT-BR.

Responda APENAS em JSON válido:
{
  "taste_summary": "...",
  "sections": [
    {
      "key": "for-you",
      "title": "...",
      "subtitle": "...",
      "icon": "heart|flame|compass|star",
      "movies": [
        {
          "id": "slug-do-filme",
          "title": "...",
          "year": 2024,
          "rating": 8.1,
          "genres": ["Drama"],
          "platforms": ["netflix"],
          "description": "...",
          "matchPercent": 95
        }
      ]
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 4096, responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("No AI response");

    const result = JSON.parse(content);

    // Cache the result
    await serviceClient.from("home_recommendations").upsert({
      user_id: user.id,
      sections: result.sections,
      taste_summary: result.taste_summary,
      generated_at: new Date().toISOString(),
      signals_count: signalCount,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("personalize error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
