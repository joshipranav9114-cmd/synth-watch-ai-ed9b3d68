import { useEffect, useState } from "react";
import { X, Search as SearchIcon } from "lucide-react";
import {
  AVATAR_COLORS,
  type UserProfile,
  saveProfile,
} from "@/lib/community";

interface UserAvatarProps {
  profile: UserProfile;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
  onUpdate?: (profile: UserProfile) => void;
}

const SIZE_CLASSES = {
  sm:  "h-8 w-8 text-sm",
  md:  "h-10 w-10 text-base",
  lg:  "h-14 w-14 text-2xl",
  xl:  "h-24 w-24 text-4xl",
};

type JikanCharacter = {
  mal_id: number;
  name: string;
  images?: { jpg?: { image_url?: string } };
};

const FALLBACK_CHARACTERS: JikanCharacter[] = [
  { mal_id: -1, name: "Naruto", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/2/284121.jpg" } } },
  { mal_id: -2, name: "Gojo Satoru", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/310307.jpg" } } },
  { mal_id: -3, name: "Levi Ackerman", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/2/241413.jpg" } } },
  { mal_id: -4, name: "Mikasa", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/215563.jpg" } } },
  { mal_id: -5, name: "Itachi", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/131317.jpg" } } },
  { mal_id: -6, name: "Luffy", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/310307.jpg" } } },
  { mal_id: -7, name: "Zoro", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/3/100534.jpg" } } },
  { mal_id: -8, name: "Kakashi", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/7/284835.jpg" } } },
  { mal_id: -9, name: "Killua", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/7/298935.jpg" } } },
  { mal_id: -10, name: "Gon", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/11/104665.jpg" } } },
  { mal_id: -11, name: "Zero Two", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/369293.jpg" } } },
  { mal_id: -12, name: "Rem", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/10/339556.jpg" } } },
  { mal_id: -13, name: "Nezuko", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/380974.jpg" } } },
  { mal_id: -14, name: "Tanjiro", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/6/380975.jpg" } } },
  { mal_id: -15, name: "Shinra", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/14/387130.jpg" } } },
  { mal_id: -16, name: "Todoroki", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/8/323227.jpg" } } },
  { mal_id: -17, name: "Bakugo", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/3/323225.jpg" } } },
  { mal_id: -18, name: "Deku", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/8/317519.jpg" } } },
  { mal_id: -19, name: "Edward Elric", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/11/174517.jpg" } } },
  { mal_id: -20, name: "Spike Spiegel", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/4/50197.jpg" } } },
  { mal_id: -21, name: "Vegeta", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/310307.jpg" } } },
  { mal_id: -22, name: "Light Yagami", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/8/81474.jpg" } } },
  { mal_id: -23, name: "L", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/9/82702.jpg" } } },
  { mal_id: -24, name: "Ryuk", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/characters/11/82699.jpg" } } },
];

export function UserAvatar({ profile, size = "md", editable = false, onUpdate }: UserAvatarProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [tab, setTab] = useState<"popular" | "search">("popular");
  const [popular, setPopular] = useState<JikanCharacter[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JikanCharacter[] | null>(null);
  const [searching, setSearching] = useState(false);

  const gradient = AVATAR_COLORS[profile.avatar_color] ?? AVATAR_COLORS.purple;
  const sizeClass = SIZE_CLASSES[size];

  useEffect(() => { setDraft(profile); }, [profile]);

  useEffect(() => {
    if (!open || popular) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch("https://api.jikan.moe/v4/top/characters?limit=24");
        if (!r.ok) throw new Error(`Jikan ${r.status}`);
        const j = await r.json();
        const list = (j?.data ?? []) as JikanCharacter[];
        if (!alive) return;
        setPopular(list.length ? list : FALLBACK_CHARACTERS);
      } catch (err) {
        console.error("Jikan top/characters failed, using fallback:", err);
        if (alive) setPopular(FALLBACK_CHARACTERS);
      }
    })();
    return () => { alive = false; };
  }, [open, popular]);

  useEffect(() => {
    if (tab !== "search") return;
    const q = query.trim();
    if (q.length < 2) { setResults(null); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      (async () => {
        const filterFallback = () =>
          FALLBACK_CHARACTERS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
        try {
          const r = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=20&order_by=favorites&sort=desc`);
          if (!r.ok) throw new Error(`Jikan ${r.status}`);
          const j = await r.json();
          const list = ((j?.data ?? []) as JikanCharacter[]).filter(
            (c) => !!c.images?.jpg?.image_url,
          );
          if (!alive) return;
          setResults(list.length ? list : filterFallback());
        } catch (err) {
          console.error("Jikan character search failed, using fallback:", err);
          if (alive) setResults(filterFallback());
        } finally {
          if (alive) setSearching(false);
        }
      })();
    }, 500);
    return () => { alive = false; clearTimeout(t); };
  }, [query, tab]);

  const handleSave = () => {
    void saveProfile(draft);
    onUpdate?.(draft);
    setOpen(false);
  };

  const pickCharacter = (c: JikanCharacter) => {
    const url = c.images?.jpg?.image_url ?? null;
    if (!url) return;
    setDraft({ ...draft, avatar_url: url });
  };

  const clearAvatar = () => setDraft({ ...draft, avatar_url: null });

  const shownList = tab === "popular" ? popular : results;

  return (
    <>
      <button
        onClick={() => editable && setOpen(true)}
        className={`relative flex items-center justify-center overflow-hidden rounded-full ${profile.avatar_url ? "" : `bg-gradient-to-br ${gradient}`} ${sizeClass} ${editable ? "ring-2 ring-offset-2 ring-offset-background ring-primary/40 hover:ring-primary transition-all" : ""} flex-shrink-0`}
        aria-label={editable ? "Edit avatar" : profile.display_name}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
        ) : (
          <span>{profile.avatar_emoji}</span>
        )}
        {editable && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
            ✎
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="flex h-full w-full flex-col bg-background animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full glass text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview + name */}
            <div className="flex flex-col items-center gap-3 px-5 py-5">
              <div className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full ${draft.avatar_url ? "" : `bg-gradient-to-br ${AVATAR_COLORS[draft.avatar_color]}`} ring-2 ring-primary/60 shadow-[0_0_30px_rgba(168,85,247,0.5)]`}>
                {draft.avatar_url ? (
                  <img src={draft.avatar_url} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl">{draft.avatar_emoji}</span>
                )}
              </div>
              <input
                value={draft.display_name}
                onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                maxLength={24}
                className="rounded-xl glass px-3 py-2 text-center text-sm font-bold text-foreground outline-none"
                placeholder="Display name"
              />
              {draft.avatar_url && (
                <button
                  onClick={clearAvatar}
                  className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Use emoji fallback
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border/50 px-5">
              {(["popular", "search"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative py-3 text-xs font-bold uppercase tracking-widest transition ${
                    tab === t ? "text-neon-pink" : "text-muted-foreground"
                  }`}
                >
                  {t === "popular" ? "Popular" : "Search"}
                  {tab === t && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  )}
                </button>
              ))}
            </div>

            {tab === "search" && (
              <div className="px-5 pt-4">
                <div className="flex items-center gap-2 rounded-2xl glass px-3 py-2">
                  <SearchIcon className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search any anime character…"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4">
              {tab === "search" && query.trim().length < 2 ? (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </p>
              ) : shownList === null || searching ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted/40" />
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
                    </div>
                  ))}
                </div>
              ) : shownList.length === 0 ? (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  {tab === "search"
                    ? `No characters found for "${query.trim()}"`
                    : "No characters found"}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {shownList.map((c) => {
                    const url = c.images?.jpg?.image_url;
                    if (!url) return null;
                    const selected = draft.avatar_url === url;
                    return (
                      <button
                        key={c.mal_id}
                        onClick={() => pickCharacter(c)}
                        className={`group flex flex-col items-center gap-1.5 transition ${selected ? "scale-[1.02]" : ""}`}
                      >
                        <div
                          className={`relative aspect-square w-full overflow-hidden rounded-2xl border-2 transition ${
                            selected
                              ? "border-primary shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                              : "border-transparent group-hover:border-primary/40"
                          }`}
                        >
                          <img
                            src={url}
                            alt={c.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className={`w-full truncate text-center text-[11px] font-semibold ${selected ? "text-neon-pink" : "text-muted-foreground"}`}>
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save */}
            <div className="border-t border-border/50 bg-background/80 px-5 py-4 pb-6 backdrop-blur">
              <button
                onClick={handleSave}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground btn-glow"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
