import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchAnime from "./tools/search-anime";
import getAnime from "./tools/get-anime";
import listAnime from "./tools/list-anime";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aniverse-mcp",
  title: "AniVerse",
  version: "0.1.0",
  instructions:
    "Tools for AniVerse, an anime discovery app. Use `search_anime` to find anime by keyword, `get_anime` to fetch full details for a MyAnimeList ID, and `list_anime` to browse top-rated, current-season, or upcoming anime. Each result includes a direct link back to the AniVerse detail page.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchAnime, getAnime, listAnime],
});