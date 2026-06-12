## Real profile stats from Supabase

Replace hardcoded numbers in `src/routes/_app.profile.tsx` with live counts.

### Data fetching

Add a `useQuery` keyed by `["profile-stats", user.id]`, enabled only when `user` exists. Run four parallel head-count queries via `Promise.all`:

```ts
supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_id", user.id)
supabase.from("watch_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id)
supabase.from("anime_reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id)
supabase.from("anime_comments").select("*", { count: "exact", head: true }).eq("user_id", user.id)
```

Return `{ watched, episodes, reviews, comments }` from `count` fields.

### JSX swaps (no layout changes)

- "Anime Watched" `248` → `stats.watched`
- "Episodes" `5,102` → `stats.episodes` (from `watch_progress` row count, per your selection)
- "Reviews" `0` → `stats.reviews`
- "Comments" `0` → `stats.comments`

### Loading state

While `isLoading`, render `<Skeleton className="h-7 w-12 mx-auto" />` in place of each number node. All wrapper classes (`text-2xl font-extrabold`, neon colors, glass cards, grid) stay exactly as-is.

### Files

- Edit `src/routes/_app.profile.tsx` — add query + skeleton; swap four values.
- No DB migrations, no other files touched.
