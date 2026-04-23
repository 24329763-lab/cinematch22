import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.5-flash";

async function fetchTMDB(path: string, params: Record<string, string> = {}): Promise<any> {
  const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not configured");
  const qs = new URLSearchParams({ api_key: TMDB_API_KEY, language: "pt-BR", ...params });
  const resp = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!resp.ok) throw new Error(`TMDB ${path} failed: ${resp.status}`);
  return resp.json();
}

// Fetch many pages in parallel for a deeper pool
async function fetchTMDBPool(path: string, params: Record<string, string> = {}, pages = 3): Promise<any[]> {
  const reqs = [];
  for (let p = 1; p <= pages; p++) {
    reqs.push(fetchTMDB(path, { ...params, page: String(p) }).catch(() => ({ results: [] })));
  }
  const results = await Promise.all(reqs);
  return results.flatMap((r) => r.results || []);
}

function mapTMDBMovie(m: any): any {
  const isTV = !!(m.first_air_date || m.name) && !m.title;
  return {
    id: `tmdb-${isTV ? "tv" : "mv"}-${m.id}`,
    title: m.title || m.name,
    year: (m.release_date || m.first_air_date)
      ? parseInt((m.release_date || m.first_air_date).slice(0, 4))
      : null,
    rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : null,
    posterUrl: m.poster_path ? `${IMG_BASE}${m.poster_path}` : null,
    description: m.overview || "",
    genres: m.genre_ids || [],
    platforms: [],
    mediaType: isTV ? "tv" : "movie",
  };
}

