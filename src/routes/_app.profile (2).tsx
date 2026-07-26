import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Settings, Shield, Palette, Star, MessageSquare, Lock } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/UserAvatar";
import { getProfile, saveProfile, type UserProfile } from "@/lib/community";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

const GENRE_BADGE: Record<string, string> = {
  Action: "Shonen Warrior",
  Romance: "Hopeless Romantic",
  Horror: "Dark Soul",
  Comedy: "Laugh Master",
  Fantasy: "Isekai Traveller",
  "Sci-Fi": "Cyber Mind",
  "Slice of Life": "Chill Watcher",
  Mystery: "Detective Eye",
  Sports: "Peak Performer",
};
const DEFAULT_BADGE = "Anime Explorer";

type Achievement = {
  id: string;
  icon: string;
  label: string;
  unlocked: (s: { watchlist: number; progress: number; reviews: number; comments: number }) => boolean;
  progress: (s: { watchlist: number; progress: number; reviews: number; comments: number }) => string;
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-watch",
    icon: "🌸",
    label: "First Watch",
    unlocked: (s) => s.watchlist >= 1,
    progress: (s) => `${Math.min(s.watchlist, 1)}/1 watched`,
  },
  {
    id: "binge-mode",
    icon: "🔥",
    label: "Binge Mode",
    unlocked: (s) => s.progress >= 5,
    progress: (s) => `${Math.min(s.progress, 5)}/5 tracked`,
  },
  {
    id: "seasonal-fan",
    icon: "⭐",
    label: "Seasonal Fan",
    unlocked: (s) => s.watchlist >= 10,
    progress: (s) => `${Math.min(s.watchlist, 10)}/10 watched`,
  },
  {
    id: "critic",
    icon: "📝",
    label: "Critic",
    unlocked: (s) => s.reviews >= 1,
    progress: (s) => `${Math.min(s.reviews, 1)}/1 review`,
  },
  {
    id: "community-voice",
    icon: "💬",
    label: "Community Voice",
    unlocked: (s) => s.comments >= 3,
    progress: (s) => `${Math.min(s.comments, 3)}/3 comments`,
  },
  {
    id: "top-reviewer",
    icon: "🏆",
    label: "Top Reviewer",
    unlocked: (s) => s.reviews >= 5,
    progress: (s) => `${Math.min(s.reviews, 5)}/5 reviews`,
  },
  {
    id: "aniverse-legend",
    icon: "👑",
    label: "AniVerse Legend",
    unlocked: (s) => s.watchlist >= 50,
    progress: (s) => `${Math.min(s.watchlist, 50)}/50 watched`,
  },
];

