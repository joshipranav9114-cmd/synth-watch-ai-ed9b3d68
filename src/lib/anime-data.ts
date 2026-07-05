import { useQueries, useQuery } from "@tanstack/react-query";

export type Anime = {
  id: string;
  malId: number;
  title: string;
  image: string;
  genres: string[];
  rating: number;
  year: number;
  episodes: number;
  studio: string;
  match: number;
  synopsis: string;
  youtubeId?: string;
};

const JIKAN = "https://api.jikan.moe/v4";

type JikanAnime = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images: { jpg: { large_image_url: string; image_url: string } };
  score: number | null;
  genres: { name: string }[];
  year: number | null;
  episodes: number | null;
  studios: { name: string }[];
  synopsis: string | null;
  aired?: { from?: string | null };
  trailer?: {
    youtube_id?: string | null;
    url?: string | null;
    embed_url?: string | null;
  };
};

function extractYouTubeId(trailer?: JikanAnime["trailer"]): string | undefined {
  if (!trailer) return undefined;
  if (trailer.youtube_id && trailer.youtube_id.trim()) return trailer.youtube_id;

  const parse = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    try {
      const u = new URL(url);
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2].split("?")[0];
      if (u.host.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
      if (u.host.includes("youtube.com") || u.host.includes("youtube-nocookie.com")) {
        return u.searchParams.get("v") || u.searchParams.get("video_id") || undefined;
      }
    } catch {
      return undefined;
    }
  };

  return parse(trailer.embed_url) || parse(trailer.url);
}

export function normalize(a: JikanAnime): Anime {
  // deterministic "AI match %" derived from score so it stays consistent
  const score = a.score ?? 7.5;
  const match = Math.min(99, Math.max(75, Math.round(score * 10 + (a.mal_id % 7))));
  const rawTrailer = a.trailer?.youtube_id;
  return {
    id: String(a.mal_id),
    malId: a.mal_id,
    title: a.title_english || a.title,
    image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
    genres: a.genres?.map((g) => g.name) ?? [],
    rating: score,
    year: a.year ?? (a.aired?.from ? new Date(a.aired.from).getFullYear() : 0),
    episodes: a.episodes ?? 0,
    studio: a.studios?.[0]?.name ?? "—",
    match,
    synopsis: a.synopsis ?? "No synopsis available.",
    youtubeId: rawTrailer && rawTrailer.trim() ? rawTrailer : undefined,
  };
}

async function jfetch<T>(path: string): Promise<T> {
  const res = await fetch(`${JIKAN}${path}`);
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  return (await res.json()) as T;
}

// MAL IDs for the featured anime requested by the user
export const FEATURED_IDS = [
  21,    // One Piece
  16498, // Attack on Titan
  38000, // Demon Slayer
  31240, // Re:Zero
  11061, // Hunter x Hunter (2011)
  32281, // Your Name
  918,   // Gintama
];

export function useTopAnime() {
  return useQuery({
    queryKey: ["jikan", "top"],
    queryFn: async () => {
      const r = await jfetch<{ data: JikanAnime[] }>("/top/anime?limit=12");
      return r.data.map(normalize);
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useSeasonalAnime() {
  return useQuery({
    queryKey: ["jikan", "season"],
    queryFn: async () => {
      const r = await jfetch<{ data: JikanAnime[] }>("/seasons/now?limit=12");
      return r.data.map(normalize);
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useUpcomingAnime() {
  return useQuery({
    queryKey: ["jikan", "upcoming"],
    queryFn: async () => {
      const r = await jfetch<{ data: JikanAnime[] }>("/seasons/upcoming?limit=10");
      return r.data.map(normalize);
    },
    staleTime: 1000 * 60 * 60 * 6,
  });
}

export function useFeaturedAnime() {
  const queries = useQueries({
    queries: FEATURED_IDS.map((id) => ({
      queryKey: ["jikan", "anime", id],
      queryFn: async () => {
        const r = await jfetch<{ data: JikanAnime }>(`/anime/${id}`);
        return normalize(r.data);
      },
      staleTime: 1000 * 60 * 60 * 6,
    })),
  });
  const data = queries.map((q) => q.data).filter(Boolean) as Anime[];
  const isLoading = queries.some((q) => q.isLoading);
  return { data, isLoading };
}

export function useAnimeById(id: string | number) {
  return useQuery({
    queryKey: ["jikan", "anime", String(id)],
    queryFn: async () => {
      const r = await jfetch<{ data: JikanAnime }>(`/anime/${id}/full`);
      return normalize(r.data);
    },
    staleTime: 1000 * 60 * 60,
    enabled: !!id,
  });
}

export function useSearchAnime(q: string, genre: string) {
  // Jikan genre IDs
  const genreMap: Record<string, number> = {
    Action: 1,
    Adventure: 2,
    Comedy: 4,
    Drama: 8,
    Fantasy: 10,
    Romance: 22,
    "Sci-Fi": 24,
    "Slice of Life": 36,
    Supernatural: 37,
    Mecha: 18,
  };
  const params = new URLSearchParams({ limit: "24", order_by: "score", sort: "desc", sfw: "true" });
  if (q) params.set("q", q);
  if (genre && genre !== "All" && genreMap[genre]) params.set("genres", String(genreMap[genre]));

  return useQuery({
    queryKey: ["jikan", "search", q, genre],
    queryFn: async () => {
      const r = await jfetch<{ data: JikanAnime[] }>(`/anime?${params.toString()}`);
      return r.data.map(normalize);
    },
    staleTime: 1000 * 60 * 5,
  });
}