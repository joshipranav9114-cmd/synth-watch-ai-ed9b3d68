# Community features audit + Supabase migration

## Audit

| Feature | Current storage | Action |
|---|---|---|
| Watchlist | ✅ Supabase (`watchlist`) | Keep as-is |
| AI Assistant threads/messages | ✅ Supabase (`chat_threads`, `chat_messages`) | Keep |
| Profile display name + avatar URL | ✅ Supabase (`profiles`) | Keep |
| Profile **avatar emoji + color** | ❌ localStorage (`profile:<id>`) | Migrate |
| Reviews & ratings | ❌ localStorage (`reviews:<animeId>`) | Migrate |
| Comments (with replies) | ❌ localStorage (`comments:<animeId>`) | Migrate |
| Discussion room messages | ❌ localStorage (`discuss:<animeId>`) | Migrate |
| Reactions (review/comment/message) | ❌ localStorage (`reactions:<type>:<id>`) | Migrate |
| Discussion rooms index | ❌ localStorage (`community:room_index`) | Replace with live aggregation from `discussion_messages` |
| Continue Watching | ⚠️ Not persisted (UI-only mock from top-anime list) | Out of scope — no real progress tracking exists; leave as-is |

## Migration scope

Single migration creating the missing tables + new profile columns, plus a full rewrite of `src/lib/community.ts` to use Supabase. All component UIs stay identical; only the data layer + `useEffect` loading shape change.

### New columns on `profiles`
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji text NOT NULL DEFAULT '⭐',
  ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT 'purple';
```

### New tables

**`anime_reviews`** — one review per (user, anime).
- `id uuid pk`, `user_id uuid → auth.users`, `anime_id text`, `anime_title text`, `rating int 1–10`, `body text`, `created_at`, `updated_at`
- `UNIQUE (user_id, anime_id)` so re-submit upserts
- RLS: select = public (read all), insert/update/delete = `auth.uid() = user_id`

**`anime_comments`** — threaded one-level replies.
- `id`, `user_id`, `anime_id text`, `body text`, `parent_id uuid null → anime_comments(id) ON DELETE CASCADE`, `created_at`
- RLS: select public; insert/delete own

**`discussion_messages`** — chat room messages keyed by `anime_id`.
- `id`, `user_id`, `anime_id text`, `anime_title text`, `anime_image text`, `body text`, `created_at`
- RLS: select public; insert own; no update/delete (chat history)
- `anime_title`/`anime_image` denormalized so the rooms list query needs no join

**`community_reactions`** — polymorphic reactions.
- `id`, `user_id`, `target_type text check in ('review','comment','message')`, `target_id uuid`, `emoji text`, `created_at`
- `UNIQUE (user_id, target_type, target_id)` so each user has one reaction per target (toggle = delete + insert)
- RLS: select public; insert/delete own

All tables get `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated`, `GRANT SELECT … TO anon` (public read), `GRANT ALL … TO service_role`.

### Rooms aggregation
Active rooms = `SELECT anime_id, anime_title, anime_image, count(*) AS message_count, max(created_at) AS last_active FROM discussion_messages GROUP BY anime_id, anime_title, anime_image ORDER BY last_active DESC`. Seed rooms in the Community page remain as a client-side merge until messages exist (existing behavior).

## Code changes

### `src/lib/community.ts` — full rewrite to async Supabase
Every function becomes `async` and returns Promises:
- `getProfile(userId)` → `select` from `profiles`; `saveProfile()` → `update`. Falls back to defaults if row missing.
- `getReviews(animeId)` → `select * from anime_reviews where anime_id = ? join profiles + reactions aggregate`.
- `addReview` → `upsert` on `(user_id, anime_id)`; `deleteReview` → `delete` scoped by id + user.
- `getComments(animeId)` → fetch flat list, group replies client-side (unchanged shape).
- `addComment` / `deleteComment` → straightforward.
- `getMessages(animeId)` → ordered ascending. `addMessage` → insert with denormalized title/image; `upsertRoom` becomes a no-op (rooms derive from messages).
- `getRooms()` → grouped query above.
- `toggleReaction`/`getReactionSummary`/`getUserReaction` → operate on `community_reactions`. Toggle = if same emoji exists, delete; else `upsert (user_id, target_type, target_id)` with new emoji.
- Reactions hydrated alongside reviews/comments/messages via a single follow-up `select … where target_id in (…)` so we don't N+1.

Types stay the same (`Review`, `Comment`, `DiscussionMessage`, `UserProfile`, `ReactionSummary`). Removes `ls()`, `lsSet()`, `uid()`, and `ROOM_INDEX_KEY`.

### Components — minimal touch-ups (UI preserved)
- `AnimeReviews.tsx`, `AnimeComments.tsx`, `_app.community.$animeId.tsx`, `_app.community.tsx`: switch the initial `useState(() => getX(…))` to `useState([])` + `useEffect` that loads from Supabase. Replace synchronous mutation calls with `await`, then re-fetch (or optimistic update). No JSX/UX changes.
- `ReactionBar.tsx`: `handleReact` becomes async; otherwise unchanged.
- `_app.profile.tsx`: `getProfile` becomes async — wrap in `useEffect`. `saveProfile` writes `display_name`, `avatar_emoji`, `avatar_color` directly to `profiles`.
- `UserAvatar.tsx`: no logic changes (it consumes `UserProfile`).

### Backward-compat / data preservation
Old localStorage entries are NOT migrated — they were per-browser anonymous data and there is no reliable mapping to `auth.users`. New tables start empty. The localStorage keys are abandoned (no cleanup needed; they're inert once `community.ts` stops reading them).

## Out of scope
- Realtime subscriptions (can be added later via `supabase.channel`).
- Continue Watching persistence — no UI for marking progress; current mock stays.
- Migrating any pre-existing localStorage rows into Supabase.

## Acceptance
- After migration, posting a review/comment/message from one browser is visible from another browser logged into the same/different account.
- Reactions persist across reload and devices.
- Profile avatar emoji/color persists across devices.
- Watchlist + AI assistant behavior unchanged.
- No remaining `localStorage.getItem`/`setItem` calls in `src/components/Anime*`, `src/components/ReactionBar.tsx`, `src/lib/community.ts`, `src/routes/_app.community*`.

## Report (delivered after implementation)
A table listing: feature → "already Supabase" vs "migrated" → table(s) used.
