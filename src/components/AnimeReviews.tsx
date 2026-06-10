import { useState, useCallback, useEffect } from "react";
import { Star, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  addReview,
  deleteReview,
  getReviews,
  getAnimeRatingStats,
  getProfile,
  type Review,
} from "@/lib/community";
import { UserAvatar } from "@/components/UserAvatar";
import { ReactionBar } from "@/components/ReactionBar";
import { timeAgo } from "@/lib/community";
import type { User } from "@supabase/supabase-js";

interface AnimeReviewsProps {
  animeId: string;
  animeTitle: string;
  user: User | null;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              star <= (hover || value)
                ? "fill-neon-orange text-neon-orange"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-bold text-neon-orange">
        {hover || value || "—"}/10
      </span>
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right text-muted-foreground">{label}</span>
      <div className="flex-1 rounded-full bg-muted h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-neon-orange transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-4 text-muted-foreground">{count}</span>
    </div>
  );
}

function ReviewCard({
  review,
  currentUserId,
  animeId,
  onDelete,
  onEdit,
}: {
  review: Review;
  currentUserId: string | null;
  animeId: string;
  onDelete: (id: string) => void;
  onEdit: (review: Review) => void;
}) {
  const isOwn = currentUserId === review.user_id;
  return (
    <div className="rounded-2xl glass p-4 space-y-3">
      <div className="flex items-start gap-3">
        <UserAvatar profile={review.profile} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{review.profile.display_name}</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < review.rating ? "fill-neon-orange text-neon-orange" : "text-muted/40"
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-bold text-neon-orange">{review.rating}/10</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{timeAgo(review.created_at)}</p>
        </div>
        {isOwn && (
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(review)}
              className="rounded-lg p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(review.id)}
              className="rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">{review.body}</p>

      <ReactionBar
        targetType="review"
        targetId={review.id}
        userId={currentUserId}
        initialReactions={review.reactions}
        initialUserReaction={review.user_reaction}
        compact
      />
    </div>
  );
}

export function AnimeReviews({ animeId, animeTitle, user }: AnimeReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<{ average: number; total: number; distribution: number[] }>({ average: 0, total: 0, distribution: Array(10).fill(0) });
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<Review | null>(null);
  const [composing, setComposing] = useState(false);

  const refresh = useCallback(async () => {
    const [r, s] = await Promise.all([getReviews(animeId), getAnimeRatingStats(animeId)]);
    setReviews(r);
    setStats(s);
  }, [animeId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSubmit = async () => {
    if (!user) { toast.error("Sign in to leave a review"); return; }
    if (!rating) { toast.error("Please select a rating"); return; }
    if (!body.trim()) { toast.error("Please write something"); return; }
    const profile = await getProfile(user.id);
    await addReview(animeId, animeTitle, user.id, profile, rating, body.trim());
    setRating(0);
    setBody("");
    setEditing(null);
    setComposing(false);
    await refresh();
    toast.success("Review posted!");
  };

  const handleDelete = async (reviewId: string) => {
    if (!user) return;
    await deleteReview(animeId, reviewId, user.id);
    await refresh();
    toast("Review deleted");
  };

  const handleEdit = (review: Review) => {
    setEditing(review);
    setRating(review.rating);
    setBody(review.body);
    setComposing(true);
  };

  const userReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  return (
    <section className="mt-8 px-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-neon-pink">
          Reviews & Ratings
        </h3>
        {stats.total > 0 && (
          <span className="text-xs text-muted-foreground">{stats.total} review{stats.total !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Aggregate rating bar */}
      {stats.total > 0 && (
        <div className="rounded-2xl glass p-4 mb-4 flex gap-4 items-center">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-neon-orange">{stats.average}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">/ 10</p>
          </div>
          <div className="flex-1 space-y-1">
            {Array.from({ length: 10 }, (_, i) => 10 - i).map((star) => (
              <RatingBar
                key={star}
                label={String(star)}
                count={stats.distribution[star - 1]}
                total={stats.total}
              />
            ))}
          </div>
        </div>
      )}

      {/* Compose / Edit */}
      {user && !userReview && !composing && (
        <button
          onClick={() => setComposing(true)}
          className="w-full rounded-2xl glass border border-dashed border-border p-3 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          ✍️ Write a review…
        </button>
      )}

      {composing && (
        <div className="rounded-2xl glass p-4 mb-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {editing ? "Editing review" : "Your review"}
          </p>
          <StarInput value={rating} onChange={setRating} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="What did you think? Spoiler-free is always appreciated…"
            className="w-full rounded-xl bg-muted/30 px-3 py-2 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-secondary py-2 text-xs font-extrabold uppercase tracking-widest text-primary-foreground"
            >
              {editing ? "Update" : "Post Review"}
            </button>
            <button
              onClick={() => { setComposing(false); setEditing(null); setRating(0); setBody(""); }}
              className="rounded-xl glass px-4 py-2 text-xs font-bold text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            No reviews yet. Be the first!
          </p>
        )}
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            currentUserId={user?.id ?? null}
            animeId={animeId}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
      </div>
    </section>
  );
}
