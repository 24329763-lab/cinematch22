import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import OpenAI from 'https://deno.land/x/openai@v4.38.5/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL' ) || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Helper types (should ideally be shared)
type TasteSignal = {
  id: string;
  user_id: string;
  signal_type: 'like' | 'dislike' | 'preference' | 'interest' | 'avoid';
  category: string;
  value: string;
  confidence: number;
  source: string;
  metadata: any;
  created_at: string;
};

type MoodSignal = {
  id: string;
  user_id: string;
  mood_type: string;
  keywords: string[];
  strength: number;
  expires_at: string;
  created_at: string;
};

type Profile = {
  id: string;
  blocked_elements: string[] | null;
  onboarding_complete: boolean;
  taste_bio: string | null;
};

// --- Helper Functions (adapted from existing) ---

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  s = s.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  s = s.replace(/":\s*([}\],])/g, '":null$1\020');
  s = s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  const opens: Record<string, string> = { "{": "}", "[": "]" };
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
    if (ch in opens) stack.push(opens[ch]);
    else if (closes.has(ch)) stack.pop();
  }
  if (inString) s += '"';
  s = s.replace(/,\s*$/, "");
  while (stack.length) s += stack.pop();
  return s;
}

// --- New Helper Function: callTmdbProxy ---
async function callTmdbProxy(path: string, params: Record<string, any>): Promise<any> {
  const tmdbProxyUrl = `${SUPABASE_URL}/functions/v1/tmdb_proxy`;
  const response = await fetch(tmdbProxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // Use Supabase anon key for Edge Function auth
    },
    body: JSON.stringify({ path, params }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`TMDB Proxy Error: ${response.status} - ${JSON.stringify(errorData)}`);
    throw new Error(`TMDB Proxy failed: ${response.statusText}`);
  }
  return response.json();
}

