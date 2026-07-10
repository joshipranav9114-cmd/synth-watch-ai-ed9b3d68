import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { StatusPicker } from "@/components/StatusPicker";
import { EMPTY_MESSAGE, STATUS_META, STATUS_ORDER, type WatchStatus } from "@/lib/watchlist-status";

export const Route = createFileRoute("/_app/watchlist")({ component: Watchlist });

type Item = { id: string; anime_id: string; anime_title: string; anime_image: string | null; status: WatchStatus };

function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | WatchStatus>("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("watchlist").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setItems((data as Item[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const remove = async (id: string) => {
    const prev = items;
    setItems(items.filter((i) => i.id !== id));
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    if (error) { setItems(prev); toast.error(error.message); }
  };

  const updateStatus = async (id: string, status: WatchStatus) => {
    const prev = items;
    setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));
    const { error } = await supabase.from("watchlist").update({ status }).eq("id", id);
    if (error) { setItems(prev); toast.error(error.message); return; }
    toast.success(`Marked as ${STATUS_META[status].label}`);
  };

  const counts = useMemo(() => {
    const c: Record<"all" | WatchStatus, number> = { all: items.length, watching: 0, completed: 0, planned: 0, dropped: 0 };
    for (const it of items) if (it.status in c) c[it.status]++;
    return c;
  }, [items]);

  const filtered = tab === "all" ? items : items.filter((i) => i.status === tab);
  const tabs: Array<{ key: "all" | WatchStatus; label: string; icon?: string }> = [
    { key: "all", label: "All" },
    ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_META[s].label, icon: STATUS_META[s].icon })),
  ];

  return (
    <main className="px-5 pt-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neon-pink">AniVerse AI</p>
        <h1 className="text-3xl font-extrabold text-foreground">Your Trophy Room</h1>
        <p className="mt-1 text-sm text-muted-foreground">A sanctuary of stories that shaped you.</p>
      </div>

      <div className="-mx-5 mb-5 overflow-x-auto smooth-scroll">
        <div className="flex gap-2 px-5 pb-1">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  active
                    ? "bg-gradient-hero text-primary-foreground shadow-neon"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon && <span>{t.icon}</span>}
                <span>{t.label}</span>
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-background/25" : "bg-primary/20 text-neon-pink"}`}>
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl glass">
            <Bookmark className="h-8 w-8 text-neon-cyan" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">Nothing here yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{EMPTY_MESSAGE[tab]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-2xl glass p-2">
              <Link to="/anime/$id" params={{ id: it.anime_id }} className="flex flex-1 items-center gap-3 min-w-0">
                {it.anime_image && (
                  <img src={it.anime_image} alt="" className="h-20 w-16 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-bold text-foreground">{it.anime_title}</p>
                  <div className="mt-1.5">
                    <StatusPicker status={it.status} onChange={(s) => updateStatus(it.id, s)} />
                  </div>
                </div>
              </Link>
              <button onClick={() => remove(it.id)} className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
