"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWatchlist } from "@/context/WatchlistContext";

export default function Navbar() {
  const { user, isLoading } = useAuth();
  const { watchlistIds, totalElements } = useWatchlist();
  const watchlistCount = watchlistIds.size > 0 ? watchlistIds.size : totalElements;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Spacer (Preserves balanced centering of CineVerse logo) */}
        <div className="w-24 sm:w-48 flex items-center justify-start" />

        {/* Center: Glowing CineVerse Branding */}
        <div className="flex-1 flex justify-center">
          <Link
            href="/home"
            className="group relative flex items-center justify-center transition-all duration-300 hover:scale-105"
          >
            {/* Subtle Ambient Red Glow */}
            <div className="absolute -inset-4 rounded-full bg-red-600/25 blur-xl opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Centered Brand Title */}
            <span className="relative text-2xl sm:text-3xl font-black tracking-[0.25em] uppercase select-none">
              <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]">
                Cine
              </span>
              <span className="text-red-500 drop-shadow-[0_0_18px_rgba(239,68,68,0.7)] ml-1">
                Verse
              </span>
            </span>
          </Link>
        </div>

        {/* Right Section: Watchlist Navigation Button & User Profile / Login */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-3.5">
          {/* Watchlist Navigation Button between CineVerse banner and User Profile */}
          <Link
            href="/watchlist"
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800/90 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all text-xs font-semibold shadow-sm hover:shadow-red-500/10 cursor-pointer"
            title="View Watchlist"
          >
            <svg
              className="h-4 w-4 text-red-500 transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <span className="hidden sm:inline">Watchlist</span>
            {user && watchlistCount > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {watchlistCount}
              </span>
            )}
          </Link>

          {!isLoading && (
            user ? (
              <Link
                href={`/user/${user.id}`}
                className="group flex items-center gap-2.5 p-1 rounded-full transition-all hover:bg-zinc-900/70"
                title="View Profile"
              >
                <div className="flex flex-col text-right leading-tight">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[90px] sm:max-w-[120px]">
                    {user.username}
                  </span>
                  <span className="text-[11px] text-zinc-400 group-hover:text-red-400 transition-colors">
                    Profile
                  </span>
                </div>

                {user.pictureUrl ? (
                  <img
                    src={user.pictureUrl}
                    alt={user.username}
                    className="h-9 w-9 rounded-full object-cover border border-zinc-700/80 group-hover:border-red-500/80 group-hover:ring-2 group-hover:ring-red-500/20 transition-all shrink-0"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase shrink-0 group-hover:border-red-500/80 group-hover:ring-2 group-hover:ring-red-500/20 transition-all">
                    {user.username.charAt(0)}
                  </div>
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all duration-200 shadow-md shadow-red-600/25 cursor-pointer"
              >
                Login
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
