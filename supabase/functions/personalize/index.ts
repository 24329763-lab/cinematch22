import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

async function fetchTMDB(path: string, params: Record<string, string> = {}): Promise<any> {
  const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not configured");
  const qs = new URLSearchParams({ api_key: TMDB_API_KEY, language: "pt-BR", ...params });
  const resp = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!resp.ok) throw new Error(`TMDB ${path} failed: ${resp.status}`);
  return resp.json();
}

function mapTMDBMovie(m: any): any {
  return {
    id: `tmdb-${m.id}`,
    title: m.title,
    year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : null,
    rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : null,
    posterUrl: m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
    description: m.overview || "",
    genres: m.genre_ids || [],
    platforms: [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Get user from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ sections: [], taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile + taste signals
    const [profileRes, signalsRes, cachedRes] = await Promise.all([
      serviceClient.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      serviceClient.from("taste_signals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      serviceClient.from("home_recommendations").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const signals = signalsRes.data || [];

    // Check cache - return if < 24h old and signals count hasn't changed significantly
    if (cachedRes.data) {
      const cached = cachedRes.data;
      const age = Date.now() - new Date(cached.generated_at).getTime();
      const signalDelta = Math.abs((cached.signals_count || 0) - signals.length);
      if (age < 24 * 60 * 60 * 1000 && signalDelta < 5) {
        return new Response(JSON.stringify({
          sections: cached.sections,
          taste_summary: cached.taste_summary,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Build taste context
    const tasteBio = profile?.taste_bio || "";
    const tasteContext = signals.slice(0, 50).map((s: any) => `${s.signal_type} ${s.category}: ${s.value}`).join(", ");
    const blockedElements = profile?.blocked_elements || [];

    // If no taste data at all, return TMDB trending/popular as fallback
    if (!tasteBio && signals.length === 0) {
      const [trending, popular, topRated] = await Promise.all([
        fetchTMDB("/trending/movie/week"),
        fetchTMDB("/movie/popular"),
        fetchTMDB("/movie/top_rated"),
      ]);

      const sections = [
        { key: "trending", title: "Em Alta Esta Semana", subtitle: "O que todo mundo está assistindo", icon: "flame", movies: (trending.results || []).slice(0, 12).map(mapTMDBMovie) },
        { key: "popular", title: "Populares", subtitle: "Os mais assistidos", icon: "star", movies: (popular.results || []).slice(0, 12).map(mapTMDBMovie) },
        { key: "top_rated", title: "Mais Bem Avaliados", subtitle: "Clássicos e favoritos", icon: "heart", movies: (topRated.results || []).slice(0, 12).map(mapTMDBMovie) },
      ];

      return new Response(JSON.stringify({ sections, taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to generate section themes
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: `Você é um curador de cinema. Com base no perfil de gosto do usuário, crie 5 seções de filmes para uma home personalizada.

PERFIL DO USUÁRIO:
Bio: ${tasteBio || "Não informado"}
Sinais de gosto: ${tasteContext || "Poucos dados ainda"}
Elementos bloqueados: ${blockedElements.join(", ") || "Nenhum"}

Para cada seção, defina:
- title: nome criativo e mood-aware (ex: "Para um dia chuvoso", "Adrenalina pura", "Cinema que faz pensar")
- subtitle: uma frase curta
- icon: um de [heart, flame, compass, star, trending, clock, globe, sparkles]
- tmdb_query: parâmetros para busca no TMDB (with_genres IDs, sort_by, vote_average.gte, etc)

Gêneros TMDB IDs: 28=Ação, 12=Aventura, 16=Animação, 35=Comédia, 80=Crime, 99=Documentário, 18=Drama, 10751=Família, 14=Fantasia, 36=História, 27=Terror, 10402=Música, 9648=Mistério, 10749=Romance, 878=Ficção Científica, 53=Thriller, 10752=Guerra, 37=Faroeste

Responda APENAS em JSON:
{
  "sections": [
    {"title": "...", "subtitle": "...", "icon": "heart", "tmdb_query": {"with_genres": "18,10749", "sort_by": "vote_average.desc", "vote_average.gte": "7"}},
  ],
  "taste_summary": "Uma frase resumindo o gosto do usuário"
}`,
        }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResp.ok) throw new Error(`AI failed: ${aiResp.status}`);
    const aiData = await aiResp.json();
    let aiText = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON
    const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) aiText = jsonMatch[1];
    aiText = aiText.trim();
    
    let parsed: any;
    try {
      parsed = JSON.parse(aiText);
    } catch {
      // Fallback if AI gives bad JSON
      parsed = {
        sections: [
          { title: "Em Alta", subtitle: "Populares agora", icon: "flame", tmdb_query: {} },
          { title: "Para Você", subtitle: "Baseado no seu gosto", icon: "star", tmdb_query: { sort_by: "vote_average.desc", "vote_average.gte": "7.5" } },
          { title: "Novidades", subtitle: "Lançamentos recentes", icon: "sparkles", tmdb_query: { sort_by: "release_date.desc" } },
        ],
        taste_summary: null,
      };
    }

    const aiSections = parsed.sections || [];
    const tasteSummary = parsed.taste_summary || null;

    // Fetch TMDB movies for each section in parallel
    const tmdbPromises = aiSections.map(async (section: any) => {
      try {
        const params: Record<string, string> = { page: "1" };
        if (section.tmdb_query) {
          Object.entries(section.tmdb_query).forEach(([k, v]) => {
            params[k] = String(v);
          });
        }
        if (!params.sort_by) params.sort_by = "popularity.desc";
        
        const data = await fetchTMDB("/discover/movie", params);
        let movies = (data.results || []).slice(0, 12).map(mapTMDBMovie);
        
        // Filter blocked elements
        if (blockedElements.length > 0) {
          const blocked = blockedElements.map((b: string) => b.toLowerCase());
          movies = movies.filter((m: any) => {
            const text = `${m.title} ${m.description}`.toLowerCase();
            return !blocked.some((b: string) => text.includes(b));
          });
        }
        
        return { ...section, movies, tmdb_query: undefined };
      } catch (e) {
        console.error(`TMDB fetch error for section ${section.title}:`, e);
        return { ...section, movies: [], tmdb_query: undefined };
      }
    });

    // Also fetch trending as a bonus section
    const trendingPromise = fetchTMDB("/trending/movie/week").then(data => ({
      key: "trending",
      title: "Em Alta Agora",
      subtitle: "Tendências da semana",
      icon: "flame",
      movies: (data.results || []).slice(0, 12).map(mapTMDBMovie),
    })).catch(() => null);

    const [sectionResults, trendingSection] = await Promise.all([
      Promise.all(tmdbPromises),
      trendingPromise,
    ]);

    // Combine sections
    const finalSections = [];
    if (trendingSection && trendingSection.movies.length > 0) {
      finalSections.push(trendingSection);
    }
    for (const s of sectionResults) {
      if (s.movies && s.movies.length > 0) {
        finalSections.push({ key: s.title.toLowerCase().replace(/\s+/g, "-"), ...s });
      }
    }

    // Cache results
    const cacheData = {
      user_id: userId,
      sections: finalSections,
      taste_summary: tasteSummary,
      signals_count: signals.length,
      generated_at: new Date().toISOString(),
    };

    if (cachedRes.data) {
      await serviceClient.from("home_recommendations").update(cacheData).eq("user_id", userId);
    } else {
      await serviceClient.from("home_recommendations").insert(cacheData);
    }

    return new Response(JSON.stringify({ sections: finalSections, taste_summary: tasteSummary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Personalize error:", e);
    // Fallback to TMDB trending
    try {
      const trending = await fetchTMDB("/trending/movie/week");
      const popular = await fetchTMDB("/movie/popular");
      const sections = [
        { key: "trending", title: "Em Alta", subtitle: "Tendências da semana", icon: "flame", movies: (trending.results || []).slice(0, 12).map(mapTMDBMovie) },
        { key: "popular", title: "Populares", subtitle: "Os mais assistidos", icon: "star", movies: (popular.results || []).slice(0, 12).map(mapTMDBMovie) },
      ];
      return new Response(JSON.stringify({ sections, taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ sections: [], taste_summary: null, error: String(e) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});
