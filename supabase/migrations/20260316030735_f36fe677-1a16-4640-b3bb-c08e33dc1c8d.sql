
-- profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  favorite_genres text[] DEFAULT '{}',
  preferred_era text,
  preferred_origin text,
  preferred_mood text,
  platforms text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own conversations" ON public.conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- chat_messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  movie_recommendations jsonb DEFAULT '[]',
  liked boolean,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own messages" ON public.chat_messages FOR ALL TO authenticated USING (
  conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
) WITH CHECK (
  conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
);

-- Validation trigger for role
CREATE OR REPLACE FUNCTION public.validate_chat_message_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role NOT IN ('user', 'assistant') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be user or assistant', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_chat_message_role_trigger
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE PROCEDURE public.validate_chat_message_role();

-- watchlist
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id text NOT NULL,
  title text NOT NULL,
  poster_url text,
  year int,
  rating numeric,
  platforms text[] DEFAULT '{}',
  genres text[] DEFAULT '{}',
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own watchlist" ON public.watchlist FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- watched
CREATE TABLE public.watched (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id text NOT NULL,
  title text NOT NULL,
  poster_url text,
  year int,
  user_rating int,
  platforms text[] DEFAULT '{}',
  genres text[] DEFAULT '{}',
  watched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

ALTER TABLE public.watched ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own watched" ON public.watched FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Validation trigger for user_rating
CREATE OR REPLACE FUNCTION public.validate_user_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_rating IS NOT NULL AND (NEW.user_rating < 1 OR NEW.user_rating > 10) THEN
    RAISE EXCEPTION 'user_rating must be between 1 and 10';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_user_rating_trigger
  BEFORE INSERT OR UPDATE ON public.watched
  FOR EACH ROW EXECUTE PROCEDURE public.validate_user_rating();
