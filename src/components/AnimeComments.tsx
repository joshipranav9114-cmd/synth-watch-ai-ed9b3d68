import { useState, useCallback, useEffect } from "react";
import { Trash2, MessageSquare, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import {
  addComment,
  deleteComment,
  getComments,
  getProfile,
  type Comment,
  timeAgo,
} from "@/lib/community";
import { UserAvatar } from "@/components/UserAvatar";
import { ReactionBar } from "@/components/ReactionBar";
import type { User } from "@supabase/supabase-js";

interface AnimeCommentsProps {
  animeId: string;
  user: User | null;
}

function CommentItem({
  comment,
  currentUserId,
  animeId,
  onDelete,
  onReply,
  depth,
}: {
  comment: Comment;
  currentUserId: string | null;
  animeId: string;
  onDelete: (id: string, parentId: string | null) => void;
  onReply: (parentId: string, displayName: string) => void;
  depth: number;
}) {
  const isOwn = currentUserId === comment.user_id;

  return (
    <div className={depth > 0 ? "ml-8 border-l border-border/50 pl-3" : ""}>
      <div className="rounded-2xl glass p-3.5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <UserAvatar profile={comment.profile} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">{comment.profile.display_name}</span>
              <span className="text-[11px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
            </div>
            <p className="mt-1 text-sm text-foreground/90 leading-relaxed">{comment.body}</p>
          </div>
          {isOwn && (
            <button
              onClick={() => onDelete(comment.id, comment.parent_id)}
              className="rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ReactionBar
            targetType="comment"
            targetId={comment.id}
            userId={currentUserId}
            initialReactions={comment.reactions}
            initialUserReaction={comment.user_reaction}
            compact
          />
          {currentUserId && depth === 0 && (
            <button
              onClick={() => onReply(comment.id, comment.profile.display_name)}
              className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-neon-cyan transition-colors"
            >
              <CornerDownRight className="h-3 w-3" /> Reply
            </button>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              animeId={animeId}
              onDelete={onDelete}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AnimeComments({ animeId, user }: AnimeCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [myProfile, setMyProfile] = useState<ReturnType<typeof Object> | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const refresh = useCallback(async () => {
    setComments(await getComments(animeId));
  }, [animeId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!user) { setMyProfile(null); return; }
    let alive = true;
    getProfile(user.id).then((p) => { if (alive) setMyProfile(p); });
    return () => { alive = false; };
  }, [user]);

  const handleSubmit = async () => {
    if (!user) { toast.error("Sign in to comment"); return; }
    if (!text.trim()) return;
    const profile = await getProfile(user.id);
    await addComment(animeId, user.id, profile, text.trim(), replyTo?.id ?? null);
    setText("");
    setReplyTo(null);
    await refresh();
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    await deleteComment(animeId, commentId, user.id);
    await refresh();
    toast("Comment deleted");
  };

  const handleReply = (parentId: string, displayName: string) => {
    setReplyTo({ id: parentId, name: displayName });
  };

  return (
    <section className="mt-8 px-5 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-neon-cyan">
          Discussion
        </h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          {comments.length}
        </span>
      </div>

      {user ? (
        <div className="rounded-2xl glass p-3.5 mb-4 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1">
              <CornerDownRight className="h-3 w-3 text-neon-cyan" />
              <span className="text-xs text-muted-foreground">Replying to {replyTo.name}</span>
              <button onClick={() => setReplyTo(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
          )}
          <div className="flex gap-2.5 items-start">
            {myProfile && <UserAvatar profile={myProfile} size="sm" />}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Share your thoughts…"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
              className="flex-1 rounded-xl bg-muted/30 px-3 py-2 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground"
            />
            <button onClick={handleSubmit} disabled={!text.trim()}
              className="rounded-xl bg-primary/80 px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40 hover:bg-primary transition-colors">
              Post
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-center text-sm text-muted-foreground py-3 glass rounded-2xl">
          Sign in to join the discussion
        </p>
      )}

      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">No comments yet. Start the conversation!</p>
        )}
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} currentUserId={user?.id ?? null}
            animeId={animeId} onDelete={handleDelete} onReply={handleReply} depth={0} />
        ))}
      </div>
    </section>
  );
}
