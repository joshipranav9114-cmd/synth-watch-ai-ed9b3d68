import { useState } from "react";
import { REACTION_EMOJIS, toggleReaction, type ReactionSummary } from "@/lib/community";

interface ReactionBarProps {
  targetType: "review" | "comment" | "message";
  targetId: string;
  userId: string | null;
  initialReactions: ReactionSummary[];
  initialUserReaction: string | null;
  compact?: boolean;
}

export function ReactionBar({
  targetType,
  targetId,
  userId,
  initialReactions,
  initialUserReaction,
  compact = false,
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions);
  const [userReaction, setUserReaction] = useState<string | null>(initialUserReaction);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleReact = async (emoji: string) => {
    if (!userId) return;
    const result = await toggleReaction(targetType, targetId, userId, emoji);
    setReactions(result.reactions);
    setUserReaction(result.user_reaction);
    setPickerOpen(false);
  };

  const topReactions = reactions.slice(0, 3);

  return (
    <div className="relative flex items-center gap-1.5 flex-wrap">
      {topReactions.map(({ emoji, count }) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
            userReaction === emoji
              ? "bg-primary/25 ring-1 ring-primary text-primary"
              : "glass hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {userId && (
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className={`flex items-center gap-1 rounded-full glass px-2 py-0.5 text-xs text-muted-foreground transition-all hover:text-foreground ${
            pickerOpen ? "bg-muted/60" : ""
          } ${compact ? "w-7 justify-center" : ""}`}
        >
          {compact ? "+" : "+ React"}
        </button>
      )}

      {/* Emoji picker popover */}
      {pickerOpen && (
        <div className="absolute bottom-8 left-0 z-20 flex gap-1.5 rounded-2xl bg-card border border-border p-2 shadow-lg">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg transition-all hover:scale-110 ${
                userReaction === emoji ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted/50"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
