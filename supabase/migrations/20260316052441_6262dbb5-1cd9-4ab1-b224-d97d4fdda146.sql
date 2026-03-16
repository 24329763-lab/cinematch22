CREATE TABLE IF NOT EXISTS public.friend_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_invite UNIQUE (sender_id, receiver_id)
);

ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invites"
  ON public.friend_invites FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send invites"
  ON public.friend_invites FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receiver can update invite"
  ON public.friend_invites FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid());

CREATE POLICY "Users can delete own invites"
  ON public.friend_invites FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_invite_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid invite status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_invite_status
  BEFORE INSERT OR UPDATE ON public.friend_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invite_status();