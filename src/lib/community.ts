/**
 * Community data layer — backed by Supabase.
 * Tables: anime_reviews, anime_comments, discussion_messages, community_reactions, profiles.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AvatarEmoji =
  | "🦊" | "🐼" | "🐉" | "⚡" | "🌸" | "🔥" | "🌙" | "⭐" | "🎭" | "💎"
  | "🌊" | "🗡️" | "🧿" | "🦋" | "🎌";

export type AvatarColor =
  | "purple" | "cyan" | "pink" | "orange" | "blue" | "green" | "red";

export const AVATAR_COLORS: Record<AvatarColor, string> = {
  purple: "from-violet-600 to-purple-800",
  cyan:   "from-cyan-500 to-teal-700",
  pink:   "from-pink-500 to-rose-700",
  orange: "from-orange-500 to-amber-700",
  blue:   "from-blue-500 to-indigo-700",
  green:  "from-emerald-500 to-green-700",
  red:    "from-red-500 to-rose-800",
};

export const AVATAR_EMOJIS: AvatarEmoji[] = [
  "🦊","🐼","🐉","⚡","🌸","🔥","🌙","⭐","🎭","💎","🌊","🗡️","🧿","🦋","🎌",
];

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_emoji: AvatarEmoji;
  avatar_color: AvatarColor;
}

export interface Review {
  id: string;
  user_id: string;
  anime_id: string;
  anime_title: string;
  rating: number;          // 1-10
  body: string;
  created_at: string;
  profile: UserProfile;
  reactions: ReactionSummary[];
  user_reaction: string | null;
}

export interface Comment {
  id: string;
  user_id: string;
  anime_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  profile: UserProfile;
  reactions: ReactionSummary[];
  user_reaction: string | null;
  replies?: Comment[];
}

export interface DiscussionMessage {
  id: string;
  user_id: string;
  anime_id: string;
  body: string;
  created_at: string;
  profile: UserProfile;
  reactions: ReactionSummary[];
  user_reaction: string | null;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
}

export const REACTION_EMOJIS = ["🔥","❤️","😂","😭","🤯","👏","💀","✨"];

type ReactTarget = "review" | "comment" | "message";

export interface RoomSummary {
  anime_id: string;
  anime_title: string;
  anime_image: string;
  message_count: number;
  last_active: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
};

function profileFrom(row: ProfileRow | null, fallbackId: string): UserProfile {
  return {
    id: row?.id ?? fallbackId,
    display_name: row?.display_name ?? "Anon",
    avatar_emoji: (row?.avatar_emoji as AvatarEmoji) || "⭐",
    avatar_color: (row?.avatar_color as AvatarColor) || "purple",
  };
}

async function hydrateReactions(
  type: ReactTarget,
  ids: string[],
): Promise<Map<string, { reactions: ReactionSummary[]; user_reaction: string | null }>> {
  const out = new Map<string, { reactions: ReactionSummary[]; user_reaction: string | null }>();
  if (!ids.length) return out;
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id ?? null;
  const { data, error } = await supabase
    .from("community_reactions")
    .select("target_id, emoji, user_id")
    .eq("target_type", type)
    .in("target_id", ids);
  if (error) { console.error("[community] hydrateReactions:", error); return out; }
  const grouped = new Map<string, { counts: Record<string, number>; userEmoji: string | null }>();
  for (const id of ids) grouped.set(id, { counts: {}, userEmoji: null });
  for (const row of data ?? []) {
    const g = grouped.get(row.target_id as string);
    if (!g) continue;
    g.counts[row.emoji as string] = (g.counts[row.emoji as string] ?? 0) + 1;
    if (currentUserId && row.user_id === currentUserId) g.userEmoji = row.emoji as string;
  }
  for (const [id, g] of grouped) {
    const reactions = Object.entries(g.counts)
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count);
    out.set(id, { reactions, user_reaction: g.userEmoji });
  }
  return out;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_emoji, avatar_color")
    .eq("id", userId)
    .maybeSingle();
  if (error) console.error("[community] getProfile:", error);
  return profileFrom(data as ProfileRow | null, userId);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: profile.display_name,
      avatar_emoji: profile.avatar_emoji,
      avatar_color: profile.avatar_color,
    })
    .eq("id", profile.id);
  if (error) console.error("[community] saveProfile:", error);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviews(animeId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("anime_reviews")
    .select("id, user_id, anime_id, anime_title, rating, body, created_at, profiles:user_id (id, display_name, avatar_emoji, avatar_color)")
    .eq("anime_id", animeId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[community] getReviews:", error); return []; }
  const rows = (data ?? []) as unknown as Array<{
    id: string; user_id: string; anime_id: string; anime_title: string;
    rating: number; body: string; created_at: string;
    profiles: ProfileRow | null;
  }>;
  const rmap = await hydrateReactions("review", rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id, user_id: r.user_id, anime_id: r.anime_id, anime_title: r.anime_title,
    rating: r.rating, body: r.body, created_at: r.created_at,
    profile: profileFrom(r.profiles, r.user_id),
    reactions: rmap.get(r.id)?.reactions ?? [],
    user_reaction: rmap.get(r.id)?.user_reaction ?? null,
  }));
}

export async function addReview(
  animeId: string,
  animeTitle: string,
  userId: string,
  _profile: UserProfile,
  rating: number,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from("anime_reviews")
    .upsert(
      { user_id: userId, anime_id: animeId, anime_title: animeTitle, rating, body },
      { onConflict: "user_id,anime_id" },
    );
  if (error) console.error("[community] addReview:", error);
}

export async function deleteReview(_animeId: string, reviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("anime_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", userId);
  if (error) console.error("[community] deleteReview:", error);
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(animeId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("anime_comments")
    .select("id, user_id, anime_id, body, parent_id, created_at, profiles:user_id (id, display_name, avatar_emoji, avatar_color)")
    .eq("anime_id", animeId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[community] getComments:", error); return []; }
  const rows = (data ?? []) as unknown as Array<{
    id: string; user_id: string; anime_id: string; body: string;
    parent_id: string | null; created_at: string; profiles: ProfileRow | null;
  }>;
  const rmap = await hydrateReactions("comment", rows.map((r) => r.id));
  const all: Comment[] = rows.map((c) => ({
    id: c.id, user_id: c.user_id, anime_id: c.anime_id, body: c.body,
    parent_id: c.parent_id, created_at: c.created_at,
    profile: profileFrom(c.profiles, c.user_id),
    reactions: rmap.get(c.id)?.reactions ?? [],
    user_reaction: rmap.get(c.id)?.user_reaction ?? null,
  }));
  const roots = all.filter((c) => !c.parent_id);
  const replies = all.filter((c) => c.parent_id);
  // Replies oldest-first under each parent
  return roots.map((r) => ({
    ...r,
    replies: replies
      .filter((rep) => rep.parent_id === r.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  }));
}

export async function addComment(
  animeId: string,
  userId: string,
  _profile: UserProfile,
  body: string,
  parentId: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("anime_comments")
    .insert({ user_id: userId, anime_id: animeId, body, parent_id: parentId });
  if (error) console.error("[community] addComment:", error);
}

export async function deleteComment(_animeId: string, commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("anime_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) console.error("[community] deleteComment:", error);
}

// ─── Discussion messages ──────────────────────────────────────────────────────

export async function getMessages(animeId: string): Promise<DiscussionMessage[]> {
  const { data, error } = await supabase
    .from("discussion_messages")
    .select("id, user_id, anime_id, body, created_at, profiles:user_id (id, display_name, avatar_emoji, avatar_color)")
    .eq("anime_id", animeId)
    .order("created_at", { ascending: true });
  if (error) { console.error("[community] getMessages:", error); return []; }
  const rows = (data ?? []) as unknown as Array<{
    id: string; user_id: string; anime_id: string; body: string;
    created_at: string; profiles: ProfileRow | null;
  }>;
  const rmap = await hydrateReactions("message", rows.map((r) => r.id));
  return rows.map((m) => ({
    id: m.id, user_id: m.user_id, anime_id: m.anime_id, body: m.body, created_at: m.created_at,
    profile: profileFrom(m.profiles, m.user_id),
    reactions: rmap.get(m.id)?.reactions ?? [],
    user_reaction: rmap.get(m.id)?.user_reaction ?? null,
  }));
}

export async function addMessage(
  animeId: string,
  userId: string,
  _profile: UserProfile,
  body: string,
  animeTitle = "",
  animeImage: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("discussion_messages")
    .insert({
      user_id: userId,
      anime_id: animeId,
      anime_title: animeTitle,
      anime_image: animeImage,
      body,
    });
  if (error) console.error("[community] addMessage:", error);
}

// Rooms are derived from discussion_messages — kept as no-op for compatibility.
export async function upsertRoom(_anime_id: string, _anime_title: string, _anime_image: string): Promise<void> {
  // no-op; aggregation happens in getRooms()
}

export async function getRooms(): Promise<RoomSummary[]> {
  const { data, error } = await supabase
    .from("discussion_messages")
    .select("anime_id, anime_title, anime_image, created_at")
    .order("created_at", { ascending: false });
  if (error) { console.error("[community] getRooms:", error); return []; }
  const map = new Map<string, RoomSummary>();
  for (const row of (data ?? []) as Array<{ anime_id: string; anime_title: string; anime_image: string | null; created_at: string }>) {
    const existing = map.get(row.anime_id);
    if (existing) {
      existing.message_count++;
      // first row is most recent due to ordering
    } else {
      map.set(row.anime_id, {
        anime_id: row.anime_id,
        anime_title: row.anime_title,
        anime_image: row.anime_image ?? "",
        message_count: 1,
        last_active: row.created_at,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime(),
  );
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(
  type: ReactTarget,
  id: string,
  userId: string,
  emoji: string,
): Promise<{ reactions: ReactionSummary[]; user_reaction: string | null }> {
  // Find current reaction for this user on this target
  const { data: existing, error: selErr } = await supabase
    .from("community_reactions")
    .select("id, emoji")
    .eq("user_id", userId)
    .eq("target_type", type)
    .eq("target_id", id)
    .maybeSingle();
  if (selErr) console.error("[community] toggleReaction select:", selErr);

  if (existing && existing.emoji === emoji) {
    await supabase.from("community_reactions").delete().eq("id", existing.id);
  } else if (existing) {
    await supabase.from("community_reactions").update({ emoji }).eq("id", existing.id);
  } else {
    await supabase.from("community_reactions").insert({
      user_id: userId, target_type: type, target_id: id, emoji,
    });
  }

  const summaryMap = await hydrateReactions(type, [id]);
  return summaryMap.get(id) ?? { reactions: [], user_reaction: null };
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────

export async function getAnimeRatingStats(animeId: string): Promise<{
  average: number;
  total: number;
  distribution: number[];
}> {
  const { data, error } = await supabase
    .from("anime_reviews")
    .select("rating")
    .eq("anime_id", animeId);
  if (error) { console.error("[community] getAnimeRatingStats:", error); }
  const rows = (data ?? []) as Array<{ rating: number }>;
  if (!rows.length) return { average: 0, total: 0, distribution: Array(10).fill(0) };
  const distribution = Array(10).fill(0);
  rows.forEach((r) => { if (r.rating >= 1 && r.rating <= 10) distribution[r.rating - 1]++; });
  const average = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
  return { average: Math.round(average * 10) / 10, total: rows.length, distribution };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
