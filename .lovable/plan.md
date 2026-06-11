## Continue Watching — Real Persistence

Replace the mock Continue Watching (currently derived from `useFeaturedAnime` with `i % 12` episodes and pseudo-random progress) with real per-user progress backed by Supabase.

### 1. Database — new table `watch_progress`

```sql
CREATE TABLE public.watch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  anime_title text NOT NULL,
  anime_image text NOT NULL,
  episode int NOT NULL DEFAULT 1,
  progress int NOT NULL DEFAULT 0,          -- 0..100
  duration_seconds int,                      -- optional, for "Xm left"
  position_seconds int,                      -- optional, exact resume point
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, anime_id)
);
CREATE INDEX ON public.watch_progress (user_id, last_watched_at DESC);
```

- GRANT to `authenticated` + `service_role` (no `anon`).
- Enable RLS. Policies: `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE.
- `updated_at` trigger using existing `public.set_updated_at()`.

### 2. Data layer — `src/lib/watch-progress.ts` (new)

- `getContinueWatching(userId, limit=20)` — select * ordered by `last_watched_at desc`.
- `getProgressFor(userId, animeId)` — single row or null (used by detail page to resume).
- `upsertProgress({ animeId, animeTitle, animeImage, episode, progress, duration_seconds?, position_seconds? })` — upsert on `(user_id, anime_id)`, bumps `last_watched_at = now()`. Drops the row once `progress >= 95` and `episode === total` (optional — keep simple: just keep latest).
- `clearProgress(animeId)` — delete one row (for a "Remove" affordance, optional UI).
- React Query keys: `["watch-progress", userId]`, `["watch-progress", userId, animeId]`.

### 3. Auto-update when user "watches"

There is no real video player — the closest action is clicking **Watch on {platform}** on the anime detail page, which opens an external streaming site. Wire that click to record progress:

- On click of the primary Watch button in `src/routes/_app.anime.$id.tsx`, call `upsertProgress` with `episode = max(currentResume.episode, 1)` and `progress = max(currentResume.progress, 5)` (so it appears in Continue Watching immediately) before/while the new tab opens.
- Also call `upsertProgress` from the Hero Carousel "Resume" CTA and any other "Play" entry point on the detail screen, so any "watch intent" counts.
- Detail page loads existing progress on mount → shows `Resume from EP X` instead of `Watch` when a row exists.

This satisfies "automatically update when a user watches an episode" within the limits of an app that does not host video. A note will be included in the UI copy ("Marked as watching") so the behavior is predictable.

### 4. UI — keep existing design

- `src/components/ContinueWatching.tsx`: accept `items: WatchProgressRow[]` (with joined anime metadata already denormalized on the row). Same card layout, same gradient, same play button, same progress bar. Replace fake `ep`/`progress` with real `row.episode` / `row.progress`. "Xm left" uses `duration_seconds` when present, else falls back to `Math.round((100-progress)/100 * 24)` minutes.
- `src/routes/_app.home.tsx`: fetch via `useQuery(["watch-progress", user.id])`; pass results to `<ContinueWatching items={...} />`. Hide the section (or show a friendly empty state card linking to Browse) when the user has no rows. Resume CTA in the header points to the most recent row's anime.
- `src/routes/_app.continue-watching.tsx`: same swap — render real rows in the existing card grid, keep skeletons, keep animations. Add a subtle "Remove" button on long-press/hover (optional; default off to keep UI identical).
- `src/routes/_app.anime.$id.tsx`: when a progress row exists, primary button label becomes `Resume EP {episode}` and the Watch click records progress before opening the external URL.

### 5. Files touched

- **New migration** `supabase/migrations/<ts>_watch_progress.sql` — table, grants, RLS, trigger, index.
- **New** `src/lib/watch-progress.ts` — query/mutation helpers.
- **Edit** `src/components/ContinueWatching.tsx` — accept real rows; same visual design.
- **Edit** `src/routes/_app.home.tsx` — load from Supabase, pass to ContinueWatching, point Resume CTA at the most recent anime.
- **Edit** `src/routes/_app.continue-watching.tsx` — load real rows; keep card design and skeletons.
- **Edit** `src/routes/_app.anime.$id.tsx` — read current progress; record progress on Watch / Resume click; relabel primary button when resuming.
- Regenerated `src/integrations/supabase/types.ts` (automatic after migration approval).

### Out of scope

- Real in-app video playback / scrubbing.
- Per-episode history (only the latest episode per anime is tracked; matches the current single-card-per-anime UI).
- Background sync / realtime — React Query refetch on focus is enough.
