import { supabase } from "@/integrations/supabase/client";

export type WatchProgress = {
  id: string;
  user_id: string;
  anime_id: string;
  anime_title: string;
  anime_image: string;
  episode: number;
  progress: number;
  duration_seconds: number | null;
  position_seconds: number | null;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
};

export async function getContinueWatching(userId: string, limit = 20): Promise<WatchProgress[]> {
  const { data, error } = await supabase
    .from("watch_progress")
    .select("*")
    .eq("user_id", userId)
    .order("last_watched_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WatchProgress[];
}

export async function getProgressFor(userId: string, animeId: string): Promise<WatchProgress | null> {
  const { data, error } = await supabase
    .from("watch_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("anime_id", animeId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as WatchProgress | null;
}

export async function upsertProgress(params: {
  userId: string;
  animeId: string;
  animeTitle: string;
  animeImage: string;
  episode?: number;
  progress?: number;
  duration_seconds?: number | null;
  position_seconds?: number | null;
}): Promise<void> {
  const existing = await getProgressFor(params.userId, params.animeId);
  const episode = Math.max(params.episode ?? 1, existing?.episode ?? 1);
  const progress = Math.min(100, Math.max(params.progress ?? 5, existing?.progress ?? 0));
  const { error } = await supabase
    .from("watch_progress")
    .upsert(
      {
        user_id: params.userId,
        anime_id: params.animeId,
        anime_title: params.animeTitle,
        anime_image: params.animeImage,
        episode,
        progress,
        duration_seconds: params.duration_seconds ?? existing?.duration_seconds ?? null,
        position_seconds: params.position_seconds ?? existing?.position_seconds ?? null,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,anime_id" },
    );
  if (error) throw error;
}

export async function clearProgress(userId: string, animeId: string): Promise<void> {
  const { error } = await supabase
    .from("watch_progress")
    .delete()
    .eq("user_id", userId)
    .eq("anime_id", animeId);
  if (error) throw error;
}