function Profile() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const emailName = user?.email?.split("@")[0] ?? "Pilot";

  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id ?? "guest",
    display_name: emailName,
    avatar_emoji: "⭐",
    avatar_color: "purple",
    avatar_url: null,
  });

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getProfile(user.id).then((p) => {
      if (!alive) return;
      const display = p.display_name === "Anon" ? emailName : p.display_name;
      if (p.display_name === "Anon") void saveProfile({ ...p, display_name: emailName });
      setProfile({ ...p, display_name: display });
    });
    return () => { alive = false; };
  }, [user, emailName]);

  // Hydrate display name from the profiles table (source of truth)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error("[profile] load failed:", error); return; }
        if (!data) return;
        setProfile((prev) => {
          const nextName = (data.display_name as string | null) ?? prev.display_name;
          // Never overwrite avatar_url with null — keep existing if Supabase returns null
          const nextUrl  = (data.avatar_url  as string | null) ?? prev.avatar_url ?? null;
          if (prev.display_name === nextName && (prev.avatar_url ?? null) === nextUrl) return prev;
          const next = { ...prev, display_name: nextName, avatar_url: nextUrl };
          void saveProfile(next);
          return next;
        });
      });
    return () => { cancelled = true; };
  }, [user]);

  const handleProfileUpdate = async (next: UserProfile) => {
    setProfile(next);
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: next.display_name, avatar_url: next.avatar_url ?? null })
      .eq("id", user.id);
    if (error) {
      console.error("[profile] save failed:", error);
      toast.error("Couldn't save profile changes");
    }
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    enabled: !!user,
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      const uid = user!.id;
      const [w, ep, rv, cm] = await Promise.all([
        supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("watch_progress").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("anime_reviews").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("anime_comments").select("*", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      return {
        watched: w.count ?? 0,
        episodes: ep.count ?? 0,
        reviews: rv.count ?? 0,
        comments: cm.count ?? 0,
      };
    },
  });
  const loading = statsLoading || !user;

  // Fetch watchlist anime IDs, then their genres via Jikan
  const { data: watchlistIds } = useQuery({
    enabled: !!user,
    queryKey: ["watchlist-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("watchlist").select("anime_id").eq("user_id", user!.id);
      return (data ?? []).map((r) => r.anime_id).filter(Boolean) as string[];
    },
  });

  const genreQueries = useQueries({
    queries: (watchlistIds ?? []).map((id) => ({
      queryKey: ["jikan", "anime", id],
      queryFn: async () => {
        const r = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
        if (!r.ok) return [] as string[];
        const j = await r.json();
        return (j.data?.genres ?? []).map((g: { name: string }) => g.name) as string[];
      },
      staleTime: 1000 * 60 * 60 * 6,
    })),
  });
  const badgeLoading = !watchlistIds || genreQueries.some((q) => q.isLoading);
  const badgeLabel = (() => {
    if (!watchlistIds || watchlistIds.length === 0) return DEFAULT_BADGE;
    const counts: Record<string, number> = {};
    for (const q of genreQueries) {
      for (const g of q.data ?? []) counts[g] = (counts[g] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return DEFAULT_BADGE;
    return GENRE_BADGE[top[0]] ?? DEFAULT_BADGE;
  })();

  const achievementStats = {
    watchlist: stats?.watched ?? 0,
    progress: stats?.episodes ?? 0,
    reviews: stats?.reviews ?? 0,
    comments: stats?.comments ?? 0,
  };

  const unlockedIds = new Set(ACHIEVEMENTS.filter((a) => a.unlocked(achievementStats)).map((a) => a.id));
  const allUnlocked = unlockedIds.size === ACHIEVEMENTS.length;
  const hiddenUnlocked = allUnlocked;

  const items = [
    { icon: Settings, label: "Account Settings", to: "/settings/account" as const },
    { icon: Palette, label: "Interface Theme", to: "/settings/theme" as const },
    { icon: Shield, label: "Privacy & Security", to: "/settings/privacy" as const },
  ];

  return (
    <main className="px-5 pt-10 pb-28">
      <div className="flex flex-col items-center">
        <div className="relative">
          <UserAvatar profile={profile} size="xl" editable={!!user} onUpdate={handleProfileUpdate} />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground whitespace-nowrap">PRO</div>
        </div>
        <h2 className="mt-5 text-2xl font-bold capitalize text-foreground">{profile.display_name}</h2>
        {badgeLoading ? (
          <Skeleton className="mt-2 h-6 w-40 rounded-full" />
        ) : (
          <span className="mt-2 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-neon-pink">
            Anime Soul: {badgeLabel}
          </span>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">Tap avatar to customise</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Anime Watched" value={stats?.watched ?? 0} color="text-neon-cyan" loading={loading} />
        <Stat label="Episodes" value={stats?.episodes ?? 0} color="text-neon-pink" loading={loading} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-2xl glass p-3">
          <Star className="h-4 w-4 text-neon-orange" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reviews</p>
            {loading ? (
              <Skeleton className="h-4 w-8" />
            ) : (
              <p className="text-sm font-extrabold text-neon-orange">{stats?.reviews ?? 0}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl glass p-3">
          <MessageSquare className="h-4 w-4 text-neon-cyan" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comments</p>
            {loading ? (
              <Skeleton className="h-4 w-8" />
            ) : (
              <p className="text-sm font-extrabold text-neon-cyan">{stats?.comments ?? 0}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Achievements</h3>
          <span className="rounded-md bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neon-pink">AI Analyzed</span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide smooth-scroll">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex w-24 flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-border p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </>
          ) : (
            <>
              {ACHIEVEMENTS.map((a) => {
                const unlocked = unlockedIds.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex w-24 flex-shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                      unlocked
                        ? "border-neon-cyan/50 bg-neon-cyan/10 shadow-cyan"
                        : "border-border bg-muted/30 opacity-70"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${unlocked ? "bg-neon-cyan/20" : "bg-muted"}`}>
                      {unlocked ? a.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <span className={`text-center text-[10px] font-bold uppercase tracking-wider leading-tight ${unlocked ? "text-neon-cyan" : "text-muted-foreground"}`}>
                      {a.label}
                    </span>
                    {!unlocked && (
                      <span className="text-[9px] text-muted-foreground">{a.progress(achievementStats)}</span>
                    )}
                  </div>
                );
              })}
              <div
                className={`flex w-24 flex-shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                  hiddenUnlocked
                    ? "border-neon-pink/50 bg-neon-pink/10 shadow-pink"
                    : "border-border bg-muted/30 opacity-70"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${hiddenUnlocked ? "bg-neon-pink/20" : "bg-muted"}`}>
                  {hiddenUnlocked ? "🔍" : <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <span className={`text-center text-[10px] font-bold uppercase tracking-wider leading-tight ${hiddenUnlocked ? "text-neon-pink" : "text-muted-foreground"}`}>
                  Hidden
                </span>
                {!hiddenUnlocked && (
                  <span className="text-[9px] text-muted-foreground">{unlockedIds.size}/{ACHIEVEMENTS.length} unlocked</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2 rounded-3xl glass p-2">
        {items.map(({ icon: Icon, label, to }) => (
          <button key={label} onClick={() => nav({ to })} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted/50">
            <Icon className="h-5 w-5 text-neon-cyan" />
            <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
            <span className="text-muted-foreground">›</span>
          </button>
        ))}
        <button onClick={async () => { await signOut(); nav({ to: "/login", search: { next: "/" } }); }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted/50">
          <LogOut className="h-5 w-5 text-destructive" />
          <span className="flex-1 text-sm font-semibold text-destructive">Logout</span>
        </button>
      </div>
    </main>
  );
}

function Stat({ label, value, color, loading }: { label: string; value: number | string; color: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl glass p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-7 w-12 mx-auto" />
      ) : (
        <p className={`mt-1 text-2xl font-extrabold ${color}`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
      )}
    </div>
  );
}
