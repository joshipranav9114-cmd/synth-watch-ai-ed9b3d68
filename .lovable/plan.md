# Fix: Discussion/Reviews tab shows nothing despite stored rows

## Root cause (not what was suspected)

The `anime_id` values are stored correctly. Existing rows on `anime_comments` for the current page (`/anime/51553`) hold `anime_id = '51553'` (text), which matches the route param exactly — no string/number mismatch.

The real failure is in the embedded profile join used by `getComments` / `getReviews` in `src/lib/community.ts`:

```ts
.select("…, profiles:user_id (id, display_name, avatar_emoji, avatar_color)")
```

Console shows PostgREST error `PGRST200: Could not find a relationship between 'anime_comments'/'anime_reviews' and 'user_id' in the schema cache`. The query returns `[]`, so the UI renders "No comments yet" / "No reviews".

Reason: `anime_comments.user_id` and `anime_reviews.user_id` only have FKs to `auth.users(id)`. PostgREST can't auto-resolve an embed to `public.profiles` because no FK to `profiles` exists. The profile-page counts work because they don't embed — they just call `count: exact`.

## Fix

Add a second FK on each affected table pointing `user_id → public.profiles(id)`. Profiles are created 1:1 with auth users by the existing `handle_new_user` trigger, so this is safe.

**Migration** (new file `supabase/migrations/<ts>_community_profile_fks.sql`):

```sql
ALTER TABLE public.anime_comments
  ADD CONSTRAINT anime_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.anime_reviews
  ADD CONSTRAINT anime_reviews_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.discussion_messages
  ADD CONSTRAINT discussion_messages_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

After the migration, the existing `profiles:user_id (...)` embeds resolve and the queries return rows. No client code changes needed; UI untouched.

## Verification

- Reload `/anime/51553` → existing comment and review render.
- Post a new comment/review → appears immediately.
- Profile page stat counts stay the same.

## Files

- New: `supabase/migrations/<timestamp>_community_profile_fks.sql`
- No other files changed.
