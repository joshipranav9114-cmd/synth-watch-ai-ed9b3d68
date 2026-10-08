import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useFeaturedAnime } from "@/lib/anime-data";
import { Play, Plus, Sparkles, Star, Info } from "lucide-react";

export function HeroCarousel() {
  const [i, setI] = useState(0);
  const { data: ANIME, isLoading, isError } = useFeaturedAnime();
  useEffect(() => {
    if (!ANIME.length) return;
    const t = setInterval(() => setI((p) => (p + 1) % ANIME.length), 5000);
    return () => clearInterval(t);
  }, [ANIME.length]);
  if (isLoading) {
    return <div aria-label="Loading featured anime" className="h-[420px] w-full animate-pulse bg-muted/20" />;
  }
  if (!ANIME.length) {
    return (
      <section className="relative flex min-h-[300px] items-end overflow-hidden bg-background px-5 pb-10 pt-24">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-background/60 to-neon-orange/10" />
        <div className="relative max-w-xl">
          <p className="heading-eyebrow text-neon-orange">AniVerse Spotlight</p>
          <h1 className="heading-1 mt-2 text-foreground">Discover your next anime.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isError ? "Featured anime is temporarily unavailable." : "No featured anime is available right now."}
          </p>
          <Link to="/search" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-cr px-6 text-sm font-bold uppercase text-background shadow-orange">
            <Sparkles className="h-4 w-4" /> Explore anime
          </Link>
        </div>
      </section>
    );
  }
  const a = ANIME[i];
  return (
    <div className="relative block h-[640px] w-full overflow-hidden">
      <img
        key={a.id}
        src={a.image}
        alt={a.title}
        className="h-full w-full object-cover hero-float animate-fade-in-soft"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

      <div className="absolute right-4 top-6 z-10 flex items-center gap-1.5 rounded-full bg-gradient-cr px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-background shadow-orange">
        <Sparkles className="h-3 w-3" /> #{i + 1} Spotlight
      </div>

      <div className="absolute bottom-10 left-5 right-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-gradient-cr px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-background shadow-orange">
            CR Originals
          </span>
          <span className="inline-flex items-center gap-1 rounded-full glass px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neon-pink">
            <Sparkles className="h-3 w-3" /> {a.match}% match
          </span>
        </div>
        <h2 className="heading-1 text-balance text-foreground drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]" style={{ fontSize: "clamp(2rem, 8vw, 3rem)" }}>
          {a.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
          <span className="flex items-center gap-1 rounded-md bg-gradient-cr px-1.5 py-0.5 text-background">
            <Star className="h-3 w-3 fill-current" /> {a.rating?.toFixed(1)}
          </span>
          <span className="rounded-md glass px-1.5 py-0.5 text-neon-orange">SUB | DUB</span>
          <span className="rounded-md glass px-1.5 py-0.5 text-neon-cyan">4K HDR</span>
          <span className="rounded-md glass px-1.5 py-0.5 text-foreground">{a.year}</span>
        </div>
        <p className="mt-3 line-clamp-2 max-w-md text-sm leading-relaxed text-muted-foreground/90">
          {a.synopsis}
        </p>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {a.genres.slice(0, 3).join(" • ")}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Link
            to="/anime/$id"
            params={{ id: a.id }}
            className="btn-glow flex h-12 items-center gap-2 rounded-full bg-gradient-cr press px-7 text-sm font-bold uppercase tracking-[0.14em] text-background shadow-orange"
          >
            <Play className="h-4 w-4 fill-current" /> Watch Now
          </Link>
          <Link
            to="/anime/$id"
            params={{ id: a.id }}
            className="flex h-12 w-12 items-center justify-center rounded-full glass press text-foreground"
            aria-label="Add to list"
          >
            <Plus className="h-5 w-5" />
          </Link>
          <Link
            to="/anime/$id"
            params={{ id: a.id }}
            className="flex h-12 w-12 items-center justify-center rounded-full glass press text-foreground"
            aria-label="More info"
          >
            <Info className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-5 flex gap-2">
          {ANIME.map((_a, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-10 bg-gradient-cr shadow-orange" : "w-3 bg-muted/70"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
