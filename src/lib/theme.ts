/**
 * Theme system — reads saved preferences from localStorage
 * and applies them as CSS custom properties on <html>.
 * Call applyTheme() once on app boot and after every save.
 */

export type AccentColor = "purple" | "cyan" | "pink" | "orange";
export type FontSize = "sm" | "md" | "lg";
export type AnimationLevel = "full" | "reduced" | "none";

export interface ThemePrefs {
  accent: AccentColor;
  fontSize: FontSize;
  animations: AnimationLevel;
  glassEffect: boolean;
}

// CSS variable values for each accent
const ACCENT_CSS: Record<AccentColor, { primary: string; secondary: string; neonPink: string; neonPurple: string }> = {
  purple: {
    primary:     "oklch(0.68 0.29 305)",
    secondary:   "oklch(0.72 0.20 290)",
    neonPink:    "oklch(0.78 0.22 350)",
    neonPurple:  "oklch(0.68 0.29 305)",
  },
  cyan: {
    primary:     "oklch(0.78 0.18 200)",
    secondary:   "oklch(0.70 0.15 190)",
    neonPink:    "oklch(0.78 0.18 200)",
    neonPurple:  "oklch(0.72 0.16 205)",
  },
  pink: {
    primary:     "oklch(0.72 0.25 350)",
    secondary:   "oklch(0.68 0.22 340)",
    neonPink:    "oklch(0.72 0.25 350)",
    neonPurple:  "oklch(0.68 0.22 340)",
  },
  orange: {
    primary:     "oklch(0.75 0.20 55)",
    secondary:   "oklch(0.70 0.18 45)",
    neonPink:    "oklch(0.75 0.20 55)",
    neonPurple:  "oklch(0.70 0.18 45)",
  },
};

const FONT_SIZE_CSS: Record<FontSize, string> = {
  sm:  "14px",
  md:  "16px",
  lg:  "18px",
};

export function getThemePrefs(): ThemePrefs {
  return {
    accent:      (localStorage.getItem("av-accent") as AccentColor)        ?? "purple",
    fontSize:    (localStorage.getItem("av-fontsize") as FontSize)         ?? "md",
    animations:  (localStorage.getItem("av-animations") as AnimationLevel) ?? "full",
    glassEffect: localStorage.getItem("av-glass") !== "false",
  };
}

export function saveThemePrefs(prefs: ThemePrefs) {
  localStorage.setItem("av-accent",     prefs.accent);
  localStorage.setItem("av-fontsize",   prefs.fontSize);
  localStorage.setItem("av-animations", prefs.animations);
  localStorage.setItem("av-glass",      String(prefs.glassEffect));
}

export function applyTheme(prefs?: ThemePrefs) {
  const p = prefs ?? getThemePrefs();
  const root = document.documentElement;
  const accent = ACCENT_CSS[p.accent];

  // Accent colors
  root.style.setProperty("--primary",      accent.primary);
  root.style.setProperty("--secondary",    accent.secondary);
  root.style.setProperty("--neon-pink",    accent.neonPink);
  root.style.setProperty("--neon-purple",  accent.neonPurple);
  root.style.setProperty("--ring",         accent.primary);

  // Font size
  root.style.setProperty("font-size", FONT_SIZE_CSS[p.fontSize]);

  // Animations
  if (p.animations === "none") {
    root.style.setProperty("--transition-speed", "0ms");
    root.classList.add("no-animations");
  } else if (p.animations === "reduced") {
    root.style.setProperty("--transition-speed", "150ms");
    root.classList.remove("no-animations");
  } else {
    root.style.setProperty("--transition-speed", "300ms");
    root.classList.remove("no-animations");
  }

  // Glass effect
  if (!p.glassEffect) {
    root.classList.add("no-glass");
  } else {
    root.classList.remove("no-glass");
  }
}
