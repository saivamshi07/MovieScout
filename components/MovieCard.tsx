"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Movie } from "@/types/movie";
import { useWatchlist } from "@/context/WatchlistContext";
import { useAuth } from "@/context/AuthContext";

interface MovieCardProps {
  movie: Movie;
  onRemove?: (movieId: number) => void;
}

export default function MovieCard({ movie, onRemove }: MovieCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [isHoveredBtn, setIsHoveredBtn] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const inWatchlist = isInWatchlist(movie.id);

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }

    setIsToggling(true);
    try {
      await toggleWatchlist(movie.id, movie);
      if (inWatchlist && onRemove) {
        onRemove(movie.id);
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Link
      href={`/movie/${movie.id}`}
      className="group relative flex flex-col shrink-0 w-36 sm:w-44 md:w-48 transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Movie Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 shadow-md transition-all duration-300 group-hover:border-zinc-700 group-hover:shadow-red-500/10 group-hover:shadow-lg">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 192px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-zinc-600">
            <svg
              className="h-10 w-10 mb-2 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <span className="text-xs font-medium">No Poster</span>
          </div>
        )}

        {/* Watchlist Quick Toggle Button on Top-Left */}
        <div className="absolute top-2 left-2 z-20">
          <button
            type="button"
            onClick={handleWatchlistClick}
            onMouseEnter={() => setIsHoveredBtn(true)}
            onMouseLeave={() => setIsHoveredBtn(false)}
            disabled={isToggling}
            className={`group/btn relative flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 shadow-md ${
              inWatchlist
                ? "bg-red-600/90 text-white hover:bg-red-700 border border-red-400/50 shadow-red-600/30"
                : "bg-black/70 text-zinc-200 hover:bg-red-600 hover:text-white border border-white/25 hover:border-red-500"
            }`}
            title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            {isToggling ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : inWatchlist ? (
              // Minus symbol (-)
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M20 12H4"
                />
              </svg>
            ) : (
              // Plus symbol (+)
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}

            {/* Hover Tooltip Popup */}
            <span
              className={`pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-950/95 px-2 py-1 text-[10px] font-semibold text-white shadow-xl border border-zinc-700/80 transition-all duration-200 ${
                isHoveredBtn ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              {inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            </span>
          </button>
        </div>

        {/* Match Score Badge for Recommendations on Bottom-Left */}
        {movie.matchScore ? (
          <div className="absolute bottom-2 left-2 rounded-md bg-emerald-950/85 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 backdrop-blur-sm border border-emerald-500/40">
            {movie.matchScore}
          </div>
        ) : null}

        {/* Rating Badge Overlay on Top-Right */}
        {movie.tmdbVoteAverage ? (
          <div className="absolute top-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur-sm border border-black/40">
            ★ {movie.tmdbVoteAverage.toFixed(1)}
          </div>
        ) : null}
      </div>

      {/* Movie Title & Info Below Image */}
      <div className="mt-2.5 px-0.5">
        <h3
          className="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-1 transition-colors group-hover:text-red-400"
          title={movie.title}
        >
          {movie.title}
        </h3>

        {movie.releaseYear ? (
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {movie.releaseYear}
            {movie.industry ? ` • ${movie.industry}` : ""}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
