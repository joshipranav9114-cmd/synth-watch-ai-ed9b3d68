
-- Profile avatar customization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji text NOT NULL DEFAULT '⭐',
  ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT 'purple';

-- updated_at trigger helper (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ anime_reviews ============
CREATE TABLE public.anime_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  anime_title text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 10),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, anime_id)
);
GRANT SELECT ON public.anime_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anime_reviews TO authenticated;
GRANT ALL ON public.anime_reviews TO service_role;
ALTER TABLE public.anime_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select ON public.anime_reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert ON public.anime_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY reviews_update ON public.anime_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY reviews_delete ON public.anime_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX anime_reviews_anime_idx ON public.anime_reviews(anime_id, created_at DESC);
CREATE TRIGGER anime_reviews_updated_at BEFORE UPDATE ON public.anime_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ anime_comments ============
CREATE TABLE public.anime_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES public.anime_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.anime_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.anime_comments TO authenticated;
GRANT ALL ON public.anime_comments TO service_role;
ALTER TABLE public.anime_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_select ON public.anime_comments FOR SELECT USING (true);
CREATE POLICY comments_insert ON public.anime_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY comments_delete ON public.anime_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX anime_comments_anime_idx ON public.anime_comments(anime_id, created_at DESC);

-- ============ discussion_messages ============
CREATE TABLE public.discussion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  anime_title text NOT NULL,
  anime_image text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discussion_messages TO anon;
GRANT SELECT, INSERT ON public.discussion_messages TO authenticated;
GRANT ALL ON public.discussion_messages TO service_role;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select ON public.discussion_messages FOR SELECT USING (true);
CREATE POLICY messages_insert ON public.discussion_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX discussion_messages_anime_idx ON public.discussion_messages(anime_id, created_at);

-- ============ community_reactions ============
CREATE TABLE public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('review','comment','message')),
  target_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
GRANT SELECT ON public.community_reactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_reactions TO authenticated;
GRANT ALL ON public.community_reactions TO service_role;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY reactions_select ON public.community_reactions FOR SELECT USING (true);
CREATE POLICY reactions_insert ON public.community_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY reactions_update ON public.community_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY reactions_delete ON public.community_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX community_reactions_target_idx ON public.community_reactions(target_type, target_id);
