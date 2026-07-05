import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

type JikanSearchItem = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  score: number | null;
  year: number | null;
  episodes: number | null;
  synopsis: string | null;
  genres?: { name: string }[];
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
};

export default defineTool({
  name: "search_anime",
  title: "Search anime",
  description:
    "Search the AniVerse anime catalog by keyword. Returns matching anime with title, score, year, genres, synopsis, cover image, and the AniVerse detail URL.",
  inputSchema: {
    query: z.string().min(1).describe("Search query, e.g. an anime title or keyword."),
    limit: z.number().int().min(1).max(20).optional().describe("Max results (default 8)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ query, limit }) => {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit ?? 8),
      order_by: "score",
      sort: "desc",
      sfw: "true",
    });
    const res = await fetch(`https://api.jikan.moe/v4/anime?${params.toString()}`);
    if (!res.ok) {
      return { content: [{ type: "text", text: `Jikan error ${res.status}` }], isError: true };
    }
    const json = (await res.json()) as { data: JikanSearchItem[] };
    const results = json.data.map((a) => ({
      id: a.mal_id,
      title: a.title_english || a.title,
      score: a.score,
      year: a.year,
      episodes: a.episodes,
      genres: a.genres?.map((g) => g.name) ?? [],
      synopsis: a.synopsis,
      image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
      url: `https://synth-watch-ai.lovable.app/anime/${a.mal_id}`,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { results },
    };
  },
});