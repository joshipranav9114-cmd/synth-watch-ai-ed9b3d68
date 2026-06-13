import { useState, useRef, useEffect } from "react";
import { Bell, Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useUpcomingAnime } from "@/lib/anime-data";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: upcoming, isLoading } = useUpcomingAnime();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const hasUpcoming = (upcoming?.length ?? 0) > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full glass press"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {hasUpcoming && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gradient-orange shadow-orange" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl glass border border-border p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Calendar className="h-3.5 w-3.5 text-neon-orange" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-neon-orange">
              Coming Soon
            </h3>
          </div>

          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {isLoading && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                Loading upcoming anime…
              </p>
            )}

            {!isLoading && !hasUpcoming && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No upcoming releases found right now.
              </p>
            )}

            {upcoming?.map((anime) => (
              <Link
                key={anime.id}
                to="/anime/$id"
                params={{ id: anime.id }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-muted/40 transition-colors"
              >
                <img
                  src={anime.image}
                  alt={anime.title}
                  className="h-12 w-9 flex-shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{anime.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {anime.year > 0 ? `Releasing ${anime.year}` : "Release date TBA"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
