"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWatchlist } from "@/context/WatchlistContext";
import MovieCard from "@/components/MovieCard";

export default function WatchlistPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    watchlist,
    watchlistIds,
    isLoading: watchlistLoading,
    isLoadingMore,
    hasMore,
    totalElements,
    loadMoreWatchlist,
  } = useWatchlist();

  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Auto-fetch next 20 movies as the user scrolls toward the bottom of the page
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreWatchlist();
        }
      },
      { rootMargin: "300px" } // Pre-fetch before user hits the exact bottom
    );

    const currentSentinel = loadMoreSentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, isLoadingMore, loadMoreWatchlist]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <div className="h-8 w-48 rounded-lg bg-zinc-800 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-zinc-800/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 sm:p-12 shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 mb-6">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to Access Your Watchlist
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2 mb-8">
            Keep track of movies you want to see, organize upcoming releases, and sync your favorites across all devices.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
          >
            Sign In to CineVerse
          </Link>
        </div>
      </div>
    );
  }

  const totalCount =
    watchlistIds.size > 0
      ? watchlistIds.size
      : totalElements > 0
      ? totalElements
      : watchlist.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Navigation & Header */}
      <div className="space-y-4">
        <div>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span> Back to Movies
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/15 text-red-500 border border-red-500/30 shadow-md shadow-red-600/10">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                My Watchlist
              </h1>
              {totalCount > 0 && (
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-300 border border-zinc-700">
                  {totalCount}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Your saved films to watch later. Click the minus (-) icon on any poster to remove it.
            </p>
          </div>

          {watchlist.length > 0 && (
            <div className="text-xs text-zinc-400 self-start sm:self-auto">
              Showing <span className="font-semibold text-zinc-200">{watchlist.length}</span> of{" "}
              <span className="font-semibold text-zinc-200">{totalCount}</span> movies
            </div>
          )}
        </div>
      </div>

      {/* Main Watchlist Grid Content */}
      {watchlistLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center shadow-xl backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 text-3xl mb-4 border border-zinc-700/50">
            🎬
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Your Watchlist is Empty</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6">
            Explore movies in cinema or browse curated recommendations, then click the plus (+) icon on any poster to save it here.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/25"
          >
            Browse Trending Movies
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {watchlist.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          {/* Pagination & Infinite Scroll Footer */}
          <div className="pt-8 pb-10 flex flex-col items-center justify-center space-y-4">
            {/* Infinite Scroll Sentinel: triggers auto-fetch as user scrolls near bottom */}
            <div ref={loadMoreSentinelRef} className="h-6 w-full pointer-events-none" />

            {isLoadingMore ? (
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs sm:text-sm font-semibold text-zinc-300 shadow-sm animate-pulse">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                <span>Loading next 20 movies...</span>
              </div>
            ) : hasMore ? (
              <button
                type="button"
                onClick={() => loadMoreWatchlist()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <span>Load Next 20 Movies</span>
                <span className="text-zinc-400">
                  ({watchlist.length} of {totalCount})
                </span>
              </button>
            ) : watchlist.length >= 20 ? (
              <p className="text-xs text-zinc-500">
                ✓ You have reached the end of your watchlist ({watchlist.length} movies).
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
