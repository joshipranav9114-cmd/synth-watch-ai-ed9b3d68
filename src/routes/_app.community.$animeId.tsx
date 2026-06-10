import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import {
  addMessage,
  getMessages,
  getProfile,
  type DiscussionMessage,
  REACTION_EMOJIS,
  toggleReaction,
  timeAgo,
} from "@/lib/community";
import type { UserProfile } from "@/lib/community";
import { useAnimeById } from "@/lib/anime-data";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_app/community/$animeId")({
  component: DiscussionRoom,
});

function MessageBubble({
  msg,
  isOwn,
  userId,
}: {
  msg: DiscussionMessage;
  isOwn: boolean;
  userId: string | null;
}) {
  const [reactions, setReactions] = useState(msg.reactions);
  const [userReaction, setUserReaction] = useState(msg.user_reaction);
  const [showPicker, setShowPicker] = useState(false);

  const react = async (emoji: string) => {
    if (!userId) return;
    const result = await toggleReaction("message", msg.id, userId, emoji);
    setReactions(result.reactions);
    setUserReaction(result.user_reaction);
    setShowPicker(false);
  };

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn && <UserAvatar profile={msg.profile} size="sm" />}

      <div className={`max-w-[75%] space-y-1 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        {!isOwn && (
          <span className="ml-1 text-[11px] font-bold text-muted-foreground">
            {msg.profile.display_name}
          </span>
        )}

        <div className="relative group">
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              isOwn
                ? "bg-gradient-to-br from-primary/80 to-secondary/80 text-primary-foreground rounded-br-sm"
                : "glass text-foreground rounded-bl-sm"
            }`}
          >
            {msg.body}
          </div>

          {/* Reaction button on hover */}
          <button
            onClick={() => setShowPicker((v) => !v)}
            className={`absolute ${isOwn ? "-left-8" : "-right-8"} bottom-1 opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full glass text-sm`}
          >
            🙂
          </button>

          {/* Emoji picker */}
          {showPicker && (
            <div
              className={`absolute bottom-10 ${isOwn ? "right-0" : "left-0"} z-20 flex gap-1.5 rounded-2xl bg-card border border-border p-2 shadow-lg`}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg hover:scale-110 transition-transform ${
                    userReaction === emoji ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted/50"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reaction pills */}
        {reactions.length > 0 && (
          <div className={`flex gap-1 flex-wrap ${isOwn ? "justify-end" : ""}`}>
            {reactions.map(({ emoji, count }) => (
              <button
                key={emoji}
                onClick={() => react(emoji)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                  userReaction === emoji
                    ? "bg-primary/25 ring-1 ring-primary text-primary"
                    : "glass text-muted-foreground"
                }`}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-muted-foreground px-1">
          {timeAgo(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

function DiscussionRoom() {
  const { animeId } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: anime } = useAnimeById(animeId);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    getMessages(animeId).then((m) => { if (alive) setMessages(m); });
    return () => { alive = false; };
  }, [animeId]);

  useEffect(() => {
    if (!user) { setMyProfile(null); return; }
    let alive = true;
    getProfile(user.id).then((p) => { if (alive) setMyProfile(p); });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user) { toast.error("Sign in to chat"); return; }
    if (!text.trim()) return;
    const profile = await getProfile(user.id);
    await addMessage(animeId, user.id, profile, text.trim(), anime?.title ?? "", anime?.image ?? null);
    setText("");
    setMessages(await getMessages(animeId));
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 border-b border-border/50 glass sticky top-0 z-10">
        <button
          onClick={() => nav({ to: "/community" })}
          className="flex h-9 w-9 items-center justify-center rounded-full glass flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        {anime?.image && (
          <img
            src={anime.image}
            alt={anime.title}
            className="h-9 w-7 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {anime?.title ?? "Loading…"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          to="/anime/$id"
          params={{ id: animeId }}
          className="rounded-xl glass px-3 py-1.5 text-xs font-bold text-neon-cyan"
        >
          Info
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">🎌</span>
            <p className="text-sm font-bold text-foreground">
              Be the first to start the discussion!
            </p>
            <p className="text-xs text-muted-foreground">
              Share your thoughts, theories, and reactions
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.user_id === user?.id}
            userId={user?.id ?? null}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 py-3 pb-safe border-t border-border/50 glass sticky bottom-0">
        {user ? (
          <div className="flex items-end gap-2">
            {myProfile && <UserAvatar profile={myProfile} size="sm" />}
            <div className="flex-1 rounded-2xl glass px-3 py-2 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={1}
                placeholder="Say something…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground max-h-24"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary disabled:opacity-40 transition-opacity flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="block w-full rounded-2xl bg-gradient-to-r from-primary to-secondary py-3 text-center text-sm font-bold text-primary-foreground"
          >
            Sign in to join the chat
          </Link>
        )}
      </div>
    </div>
  );
}
