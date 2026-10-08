# Restore the AniVerse home page

## Goal
Make `/home` render its full set of anime sections reliably, even when Jikan data cannot be reached.

## Findings
- `AnimeOfTheDay` and `useAnimeOfTheDay` both exist and are exported; the import paths used by the home page match.
- The latest recorded preview build is successful, with no recorded runtime exception.
- Preview telemetry shows failed network requests to Jikan, including the featured, seasonal, and top-anime requests. The hero currently keeps a large loading placeholder when featured data is unavailable.

## Work
1. Keep the existing home-page sections and check the remaining render dependencies for errors that could stop the page.
2. Make anime-dependent sections fail gracefully when Jikan requests fail, so the hero and content rails show useful empty or fallback states rather than indefinite blank loading space. Retain Anime of the Day unless an actual render crash is found; React error handling will not be added as an ineffective try/catch.
3. Add unique `/home` page metadata and verify the preview renders the hero, Continue Watching, Latest Episodes, For You, Top 10, and Simulcast sections without a page exception.

## Technical details
- Limit changes to the home route and the shared anime-data/rendering code needed for resilient Jikan failure handling.
- Preserve the current AniVerse visual style and section order.
