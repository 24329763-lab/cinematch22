
-- Invisible taste bank: stores all behavioral signals about user preferences
CREATE TABLE public.taste_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- 'like', 'dislike', 'preference', 'interest', 'avoid'
  category TEXT NOT NULL,    -- 'genre', 'movie', 'mood', 'era', 'director', 'actor', 'theme', 'style'
  value TEXT NOT NULL,       -- the actual preference value e.g. 'horror', 'Christopher Nolan'
  confidence REAL NOT NULL DEFAULT 0.7, -- 0-1 how confident we are
  source TEXT NOT NULL DEFAULT 'chat', -- 'chat', 'watchlist', 'rating', 'watched', 'profile'
  metadata JSONB DEFAULT '{}'::jsonb,  -- extra context
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cached personalized home recommendations
CREATE TABLE public.home_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of {key, title, subtitle, icon, movies[]}
  taste_summary TEXT, -- AI-generated summary of user taste
  generated_at TIMESTAMPTZ DEFAULT now(),
  signals_count INTEGER DEFAULT 0, -- how many signals were used to generate
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.taste_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own taste signals" ON public.taste_signals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own taste signals" ON public.taste_signals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own home recs" ON public.home_recommendations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service can manage home recs" ON public.home_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow edge functions (service role) to insert taste signals
CREATE POLICY "Service can manage taste signals" ON public.taste_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
