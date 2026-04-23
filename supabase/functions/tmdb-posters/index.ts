import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

// Clean title for search: split on "/" or "—", try each part
function extractSearchTerms(raw: string): string[] {
  // "War Horse / Cavalo de Guerra" -> ["War Horse", "Cavalo de Guerra"]
  // "Spirit: O Corcel Indomável" -> ["Spirit: O Corcel Indomável"]
  const parts = raw.split(/\s*[\/—]\s*/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return [raw.trim()];
  return parts;
}

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

    const results = await Promise.all(
      titles.slice(0, 10).map(async (rawTitle: string) => {
        try {
          const searchTerms = extractSearchTerms(rawTitle);
          
          for (const term of searchTerms) {
            // Try movie + TV search across pt-BR and en-US
            for (const lang of ["pt-BR", "en-US"]) {
              for (const kind of ["movie", "tv"] as const) {
                const url = `${TMDB_BASE}/search/${kind}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(term)}&language=${lang}&page=1`;
                const resp = await fetch(url);
                const data = await resp.json();
                const item = data.results?.[0];
                if (item?.poster_path) {
                  const dateField = kind === "tv" ? item.first_air_date : item.release_date;
                  return {
                    title: rawTitle,
                    posterUrl: `${IMG_BASE}${item.poster_path}`,
                    year: dateField ? parseInt(dateField.slice(0, 4)) : null,
                    overview: item.overview || null,
                    tmdbId: item.id,
                    mediaType: kind,
                  };
                }
              }
            }
          }
          
          return { title: rawTitle, posterUrl: null, year: null, overview: null };
        } catch {
          return { title: rawTitle, posterUrl: null, year: null, overview: null };
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
