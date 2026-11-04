"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Review, ReviewPageResponse } from "@/types/movie";
import {
  fetchUserReviews,
  fetchMyReviews,
  submitMovieReview,
} from "@/services/movieService";
import { submitRatingToRecommendationService } from "@/services/recommendationService";

interface UserReviewsSectionProps {
  userId: string;
  username: string;
  isOwner: boolean;
}

export default function UserReviewsSection({
  userId,
  username,
  isOwner,
}: UserReviewsSectionProps) {
  const { user, token } = useAuth();

  const [reviewsData, setReviewsData] = useState<ReviewPageResponse>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 6,
    first: true,
    last: true,
    empty: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sortOption, setSortOption] = useState<"latest" | "top" | "low">("latest");
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Editing state for own reviews
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editHoverRating, setEditHoverRating] = useState<number>(0);
  const [editReviewText, setEditReviewText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadReviews = useCallback(
    async (page: number, sort: "latest" | "top" | "low") => {
      setIsLoading(true);
      try {
        const res = isOwner
          ? await fetchMyReviews(page, 6, sort, token || undefined)
          : await fetchUserReviews(userId, page, 6, sort, token || undefined);

        setReviewsData(res);
      } catch (err) {
        console.error("Failed to load user reviews:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, isOwner, token]
  );

  useEffect(() => {
    loadReviews(currentPage, sortOption);
  }, [loadReviews, currentPage, sortOption]);

  const handleStartEdit = (review: Review) => {
    setEditingReviewId(review.id);
    setEditRating(Number(review.rating) || 5);
    setEditHoverRating(0);
    setEditReviewText(review.reviewText || "");
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setSaveError(null);
  };

  const handleSaveEdit = async (review: Review) => {
    if (editRating < 1 || editRating > 5) {
      setSaveError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updated = await submitMovieReview(
        review.movieId,
        editRating,
        editReviewText,
        token || undefined
      );

      if (updated) {
        // Fire rating update request to recommendation-service
        if (user?.id) {
          submitRatingToRecommendationService(
            {
              userId: user.id,
              itemId: String(review.movieId),
              rating: editRating,
            },
            token || undefined
          ).catch((syncErr) => {
            console.warn("Direct recommendation rating sync warning:", syncErr);
          });
        }

        // Update review in place in the current list
        setReviewsData((prev) => ({
          ...prev,
          content: prev.content.map((r) =>
            r.id === review.id || r.movieId === review.movieId
              ? {
                  ...r,
                  rating: editRating,
                  reviewText: editReviewText.trim() || undefined,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));
        setEditingReviewId(null);
      } else {
        setSaveError("Failed to update review. Please try again.");
      }
    } catch {
      setSaveError("An unexpected error occurred while updating the review.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm space-y-6">
      {/* Header & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/15 text-red-500 border border-red-500/30">
              ★
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {isOwner ? "My Ratings & Reviews" : `@${username}'s Ratings & Reviews`}
            </h2>
            {reviewsData.totalElements > 0 && (
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-300 border border-zinc-700">
                {reviewsData.totalElements}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isOwner
              ? "Films you've rated and reviewed on CineVerse. Click 'Edit' to update your thoughts."
              : `Films @${username} has rated and reviewed.`}
          </p>
        </div>

        {/* Sort Controls: latest (default), top, low */}
        {reviewsData.totalElements > 0 && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl text-xs">
            <span className="text-[11px] text-zinc-500 font-semibold px-2 uppercase tracking-wider">
              Sort:
            </span>
            <button
              type="button"
              onClick={() => {
                setSortOption("latest");
                setCurrentPage(0);
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                sortOption === "latest"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Latest
            </button>
            <button
              type="button"
              onClick={() => {
                setSortOption("top");
                setCurrentPage(0);
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                sortOption === "top"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Top Rated
            </button>
            <button
              type="button"
              onClick={() => {
                setSortOption("low");
                setCurrentPage(0);
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                sortOption === "low"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Low Rated
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-zinc-800/40 border border-zinc-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : reviewsData.content.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/80 text-xl border border-zinc-700/50">
            ✍️
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
            {isOwner
              ? "You haven't written any movie reviews yet. Explore movies in the catalog and share your rating!"
              : `@${username} hasn't written any reviews yet.`}
          </p>
          {isOwner && (
            <div>
              <Link
                href="/home"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20"
              >
                Browse Movies to Review
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviewsData.content.map((review) => {
            const isEditing = editingReviewId === review.id;

            return (
              <div
                key={review.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5 backdrop-blur-sm transition-all hover:border-zinc-700/80 space-y-3"
              >
                {/* Movie Info & Poster Header */}
                <div className="flex gap-3.5 items-start">
                  <Link
                    href={`/movie/${review.movieId}`}
                    className="relative aspect-[2/3] w-14 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-md group"
                  >
                    {review.moviePosterUrl ? (
                      <Image
                        src={review.moviePosterUrl}
                        alt={review.movieTitle || "Movie Poster"}
                        fill
                        sizes="64px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                        🎬
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/movie/${review.movieId}`}
                        className="text-sm font-bold text-white hover:text-red-400 transition-colors truncate block"
                      >
                        {review.movieTitle || `Movie #${review.movieId}`}
                      </Link>

                      {/* Edit Button: ONLY for owner! */}
                      {isOwner && !isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(review)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-white bg-zinc-800/70 hover:bg-zinc-700 px-2 py-0.5 rounded-md border border-zinc-700 transition-colors cursor-pointer shrink-0"
                          title="Edit review"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {/* Star Rating Display */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex text-amber-400 text-xs">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star}>
                              {star <= Math.round(Number(review.rating))
                                ? "★"
                                : "☆"}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-extrabold text-zinc-200">
                          {Number(review.rating).toFixed(1)}/5.0
                        </span>
                      </div>
                    )}

                    <div className="text-[10px] text-zinc-500 mt-1">
                      {review.updatedAt && review.updatedAt !== review.createdAt
                        ? `Updated ${new Date(review.updatedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : `Reviewed on ${new Date(review.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`}
                    </div>
                  </div>
                </div>

                {/* Inline Edit Form for Owner */}
                {isEditing ? (
                  <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 font-semibold">
                        Rating:
                      </span>
                      <div
                        className="flex text-xl text-amber-400 cursor-pointer select-none"
                        onMouseLeave={() => setEditHoverRating(0)}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditRating(star)}
                            onMouseEnter={() => setEditHoverRating(star)}
                            className="px-0.5 hover:scale-125 transition-transform"
                          >
                            {star <= (editHoverRating || editRating)
                              ? "★"
                              : "☆"}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        {Number(editHoverRating || editRating).toFixed(1)}
                      </span>
                    </div>

                    <textarea
                      value={editReviewText}
                      onChange={(e) => setEditReviewText(e.target.value)}
                      rows={2}
                      placeholder="Write your review..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                    />

                    {saveError && (
                      <div className="text-[11px] text-red-400 bg-red-950/30 border border-red-900/50 p-2 rounded-lg">
                        {saveError}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(review)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Readable Review Text */
                  review.reviewText && (
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line line-clamp-3">
                      "{review.reviewText}"
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {reviewsData.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
          <div className="text-xs text-zinc-400">
            Page{" "}
            <span className="font-semibold text-zinc-200">
              {reviewsData.number + 1}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-200">
              {reviewsData.totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={reviewsData.first}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(reviewsData.totalPages - 1, prev + 1)
                )
              }
              disabled={reviewsData.last}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

