-- Allow authenticated users to read other profiles (for friends feature)
CREATE POLICY "Users can read friend profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT CASE 
        WHEN sender_id = auth.uid() THEN receiver_id 
        ELSE sender_id 
      END
      FROM public.friend_invites
      WHERE status = 'accepted'
        AND (sender_id = auth.uid() OR receiver_id = auth.uid())
    )
  );