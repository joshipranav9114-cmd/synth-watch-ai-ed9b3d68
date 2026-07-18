import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, ImagePlus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AVATAR_COLORS, type UserProfile, saveProfile } from "@/lib/community";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CharacterResult { name: string; image: string; }

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

// ─── Fallback characters ──────────────────────────────────────────────────────

const FALLBACK: CharacterResult[] = [
  { name: "Naruto Uzumaki",   image: "https://cdn.myanimelist.net/images/characters/2/284121.jpg" },
  { name: "Levi Ackerman",    image: "https://cdn.myanimelist.net/images/characters/2/241413.jpg" },
  { name: "Gojo Satoru",      image: "https://cdn.myanimelist.net/images/characters/9/310307.jpg" },
  { name: "Mikasa Ackerman",  image: "https://cdn.myanimelist.net/images/characters/9/215563.jpg" },
  { name: "Itachi Uchiha",    image: "https://cdn.myanimelist.net/images/characters/9/131317.jpg" },
  { name: "Killua Zoldyck",   image: "https://cdn.myanimelist.net/images/characters/7/298935.jpg" },
  { name: "Gon Freecss",      image: "https://cdn.myanimelist.net/images/characters/11/104665.jpg" },
  { name: "Roronoa Zoro",     image: "https://cdn.myanimelist.net/images/characters/3/100534.jpg" },
  { name: "Monkey D. Luffy",  image: "https://cdn.myanimelist.net/images/characters/17/163128.jpg" },
  { name: "Zero Two",         image: "https://cdn.myanimelist.net/images/characters/9/369293.jpg" },
  { name: "Rem",              image: "https://cdn.myanimelist.net/images/characters/10/339556.jpg" },
  { name: "Nezuko Kamado",    image: "https://cdn.myanimelist.net/images/characters/9/380974.jpg" },
  { name: "Tanjiro Kamado",   image: "https://cdn.myanimelist.net/images/characters/6/380975.jpg" },
  { name: "Todoroki Shoto",   image: "https://cdn.myanimelist.net/images/characters/8/323227.jpg" },
  { name: "Bakugo Katsuki",   image: "https://cdn.myanimelist.net/images/characters/3/323225.jpg" },
  { name: "Midoriya Izuku",   image: "https://cdn.myanimelist.net/images/characters/8/317519.jpg" },
  { name: "Sasuke Uchiha",    image: "https://cdn.myanimelist.net/images/characters/8/86541.jpg" },
  { name: "Kakashi Hatake",   image: "https://cdn.myanimelist.net/images/characters/7/284835.jpg" },
  { name: "Edward Elric",     image: "https://cdn.myanimelist.net/images/characters/11/174517.jpg" },
  { name: "L Lawliet",        image: "https://cdn.myanimelist.net/images/characters/9/82702.jpg" },
  { name: "Light Yagami",     image: "https://cdn.myanimelist.net/images/characters/8/81474.jpg" },
  { name: "Eren Yeager",      image: "https://cdn.myanimelist.net/images/characters/10/216895.jpg" },
  { name: "Hinata Hyuga",     image: "https://cdn.myanimelist.net/images/characters/4/267763.jpg" },
  { name: "Spike Spiegel",    image: "https://cdn.myanimelist.net/images/characters/4/50197.jpg" },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchPopular(): Promise<CharacterResult[]> {
  try {
    const [jRes, aRes] = await Promise.allSettled([
      fetch("https://api.jikan.moe/v4/top/characters?limit=24", { signal: AbortSignal.timeout(5000) }),
      fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `{ Page(perPage:24){ characters(sort:FAVOURITES_DESC){ name{full} image{large} } } }` }),
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    const results: CharacterResult[] = [];

    if (jRes.status === "fulfilled" && jRes.value.ok) {
      const j = await jRes.value.json();
      (j.data ?? []).forEach((c: any) => {
        if (c.images?.jpg?.image_url) results.push({ name: c.name, image: c.images.jpg.image_url });
      });
    }

    if (aRes.status === "fulfilled" && aRes.value.ok) {
      const a = await aRes.value.json();
      (a.data?.Page?.characters ?? []).forEach((c: any) => {
        if (c.image?.large) results.push({ name: c.name?.full ?? "", image: c.image.large });
      });
    }

    if (results.length === 0) return FALLBACK;

    // Deduplicate
    const seen = new Set<string>();
    return results.filter((r) => {
      const k = r.name.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  } catch {
    return FALLBACK;
  }
}

async function searchChars(term: string): Promise<CharacterResult[]> {
  try {
    const [jRes, aRes] = await Promise.allSettled([
      fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(term)}&limit=20&order_by=favorites&sort=desc`, { signal: AbortSignal.timeout(5000) }),
      fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `query($s:String){ Page(perPage:20){ characters(search:$s,sort:FAVOURITES_DESC){ name{full} image{large} } } }`, variables: { s: term } }),
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    const results: CharacterResult[] = [];

    if (jRes.status === "fulfilled" && jRes.value.ok) {
      const j = await jRes.value.json();
      (j.data ?? []).forEach((c: any) => {
        if (c.images?.jpg?.image_url) results.push({ name: c.name, image: c.images.jpg.image_url });
      });
    }
    if (aRes.status === "fulfilled" && aRes.value.ok) {
      const a = await aRes.value.json();
      (a.data?.Page?.characters ?? []).forEach((c: any) => {
        if (c.image?.large) results.push({ name: c.name?.full ?? "", image: c.image.large });
      });
    }

    if (results.length > 0) {
      const seen = new Set<string>();
      return results.filter((r) => { const k = r.name.toLowerCase().replace(/\s/g, ""); if (seen.has(k)) return false; seen.add(k); return true; });
    }

    return FALLBACK.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()));
  } catch {
    return FALLBACK.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()));
  }
}

// Resize gallery image to 200x200 JPEG base64
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 200;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // Crop to square from center
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ─── Avatar display component ─────────────────────────────────────────────────

export function UserAvatar({ profile, size = "md", editable = false, onUpdate }: UserAvatarProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const gradient = AVATAR_COLORS[profile.avatar_color] ?? AVATAR_COLORS.purple;
  const sizeClass = SIZE_CLASSES[size];

  return (
    <>
      <button
        onClick={() => editable && setOpen(true)}
        className={`relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${sizeClass} ${editable ? "ring-2 ring-offset-2 ring-offset-background ring-primary/40 hover:ring-primary transition-all" : ""}`}
        aria-label={editable ? "Edit avatar" : profile.display_name}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
            <span>{profile.avatar_emoji}</span>
          </div>
        )}
        {editable && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white z-10 shadow">✎</span>
        )}
      </button>

      {open && user && (
        <EditProfileModal
          profile={profile}
          userId={user.id}
          onClose={() => setOpen(false)}
          onSave={(updated) => { onUpdate?.(updated); setOpen(false); }}
        />
      )}
    </>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

type Tab = "gallery" | "popular" | "search";

function EditProfileModal({
  profile,
  userId,
  onClose,
  onSave,
}: {
  profile: UserProfile;
  userId: string;
  onClose: () => void;
  onSave: (p: UserProfile) => void;
}) {
  const [tab, setTab] = useState<Tab>("gallery");
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [selectedImage, setSelectedImage] = useState<string | null>(profile.avatar_url ?? null);
  const [saving, setSaving] = useState(false);

  // Popular tab
  const [popular, setPopular] = useState<CharacterResult[]>([]);
  const [popLoading, setPopLoading] = useState(false);
  const popFetched = useRef(false);

  // Search tab
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CharacterResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load popular on tab open
  useEffect(() => {
    if (tab !== "popular" || popFetched.current) return;
    popFetched.current = true;
    setPopLoading(true);
    fetchPopular().then((r) => { setPopular(r); setPopLoading(false); });
  }, [tab]);

  // Debounced search
  useEffect(() => {
    if (tab !== "search") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const r = await searchChars(query.trim());
      setSearchResults(r);
      setSearchLoading(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tab]);

  const handleGalleryPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast("Processing image...");
      const base64 = await resizeImage(file);
      setSelectedImage(base64);
      toast.success("Image ready — tap Save!");
    } catch {
      toast.error("Couldn't load that image, try another");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const updated: UserProfile = {
      ...profile,
      display_name: displayName.trim() || profile.display_name,
      avatar_url: selectedImage,
    };
    // upsert guarantees the row is created/updated even if it doesn't exist yet
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        display_name: updated.display_name,
        avatar_url: updated.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) { toast.error("Save failed — try again"); return; }
    saveProfile(updated);    // also persist to localStorage as backup
    toast.success("Profile saved!");
    onSave(updated);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "gallery",  label: "📷 Gallery" },
    { id: "popular",  label: "⭐ Popular" },
    { id: "search",   label: "🔍 Search" },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
      style={{ touchAction: "none" }}
    >
      {/* Sheet — full width, anchored to bottom, 85% screen height */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-[#0f0c1a] flex flex-col"
        style={{ height: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── TOP BAR ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <h2 className="text-lg font-extrabold text-white">Edit Profile</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* ── PREVIEW ROW ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-5 pb-4 flex-shrink-0">
          <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-purple-500 flex-shrink-0">
            {selectedImage ? (
              <img src={selectedImage} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[profile.avatar_color]} text-2xl`}>
                {profile.avatar_emoji}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
              placeholder="Display name"
              style={{ fontSize: "16px" }}  // prevents mobile zoom
              className="w-full rounded-xl bg-white/10 px-3 py-2 font-bold text-white outline-none placeholder:text-white/40 border border-white/10"
            />
            {selectedImage && (
              <button onClick={() => setSelectedImage(null)} className="text-xs text-purple-400 hover:text-white transition-colors">
                Remove photo
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ────────────────────────────────────────────────── */}
        <div className="flex border-b border-white/10 flex-shrink-0 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tab === t.id ? "text-purple-400 border-b-2 border-purple-400" : "text-white/40"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SCROLLABLE CONTENT ──────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-4 pt-4 pb-2"
          style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
        >

          {/* Gallery tab */}
          {tab === "gallery" && (
            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-purple-500/50 py-8 text-purple-400 hover:border-purple-400 hover:bg-purple-500/5 transition-colors"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-sm font-bold">Choose from Gallery</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryPick}
              />
              <p className="text-center text-xs text-white/30">
                Picks from your phone's photo gallery
              </p>
              {selectedImage && (
                <div className="rounded-2xl bg-white/5 p-3 flex items-center gap-3">
                  <img src={selectedImage} alt="selected" className="h-12 w-12 rounded-xl object-cover" />
                  <div>
                    <p className="text-sm font-bold text-white">Photo selected ✓</p>
                    <p className="text-xs text-white/40">Tap Save to apply</p>
                  </div>
                </div>
              )}
              <div className="pt-2">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Or pick a character below</p>
                <div className="flex gap-2">
                  <button onClick={() => setTab("popular")} className="flex-1 rounded-xl bg-white/5 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10 transition-colors">⭐ Popular</button>
                  <button onClick={() => setTab("search")} className="flex-1 rounded-xl bg-white/5 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10 transition-colors">🔍 Search</button>
                </div>
              </div>
            </div>
          )}

          {/* Popular tab */}
          {tab === "popular" && (
            popLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {popular.map((c) => (
                  <CharCard key={c.image} c={c} selected={selectedImage === c.image} onSelect={setSelectedImage} />
                ))}
              </div>
            )
          )}

          {/* Search tab */}
          {tab === "search" && (
            <div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-3 py-2 mb-4">
                <Search className="h-4 w-4 text-white/40 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any anime character..."
                  autoComplete="off"
                  style={{ fontSize: "16px" }} // prevents mobile zoom!
                  className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
                />
                {query && (
                  <button onClick={() => { setQuery(""); setSearchResults([]); }}>
                    <X className="h-4 w-4 text-white/40" />
                  </button>
                )}
              </div>

              {!query.trim() && (
                <p className="text-center text-sm text-white/30 py-8">Type a character name above</p>
              )}
              {query.trim() && searchLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              )}
              {query.trim() && !searchLoading && searchResults.length === 0 && (
                <p className="text-center text-sm text-white/30 py-8">No results for "{query}"</p>
              )}
              {query.trim() && !searchLoading && searchResults.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {searchResults.map((c) => (
                    <CharCard key={c.image} c={c} selected={selectedImage === c.image} onSelect={setSelectedImage} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SAVE BUTTON — always visible ────────────────────────── */}
        <div className="flex-shrink-0 px-5 pt-3 pb-8 border-t border-white/10 bg-[#0f0c1a]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 py-4 text-base font-extrabold uppercase tracking-widest text-white shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? "Saving..." : "✓  Save Profile"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Character card ───────────────────────────────────────────────────────────

function CharCard({ c, selected, onSelect }: { c: CharacterResult; selected: boolean; onSelect: (img: string) => void }) {
  return (
    <button
      onClick={() => onSelect(c.image)}
      className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-all active:scale-95 ${selected ? "ring-2 ring-purple-500 bg-purple-500/20 scale-105" : "hover:bg-white/5"}`}
    >
      <img
        src={c.image}
        alt={c.name}
        className="h-[80px] w-full rounded-xl object-cover"
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/80x80/1a1a2e/a855f7?text=?"; }}
      />
      <span className="text-[10px] font-semibold text-white/70 text-center leading-tight line-clamp-2 w-full px-0.5">
        {c.name}
      </span>
    </button>
  );
}
