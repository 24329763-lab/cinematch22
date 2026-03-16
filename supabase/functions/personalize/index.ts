import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SignalType = "like" | "dislike" | "preference" | "interest" | "avoid";

type TasteSignal = {
  signal_type: SignalType;
  category: string;
  value: string;
  confidence?: number;
};

type ChatTasteExtraction = {
  taste_note: string;
  likes: string[];
  dislikes: string[];
  preferences: string[];
  signals: TasteSignal[];
};

const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const [{ data: signals }, { data: profile }, { data: watchlist }, { data: watched }, userMessages] =
      await Promise.all([
        serviceClient
          .from("taste_signals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        serviceClient.from("profiles").select("*").eq("user_id", user.id).single(),
        serviceClient.from("watchlist").select("title, genres, year, rating").eq("user_id", user.id).limit(50),
        serviceClient.from("watched").select("title, genres, year, user_rating").eq("user_id", user.id).limit(50),
        fetchRecentUserMessages(serviceClient, user.id),
      ]);

    const signalRows = (signals || []) as TasteSignal[];
    const signalCount = signalRows.length;
    const tasteBio = (profile as any)?.taste_bio || "";
    // Profile version changes only on significant data changes (new signals, new watched/watchlist items, taste_bio changes)
    const profileVersion = signalCount * 1000 + userMessages.length * 10 + (watchlist?.length || 0) + (watched?.length || 0) + (tasteBio.length > 0 ? 1 : 0);

    const { data: existingRecs } = await serviceClient
      .from("home_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Cache for 24 hours instead of 6 — home should be stable
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const isFresh = existingRecs?.generated_at
      ? Date.now() - new Date(existingRecs.generated_at).getTime() < TWENTY_FOUR_HOURS_MS
      : false;

    // Check if cached data has poster URLs
    const cachedMovies = (existingRecs?.sections as any[])?.flatMap((s: any) => s.movies || []) || [];
    const hasPosterUrls = cachedMovies.length > 0 && cachedMovies.every((m: any) => m.posterUrl && !m.posterUrl.includes("placeholder"));

    // Only regenerate if profile version changed significantly (new taste data) or cache expired
    if (existingRecs && existingRecs.signals_count === profileVersion && profileVersion > 0 && isFresh && hasPosterUrls) {
      return new Response(JSON.stringify(existingRecs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we have cached data but missing posters, re-enrich without calling AI again
    if (existingRecs && existingRecs.signals_count === profileVersion && profileVersion > 0 && !hasPosterUrls && TMDB_API_KEY) {
      const sections = existingRecs.sections as any[];
      const allCachedMovies = sections.flatMap((s: any) => s.movies || []);
      await enrichWithTmdbPosters(allCachedMovies, TMDB_API_KEY);
      
      await serviceClient.from("home_recommendations").update({
        sections: sections,
        generated_at: existingRecs.generated_at, // keep original time
      }).eq("user_id", user.id);

      return new Response(JSON.stringify({ ...existingRecs, sections }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tasteNote = "";
    let tasteSignals: TasteSignal[] = [...signalRows];

    if (signalRows.length > 0) {
      tasteNote = buildTasteNoteFromSignals(signalRows);
    }

    if (!tasteNote && userMessages.length > 0) {
      const extracted = await extractTasteFromChat(userMessages, GEMINI_API_KEY);
      tasteNote = extracted.taste_note;
      tasteSignals = extracted.signals?.length ? extracted.signals : tasteSignals;

      if (signalRows.length === 0 && extracted.signals?.length) {
        const uniqueSignals = dedupeSignals(extracted.signals);
        if (uniqueSignals.length > 0) {
          await serviceClient.from("taste_signals").insert(
            uniqueSignals.map((s) => ({
              user_id: user.id,
              signal_type: s.signal_type,
              category: s.category,
              value: s.value,
              confidence: s.confidence ?? 0.72,
              source: "chat_history",
            })),
          );
        }
      }
    }

    if (!tasteNote) {
      const watchedSummary = watched
        ?.map((w) => `${w.title}${w.user_rating ? ` (${w.user_rating}★)` : ""}`)
        .join(", ");
      const watchlistSummary = watchlist?.map((w) => w.title).join(", ");
      tasteNote = [
        watchedSummary ? `Assistidos: ${watchedSummary}` : "",
        watchlistSummary ? `Watchlist: ${watchlistSummary}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (!tasteNote.trim()) {
      return new Response(JSON.stringify({ sections: [], taste_summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const watchlistTitles = watchlist?.map((w) => w.title).join(", ") || "vazia";
    const watchedTitles = watched?.map((w) => `${w.title}${w.user_rating ? ` (${w.user_rating}★)` : ""}`).join(", ") || "vazio";

    const watchedTitlesList = watched?.map(w => w.title).slice(0, 10) || [];
    const becauseYouWatchedHint = watchedTitlesList.length > 0
      ? `\nFilmes já assistidos pelo usuário (use para seções "Porque você assistiu X"): ${watchedTitlesList.join(", ")}`
      : "";

    const tasteBioHint = tasteBio ? `\nAUTO-DESCRIÇÃO DO USUÁRIO: "${tasteBio}"` : "";

    const prompt = `Você é um motor de recomendação de filmes para home page.

PERFIL REAL DO USUÁRIO (TASTE NOTE):
${tasteNote}
${tasteBioHint}

CONTEXTO:
- Watchlist: ${watchlistTitles}
- Já assistidos: ${watchedTitles}
- Plataformas: ${profile?.platforms?.join(", ") || "Netflix, Prime Video, Disney+"}
${becauseYouWatchedHint}

TAREFA: Gere EXATAMENTE 9 seções personalizadas, cada uma com **8 filmes REAIS** de qualquer país/língua.

TIPOS DE SEÇÃO OBRIGATÓRIOS (use pelo menos 1 de cada tipo):
1. "Porque você assistiu [Título]" — filmes similares a um filme que o usuário já assistiu (use watched list)
2. MOOD — seções com títulos emocionais como "Pra um dia chuvoso e aconchegante", "Pra relaxar depois de um dia estressante", "Pra uma noite de insônia", "Pra chorar sem culpa"
3. GÊNERO — seções baseadas em gêneros que o usuário demonstrou gostar
4. TEMA/ESTILO — seções baseadas em temas específicos do perfil (ex: "Protagonistas obsessivos", "Mundos distópicos")
5. DESCOBERTA — "Você provavelmente não conhece, mas vai amar" — filmes menos conhecidos que combinam

REGRAS:
- Títulos das seções devem ser CRIATIVOS e emocionais, não genéricos
- NÃO forçar filmes brasileiros a menos que o perfil demonstre gostar
- NÃO repetir filmes entre seções
- NÃO incluir filmes já assistidos ou na watchlist
- Explore filmes internacionais variados que COMBINEM com o perfil
- matchPercent: 55-98 baseado no taste note real
- Cada filme DEVE ter o campo "tmdb_title" com o título original/internacional para busca no TMDB
- Icons possíveis: heart, flame, compass, star, trending, clock, globe, sparkles

JSON OBRIGATÓRIO (sem texto extra):
{"taste_summary":"...","sections":[{"key":"s1","title":"...","subtitle":"...","icon":"heart","movies":[{"id":"slug","title":"...","tmdb_title":"...","year":2024,"rating":8.1,"genres":["Drama"],"platforms":["netflix"],"description":"uma frase curta","matchPercent":84}]}]}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("No AI response");

    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      const repaired = repairJson(content);
      result = JSON.parse(repaired);
    }

    // Fetch TMDB posters for all movies
    const allMovies = (result.sections || []).flatMap((s: any) => s.movies || []);
    if (TMDB_API_KEY && allMovies.length > 0) {
      await enrichWithTmdbPosters(allMovies, TMDB_API_KEY);
    }

    const normalizedSections = normalizeSections(result.sections || [], tasteNote, tasteSignals);

    const finalPayload = {
      taste_summary: result.taste_summary || summarizeTasteNote(tasteNote),
      sections: normalizedSections,
    };

    await serviceClient.from("home_recommendations").upsert(
      {
        user_id: user.id,
        sections: finalPayload.sections,
        taste_summary: finalPayload.taste_summary,
        generated_at: new Date().toISOString(),
        signals_count: profileVersion,
      },
      { onConflict: "user_id" },
    );

    return new Response(JSON.stringify(finalPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("personalize error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function enrichWithTmdbPosters(movies: any[], tmdbApiKey: string) {
  // Batch search - process 4 at a time to avoid rate limits
  const batchSize = 4;
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (movie: any) => {
        try {
          const searchTitle = movie.tmdb_title || movie.title;
          const year = movie.year ? `&year=${movie.year}` : "";
          const url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(searchTitle)}${year}&language=pt-BR`;
          const resp = await fetch(url);
          if (!resp.ok) return;
          const data = await resp.json();
          const first = data.results?.[0];
          if (first?.poster_path) {
            movie.posterUrl = `${TMDB_POSTER_BASE}${first.poster_path}`;
          }
          if (first?.overview && !movie.description) {
            movie.description = first.overview.slice(0, 200);
          }
        } catch {
          // Skip failed lookups
        }
      }),
    );
  }
}

async function fetchRecentUserMessages(serviceClient: ReturnType<typeof createClient>, userId: string): Promise<string[]> {
  const { data: conversations } = await serviceClient
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(8);

  const conversationIds = (conversations || []).map((c: { id: string }) => c.id);
  if (conversationIds.length === 0) return [];

  const { data: messages } = await serviceClient
    .from("chat_messages")
    .select("content, created_at")
    .in("conversation_id", conversationIds)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(30);

  return (messages || [])
    .map((m: { content: string | null }) => (m.content || "").trim())
    .filter((msg: string) => msg.length > 0);
}

async function extractTasteFromChat(userMessages: string[], apiKey: string): Promise<ChatTasteExtraction> {
  const conversation = userMessages.slice(0, 20).join("\n");

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analise as mensagens do usuário sobre cinema e extraia um perfil de gosto completo.

MENSAGENS DO USUÁRIO:
${conversation}

Responda APENAS em JSON:
{
  "taste_note": "Texto curto com perfil de gosto completo incluindo temas, elementos visuais e não-cinematográficos que a pessoa gosta ou não gosta",
  "likes": ["..."],
  "dislikes": ["..."],
  "preferences": ["..."],
  "signals": [
    {"signal_type":"like|dislike|preference|interest|avoid","category":"genre|movie|mood|era|director|actor|theme|style|origin|element|animal|setting|topic","value":"...","confidence":0.0}
  ]
}

Regras:
- Só usar sinais explícitos do que o usuário disse
- Inclua QUALQUER preferência mencionada: animais (cachorros, gatos), temas (guerra, espaço), elementos visuais, cenários, coisas que a pessoa odeia ou não suporta
- Use "avoid" para coisas que a pessoa disse que não gosta/não quer ver
- Se faltar info, arrays vazios
- Nunca inventar preferências não mencionadas`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!resp.ok) {
    return { taste_note: "", likes: [], dislikes: [], preferences: [], signals: [] };
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { taste_note: "", likes: [], dislikes: [], preferences: [], signals: [] };

  try {
    const parsed = JSON.parse(text);
    return {
      taste_note: parsed.taste_note || "",
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      dislikes: Array.isArray(parsed.dislikes) ? parsed.dislikes : [],
      preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
    };
  } catch {
    return { taste_note: "", likes: [], dislikes: [], preferences: [], signals: [] };
  }
}

function buildTasteNoteFromSignals(signals: TasteSignal[]): string {
  const groups: Record<string, { likes: string[]; dislikes: string[]; preferences: string[] }> = {};

  for (const s of signals) {
    const cat = s.category || "general";
    if (!groups[cat]) groups[cat] = { likes: [], dislikes: [], preferences: [] };

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
    if (data.dislikes.length) parts.push(`NÃO gosta: ${data.dislikes.join(", ")}`);
    if (data.preferences.length) parts.push(`prefere: ${data.preferences.join(", ")}`);
    if (parts.length) lines.push(`[${category.toUpperCase()}] ${parts.join(" | ")}`);
  }

  return lines.join("\n");
}

function dedupeSignals(signals: TasteSignal[]): TasteSignal[] {
  const map = new Map<string, TasteSignal>();
  for (const s of signals) {
    if (!s?.value || !s?.category || !s?.signal_type) continue;
    const key = `${s.signal_type}|${s.category}|${normalize(s.value)}`;
    if (!map.has(key)) map.set(key, s);
  }
  return Array.from(map.values());
}

function normalizeSections(sections: any[], tasteNote: string, signals: TasteSignal[]) {
  const liked = new Set<string>();
  const disliked = new Set<string>();
  const preferred = new Set<string>();

  for (const s of signals) {
    const v = normalize(s.value || "");
    if (!v) continue;
    if (s.signal_type === "like" || s.signal_type === "interest") liked.add(v);
    if (s.signal_type === "dislike" || s.signal_type === "avoid") disliked.add(v);
    if (s.signal_type === "preference") preferred.add(v);
  }

  const words = tokenize(tasteNote).filter((w) => w.length > 3);
  for (const w of words.slice(0, 25)) preferred.add(w);

  return sections.map((section: any, sectionIdx: number) => ({
    key: section.key || `section-${sectionIdx + 1}`,
    title: section.title || `Sugestões para você ${sectionIdx + 1}`,
    subtitle: section.subtitle || undefined,
    icon: ["heart", "flame", "compass", "star"].includes(section.icon) ? section.icon : "heart",
    movies: (section.movies || []).map((movie: any, movieIdx: number) => {
      const computed = computeMatchPercent(movie, liked, preferred, disliked);
      return {
        id: movie.id || `${sectionIdx}-${movieIdx}-${normalize(movie.title || "filme")}`,
        title: movie.title,
        year: movie.year,
        rating: Number(movie.rating || 7.0),
        genres: Array.isArray(movie.genres) ? movie.genres : [],
        platforms: Array.isArray(movie.platforms) ? movie.platforms : ["netflix"],
        description: movie.description || "",
        posterUrl: movie.posterUrl || "",
        matchPercent: computed,
      };
    }),
  }));
}

function computeMatchPercent(
  movie: any,
  liked: Set<string>,
  preferred: Set<string>,
  disliked: Set<string>,
): number {
  const text = normalize(`${movie.title || ""} ${(movie.genres || []).join(" ")} ${movie.description || ""}`);

  let score = 58;

  for (const k of liked) {
    if (k && text.includes(k)) score += 12;
  }

  for (const k of preferred) {
    if (k && text.includes(k)) score += 8;
  }

  for (const k of disliked) {
    if (k && text.includes(k)) score -= 16;
  }

  score += deterministicJitter(movie.title || "", 5) - 2;

  if (score < 55) score = 55;
  if (score > 98) score = 98;
  return Math.round(score);
}

function summarizeTasteNote(tasteNote: string): string {
  const lines = tasteNote.split("\n").filter(Boolean).slice(0, 2);
  if (!lines.length) return "Seu perfil está em aprendizado.";
  return lines.join(" ");
}

function tokenize(text: string): string[] {
  const stopwords = new Set([
    "para", "com", "sem", "uma", "uns", "umas", "dos", "das", "que", "por", "mais", "menos", "sobre", "filmes", "filme", "gosto", "quero", "tipo", "como", "ainda", "muito", "pouco", "this", "that", "from", "about", "home", "screen", "update",
  ]);

  return normalize(text)
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !stopwords.has(w));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deterministicJitter(seed: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % Math.max(1, modulo));
}

function repairJson(text: string): string {
  let s = text.trim();
  const opens = { "{": "}", "[": "]" };
  const closes = new Set(["}", "]"]);
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch in opens) stack.push(opens[ch as "{" | "["]);
    else if (closes.has(ch)) stack.pop();
  }

  if (inString) s += '"';
  s = s.replace(/,\s*$/, "");
  while (stack.length) s += stack.pop();

  return s;
}
