import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MessageSquare, Users, Flame, Search } from "lucide-react";
import { getRooms, type RoomSummary, timeAgo } from "@/lib/community";
import { useTopAnime } from "@/lib/anime-data";

export const Route = createFileRoute("/_app/community")({ component: Community });

const SEED_ROOMS = [
  { anime_id: "16498", anime_title: "Attack on Titan", anime_image: "https://cdn.myanimelist.net/images/anime/10/47347l.jpg" },
  { anime_id: "38000", anime_title: "Demon Slayer", anime_image: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg" },
  { anime_id: "21",    anime_title: "One Piece",       anime_image: "https://cdn.myanimelist.net/images/anime/6/73245l.jpg" },
  { anime_id: "11061", anime_title: "Hunter x Hunter", anime_image: "https://cdn.myanimelist.net/images/anime/11/33657l.jpg" },
  { anime_id: "31240", anime_title: "Re:Zero",         anime_image: "https://cdn.myanimelist.net/images/anime/11/78922l.jpg" },
  { anime_id: "32281", anime_title: "Your Name",       anime_image: "https://cdn.myanimelist.net/images/anime/5/87048l.jpg" },
];

function RoomCard({ room }: { room: RoomSummary }) {
  const isActive = Date.now() - new Date(room.last_active).getTime() < 3600000;
  const activeCount = isActive ? room.message_count : 0;

  return (
    <Link
      to="/community/$animeId"
      params={{ animeId: room.anime_id }}
      className="flex items-center gap-3 rounded-2xl glass p-3.5 hover:bg-muted/30 transition-colors active:scale-[0.98] tap-scale"
    >
      <div className="relative h-14 w-10 flex-shrink-0 rounded-xl overflow-hidden">
        <img src={room.anime_image} alt={room.anime_title} className="h-full w-full object-cover" />
        {activeCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-neon-pink text-[9px] font-bold text-white">
            {activeCount}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{room.anime_title}</p>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {room.message_count}
          </span>
          <span>{timeAgo(room.last_active)}</span>
        </div>
      </div>
      <div className="flex items-center text-neon-pink">
        <span className="text-lg">›</span>
      </div>
    </Link>
  );
}

export default function Community() {
  const nav = useNavigate();
  const { data: topAnime } = useTopAnime();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    getRooms().then((stored) => {
      if (!alive) return;
      const byId = new Map<string, RoomSummary>(stored.map((r) => [r.anime_id, r]));
      SEED_ROOMS.forEach((seed) => {
        if (!byId.has(seed.anime_id)) {
          byId.set(seed.anime_id, {
            ...seed,
            message_count: 0,
            last_active: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
          });
        }
      });
      setRooms(
        Array.from(byId.values()).sort(
          (a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime(),
        ),
      );
    });
    return () => { alive = false; };
  }, []);

  const filtered = rooms.filter((r) =>
    !query || r.anime_title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="px-4 pt-10 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero">
            <Users className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Community</h1>
        </div>
        <p className="text-xs text-muted-foreground ml-10">
          Discuss anime with fellow fans in real time
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-2xl glass px-4 py-2.5 mb-5">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms…"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: "Rooms", value: rooms.length, color: "text-neon-cyan" },
          { label: "Messages", value: rooms.reduce((s, r) => s + r.message_count, 0), color: "text-neon-pink" },
          { label: "Active now", value: rooms.filter(r => Date.now() - new Date(r.last_active).getTime() < 3600000).length, color: "text-neon-orange" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl glass p-3 text-center">
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Hot rooms section */}
      {!query && (
        <div className="mb-2 flex items-center gap-2">
          <Flame className="h-4 w-4 text-neon-orange" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-neon-orange">
            Active Rooms
          </h2>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">No rooms found</p>
        ) : (
          filtered.map((room) => <RoomCard key={room.anime_id} room={room} />)
        )}
      </div>

      {/* Quick jump from currently trending */}
      {!query && topAnime && topAnime.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neon-cyan">
            Trending — Join the chat
          </h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {topAnime.slice(0, 8).map((anime) => (
              <Link
                key={anime.id}
                to="/community/$animeId"
                params={{ animeId: anime.id }}
                className="flex-shrink-0 rounded-xl glass px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors max-w-[120px] truncate"
              >
                {anime.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
