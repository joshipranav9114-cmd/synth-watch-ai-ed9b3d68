import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  AVATAR_COLORS,
  type UserProfile,
  saveProfile,
} from "@/lib/community";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CharacterResult {
  name: string;
  image: string;
}

interface UserAvatarProps {
  profile: UserProfile;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
  onUpdate?: (profile: UserProfile) => void;
}

// ─── Size classes ─────────────────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-2xl",
  xl: "h-24 w-24 text-4xl",
};

// ─── Fallback characters (always available offline) ───────────────────────────

const FALLBACK_CHARACTERS: CharacterResult[] = [
  { name: "Naruto", image: "https://cdn.myanimelist.net/images/characters/2/284121.jpg" },
  { name: "Gojo Satoru", image: "https://cdn.myanimelist.net/images/characters/9/310307.jpg" },
  { name: "Levi Ackerman", image: "https://cdn.myanimelist.net/images/characters/2/241413.jpg" },
  { name: "Mikasa Ackerman", image: "https://cdn.myanimelist.net/images/characters/9/215563.jpg" },
  { name: "Itachi Uchiha", image: "https://cdn.myanimelist.net/images/characters/9/131317.jpg" },
  { name: "Monkey D. Luffy", image: "https://cdn.myanimelist.net/images/characters/9/310307.jpg" },
  { name: "Roronoa Zoro", image: "https://cdn.myanimelist.net/images/characters/3/100534.jpg" },
  { name: "Kakashi Hatake", image: "https://cdn.myanimelist.net/images/characters/7/284835.jpg" },
  { name: "Killua Zoldyck", image: "https://cdn.myanimelist.net/images/characters/7/298935.jpg" },
  { name: "Gon Freecss", image: "https://cdn.myanimelist.net/images/characters/11/104665.jpg" },
  { name: "Zero Two", image: "https://cdn.myanimelist.net/images/characters/9/369293.jpg" },
  { name: "Rem", image: "https://cdn.myanimelist.net/images/characters/10/339556.jpg" },
  { name: "Nezuko Kamado", image: "https://cdn.myanimelist.net/images/characters/9/380974.jpg" },
  { name: "Tanjiro Kamado", image: "https://cdn.myanimelist.net/images/characters/6/380975.jpg" },
  { name: "Todoroki Shoto", image: "https://cdn.myanimelist.net/images/characters/8/323227.jpg" },
  { name: "Bakugo Katsuki", image: "https://cdn.myanimelist.net/images/characters/3/323225.jpg" },
  { name: "Midoriya Izuku", image: "https://cdn.myanimelist.net/images/characters/8/317519.jpg" },
  { name: "Edward Elric", image: "https://cdn.myanimelist.net/images/characters/11/174517.jpg" },
  { name: "Spike Spiegel", image: "https://cdn.myanimelist.net/images/characters/4/50197.jpg" },
  { name: "Light Yagami", image: "https://cdn.myanimelist.net/images/characters/8/81474.jpg" },
  { name: "L Lawliet", image: "https://cdn.myanimelist.net/images/characters/9/82702.jpg" },
  { name: "Ryuk", image: "https://cdn.myanimelist.net/images/characters/11/82699.jpg" },
  { name: "Sasuke Uchiha", image: "https://cdn.myanimelist.net/images/characters/8/86541.jpg" },
  { name: "Hinata Hyuga", image: "https://cdn.myanimelist.net/images/characters/4/267763.jpg" },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchJikanPopular(): Promise<CharacterResult[]> {
  try {
    const r = await fetch("https://api.jikan.moe/v4/top/characters?limit=24", {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    const json = await r.json();
    return (json.data ?? []).map((c: any) => ({
      name: c.name,
      image: c.images?.jpg?.image_url ?? "",
    })).filter((c: CharacterResult) => c.image);
  } catch {
    return [];
  }
}

async function fetchAniListPopular(): Promise<CharacterResult[]> {
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: `query { Page(page:1,perPage:24){ characters(sort:FAVOURITES_DESC){ name{full} image{large} } } }`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    const json = await r.json();
    return (json.data?.Page?.characters ?? []).map((c: any) => ({
      name: c.name?.full ?? "",
      image: c.image?.large ?? "",
    })).filter((c: CharacterResult) => c.image);
  } catch {
    return [];
  }
}

async function searchJikan(term: string): Promise<CharacterResult[]> {
  try {
    const r = await fetch(
      `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(term)}&limit=20&order_by=favorites&sort=desc`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return [];
    const json = await r.json();
    return (json.data ?? []).map((c: any) => ({
      name: c.name,
      image: c.images?.jpg?.image_url ?? "",
    })).filter((c: CharacterResult) => c.image);
  } catch {
    return [];
  }
}

async function searchAniList(term: string): Promise<CharacterResult[]> {
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: `query($s:String){ Page(page:1,perPage:20){ characters(search:$s,sort:FAVOURITES_DESC){ name{full} image{large} } } }`,
        variables: { s: term },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    const json = await r.json();
    return (json.data?.Page?.characters ?? []).map((c: any) => ({
      name: c.name?.full ?? "",
      image: c.image?.large ?? "",
    })).filter((c: CharacterResult) => c.image);
  } catch {
    return [];
  }
}

function dedup(list: CharacterResult[]): CharacterResult[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = c.name.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Character Grid ───────────────────────────────────────────────────────────

function CharacterGrid({
  characters,
  selected,
  onSelect,
}: {
  characters: CharacterResult[];
  selected: string | null;
  onSelect: (img: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {characters.map((c) => (
        <button
          key={c.image}
          onClick={() => onSelect(c.image)}
          className={`flex flex-col items-center gap-1 rounded-2xl p-1.5 transition-all ${
            selected === c.image
              ? "ring-2 ring-primary bg-primary/15 scale-105"
              : "hover:bg-muted/40"
          }`}
        >
          <img
            src={c.image}
            alt={c.name}
            className="h-20 w-20 rounded-xl object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://via.placeholder.com/80x80/1a1a2e/a855f7?text=?";
            }}
          />
          <span className="text-[10px] font-semibold text-foreground/80 text-center leading-tight line-clamp-1 w-full">
            {c.name}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserAvatar({
  profile,
  size = "md",
  editable = false,
  onUpdate,
}: UserAvatarProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"popular" | "search">("popular");
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [selectedImage, setSelectedImage] = useState<string | null>(
    profile.avatar_url ?? null
  );

  // Popular tab
  const [popular, setPopular] = useState<CharacterResult[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const popularFetched = useRef(false);

  // Search tab
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CharacterResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sizeClass = SIZE_CLASSES[size];
  const gradient = AVATAR_COLORS[profile.avatar_color] ?? AVATAR_COLORS.purple;
  const avatarUrl = profile.avatar_url;

  // Load popular characters when modal opens
  useEffect(() => {
    if (!open || popularFetched.current) return;
    popularFetched.current = true;
    setPopularLoading(true);
    Promise.all([fetchJikanPopular(), fetchAniListPopular()]).then(
      ([jikan, anilist]) => {
        const merged = dedup([...jikan, ...anilist]);
        setPopular(merged.length > 0 ? merged : FALLBACK_CHARACTERS);
        setPopularLoading(false);
      }
    );
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (tab !== "search") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const [jikan, anilist] = await Promise.all([
        searchJikan(query.trim()),
        searchAniList(query.trim()),
      ]);
      const merged = dedup([...jikan, ...anilist]);
      if (merged.length > 0) {
        setSearchResults(merged);
      } else {
        // fallback filter
        const filtered = FALLBACK_CHARACTERS.filter((c) =>
          c.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
      setSearchLoading(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tab]);

  const handleSave = async () => {
    if (!user) return;
    const updatedProfile: UserProfile = {
      ...profile,
      display_name: displayName.trim() || profile.display_name,
      avatar_url: selectedImage ?? profile.avatar_url,
    };
    // Save to Supabase
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: updatedProfile.display_name,
        avatar_url: updatedProfile.avatar_url,
      })
      .eq("id", user.id);
    if (error) {
      toast.error("Failed to save avatar");
      return;
    }
    saveProfile(updatedProfile);
    onUpdate?.(updatedProfile);
    toast.success("Avatar saved!");
    setOpen(false);
  };

  return (
    <>
      {/* Avatar display */}
      <button
        onClick={() => editable && setOpen(true)}
        className={`relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${sizeClass} ${
          editable
            ? "ring-2 ring-offset-2 ring-offset-background ring-primary/40 hover:ring-primary transition-all"
            : ""
        }`}
        aria-label={editable ? "Edit avatar" : profile.display_name}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={profile.display_name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
          >
            <span>{profile.avatar_emoji}</span>
          </div>
        )}
        {editable && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground z-10">
            ✎
          </span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-t-3xl bg-card flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full glass"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Preview + name */}
            <div className="flex flex-col items-center gap-2 px-5 pb-3 flex-shrink-0">
              <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-primary/50">
                {selectedImage ? (
                  <img src={selectedImage} alt="preview" className="h-full w-full object-cover" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="current" className="h-full w-full object-cover" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-4xl`}>
                    {profile.avatar_emoji}
                  </div>
                )}
              </div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={24}
                className="rounded-xl glass px-3 py-2 text-center text-sm font-bold text-foreground outline-none w-48"
                placeholder="Display name"
              />
              {(selectedImage || avatarUrl) && (
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-[11px] text-muted-foreground hover:text-neon-pink transition-colors"
                >
                  Use emoji fallback
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/50 flex-shrink-0 px-5">
              {(["popular", "search"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                    tab === t
                      ? "text-neon-pink border-b-2 border-neon-pink"
                      : "text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Search input */}
            {tab === "search" && (
              <div className="px-5 pt-3 flex-shrink-0">
                <div className="flex items-center gap-2 rounded-xl glass px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search any character..."
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button onClick={() => { setQuery(""); setSearchResults([]); }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable grid */}
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4 min-h-0">
              {/* Popular */}
              {tab === "popular" && (
                popularLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <CharacterGrid
                    characters={popular}
                    selected={selectedImage}
                    onSelect={setSelectedImage}
                  />
                )
              )}

              {/* Search */}
              {tab === "search" && (
                <>
                  {!query.trim() && (
                    <p className="text-center text-sm text-muted-foreground py-12">
                      Type a character name to search
                    </p>
                  )}
                  {query.trim() && searchLoading && (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {query.trim() && !searchLoading && searchResults.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-12">
                      No characters found for "{query}"
                    </p>
                  )}
                  {query.trim() && !searchLoading && searchResults.length > 0 && (
                    <CharacterGrid
                      characters={searchResults}
                      selected={selectedImage}
                      onSelect={setSelectedImage}
                    />
                  )}
                </>
              )}
            </div>

            {/* Save button */}
            <div className="px-5 pb-8 pt-2 flex-shrink-0 border-t border-border/30">
              <button
                onClick={handleSave}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground"
              >
                Save Avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
