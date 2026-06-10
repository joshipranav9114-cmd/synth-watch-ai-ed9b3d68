# Fix: Install missing `on_auth_user_created` trigger

## Problem
`public.handle_new_user()` exists but no trigger fires it. New auth users (e.g. `test@test.com`) get no `profiles` row until the client-side `ensureProfile()` upsert runs — which only happens after email confirmation + successful login.

## Fix
Run a single migration that creates the trigger on `auth.users`. No code changes, no schema changes to `profiles`, no edits to the existing function.

### Migration SQL
```sql
-- Ensure trigger does not already exist (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Fire handle_new_user() after every new auth.users row
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profile rows for any existing auth users that don't have one
-- (e.g. test@test.com). Existing profiles are preserved by ON CONFLICT in the function.
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

## How it works
- `auth.users.id` is a UUID (PK). `public.profiles.id` already stores the same UUID (existing schema). The function inserts `NEW.id` into `profiles.id`, linking them 1:1.
- The trigger fires `AFTER INSERT` on `auth.users` for each row, immediately after Supabase Auth creates the user — before the client even receives the signup response, and well before first login or email confirmation.
- `handle_new_user()` runs as `SECURITY DEFINER`, so it can write to `public.profiles` regardless of the requester's RLS context.
- It derives `display_name` from metadata (`display_name` → `full_name` → `name`) and falls back to the email local-part.
- It derives `avatar_url` from `avatar_url` or `picture` metadata (set by Google OAuth).
- `created_at` / `updated_at` use the table defaults (`now()`).
- The `ON CONFLICT (id) DO UPDATE` clause in the function preserves existing profile values — it only fills in NULLs — so re-running or backfilling is safe and won't clobber user edits.

## Verification (after migration runs)
1. Confirm trigger exists:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
   ```
2. Confirm backfill: every `auth.users.id` now has a matching `profiles.id` (including `test@test.com`).
3. New signup → row appears in `profiles` instantly, independent of email confirmation or login.

## Out of scope
- No changes to `profiles` schema, RLS, or grants (already correct).
- No changes to `src/lib/auth.tsx` — the client `ensureProfile()` upsert stays as a safety net.
- No changes to email confirmation settings.
