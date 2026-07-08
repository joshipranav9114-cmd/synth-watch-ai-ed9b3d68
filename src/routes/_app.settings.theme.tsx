import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Moon, Sun, Monitor, Type, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/theme")({ component: InterfaceTheme });

type AccentColor = "purple" | "cyan" | "pink" | "orange";
type FontSize = "sm" | "md" | "lg";
type AnimationLevel = "full" | "reduced" | "none";

const ACCENT_COLORS: { id: AccentColor; label: string; class: string }[] = [
  { id: "purple", label: "Neon Purple", class: "bg-violet-500" },
  { id: "cyan",   label: "Cyber Cyan",  class: "bg-cyan-400" },
  { id: "pink",   label: "Neon Pink",   class: "bg-pink-500" },
  { id: "orange", label: "Solar Orange",class: "bg-orange-500" },
];

const FONT_SIZES: { id: FontSize; label: string; preview: string }[] = [
  { id: "sm", label: "Small",  preview: "text-xs" },
  { id: "md", label: "Medium", preview: "text-sm" },
  { id: "lg", label: "Large",  preview: "text-base" },
];

function InterfaceTheme() {
  const nav = useNavigate();
  const [accent, setAccent] = useState<AccentColor>(() =>
    (localStorage.getItem("av-accent") as AccentColor) ?? "purple"
  );
  const [fontSize, setFontSize] = useState<FontSize>(() =>
    (localStorage.getItem("av-fontsize") as FontSize) ?? "md"
  );
  const [animations, setAnimations] = useState<AnimationLevel>(() =>
    (localStorage.getItem("av-animations") as AnimationLevel) ?? "full"
  );
  const [glassEffect, setGlassEffect] = useState(() =>
    localStorage.getItem("av-glass") !== "false"
  );

  const handleSave = () => {
    localStorage.setItem("av-accent", accent);
    localStorage.setItem("av-fontsize", fontSize);
    localStorage.setItem("av-animations", animations);
    localStorage.setItem("av-glass", String(glassEffect));
    toast.success("Theme preferences saved!");
  };

  return (
    <main className="px-5 pt-10 pb-28">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => nav({ to: "/profile" })}
          className="flex h-9 w-9 items-center justify-center rounded-full glass">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Interface Theme</h1>
      </div>

      {/* Accent Color */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-neon-pink">Accent Color</p>
        <div className="grid grid-cols-2 gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setAccent(c.id)}
              className={`flex items-center gap-2.5 rounded-xl p-3 transition-all ${
                accent === c.id
                  ? "ring-2 ring-primary bg-primary/10"
                  : "glass hover:bg-muted/40"
              }`}
            >
              <div className={`h-5 w-5 rounded-full ${c.class}`} />
              <span className="text-xs font-semibold text-foreground">{c.label}</span>
              {accent === c.id && <span className="ml-auto text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-neon-cyan" />
          <p className="text-xs font-bold uppercase tracking-widest text-neon-cyan">Font Size</p>
        </div>
        <div className="flex gap-2">
          {FONT_SIZES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontSize(f.id)}
              className={`flex-1 rounded-xl py-3 text-center transition-all ${
                fontSize === f.id
                  ? "bg-primary/20 ring-1 ring-primary text-neon-pink font-bold"
                  : "glass text-muted-foreground hover:text-foreground"
              } ${f.preview}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Animations */}
      <div className="mb-4 rounded-2xl glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-neon-orange" />
          <p className="text-xs font-bold uppercase tracking-widest text-neon-orange">Animations</p>
        </div>
        <div className="flex gap-2">
          {(["full", "reduced", "none"] as AnimationLevel[]).map((a) => (
            <button
              key={a}
              onClick={() => setAnimations(a)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold capitalize transition-all ${
                animations === a
                  ? "bg-primary/20 ring-1 ring-primary text-neon-pink"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Glass Effect Toggle */}
      <div className="mb-6 rounded-2xl glass p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Glass Effect</p>
            <p className="text-[11px] text-muted-foreground">Frosted glass on cards and panels</p>
          </div>
          <button
            onClick={() => setGlassEffect(v => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              glassEffect ? "bg-primary" : "bg-muted"
            }`}
          >
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              glassEffect ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground"
      >
        Save Preferences
      </button>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Some changes may require a page refresh to fully apply
      </p>
    </main>
  );
}
