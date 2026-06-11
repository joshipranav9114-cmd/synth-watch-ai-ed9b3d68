import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Play, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getContinueWatching, type WatchProgress } from "@/lib/watch-progress";

export const Route = createFileRoute("/_app/continue-watching")({ component: ContinueWatchingPage });

function ContinueWatchingPage() {
  const { user } = useAuth();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["watch-progress", user?.id],
    queryFn: () => getContinueWatching(user!.id),
    enabled: !!user,
  });

  return (
    <main className="min-h-screen px-5 pt-6 page-enter">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/home" className="flex h-10 w-10 items-center justify-center rounded-full glass press">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </Link>
        <div>
          <p className="heading-eyebrow text-neon-orange flex items-center gap-1">
            <Zap className="h-3 w-3" /> Pick up where you left off
          </p>
          <h1 className="heading-1 text-foreground">Continue Watching</h1>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && rows && rows.length === 0 && (
        <div className="rounded-2xl glass p-6 text-center">
          <p className="text-sm font-bold text-foreground">Nothing in progress yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Open an anime and hit Watch to start tracking.</p>
        </div>
      )}

      {!isLoading && rows && rows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 pb-24">
          {rows.map((row, i) => (
            <ContinueCard key={row.id} row={row} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}

function ContinueCard({ row, index }: { row: WatchProgress; index: number }) {
  const progress = row.progress;
  const episode = row.episode;
  const minsLeft = row.duration_seconds
    ? Math.max(0, Math.round((row.duration_seconds * (100 - progress)) / 100 / 60))
    : Math.round(((100 - progress) / 100) * 24);
  return (
    <Link
      to="/anime/$id"
      params={{ id: row.anime_id }}
      className="group relative h-40 w-full overflow-hidden rounded-2xl card-glow card-interactive animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <img src={row.anime_image} alt={row.anime_title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute right-3 top-3 rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-orange backdrop-blur-md">
        EP {episode}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-cr shadow-orange transition-transform duration-300 group-hover:scale-110 animate-glow">
          <Play className="h-5 w-5 fill-current text-background" />
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3">
        <p className="line-clamp-1 text-sm font-extrabold tracking-tight text-foreground">{row.anime_title}</p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {minsLeft}m left
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-background/60">
          <div className="h-full bg-gradient-cr" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Link>
  );
}
