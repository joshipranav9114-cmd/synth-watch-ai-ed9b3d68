import { Link } from "@tanstack/react-router";
import { Sparkles, Star, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Anime } from "@/lib/anime-data";

interface AnimeOfTheDayProps {
  anime: Anime | undefined;
  isLoading?: boolean;
}

export function AnimeOfTheDay({ anime, isLoading }: AnimeOfTheDayProps) {
  if (isLoading) {
    return (
      <section className="px-5 pt-7 animate-fade-up">
        <div className="mb-3 flex items-center gap-2">
          <p className="heading-eyebrow flex items-center gap-1 text-neon-pink">
            <Sparkles className="h-3 w-3" /> Anime of the Day
          </p>
        </div>
        <Skeleton className="h-48 w-full rounded-3xl" />
      </section>
    );
  }

  if (!anime) return null;

  return (
    <section className="px-5 pt-7 animate-fade-up">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="heading-eyebrow flex items-center gap-1 text-neon-pink">
            <Sparkles className="h-3 w-3" /> Anime of the Day
          </p>
          <h3 className="heading-3 text-foreground">Today's Pick</h3>
        </div>
      </div>

      <Link
        to="/anime/$id"
        params={{ id: anime.id }}
        className="relative flex overflow-hidden rounded-3xl glass card-interactive group"
      >
        <img
          src={anime.image}
          alt={anime.title}
          className="h-40 w-28 flex-shrink-0 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/30 to-background/80" />
        <div className="relative flex flex-1 flex-col justify-between p-4 pl-4">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-neon-pink/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neon-pink">
              <Sparkles className="h-2.5 w-2.5" /> {anime.match}% match
            </div>
            <h4 className="text-base font-extrabold leading-tight text-foreground line-clamp-2">
              {anime.title}
            </h4>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5 text-neon-cyan">
                <Star className="h-3 w-3 fill-current" /> {anime.rating}
              </span>
              <span>·</span>
              <span>{anime.year}</span>
              <span>·</span>
              <span>{anime.episodes > 0 ? `${anime.episodes} ep` : "Ongoing"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {anime.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-background/40 px-2 py-0.5 text-[10px] font-semibold text-foreground/80"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-cr px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-background shadow-orange">
              <Play className="h-3 w-3 fill-current" /> Watch Now
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
