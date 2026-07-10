export type WatchStatus = "watching" | "completed" | "planned" | "dropped";

export const STATUS_META: Record<WatchStatus, { label: string; icon: string }> = {
  watching: { label: "Watching", icon: "👁️" },
  completed: { label: "Completed", icon: "✅" },
  planned: { label: "Plan to Watch", icon: "📋" },
  dropped: { label: "Dropped", icon: "❌" },
};

export const STATUS_ORDER: WatchStatus[] = ["watching", "completed", "planned", "dropped"];

export const EMPTY_MESSAGE: Record<WatchStatus | "all", string> = {
  all: "Empty Trophy Room — tap the bookmark on any title to start your collection.",
  watching: "No anime marked as Watching yet — start watching something!",
  completed: "No completed anime yet — finish a series to earn your first badge.",
  planned: "No anime planned yet — bookmark titles you want to watch later.",
  dropped: "Nothing dropped — not every show is for you, and that's okay.",
};