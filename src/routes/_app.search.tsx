import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { useSearchAnime, type SearchFilters } from "@/lib/anime-data";
import { AnimeCard } from "@/components/AnimeCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/search")({ component: Search });

const GENRES = ["All", "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance", "Sci-Fi", "Slice of Life", "Supernatural", "Mecha"];
const YEARS = ["Any", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2015-2017", "2010-2014", "Before 2010"];
const RATINGS = ["Any", "9+", "8+", "7+", "6+"];
const TYPES = ["Any", "TV", "Movie", "OVA", "Special"];
const STATUSES = ["Any", "Airing", "Completed", "Upcoming"];
const ORDERS = ["Popularity", "Score", "Title", "Newest"];

const DEFAULT_FILTERS: SearchFilters = {
  year: "Any",
  minScore: "Any",
  type: "Any",
  status: "Any",
  orderBy: "Score",
};

function Search() {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const { data: results, isLoading } = useSearchAnime(q, genre, filters);

  const activeCount =
    (filters.year !== "Any" ? 1 : 0) +
    (filters.minScore !== "Any" ? 1 : 0) +
    (filters.type !== "Any" ? 1 : 0) +
    (filters.status !== "Any" ? 1 : 0) +
    (filters.orderBy !== "Score" ? 1 : 0) +
    (genre !== "All" ? 1 : 0);

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setGenre("All");
  };

  const chipBtn = (active: boolean) =>
    `flex-shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
      active ? "bg-gradient-to-r from-neon-pink to-neon-cyan text-primary-foreground shadow-neon" : "glass text-muted-foreground"
    }`;

  return (
    <main className="bg-mesh px-5 pt-6 min-h-screen">
      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-neon-orange">Explore</p>
      <h1 className="heading-1 text-foreground">
        Discover <span className="text-gradient-neon">Anime</span>
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">Search 4,200+ timelines, studios & characters</p>

      <div className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search anime, studios, characters..."
            className="h-13 w-full rounded-2xl glass pl-11 pr-4 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`relative flex-shrink-0 h-13 w-13 rounded-2xl grid place-items-center press ${
            showFilters || activeCount > 0 ? "bg-gradient-hero text-primary-foreground shadow-neon" : "glass text-foreground"
          }`}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-neon-pink text-[10px] font-black text-primary-foreground grid place-items-center shadow-neon">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          showFilters ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="heading-eyebrow text-neon-cyan">Filters</p>
              <button onClick={clearAll} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neon-pink press">
                <X className="h-3 w-3" /> Clear all
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Year</p>
              <select
                value={filters.year}
                onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
                className="w-full h-9 rounded-xl bg-background/60 border border-border px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <FilterRow label="Rating" options={RATINGS} value={filters.minScore!} onChange={(v) => setFilters((f) => ({ ...f, minScore: v }))} chipBtn={chipBtn} />
            <FilterRow label="Type" options={TYPES} value={filters.type!} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} chipBtn={chipBtn} />
            <FilterRow label="Status" options={STATUSES} value={filters.status!} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} chipBtn={chipBtn} />
            <FilterRow label="Order By" options={ORDERS} value={filters.orderBy!} onChange={(v) => setFilters((f) => ({ ...f, orderBy: v }))} chipBtn={chipBtn} />
          </div>
        </div>
      </div>

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 scrollbar-hide smooth-scroll">
        {GENRES.map((g) => (
          <button
            key={g} onClick={() => setGenre(g)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              genre === g ? "bg-gradient-hero text-primary-foreground shadow-neon" : "glass text-muted-foreground"
            }`}
          >{g}</button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
        {!isLoading && results?.map((a) => (
          <div key={a.id}><AnimeCard anime={a} size="lg" /></div>
        ))}
        {!isLoading && results && results.length === 0 && (
          <div className="col-span-2 mt-10 flex flex-col items-center gap-3">
            <p className="text-center text-sm text-muted-foreground">No results found for your filters.</p>
            <button onClick={clearAll} className="rounded-full bg-gradient-hero px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-neon press">
              Clear all
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterRow({
  label, options, value, onChange, chipBtn,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  chipBtn: (active: boolean) => string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 scrollbar-hide">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={chipBtn(value === o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}
