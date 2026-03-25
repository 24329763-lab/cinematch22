import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

async function fetchTMDB(path: string, params: Record<string, string> = {}): Promise<any> {
  const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not configured in Supabase Secrets");
  
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError) console.error("Auth error:", authError.message);
      userId = user?.id || null;
    }

    if (!userId) {
      console.log("No user ID found in request");
      return new Response(JSON.stringify({ sections: [], taste_summary: "Realize o login para ver recomendações personalizadas." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch data using the corrected 'id' column for profiles
    const [profileRes, signalsRes, cachedRes] = await Promise.all([
      serviceClient.from("profiles").select("*").eq("id", userId).maybeSingle(),
      serviceClient.from("taste_signals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      serviceClient.from("home_recommendations").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const profile =