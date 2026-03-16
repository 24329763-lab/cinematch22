
-- Add friend_code column
ALTER TABLE public.profiles ADD COLUMN friend_code TEXT UNIQUE;

-- Function to generate a unique 6-char code
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Backfill existing profiles
UPDATE public.profiles SET friend_code = public.generate_friend_code() WHERE friend_code IS NULL;

-- Make it NOT NULL with default for future rows
ALTER TABLE public.profiles ALTER COLUMN friend_code SET DEFAULT public.generate_friend_code();
ALTER TABLE public.profiles ALTER COLUMN friend_code SET NOT NULL;

-- Update handle_new_user to include friend_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, friend_code)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), public.generate_friend_code());
  RETURN new;
END;
$function$;
