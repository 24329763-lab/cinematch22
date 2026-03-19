-- Recreate the trigger that was lost during remix
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profile for existing user who signed up without trigger
INSERT INTO public.profiles (user_id, display_name, friend_code)
SELECT id, coalesce(raw_user_meta_data->>'full_name', email), public.generate_friend_code()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT DO NOTHING;