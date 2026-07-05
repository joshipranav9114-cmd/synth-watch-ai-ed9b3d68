import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_anime",
  title: "Get anime details",
  description:
    "Fetch full details for a single anime by MyAnimeList ID: title, score, episodes, studios, genres, synopsis, trailer, and the AniVerse detail URL.",
  inputSchema: {
    id: z.number().int().positive().describe("MyAnimeList ID of the anime."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ id }) => {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
    if (!res.ok) {
      return { content: [{ type: "text", text: `Jikan error ${res.status}` }], isError: true };
    }
    const { data: a } = (await res.json()) as { data: Record<string, unknown> };
    const anime = a as {
      mal_id: number;
      title: string;
      title_english?: string | null;
      score: number | null;
      episodes: number | null;
      status?: string;
      year: number | null;
      genres?: { name: string }[];
      studios?: { name: string }[];
      synopsis: string | null;
      trailer?: { youtube_id?: string | null; url?: string | null };
      images?: { jpg?: { large_image_url?: string } };
      aired?: { from?: string | null; to?: string | null };
    };
    const result = {
      id: anime.mal_id,
      title: anime.title_english || anime.title,
      score: anime.score,
      episodes: anime.episodes,
      status: anime.status,
      year: anime.year,
      aired: anime.aired,
      genres: anime.genres?.map((g) => g.name) ?? [],
      studios: anime.studios?.map((s) => s.name) ?? [],
      synopsis: anime.synopsis,
      trailer_url: anime.trailer?.url ?? null,
      image: anime.images?.jpg?.large_image_url ?? null,
      url: `https://synth-watch-ai.lovable.app/anime/${anime.mal_id}`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});