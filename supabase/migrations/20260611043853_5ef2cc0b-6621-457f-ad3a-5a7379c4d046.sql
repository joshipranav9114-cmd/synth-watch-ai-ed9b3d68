
CREATE TABLE public.watch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  anime_title text NOT NULL,
  anime_image text NOT NULL,
  episode int NOT NULL DEFAULT 1,
  progress int NOT NULL DEFAULT 0,
  duration_seconds int,
  position_seconds int,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, anime_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_progress TO service_role;

ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own progress" ON public.watch_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.watch_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.watch_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own progress" ON public.watch_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX watch_progress_user_recent_idx
  ON public.watch_progress (user_id, last_watched_at DESC);

CREATE TRIGGER set_watch_progress_updated_at
  BEFORE UPDATE ON public.watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
