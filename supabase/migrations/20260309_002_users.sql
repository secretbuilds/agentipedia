-- Public user profiles mirroring X/Twitter identity data.
-- id references auth.users(id) so RLS can use auth.uid() directly.
CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  x_user_id      text        NOT NULL UNIQUE,
  x_handle       text        NOT NULL,
  x_display_name text        NOT NULL,
  x_avatar_url   text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_x_handle ON public.users (x_handle);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON public.users
  FOR SELECT USING (true);

CREATE POLICY users_insert ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY users_update ON public.users
  FOR UPDATE USING (auth.uid() = id);
