import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, MessageSquare, Play, Share, Sparkles, Star, Users } from "lucide-react";
import { useAnimeById } from "@/lib/anime-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { PlatformChips, PlatformList } from "@/components/PlatformBadges";
import { primaryPlatform } from "@/lib/streaming";
import { AnimeReviews } from "@/components/AnimeReviews";
import { AnimeComments } from "@/components/AnimeComments";
import { getAnimeRatingStats } from "@/lib/community";
import { getProgressFor, upsertProgress, type WatchProgress } from "@/lib/watch-progress";
import { useQueryClient } from "@tanstack/react-query";
import { StatusPicker } from "@/components/StatusPicker";
import { STATUS_META, type WatchStatus } from "@/lib/watchlist-status";


export const Route = createFileRoute("/_app/anime/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: anime, isLoading } = useAnimeById(id);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<WatchStatus>("planned");
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"info" | "reviews" | "discuss">("info");
  const [communityStats, setCommunityStats] = useState<{ average: number; total: number; distribution: number[] }>({ average: 0, total: 0, distribution: Array(10).fill(0) });
  const [progress, setProgress] = useState<WatchProgress | null>(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    getAnimeRatingStats(id).then((s) => { if (alive) setCommunityStats(s); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!user || !anime) return;
    supabase.from("watchlist").select("id,status").eq("user_id", user.id).eq("anime_id", anime.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSaved(true);
          setWatchlistId((data as any).id);
          setStatus(((data as any).status as WatchStatus) ?? "planned");
        } else {
          setSaved(false);
          setWatchlistId(null);
        }
      });
  }, [user, anime]);

  useEffect(() => {
    if (!user || !anime) return;
    let alive = true;
    getProgressFor(user.id, anime.id).then((p) => { if (alive) setProgress(p); });
    return () => { alive = false; };
  }, [user, anime]);

  if (isLoading) return <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</main>;
  if (!anime) return (
    <main className="flex min-h-screen items-center justify-center text-muted-foreground">
      Not found. <Link to="/home" className="ml-2 text-neon-pink">Home</Link>
    </main>
  );

  const toggleSave = async () => {
    if (!user) return;
    if (saved) {
      const { error } = await supabase.from("watchlist").delete().eq("user_id", user.id).eq("anime_id", anime.id);
      if (error) { toast.error(error.message); return; }
      setSaved(false); setWatchlistId(null); toast("Removed from watchlist");
    } else {
      const { data, error } = await supabase.from("watchlist").insert({ user_id: user.id, anime_id: anime.id, anime_title: anime.title, anime_image: anime.image, status: "planned" }).select("id").single();
      if (error) { toast.error(error.message); return; }
      setSaved(true); setStatus("planned"); setWatchlistId(data?.id ?? null); toast.success("Added to your trophy room");
    }
  };

  const changeStatus = async (s: WatchStatus) => {
    if (!user || !anime) return;
    const prev = status;
    setStatus(s);
    const { error } = await supabase.from("watchlist").update({ status: s }).eq("user_id", user.id).eq("anime_id", anime.id);
    if (error) { setStatus(prev); toast.error(error.message); return; }
    toast.success(`Marked as ${STATUS_META[s].label}`);
  };

  const primary = primaryPlatform(anime);

  const handleWatch = async () => {
    if (!user || !anime) return;
    try {
      await upsertProgress({
        userId: user.id,
        animeId: anime.id,
        animeTitle: anime.title,
        animeImage: anime.image,
        episode: progress?.episode ?? 1,
        progress: Math.max(progress?.progress ?? 0, 10),
      });
      queryClient.invalidateQueries({ queryKey: ["watch-progress", user.id] });
      const fresh = await getProgressFor(user.id, anime.id);
      setProgress(fresh);
    } catch (e) {
      // non-blocking
    }
  };

  const handleShare = async () => {
    if (!anime) return;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: anime.title,
          text: `Check out ${anime.title} on AniVerse!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied!");
      }
    } catch {
      // user cancelled or share failed — ignore
    }
  };

  return (
    <main>
      <div className="relative h-[460px]">
        <img src={anime.image} alt={anime.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <button onClick={() => nav({ to: "/home" })} className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full glass">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <button onClick={toggleSave} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full glass">
          {saved ? <BookmarkCheck className="h-4 w-4 text-neon-pink" /> : <Bookmark className="h-4 w-4 text-foreground" />}
        </button>
        <div className="absolute bottom-6 left-5 right-5">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-neon-pink">
            <Sparkles className="h-3 w-3" /> {anime.match}% match
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-foreground">{anime.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 text-neon-cyan"><Star className="h-3 w-3 fill-current" /> {anime.rating}</span>
            {communityStats.total > 0 && (
              <span className="flex items-center gap-1 text-neon-orange"><Star className="h-3 w-3" /> {communityStats.average} fan</span>
            )}
            <span>·</span><span>{anime.year}</span><span>·</span><span>{anime.episodes} ep</span><span>·</span><span>{anime.studio}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <PlatformChips anime={anime} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Available now</span>
          </div>
        </div>
      </div>

      <section className="px-5 pt-6">
        <div className="flex gap-2">
          <a href={primary.searchUrl(anime.title)} target="_blank" rel="noopener noreferrer"
            onClick={handleWatch}
            className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-cr py-4 text-sm font-black uppercase tracking-widest text-background shadow-orange transition-transform active:scale-[0.98]">
            <Play className="h-4 w-4 fill-current" /> {progress ? `Resume EP ${progress.episode}` : `Watch on ${primary.name}`}
          </a>
          {anime.youtubeId && (
            <button onClick={() => window.open(`https://www.youtube.com/watch?v=${anime.youtubeId}`, "_blank")} className="flex h-13 flex-none items-center justify-center gap-2 rounded-full glass px-4 text-sm font-black uppercase tracking-widest text-foreground transition-transform active:scale-[0.98]">
              <Play className="h-4 w-4 fill-current" /> Trailer
            </button>
          )}
          <button onClick={toggleSave} className="flex h-13 items-center justify-center rounded-full glass px-5 text-sm font-bold">
            {saved ? <BookmarkCheck className="h-4 w-4 text-neon-pink" /> : <Bookmark className="h-4 w-4 text-foreground" />}
          </button>
          <Link to="/community/$animeId" params={{ animeId: id }} className="flex h-13 items-center justify-center rounded-full glass px-4">
            <MessageSquare className="h-4 w-4 text-neon-cyan" />
          </Link>
          <button onClick={handleShare} className="flex h-13 items-center justify-center rounded-full glass px-4" aria-label="Share">
            <Share className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="mt-5 flex rounded-2xl glass overflow-hidden">
          {(["info", "reviews", "discuss"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveSection(tab)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${activeSection === tab ? "bg-primary/20 text-neon-pink" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "reviews" ? (
                <span className="flex items-center justify-center gap-1">
                  <Star className="h-3 w-3" /> Reviews
                  {communityStats.total > 0 && <span className="rounded-full bg-neon-orange/20 px-1.5 text-[10px] text-neon-orange">{communityStats.total}</span>}
                </span>
              ) : tab === "discuss" ? (
                <span className="flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Chat</span>
              ) : "Info"}
            </button>
          ))}
        </div>
      </section>

      {activeSection === "info" && (
        <section className="px-5 pt-4">
          <div className="mt-2 flex flex-wrap gap-2">
            {anime.genres.map((g: string) => (
              <span key={g} className="rounded-full glass px-3 py-1 text-[11px] font-semibold text-foreground">{g}</span>
            ))}
          </div>
          <h3 className="mt-8 text-sm font-bold uppercase tracking-widest text-neon-orange">Where to Watch</h3>
          <div className="mt-3"><PlatformList anime={anime} /></div>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-widest text-neon-cyan">Synopsis</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{anime.synopsis}</p>
          <h3 className="mt-8 text-sm font-bold uppercase tracking-widest text-neon-cyan">AI Insight</h3>
          <div className="mt-2 mb-28 rounded-2xl glass p-4">
            <p className="text-sm text-foreground/90">
              Based on your taste profile, expect <span className="font-bold text-neon-pink">high tear-jerker probability</span> and a strong neo-noir aesthetic. Best viewed at night, headphones on.
            </p>
          </div>
        </section>
      )}

      {activeSection === "reviews" && <AnimeReviews animeId={id} animeTitle={anime.title} user={user} />}

      {activeSection === "discuss" && (
        <section className="px-5 pt-6 pb-4">
          <div className="rounded-2xl glass p-5 text-center space-y-4 mb-6">
            <div className="text-4xl">🎌</div>
            <h3 className="text-lg font-bold text-foreground">Join the Discussion</h3>
            <p className="text-sm text-muted-foreground">Chat live with fans of {anime.title}</p>
            <Link to="/community/$animeId" params={{ animeId: id }}
              className="inline-block w-full rounded-2xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground">
              Open Live Room →
            </Link>
          </div>
          <AnimeComments animeId={id} user={user} />
        </section>
      )}
    </main>
  );
}