function dedupeById(movies: any[]): any[] {
  const seen = new Set<string>();
  return movies.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

function filterBlocked(movies: any[], blocked: string[]): any[] {
  if (!blocked || blocked.length === 0) return movies;
  const blk = blocked.map((b) => b.toLowerCase().trim()).filter(Boolean);
  return movies.filter((m) => {
    const text = `${m.title || ""} ${m.description || ""}`.toLowerCase();
    return !blk.some((b) => text.includes(b));
  });
}

async function callGemini(prompt: string, jsonMode = true): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

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

    // Anonymous → return rich TMDB fallback (movies + TV)
    if (!userId) {
      const [trendingMv, popularMv, trendingTv, popularTv] = await Promise.all([
        fetchTMDBPool("/trending/movie/week", {}, 2),
        fetchTMDBPool("/movie/popular", {}, 2),
        fetchTMDBPool("/trending/tv/week", {}, 2),
        fetchTMDBPool("/tv/popular", {}, 2),
      ]);
      const sections = [
        { key: "trending", title: "Em Alta Esta Semana", subtitle: "Filmes que todo mundo está vendo", icon: "flame", movies: dedupeById(trendingMv).slice(0, 12).map(mapTMDBMovie) },
        { key: "trending_tv", title: "Séries em Alta", subtitle: "As séries do momento", icon: "trending", movies: dedupeById(trendingTv).slice(0, 12).map(mapTMDBMovie) },
        { key: "popular", title: "Filmes Populares", subtitle: "Os mais assistidos", icon: "star", movies: dedupeById(popularMv).slice(0, 12).map(mapTMDBMovie) },
        { key: "popular_tv", title: "Séries Populares", subtitle: "Maratonas que valem a pena", icon: "heart", movies: dedupeById(popularTv).slice(0, 12).map(mapTMDBMovie) },
      ];
      return new Response(JSON.stringify({ sections, taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [profileRes, signalsRes, cachedRes] = await Promise.all([
      serviceClient.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      serviceClient.from("taste_signals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      serviceClient.from("home_recommendations").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const signals = signalsRes.data || [];
    const blockedElements: string[] = profile?.blocked_elements || [];

    // Cache check
    if (cachedRes.data) {
      const cached = cachedRes.data;
      const age = Date.now() - new Date(cached.generated_at).getTime();
      const signalDelta = Math.abs((cached.signals_count || 0) - signals.length);
      if (age < 24 * 60 * 60 * 1000 && signalDelta < 5) {
        return new Response(
          JSON.stringify({ sections: cached.sections, taste_summary: cached.taste_summary }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const tasteBio = profile?.taste_bio || "";
    const tasteContext = signals.slice(0, 50).map((s: any) => `${s.signal_type} ${s.category}: ${s.value}`).join(", ");

    // No taste data → rich TMDB fallback (movies + TV)
    if (!tasteBio && signals.length === 0) {
      const [trendingMv, popularMv, trendingTv, popularTv] = await Promise.all([
        fetchTMDBPool("/trending/movie/week", {}, 2),
        fetchTMDBPool("/movie/popular", {}, 2),
        fetchTMDBPool("/trending/tv/week", {}, 2),
        fetchTMDBPool("/tv/popular", {}, 2),
      ]);
      const sections = [
        { key: "trending", title: "Em Alta Esta Semana", subtitle: "Filmes que todo mundo está vendo", icon: "flame", movies: filterBlocked(dedupeById(trendingMv).map(mapTMDBMovie), blockedElements).slice(0, 12) },
        { key: "trending_tv", title: "Séries em Alta", subtitle: "As séries do momento", icon: "trending", movies: filterBlocked(dedupeById(trendingTv).map(mapTMDBMovie), blockedElements).slice(0, 12) },
        { key: "popular", title: "Filmes Populares", subtitle: "Os mais assistidos", icon: "star", movies: filterBlocked(dedupeById(popularMv).map(mapTMDBMovie), blockedElements).slice(0, 12) },
        { key: "popular_tv", title: "Séries Populares", subtitle: "Maratonas que valem a pena", icon: "heart", movies: filterBlocked(dedupeById(popularTv).map(mapTMDBMovie), blockedElements).slice(0, 12) },
      ];
      return new Response(JSON.stringify({ sections, taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Gemini to generate themed sections (mix of movies + TV)
    const aiPrompt = `Você é um curador de cinema e séries de TV. Com base no perfil de gosto do usuário, crie 5 seções para uma home personalizada. Misture filmes E séries — não foque só em filmes.

PERFIL DO USUÁRIO:
Bio: ${tasteBio || "Não informado"}
Sinais de gosto: ${tasteContext || "Poucos dados ainda"}
Elementos bloqueados (NUNCA recomendar): ${blockedElements.join(", ") || "Nenhum"}

Para cada seção, defina:
- title: nome criativo e mood-aware (ex: "Para um dia chuvoso", "Maratonas viciantes")
- subtitle: uma frase curta
- icon: um de [heart, flame, compass, star, trending, clock, globe, sparkles]
- media_type: "movie" para filmes OU "tv" para séries de TV
- tmdb_query: parâmetros TMDB (with_genres IDs separados por vírgula, sort_by, vote_average.gte, primary_release_date.gte para filmes ou first_air_date.gte para TV, etc)

Pelo menos 2 das 5 seções DEVEM ser séries de TV (media_type: "tv").

Gêneros TMDB para filmes: 28=Ação, 12=Aventura, 16=Animação, 35=Comédia, 80=Crime, 99=Documentário, 18=Drama, 10751=Família, 14=Fantasia, 36=História, 27=Terror, 10402=Música, 9648=Mistério, 10749=Romance, 878=Ficção Científica, 53=Thriller, 10752=Guerra, 37=Faroeste
Gêneros TMDB para TV: 10759=Ação&Aventura, 16=Animação, 35=Comédia, 80=Crime, 99=Documentário, 18=Drama, 10751=Família, 10762=Kids, 9648=Mistério, 10763=News, 10764=Reality, 10765=Sci-Fi&Fantasia, 10766=Soap, 10767=Talk, 10768=Guerra&Política, 37=Faroeste

Responda APENAS JSON:
{
  "sections": [
    {"title": "...", "subtitle": "...", "icon": "heart", "media_type": "movie", "tmdb_query": {"with_genres": "18,10749", "sort_by": "vote_average.desc", "vote_average.gte": "7"}},
    {"title": "...", "subtitle": "...", "icon": "trending", "media_type": "tv", "tmdb_query": {"with_genres": "18", "sort_by": "vote_average.desc", "vote_average.gte": "7.5"}}
  ],
  "taste_summary": "Uma frase resumindo o gosto do usuário"
}`;

    let parsed: any;
    try {
      const aiText = (await callGemini(aiPrompt, true)).trim();
      const cleaned = aiText.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Gemini parse error, using fallback themes:", e);
      parsed = {
        sections: [
          { title: "Para Você", subtitle: "Baseado no seu gosto", icon: "star", media_type: "movie", tmdb_query: { sort_by: "vote_average.desc", "vote_average.gte": "7.5", "vote_count.gte": "300" } },
          { title: "Séries Pra Maratonar", subtitle: "Histórias que te prendem", icon: "trending", media_type: "tv", tmdb_query: { sort_by: "vote_average.desc", "vote_average.gte": "8", "vote_count.gte": "200" } },
          { title: "Novidades", subtitle: "Lançamentos recentes", icon: "sparkles", media_type: "movie", tmdb_query: { sort_by: "primary_release_date.desc", "vote_count.gte": "50" } },
          { title: "Cinema Que Faz Pensar", subtitle: "Drama e profundidade", icon: "compass", media_type: "movie", tmdb_query: { with_genres: "18", sort_by: "vote_average.desc", "vote_average.gte": "7.5" } },
        ],
        taste_summary: null,
      };
    }

    const aiSections = parsed.sections || [];
    const tasteSummary = parsed.taste_summary || null;

    // For each section: fetch from TMDB (movie or tv discover), then filter blocked, then take 12
    const tmdbPromises = aiSections.map(async (section: any) => {
      try {
        const params: Record<string, string> = {};
        if (section.tmdb_query) {
          Object.entries(section.tmdb_query).forEach(([k, v]) => {
            params[k] = String(v);
          });
        }
        if (!params.sort_by) params.sort_by = "popularity.desc";

        const discoverPath = section.media_type === "tv" ? "/discover/tv" : "/discover/movie";
        const pool = await fetchTMDBPool(discoverPath, params, 3);
        const mapped = dedupeById(pool).map(mapTMDBMovie).filter((m) => m.posterUrl);
        const filtered = filterBlocked(mapped, blockedElements);
        return { ...section, movies: filtered.slice(0, 12), tmdb_query: undefined, media_type: undefined };
      } catch (e) {
        console.error(`TMDB fetch error for section ${section.title}:`, e);
        return { ...section, movies: [], tmdb_query: undefined, media_type: undefined };
      }
    });

    const trendingMoviePromise = fetchTMDBPool("/trending/movie/week", {}, 2)
      .then((pool) => {
        const movies = filterBlocked(dedupeById(pool).map(mapTMDBMovie), blockedElements);
        return {
          key: "trending",
          title: "Filmes em Alta",
          subtitle: "Tendências da semana",
          icon: "flame",
          movies: movies.slice(0, 12),
        };
      })
      .catch(() => null);

    const trendingTvPromise = fetchTMDBPool("/trending/tv/week", {}, 2)
      .then((pool) => {
        const movies = filterBlocked(dedupeById(pool).map(mapTMDBMovie), blockedElements);
        return {
          key: "trending_tv",
          title: "Séries em Alta",
          subtitle: "As séries do momento",
          icon: "trending",
          movies: movies.slice(0, 12),
        };
      })
      .catch(() => null);

    const [sectionResults, trendingMovieSection, trendingTvSection] = await Promise.all([
      Promise.all(tmdbPromises),
      trendingMoviePromise,
      trendingTvPromise,
    ]);

    const finalSections: any[] = [];
    if (trendingMovieSection && trendingMovieSection.movies.length > 0) finalSections.push(trendingMovieSection);
    if (trendingTvSection && trendingTvSection.movies.length > 0) finalSections.push(trendingTvSection);
    for (const s of sectionResults) {
      if (s.movies && s.movies.length > 0) {
        finalSections.push({ key: s.title.toLowerCase().replace(/\s+/g, "-"), ...s });
      }
    }

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

    return new Response(
      JSON.stringify({ sections: finalSections, taste_summary: tasteSummary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Personalize error:", e);
    try {
      const trending = await fetchTMDBPool("/trending/movie/week", {}, 2);
      const popular = await fetchTMDBPool("/movie/popular", {}, 2);
      const sections = [
        { key: "trending", title: "Em Alta", subtitle: "Tendências da semana", icon: "flame", movies: dedupeById(trending).slice(0, 12).map(mapTMDBMovie) },
        { key: "popular", title: "Populares", subtitle: "Os mais assistidos", icon: "star", movies: dedupeById(popular).slice(0, 12).map(mapTMDBMovie) },
      ];
      return new Response(JSON.stringify({ sections, taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(
        JSON.stringify({ sections: [], taste_summary: null, error: String(e) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }
});
