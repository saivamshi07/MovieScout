"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Movie } from "@/types/movie";
import { useWatchlist } from "@/context/WatchlistContext";
import { useAuth } from "@/context/AuthContext";

interface WatchlistDetailButtonProps {
  movie: Movie;
}

export default function WatchlistDetailButton({ movie }: WatchlistDetailButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [isHovered, setIsHovered] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const inWatchlist = isInWatchlist(movie.id);

  const handleClick = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setIsToggling(true);
    try {
      await toggleWatchlist(movie.id, movie);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isToggling}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 ${
        inWatchlist
          ? isHovered
            ? "bg-red-600/20 text-red-400 border border-red-500/40 shadow-red-600/10"
            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10"
          : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/25 hover:shadow-red-600/40 active:scale-95"
      }`}
      title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      {isToggling ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : inWatchlist ? (
        isHovered ? (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove from Watchlist
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Already in Watchlist
          </>
        )
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add to Watchlist
        </>
      )}
    </button>
  );
}

