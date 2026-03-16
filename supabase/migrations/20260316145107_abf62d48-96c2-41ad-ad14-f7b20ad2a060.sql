-- Add taste_bio to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS taste_bio TEXT DEFAULT '';

-- Add a policy so any authenticated user can look up profiles by friend_code (limited fields via the query)
CREATE POLICY "Anyone can lookup profiles by friend_code"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Drop the overly restrictive read policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read friend profiles" ON public.profiles;