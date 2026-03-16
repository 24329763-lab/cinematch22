import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY is not configured");

    const { titles } = await req.json();
    if (!Array.isArray(titles) || titles.length === 0) {
      return new Response(JSON.stringify({ error: "titles array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search for each title in parallel
    const results = await Promise.all(
      titles.slice(0, 10).map(async (title: string) => {
        try {
          const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=pt-BR&page=1`;
          const resp = await fetch(url);
          const data = await resp.json();
          const movie = data.results?.[0];
          if (!movie) return { title, posterUrl: null, year: null, overview: null };
          return {
            title,
            posterUrl: movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : null,
            year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null,
            overview: movie.overview || null,
            tmdbId: movie.id,
          };
        } catch {
          return { title, posterUrl: null, year: null, overview: null };
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tmdb-posters error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
