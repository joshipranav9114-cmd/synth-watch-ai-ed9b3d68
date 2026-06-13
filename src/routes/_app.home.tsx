import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Play, Search, Sparkles, TrendingUp, Zap } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { HeroCarousel } from "@/components/HeroCarousel";
import { AnimeCard } from "@/components/AnimeCard";
import { ContinueWatching } from "@/components/ContinueWatching";
import { EpisodeRow } from "@/components/EpisodeCard";
import { useFeaturedAnime, useSeasonalAnime, useTopAnime, type Anime } from "@/lib/anime-data";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import logo from "@/assets/aniverse-logo.png";
import { useQuery } from "@tanstack/react-query";
import { getContinueWatching } from "@/lib/watch-progress";

export const Route = createFileRoute("/_app/home")({ component: Home });

function Home() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "Pilot";
  const { data: featured } = useFeaturedAnime();
  const { data: trending } = useTopAnime();
  const { data: seasonal } = useSeasonalAnime();
  const { data: continueWatching, isLoading: cwLoading } = useQuery({
    queryKey: ["watch-progress", user?.id],
    queryFn: () => getContinueWatching(user!.id),
    enabled: !!user,
  });
  const resumeAnimeId = continueWatching?.[0]?.anime_id ?? featured?.[0]?.id ?? "21";

  return (
    <main className="bg-mesh">
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-background/80 to-transparent">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8 drop-shadow-[0_0_12px_rgba(180,80,255,0.7)]" />
          <span className="text-xl font-black tracking-tight text-gradient-neon">AniVerse</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/search" className="flex h-9 w-9 items-center justify-center rounded-full glass press">
            <Search className="h-4 w-4 text-foreground" />
          </Link>
          <NotificationBell />
        </div>
      </header>

      <HeroCarousel />

      <section className="px-5 pt-6 section-fade">
        <div className="flex items-end justify-between">
          <div>
            <p className="heading-eyebrow text-neon-orange">Welcome back</p>
            <h2 className="heading-2 mt-1 capitalize text-foreground">
              {name}, ready to <span className="text-gradient-neon">stream?</span>
            </h2>
          </div>
          <Link
            to="/anime/$id"
            params={{ id: resumeAnimeId }}
            className="btn-glow flex items-center gap-2 rounded-full bg-gradient-cr px-4 py-2 text-[11px] font-black uppercase tracking-widest text-background shadow-orange"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Resume
          </Link>
        </div>
      </section>

      <Section title="Continue Watching" subtitle="Pick up where you left off" icon={<Zap className="h-3 w-3" />} accent="text-neon-orange" wrap={false} viewAllLink="/continue-watching">
        <ContinueWatching items={continueWatching} isLoading={cwLoading} />
      </Section>

      <Section title="Latest Episodes" subtitle="Fresh Drops" icon={<Flame className="h-3 w-3" />} accent="text-neon-pink" wrap={false} viewAllLink="/latest-episodes">
        <EpisodeRow items={seasonal} />
      </Section>

      <Section title="For You" subtitle="AI Curated" icon={<Sparkles className="h-3 w-3" />} accent="text-neon-purple" viewAllLink="/for-you">
        <CardRow items={featured} size="lg" />
      </Section>

      <Section title="Top 10 This Week" subtitle="Trending Now" icon={<TrendingUp className="h-3 w-3" />} accent="text-neon-orange" viewAllLink="/trending">
        <CardRow items={trending?.slice(0, 10)} size="xl" ranked />
      </Section>

      <Section title="Simulcast Season" subtitle="This Season" icon={<Flame className="h-3 w-3" />} accent="text-neon-cyan" viewAllLink="/simulcast">
        <CardRow items={seasonal} size="xl" />
      </Section>

      <section className="px-5 pt-8 section-fade">
        <Link
          to="/assistant"
          className="relative block overflow-hidden rounded-3xl bg-gradient-hero p-5 shadow-neon card-interactive btn-glow"
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-neon-orange/40 blur-3xl" />
          <div className="absolute -bottom-8 -left-4 h-32 w-32 rounded-full bg-neon-blue/40 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/30 backdrop-blur-md">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/80">
                AI Assistant
              </p>
              <p className="text-base font-extrabold text-primary-foreground">Ask Ani anything</p>
              <p className="mt-0.5 text-xs text-primary-foreground/80">"Find me something emotional tonight…"</p>
            </div>
          </div>
        </Link>
      </section>
    </main>
  );
}

function Section({
  title,
  subtitle,
  icon,
  accent = "text-neon-cyan",
  children,
  wrap = true,
  viewAllLink,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
  wrap?: boolean;
  viewAllLink?: string;
}) {
  return (
    <section className="pt-7 animate-fade-up">
      <div className="mb-3 flex items-end justify-between px-5">
        <div>
          <p className={`heading-eyebrow flex items-center gap-1 ${accent}`}>
            {icon} {subtitle}
          </p>
          <h3 className="heading-3 text-foreground">{title}</h3>
        </div>
        {viewAllLink ? (
          <Link
            to={viewAllLink}
            className="rounded-full glass press px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground"
          >
            View all
          </Link>
        ) : (
          <button className="rounded-full glass press px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
            View all
          </button>
        )}
      </div>
      {wrap ? (
        <div className="flex gap-4 overflow-x-auto px-5 pb-3 scrollbar-hide snap-x-mandatory smooth-scroll">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

function CardRow({
  items,
  size = "md",
  ranked = false,
}: {
  items: Anime[] | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  ranked?: boolean;
}) {
  if (!items || items.length === 0) {
    const w =
      size === "xl" ? "w-52 h-72" : size === "lg" ? "w-44 h-64" : "w-36 h-52";
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={`flex-shrink-0 rounded-2xl ${w}`} />
        ))}
      </>
    );
  }
  return (
    <>
      {items.map((a, idx) => (
        <AnimeCard key={a.id} anime={a} size={size} rank={ranked ? idx + 1 : undefined} />
      ))}
    </>
  );
}
