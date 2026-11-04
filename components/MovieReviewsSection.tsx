"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Review, ReviewPageResponse } from "@/types/movie";
import {
  fetchMovieReviews,
  fetchMyMovieReview,
  submitMovieReview,
} from "@/services/movieService";
import { submitRatingToRecommendationService } from "@/services/recommendationService";
import { fetchUsersByIds } from "@/services/userService";

interface MovieReviewsSectionProps {
  movieId: number;
  movieTitle: string;
  initialPlatformRating?: number;
  initialPlatformRatingCount?: number;
}

function ReviewUserAvatar({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  const initials = name
    ? name
        .replace(/^@/, "")
        .trim()
        .slice(0, 2)
        .toUpperCase()
    : "CV";

  return (
    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-red-400 bg-red-600/20 select-none">
      {initials}
    </div>
  );
}

export default function MovieReviewsSection({
  movieId,
  movieTitle,
  initialPlatformRating,
  initialPlatformRatingCount,
}: MovieReviewsSectionProps) {
  const { user, token, isLoading: authLoading } = useAuth();

  // Platform Rating State
  const [platformRating, setPlatformRating] = useState<number | undefined>(
    initialPlatformRating
  );
  const [platformRatingCount, setPlatformRatingCount] = useState<
    number | undefined
  >(initialPlatformRatingCount);

  // My Review State
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isLoadingMyReview, setIsLoadingMyReview] = useState(false);
  const [isEditingMyReview, setIsEditingMyReview] = useState(false);
  const [myRatingInput, setMyRatingInput] = useState<number>(5);
  const [myHoverRating, setMyHoverRating] = useState<number>(0);
  const [myReviewTextInput, setMyReviewTextInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Community Reviews State
  const [reviewsData, setReviewsData] = useState<ReviewPageResponse>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 5,
    first: true,
    last: true,
    empty: true,
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [sortOption, setSortOption] = useState<"latest" | "top" | "low">("latest");
  const [currentPage, setCurrentPage] = useState<number>(0);

  // User details map: userId -> { id, username, pictureUrl }
  const [userMap, setUserMap] = useState<
    Record<string, { id: string; username: string; pictureUrl?: string | null }>
  >({});

  // 1. Fetch current user's review for this movie
  const loadMyReview = useCallback(async () => {
    if (!user) return;
    setIsLoadingMyReview(true);
    try {
      const review = await fetchMyMovieReview(movieId, token || undefined);
      setMyReview(review);
      if (review) {
        setMyRatingInput(review.rating);
        setMyReviewTextInput(review.reviewText || "");
      }
    } catch (err) {
      console.error("Failed to load my review:", err);
    } finally {
      setIsLoadingMyReview(false);
    }
  }, [user, movieId, token]);

  // 2. Fetch community reviews
  const loadCommunityReviews = useCallback(
    async (page: number, sort: "latest" | "top" | "low") => {
      if (!user) return;
      setIsLoadingReviews(true);
      try {
        const res = await fetchMovieReviews(
          movieId,
          page,
          5,
          sort,
          token || undefined
        );
        setReviewsData(res);

        // Batch resolve user details by collecting all userIds
        const userIds = res.content.map((r) => r.userId).filter(Boolean);
        if (userIds.length > 0) {
          const resolvedUsers = await fetchUsersByIds(userIds, token || undefined);
          setUserMap((prev) => ({ ...prev, ...resolvedUsers }));
        }
      } catch (err) {
        console.error("Failed to load community reviews:", err);
      } finally {
        setIsLoadingReviews(false);
      }
    },
    [user, movieId, token]
  );

  useEffect(() => {
    if (user) {
      loadMyReview();
      loadCommunityReviews(currentPage, sortOption);
    }
  }, [user, loadMyReview, loadCommunityReviews, currentPage, sortOption]);

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (myRatingInput < 1 || myRatingInput > 5) {
      setSubmitError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const saved = await submitMovieReview(
        movieId,
        myRatingInput,
        myReviewTextInput,
        token || undefined
      );

      if (saved) {
        setMyReview(saved);
        setIsEditingMyReview(false);

        // Update platform rating count optimistically
        setPlatformRatingCount((prev) => (myReview ? prev : (prev || 0) + 1));

        // Fire rating update request to recommendation-service
        if (user?.id) {
          submitRatingToRecommendationService(
            {
              userId: user.id,
              itemId: String(movieId),
              rating: myRatingInput,
            },
            token || undefined
          ).catch((syncErr) => {
            console.warn("Direct recommendation rating sync warning:", syncErr);
          });
        }

        // Reload community reviews to reflect the update
        loadCommunityReviews(0, sortOption);
        setCurrentPage(0);
      } else {
        setSubmitError("Failed to save your review. Please try again.");
      }
    } catch {
      setSubmitError("An unexpected error occurred while saving your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If auth is still loading, show skeleton
  if (authLoading) {
    return (
      <section className="mt-14 sm:mt-16 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-zinc-800 rounded-md" />
        <div className="h-24 w-full bg-zinc-800/50 rounded-xl" />
      </section>
    );
  }

  // Requirement: "If user is not logged in we should hide these details in movie detail page"
  if (!user) {
    return (
      <section className="mt-14 sm:mt-16 rounded-3xl border border-zinc-800/80 bg-zinc-900/30 p-8 sm:p-10 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 mb-4">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
          Sign In to Access CineVerse Ratings & Reviews
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6">
          Log in with your CineVerse account to view verified platform movie ratings, read community reviews, and publish your own rating.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/30 active:scale-95"
        >
          Sign In to CineVerse
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-14 sm:mt-16 space-y-8">
      {/* 1. Header & CineVerse Platform Rating Overview */}
      <div className="rounded-3xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 shadow-md shadow-red-600/10">
                ★
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  CineVerse Ratings & Reviews
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  Honest community ratings curated by passionate cinephiles
                </p>
              </div>
            </div>
          </div>

          {/* Platform Rating Summary Badge */}
          <div className="flex items-center gap-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl px-5 py-3.5 self-start md:self-auto shadow-inner">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-black text-red-500 leading-none">
                {platformRating && platformRating > 0
                  ? platformRating.toFixed(1)
                  : "—"}
              </div>
              <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                out of 5.0
              </div>
            </div>

            <div className="h-9 w-px bg-zinc-800" />

            <div className="text-left leading-tight">
              <div className="flex text-amber-400 text-sm">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star}>
                    {platformRating && star <= Math.round(platformRating)
                      ? "★"
                      : "☆"}
                  </span>
                ))}
              </div>
              <span className="text-xs text-zinc-400 font-medium">
                {platformRatingCount && platformRatingCount > 0
                  ? `${platformRatingCount} platform ${
                      platformRatingCount === 1 ? "rating" : "ratings"
                    }`
                  : "No platform ratings yet"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. My Review Section (Create / View / Edit) */}
        <div className="pt-6">
          {isLoadingMyReview ? (
            <div className="h-28 bg-zinc-800/40 rounded-2xl animate-pulse" />
          ) : myReview && !isEditingMyReview ? (
            // Display User's Existing Review
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/50 border border-red-800/40 px-2.5 py-0.5 rounded-md">
                    Your Review
                  </span>
                  <div className="flex text-amber-400 text-base">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>
                        {star <= Math.round(myReview.rating) ? "★" : "☆"}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-extrabold text-zinc-200">
                    {Number(myReview.rating).toFixed(1)}/5.0
                  </span>
                </div>

                {/* Edit Button for own review */}
                <button
                  type="button"
                  onClick={() => {
                    setMyRatingInput(myReview.rating);
                    setMyReviewTextInput(myReview.reviewText || "");
                    setIsEditingMyReview(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <svg
                    className="h-3.5 w-3.5 text-zinc-400"
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
                  <span>Edit My Review</span>
                </button>
              </div>

              {myReview.reviewText ? (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {myReview.reviewText}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  You submitted a rating without text.
                </p>
              )}

              <div className="text-[11px] text-zinc-500">
                {myReview.updatedAt && myReview.updatedAt !== myReview.createdAt
                  ? `Updated ${new Date(myReview.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : `Reviewed on ${new Date(myReview.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`}
              </div>
            </div>
          ) : (
            // Form to Add or Edit Review
            <form
              onSubmit={handleSubmitReview}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {myReview ? "Edit Your Review" : `Rate "${movieTitle}"`}
                </h3>

                {/* Interactive Star Rating Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium mr-1">
                    Your Rating:
                  </span>
                  <div
                    className="flex text-2xl text-amber-400 cursor-pointer select-none"
                    onMouseLeave={() => setMyHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setMyRatingInput(star)}
                        onMouseEnter={() => setMyHoverRating(star)}
                        className="transition-transform hover:scale-125 focus:outline-none px-0.5"
                        title={`${star} Star${star > 1 ? "s" : ""}`}
                      >
                        {star <= (myHoverRating || myRatingInput) ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-black text-amber-400 min-w-[32px] text-center">
                    {Number(myHoverRating || myRatingInput).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Review Textarea */}
              <div>
                <textarea
                  value={myReviewTextInput}
                  onChange={(e) => setMyReviewTextInput(e.target.value)}
                  rows={3}
                  placeholder="Share your thoughts on the acting, direction, screenplay, and music (optional)..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors resize-none"
                />
              </div>

              {submitError && (
                <div className="text-xs font-semibold text-red-400 bg-red-950/30 border border-red-900/50 px-3.5 py-2 rounded-lg">
                  {submitError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                {myReview && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingMyReview(false);
                      setSubmitError(null);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{myReview ? "Update Review" : "Publish Review"}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 3. Community Reviews Section with Sort & Pagination */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Community Reviews
            </h3>
            {reviewsData.totalElements > 0 && (
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-300 border border-zinc-700">
                {reviewsData.totalElements}
              </span>
            )}
          </div>

          {/* Sort Controls: latest (default), top, low */}
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
        </div>

        {/* Reviews List */}
        {isLoadingReviews ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : reviewsData.content.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
            No community reviews yet for this movie. Be the first to share your thoughts above!
          </div>
        ) : (
          <div className="space-y-4">
            {reviewsData.content.map((review) => {
              const author = userMap[review.userId];
              const authorName = author?.username || "CineVerse Member";
              const authorPic = author?.pictureUrl;
              const isOwnReview = user?.id === review.userId;

              return (
                <div
                  key={review.id}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6 space-y-3 backdrop-blur-sm transition-all hover:border-zinc-700/80"
                >
                  {/* Review Header: User Info & Rating */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <Link
                        href={`/user/${review.userId}`}
                        className="relative h-10 w-10 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 shrink-0 hover:ring-2 hover:ring-red-500 transition-all block"
                        title={`View @${authorName}'s profile`}
                      >
                        <ReviewUserAvatar src={authorPic} name={authorName} />
                      </Link>

                      {/* Username & Date */}
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/user/${review.userId}`}
                            className="text-xs sm:text-sm font-bold text-white hover:text-red-400 transition-colors"
                          >
                            @{authorName}
                          </Link>
                          {isOwnReview && (
                            <span className="rounded bg-red-950/80 border border-red-800/60 px-1.5 py-0.2 text-[10px] font-bold text-red-300 uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {new Date(review.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Star Rating (Read-Only) */}
                    <div className="flex items-center gap-1.5 self-start bg-zinc-950/80 border border-zinc-800/80 px-2.5 py-1 rounded-lg">
                      <span className="text-amber-400 text-xs">★</span>
                      <span className="text-xs font-extrabold text-zinc-200">
                        {Number(review.rating).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Review Text (Read-Only) */}
                  {review.reviewText && (
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line pl-1">
                      {review.reviewText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Pagination Controls */}
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
    </section>
  );
}

