import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STATUS_META, STATUS_ORDER, type WatchStatus } from "@/lib/watchlist-status";
import { Check, ChevronDown } from "lucide-react";

export function StatusPicker({
  status,
  onChange,
  size = "sm",
}: {
  status: WatchStatus;
  onChange: (s: WatchStatus) => void | Promise<void>;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[status];
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1.5 rounded-full glass ${pad} font-bold uppercase tracking-wider text-neon-pink transition-transform active:scale-95`}
        >
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-48 rounded-2xl border-border/50 bg-background/95 p-1 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_ORDER.map((s) => {
          const m = STATUS_META[s];
          const active = s === status;
          return (
            <button
              key={s}
              onClick={async (e) => {
                e.stopPropagation();
                setOpen(false);
                if (!active) await onChange(s);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                active ? "bg-primary/20 text-neon-pink" : "text-foreground hover:bg-primary/10"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </span>
              {active && <Check className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}