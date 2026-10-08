import { Link } from "@tanstack/react-router";
import { Play, Clock } from "lucide-react";
import type { Anime } from "@/lib/anime-data";
import { Skeleton } from "@/components/ui/skeleton";

export function EpisodeRow({ items, isLoading, isError }: { items: Anime[] | undefined; isLoading?: boolean; isError?: boolean }) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto px-5 pb-3 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-64 flex-shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <div className="px-5 pb-3">
        <p className="rounded-xl border border-border/50 bg-background/30 px-4 py-5 text-sm text-muted-foreground">
          {isError ? "Latest episodes are temporarily unavailable." : "No latest episodes are available right now."}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto px-5 pb-3 scrollbar-hide snap-x-mandatory smooth-scroll">
      {items.slice(0, 12).map((a, i) => {
        const ep = (i % 24) + 1;
        return (
          <Link
            key={a.id + "-ep"}
            to="/anime/$id"
            params={{ id: a.id }}
            className="group w-64 flex-shrink-0 snap-start animate-fade-up"
            style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
          >
            <div className="relative h-36 overflow-hidden rounded-2xl card-glow card-interactive">
              <img src={a.image} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
              <div className="absolute left-2 top-2 rounded-md bg-gradient-cr px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-background shadow-orange">
                NEW
              </div>
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-bold text-foreground backdrop-blur-md">
                <Clock className="h-2.5 w-2.5" /> 24m
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-cr shadow-orange">
                  <Play className="h-5 w-5 fill-current text-background" />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-neon-orange">Episode {ep}</p>
            <p className="line-clamp-1 text-sm font-bold tracking-tight text-foreground">{a.title}</p>
          </Link>
        );
      })}
    </div>
  );
}