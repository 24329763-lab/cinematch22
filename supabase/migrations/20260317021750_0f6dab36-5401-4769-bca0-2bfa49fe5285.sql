
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_elements text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Create user_mood_signals table
CREATE TABLE IF NOT EXISTS public.user_mood_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood text NOT NULL,
  intensity real NOT NULL DEFAULT 0.5,
  source text NOT NULL DEFAULT 'chat',
  context text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_mood_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mood signals"
ON public.user_mood_signals FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mood signals"
ON public.user_mood_signals FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can manage mood signals"
ON public.user_mood_signals FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX idx_user_mood_signals_user_id ON public.user_mood_signals (user_id);
CREATE INDEX idx_user_mood_signals_created_at ON public.user_mood_signals (created_at DESC);