// --- Main Personalize Logic ---
serve(async (req) => {
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch User Profile, Taste Signals, and Mood Signals
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, blocked_elements, onboarding_complete, taste_bio')
      .eq('id', user_id)
      .single();

    if (profileError) throw profileError;
    const profile: Profile = profileData;

    const { data: tasteSignalsData, error: tasteSignalsError } = await supabaseClient
      .from('taste_signals')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (tasteSignalsError) throw tasteSignalsError;
    const tasteSignals: TasteSignal[] = tasteSignalsData;

    const { data: moodSignalsData, error: moodSignalsError } = await supabaseClient
      .from('user_mood_signals')
      .select('*')
      .eq('user_id', user_id)
      .gte('expires_at', new Date().toISOString()); // Only active mood signals

    if (moodSignalsError) throw moodSignalsError;
    const moodSignals: MoodSignal[] = moodSignalsData;

    const blockedElements = profile.blocked_elements || [];

    // 2. Construct LLM Prompt for TMDB Query Generation
    const tasteSummary = tasteSignals.map(s => `${s.signal_type} ${s.category}: ${s.value}`).join(', ');
    const moodSummary = moodSignals.map(m => `${m.mood_type} (${m.keywords?.join(', ') || ''})`).join(', ');

    const llmPrompt = `
      Based on the user's taste profile and current mood, suggest diverse TMDB API discovery parameters.
      Prioritize stable tastes but also consider transient moods. Avoid anything explicitly blocked.

      User ID: ${user_id}
      Taste Profile: ${tasteSummary || 'No specific taste profile yet.'}
      Current Mood: ${moodSummary || 'No active mood.'}
      Blocked Elements: ${blockedElements.join(', ') || 'None.'}

      Suggest up to 5 distinct TMDB API discovery parameter sets. Each set should be a JSON object with 'path' (e.g., '/discover/movie') and 'params' (e.g., { with_genres: '28', sort_by: 'popularity.desc' }).
      Focus on 'with_genres', 'with_keywords', 'with_people' (actor/director IDs), 'primary_release_year', 'vote_average.gte', 'sort_by'.
      Ensure diversity across the 5 sets. Do NOT suggest movies that contain blocked elements.
      Return a JSON array of these parameter sets. Example: [
        { path: '/discover/movie', params: { with_genres: '878', sort_by: 'vote_average.desc' } },
        { path: '/trending/movie/week', params: {} }
      ]
    `;

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // Or another suitable model
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates TMDB API parameters based on user preferences.' },
        { role: 'user', content: llmPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const llmResponseContent = chatCompletion.choices[0].message.content;
    if (!llmResponseContent) throw new Error('LLM did not return content for TMDB queries.');

    const rawTmdbQueries = JSON.parse(repairJson(llmResponseContent));
    const tmdbQueries = Array.isArray(rawTmdbQueries) ? rawTmdbQueries : rawTmdbQueries.queries || [];

    // 3. Execute TMDB Queries and Collect Movies
    let allMovies: any[] = [];
    for (const query of tmdbQueries) {
      try {
        const tmdbResult = await callTmdbProxy(query.path, { language: 'pt-BR', ...query.params });
        allMovies.push(...(tmdbResult.results || []));
      } catch (tmdbError) {
        console.error(`Error calling TMDB proxy for query ${JSON.stringify(query)}:`, tmdbError);
      }
    }

    // Deduplicate movies by ID
    const uniqueMovies = Array.from(new Map(allMovies.map(movie => [movie.id, movie])).values());

    // 4. Apply Hard Filtering (Blocked Elements)
    const filteredMovies = uniqueMovies.filter(movie => {
      const movieText = normalize(`${movie.title || ''} ${movie.overview || ''} ${movie.genres?.map((g: any) => g.name).join(' ')}`);
      return !blockedElements.some(blocked => movieText.includes(normalize(blocked)));
    });

    // 5. Enhance computeMatchPercent (to be defined/adapted based on new data)
    // For now, a placeholder or simplified version
    const likedKeywords = new Set<string>();
    const preferredKeywords = new Set<string>();
    const dislikedKeywords = new Set<string>();

    tasteSignals.forEach(s => {
      const v = normalize(s.value);
      if (s.signal_type === 'like' || s.signal_type === 'interest') likedKeywords.add(v);
      if (s.signal_type === 'dislike') dislikedKeywords.add(v);
      if (s.signal_type === 'preference') preferredKeywords.add(v);
    });

    moodSignals.forEach(m => {
      m.keywords?.forEach(k => preferredKeywords.add(normalize(k)));
      preferredKeywords.add(normalize(m.mood_type));
    });

    const computeMatchPercent = (movie: any): number => {
      const movieText = normalize(`${movie.title || ''} ${movie.overview || ''} ${movie.genres?.map((g: any) => g.name).join(' ')} ${movie.tagline || ''}`);
      let score = 50; // Base score

      for (const k of likedKeywords) {
        if (movieText.includes(k)) score += 10;
      }
      for (const k of preferredKeywords) {
        if (movieText.includes(k)) score += 5;
      }
      for (const k of dislikedKeywords) {
        if (movieText.includes(k)) score -= 15;
      }

      // Add some jitter for variety
      score += deterministicJitter(movie.title || '', 5) - 2;

      // Clamp score
      if (score < 30) score = 30;
      if (score > 99) score = 99;
      return Math.round(score);
    };

    const moviesWithMatch = filteredMovies.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      rating: movie.vote_average ? parseFloat(movie.vote_average.toFixed(1)) : null,
      genres: movie.genres?.map((g: any) => g.name) || [],
      platforms: ['netflix'], // Placeholder, needs actual integration
      description: movie.overview,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      matchPercent: computeMatchPercent(movie ),
    }));

    // 6. Organize Movies into Sections
    const sections = [
      { key: 'trending', title: 'Em Alta Agora', subtitle: 'Filmes populares no momento', icon: 'flame', movies: [] },
      { key: 'for_you', title: 'Feito Para Você', subtitle: 'Baseado no seu gosto e humor', icon: 'star', movies: [] },
      { key: 'discovery', title: 'Explore Novidades', subtitle: 'Sugestões para expandir seu horizonte', icon: 'compass', movies: [] },
    ];

    // Simple distribution for now, can be more sophisticated
    moviesWithMatch.sort((a, b) => b.matchPercent - a.matchPercent);

    sections[0].movies = moviesWithMatch.slice(0, 10); // Top 10 for trending
    sections[1].movies = moviesWithMatch.slice(10, 20); // Next 10 for personalized
    sections[2].movies = moviesWithMatch.slice(20, 30); // Next 10 for discovery

    // Summarize taste for the profile bio
    const currentTasteBio = profile.taste_bio || 'Seu perfil está em aprendizado.';
    const newTasteBio = summarizeTasteNote(tasteSignals);
    if (newTasteBio !== currentTasteBio) {
      await supabaseClient.from('profiles').update({ taste_bio: newTasteBio }).eq('id', user_id);
    }

    return new Response(JSON.stringify(sections), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Personalize Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Simplified summarizeTasteNote for now, can be enhanced
function summarizeTasteNote(signals: TasteSignal[]): string {
  const likedGenres = signals.filter(s => s.signal_type === 'like' && s.category === 'genre').map(s => s.value);
  const likedActors = signals.filter(s => s.signal_type === 'like' && s.category === 'actor').map(s => s.value);
  const likedThemes = signals.filter(s => s.signal_type === 'like' && s.category === 'theme').map(s => s.value);

  let summary = '';
  if (likedGenres.length > 0) summary += `Gosta de ${likedGenres.join(', ')}. `;
  if (likedActors.length > 0) summary += `Adora filmes com ${likedActors.join(', ')}. `;
  if (likedThemes.length > 0) summary += `Interessado em temas como ${likedThemes.join(', ')}. `;

  return summary || 'Seu perfil está em aprendizado.';
}
