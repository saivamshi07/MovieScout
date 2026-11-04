"use client";

import { useEffect, useState, useTransition } from "react";
import MovieCard from "@/components/MovieCard";
import SearchPersonCard from "@/components/SearchPersonCard";
import { MultiSearchResponse, SearchType } from "@/types/movie";

const SEARCH_TABS: { label: string; value: SearchType }[] = [
  { label: "All", value: "ALL" },
  { label: "Movies", value: "MOVIE" },
  { label: "Persons", value: "PERSON" },
];

export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("ALL");
  const [results, setResults] = useState<MultiSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Debounced API fetch whenever query or type changes
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          query: trimmed,
          type,
          page: "1",
        });

        const res = await fetch(`/api/movies/search?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Search failed: ${res.status}`);
        }

        const data: MultiSearchResponse = await res.json();
        startTransition(() => {
          setResults(data);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Search fetch error:", err);
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, type]);

  const handleClear = () => {
    setQuery("");
    setResults(null);
  };

  const placeholderText =
    type === "MOVIE"
      ? "Search movies by title..."
      : type === "PERSON"
      ? "Search actors, directors, writers..."
      : "Search movies, actors, crew...";

  return (
    <div className="w-full space-y-6">
      {/* Search Controls Container */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-sm">
        {/* Filter Pills / Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline-block">
            Filter:
          </span>
          {SEARCH_TABS.map((tab) => {
            const isActive = type === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setType(tab.value)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                    : "bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div className="relative flex items-center">
          {/* Search Magnifier Icon */}
          <div className="pointer-events-none absolute left-4 text-zinc-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholderText}
            className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 py-3.5 pl-12 pr-12 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />

          {/* Loading Spinner or Clear 'X' Button */}
          <div className="absolute right-3.5 flex items-center">
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            ) : query.length > 0 ? (
              <button
                onClick={handleClear}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                title="Clear search"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {/* Hint text if user typed 1 letter */}
        {query.trim().length === 1 && (
          <p className="mt-2 text-xs text-zinc-500 pl-1">
            Type at least 2 characters to search...
          </p>
        )}
      </div>

      {/* Search Results Display Area */}
      {results !== null && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7 shadow-2xl backdrop-blur-md space-y-8 animate-in fade-in duration-300">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Search Results
              </h2>
              <span className="text-xs text-zinc-400 font-medium bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700/60">
                {results.totalMatches} {results.totalMatches === 1 ? "match" : "matches"}
              </span>
            </div>

            <button
              onClick={handleClear}
              className="text-xs text-zinc-400 hover:text-red-400 font-medium transition-colors cursor-pointer"
            >
              Clear Results
            </button>
          </div>

          {/* 1. Empty Results State */}
          {results.totalMatches === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 mb-3">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-300">
                No matches found for "{results.query}"
              </h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Try searching with a different keyword or switch the filter tab above.
              </p>
            </div>
          ) : (
            <>
              {/* 2. Movies Results */}
              {results.movies && results.movies.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
                      🎬 Movies
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      ({results.movies.length})
                    </span>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-3 pt-1 -mx-2 px-2 scrollbar-thin">
                    {results.movies.map((movie) => (
                      <MovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Actors Results */}
              {results.actors && results.actors.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
                      🎭 Actors
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      ({results.actors.length})
                    </span>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-3 pt-1 -mx-2 px-2 scrollbar-thin">
                    {results.actors.map((actor) => (
                      <SearchPersonCard key={actor.id} person={actor} type="actor" />
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Crew Results */}
              {results.crew && results.crew.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
                      🎥 Crew
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      ({results.crew.length})
                    </span>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-3 pt-1 -mx-2 px-2 scrollbar-thin">
                    {results.crew.map((member) => (
                      <SearchPersonCard key={member.id} person={member} type="crew" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

