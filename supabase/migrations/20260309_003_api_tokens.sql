-- Personal Access Tokens for CLI/agent authentication.
-- Token format: agp_<32 random bytes as hex> (68 chars total).
-- Only the SHA-256 hash is stored; raw token shown once at creation.
CREATE TABLE public.api_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash   text        NOT NULL,
  name         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,

  CONSTRAINT api_tokens_name_length CHECK (char_length(name) BETWEEN 1 AND 100)
);

CREATE INDEX idx_api_tokens_user_id ON public.api_tokens (user_id);
CREATE INDEX idx_api_tokens_token_hash ON public.api_tokens (token_hash) WHERE revoked_at IS NULL;

-- RLS: tokens are private to the owning user
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_tokens_select ON public.api_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY api_tokens_insert ON public.api_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY api_tokens_update ON public.api_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY api_tokens_delete ON public.api_tokens
  FOR DELETE USING (auth.uid() = user_id);
