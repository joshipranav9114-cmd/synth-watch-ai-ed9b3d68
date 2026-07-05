import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

type JikanItem = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  score: number | null;
  year: number | null;
  genres?: { name: string }[];
  images?: { jpg?: { large_image_url?: string } };
  aired?: { from?: string | null };
};

const CATEGORY_PATH: Record<string, string> = {
  top: "/top/anime?limit=12",
  current_season: "/seasons/now?limit=12",
  upcoming: "/seasons/upcoming?limit=12",
};

export default defineTool({
  name: "list_anime",
  title: "List anime by category",
  description:
    "Browse curated anime lists on AniVerse: top-rated, currently airing this season, or upcoming releases.",
  inputSchema: {
    category: z
      .enum(["top", "current_season", "upcoming"])
      .describe("Which curated list to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ category }) => {
    const res = await fetch(`https://api.jikan.moe/v4${CATEGORY_PATH[category]}`);
    if (!res.ok) {
      return { content: [{ type: "text", text: `Jikan error ${res.status}` }], isError: true };
    }
    const json = (await res.json()) as { data: JikanItem[] };
    const results = json.data.map((a) => ({
      id: a.mal_id,
      title: a.title_english || a.title,
      score: a.score,
      year: a.year ?? (a.aired?.from ? new Date(a.aired.from).getFullYear() : null),
      genres: a.genres?.map((g) => g.name) ?? [],
      image: a.images?.jpg?.large_image_url ?? null,
      aired_from: a.aired?.from ?? null,
      url: `https://synth-watch-ai.lovable.app/anime/${a.mal_id}`,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { category, results },
    };
  },
});