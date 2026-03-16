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

    const signalCount = signals?.length || 0;

    // Check cache - only use if signal count hasn't changed
    const { data: existingRecs } = await serviceClient
      .from("home_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingRecs && existingRecs.signals_count === signalCount && signalCount > 0) {
      console.log("Returning cached recommendations (signals unchanged)");
      return new Response(JSON.stringify(existingRecs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signals || signals.length === 0) {
      return new Response(JSON.stringify({ sections: [], taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the "Taste Note" — structured text profile from all signals
    const tasteNote = buildTasteNote(signals);
    console.log("Taste Note:", tasteNote);

    // Get watchlist + watched for extra context
    const [{ data: watchlist }, { data: watched }, { data: profile }] = await Promise.all([
      serviceClient.from("watchlist").select("title, genres, year, rating").eq("user_id", user.id).limit(50),
      serviceClient.from("watched").select("title, genres, year, user_rating").eq("user_id", user.id).limit(50),
      serviceClient.from("profiles").select("*").eq("user_id", user.id).single(),
    ]);

    const watchlistTitles = watchlist?.map(w => w.title).join(", ") || "vazia";
    const watchedTitles = watched?.map(w => `${w.title}${w.user_rating ? ` (${w.user_rating}★)` : ""}`).join(", ") || "vazio";

    const prompt = `Você é um sistema de recomendação de filmes. Use o PERFIL DE GOSTO abaixo para gerar recomendações 100% PERSONALIZADAS.

=== PERFIL DE GOSTO (Taste Note) ===
${tasteNote}

=== WATCHLIST ===
${watchlistTitles}

=== JÁ ASSISTIDOS ===
${watchedTitles}

=== PLATAFORMAS ===
${profile?.platforms?.join(", ") || "Netflix, Prime Video, Disney+"}

TAREFA: Gere exatamente 4 seções para a home page. Os TÍTULOS das seções devem ser criativos e refletir o gosto específico do usuário (ex: se gosta de terror → "Noites Sem Dormir", se gosta de drama → "Emoções à Flor da Pele").

Cada seção com 5-6 filmes REAIS.

REGRAS:
- APENAS filmes REAIS
- NÃO repita filmes entre seções
- NÃO inclua filmes já assistidos
- Cada filme: title, year, rating (IMDB), genres (PT-BR), platforms (netflix/prime/disney), description (1 frase PT-BR), matchPercent (60-99)
- Os títulos das seções DEVEM ser personalizados ao perfil, NUNCA genéricos

Responda APENAS em JSON:
{
  "taste_summary": "1-2 frases descrevendo o perfil de gosto em PT-BR",
  "sections": [
    {
      "key": "section-1",
      "title": "Título Criativo Personalizado",
      "subtitle": "porque você curte X",
      "icon": "heart|flame|compass|star",
      "movies": [{"id": "slug", "title": "...", "year": 2024, "rating": 8.1, "genres": ["Drama"], "platforms": ["netflix"], "description": "...", "matchPercent": 95}]
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

    console.log(`Generated personalized home for user ${user.id} with ${signalCount} signals`);

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

/**
 * Build a structured "Taste Note" from raw taste signals.
 * Groups by category and summarizes into readable text.
 */
function buildTasteNote(signals: any[]): string {
  const groups: Record<string, { likes: string[]; dislikes: string[]; preferences: string[] }> = {};

  for (const s of signals) {
    const cat = s.category;
    if (!groups[cat]) groups[cat] = { likes: [], dislikes: [], preferences: [] };

    const val = `${s.value} (confiança: ${s.confidence})`;
    if (s.signal_type === "like" || s.signal_type === "interest") {
      if (!groups[cat].likes.includes(s.value)) groups[cat].likes.push(s.value);
    } else if (s.signal_type === "dislike" || s.signal_type === "avoid") {
      if (!groups[cat].dislikes.includes(s.value)) groups[cat].dislikes.push(s.value);
    } else if (s.signal_type === "preference") {
      if (!groups[cat].preferences.includes(s.value)) groups[cat].preferences.push(s.value);
    }
  }

  const lines: string[] = [];
  for (const [category, data] of Object.entries(groups)) {
    const parts: string[] = [];
    if (data.likes.length) parts.push(`gosta: ${data.likes.join(", ")}`);
    if (data.dislikes.length) parts.push(`não gosta: ${data.dislikes.join(", ")}`);
    if (data.preferences.length) parts.push(`prefere: ${data.preferences.join(", ")}`);
    if (parts.length) lines.push(`[${category.toUpperCase()}] ${parts.join(" | ")}`);
  }

  return lines.join("\n") || "Nenhum sinal de gosto capturado ainda.";
}