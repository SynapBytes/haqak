
CREATE TABLE public.fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own tokens"
ON public.fcm_tokens FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tokens"
ON public.fcm_tokens FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
ON public.fcm_tokens FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
ON public.fcm_tokens FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all tokens"
ON public.fcm_tokens FOR SELECT TO service_role
USING (true);
