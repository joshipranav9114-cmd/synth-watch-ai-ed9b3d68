import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useFeaturedAnime } from "@/lib/anime-data";
import a1 from "@/assets/anime-1.jpg";
import a2 from "@/assets/anime-2.jpg";
import a3 from "@/assets/anime-3.jpg";
import a4 from "@/assets/anime-4.jpg";
import a5 from "@/assets/anime-5.jpg";
import a6 from "@/assets/anime-6.jpg";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const fallback = [a1, a2, a3, a4, a5, a6];
const slidesMeta = [
  { badge: "AI Discovery", title: ["Smart", "Recommendations,", "Evolved"], titleAccent: 2,
    body: "AniVerse AI analyzes your emotional response to every episode, crafting a viewing path that matches your unique soul.", idx: [1, 3] },
  { badge: "Mood Engine", title: ["Find What", "Hits Your", "Frequency"], titleAccent: 2,
    body: "Tell our assistant how you feel — sad, hyped, nostalgic — and watch the perfect series surface in seconds.", idx: [2, 4] },
  { badge: "Trophy Room", title: ["Your Anime", "Story, Forever", "Curated"], titleAccent: 2,
    body: "Build a cinematic trophy room of your favorites and revisit the timelines that shaped you.", idx: [0, 5] },
];

function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const { data: featured } = useFeaturedAnime();
  const meta = slidesMeta[i];
  const pick = (idx: number) => featured[idx] ?? { image: fallback[idx % fallback.length], match: 95 };
  const s = { ...meta, images: meta.idx.map(pick) };
  const next = () => (i < slidesMeta.length - 1 ? setI(i + 1) : nav({ to: "/login", search: { next: "/" } }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-background pb-32">
      <div className="absolute inset-0 opacity-60" style={{
        background: "radial-gradient(80% 50% at 50% 0%, oklch(0.65 0.27 305 / 0.25), transparent 70%), radial-gradient(80% 50% at 50% 100%, oklch(0.78 0.18 220 / 0.2), transparent 70%)",
      }} />
      <header className="relative flex items-center justify-between px-5 py-5">
        <span className="text-xl font-extrabold text-gradient-neon">AniVerse</span>
        <Link to="/login" search={{ next: "/" }} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Skip</Link>
      </header>

      <section className="relative px-5">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-neon-pink">
          <Sparkles className="h-3 w-3" /> {s.badge}
        </div>
        <h1 className="text-4xl font-extrabold leading-[1.1]">
          {s.title.map((line, idx) => (
            <span key={idx} className={`block ${idx === s.titleAccent ? "text-gradient-neon" : "text-foreground"}`}>
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{s.body}</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="relative h-72 overflow-hidden rounded-2xl shadow-card">
            <img src={s.images[0].image} alt="" className="h-full w-full object-cover" />
            <div className="absolute left-2 top-2 rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-bold text-neon-cyan backdrop-blur">
              {s.images[0].match}% MATCH
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="relative h-44 overflow-hidden rounded-2xl shadow-card">
              <img src={s.images[1].image} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex h-24 items-center justify-center gap-2 rounded-2xl glass">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-pink/80 text-[10px] font-bold text-background">A</div>
              <div className="-ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-neon-cyan/80 text-[10px] font-bold text-background">I</div>
              <div className="-ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">+</div>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="mb-5 flex items-center justify-center gap-2">
          {slidesMeta.map((_, idx) => (
            <span key={idx} className={`h-1 rounded-full transition-all ${idx === i ? "w-8 bg-gradient-neon" : "w-2 bg-muted"}`} />
          ))}
        </div>
        <button
          onClick={next}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-gradient-hero text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-neon"
        >
          {i < slidesMeta.length - 1 ? "Continue" : "Enter the Universe"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
