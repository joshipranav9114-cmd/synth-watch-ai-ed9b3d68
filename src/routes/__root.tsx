import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#16091f" },
      { title: "AniVerse — AI Anime Universe" },
      { name: "description", content: "Cinematic AI-powered anime discovery, watchlist, and assistant." },
      { property: "og:title", content: "AniVerse — AI Anime Universe" },
      { name: "twitter:title", content: "AniVerse — AI Anime Universe" },
      { property: "og:description", content: "Cinematic AI-powered anime discovery, watchlist, and assistant." },
      { name: "twitter:description", content: "Cinematic AI-powered anime discovery, watchlist, and assistant." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9f2d94ab-6a12-412e-95eb-8696802c6cc1" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9f2d94ab-6a12-412e-95eb-8696802c6cc1" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Bebas+Neue&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster theme="dark" position="top-center" />
    </AuthProvider>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
