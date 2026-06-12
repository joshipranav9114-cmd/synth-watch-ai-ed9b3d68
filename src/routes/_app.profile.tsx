import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Settings, Shield, Palette, Award, Star, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/UserAvatar";
import { getProfile, saveProfile, type UserProfile } from "@/lib/community";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const emailName = user?.email?.split("@")[0] ?? "Pilot";

  const [profile, setProfile] = useState<UserProfile>(() => ({
    id: user?.id ?? "guest",
    display_name: emailName,
    avatar_emoji: "⭐",
    avatar_color: "purple",
  }));

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getProfile(user.id).then((p) => {
      if (!alive) return;
      if (p.display_name === "Anon") {
        const updated = { ...p, display_name: emailName };
        void saveProfile(updated);
        setProfile(updated);
      } else {
        setProfile(p);
      }
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
        if (data?.display_name) {
          setProfile((prev) => {
            if (prev.display_name === data.display_name) return prev;
            const next = { ...prev, display_name: data.display_name as string };
            saveProfile(next);
            return next;
          });
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  const handleProfileUpdate = async (next: UserProfile) => {
    setProfile(next);
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: next.display_name })
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

  const items = [
    { icon: Settings, label: "Account Settings" },
    { icon: Palette, label: "Interface Theme" },
    { icon: Shield, label: "Privacy & Security" },
  ];

  return (
    <main className="px-5 pt-10 pb-28">
      <div className="flex flex-col items-center">
        <div className="relative">
          <UserAvatar profile={profile} size="xl" editable={!!user} onUpdate={handleProfileUpdate} />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground whitespace-nowrap">PRO</div>
        </div>
        <h2 className="mt-5 text-2xl font-bold capitalize text-foreground">{profile.display_name}</h2>
        <span className="mt-2 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-neon-pink">Anime Soul: Seinen Expert</span>
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
          {["Seasonal", "Binge", "Top Reviewer", "Hidden"].map((t, i) => (
            <div key={t} className={`flex w-24 flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-border p-3 ${i === 0 ? "shadow-cyan" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Award className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2 rounded-3xl glass p-2">
        {items.map(({ icon: Icon, label }) => (
          <button key={label} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted/50">
            <Icon className="h-5 w-5 text-neon-cyan" />
            <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
            <span className="text-muted-foreground">›</span>
          </button>
        ))}
        <button onClick={async () => { await signOut(); nav({ to: "/login" }); }}
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
