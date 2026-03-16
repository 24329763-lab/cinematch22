-- Allow friends to read each other's watchlists for Party mode
CREATE POLICY "Friends can read watchlists"
  ON public.watchlist FOR SELECT TO authenticated
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