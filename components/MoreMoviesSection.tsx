"use client";

import { useEffect, useState } from "react";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";

interface MoreMoviesSectionProps {
  currentMovieId: number;
  industry: string;
  genres: string[];
  initialMovies?: Movie[];
}

export function MoreMoviesSectionSkeleton() {
  return (
    <section className="mt-14 sm:mt-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/50 animate-pulse" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
            More Movies Like This
          </h2>
          <span className="h-5 w-20 rounded-full bg-zinc-900 border border-zinc-800 animate-pulse" />
        </div>
        <span className="text-xs font-medium text-zinc-500 hidden md:inline">
          Scroll horizontally →
        </span>
      </div>

      <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-[2/3] w-36 sm:w-44 md:w-48 rounded-xl bg-zinc-900/80 border border-zinc-800/60 animate-pulse shrink-0"
          />
        ))}
      </div>
    </section>
  );
}

export default function MoreMoviesSection({
  currentMovieId,
  industry,
  genres = [],
  initialMovies,
}: MoreMoviesSectionProps) {
  const initialGenre = genres.length > 0 ? genres[0] : "Action";
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [movies, setMovies] = useState<Movie[]>(initialMovies || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialMovies);

  useEffect(() => {
    if (initialMovies) return;

    let isMounted = true;
    async function loadMovies() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          industry: industry || "ALL",
          genre: initialGenre,
          excludeMovieId: String(currentMovieId),
        });

        const res = await fetch(`/api/movies/popular?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMovies(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error("Failed to load similar movies:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMovies();
    return () => {
      isMounted = false;
    };
  }, [currentMovieId, industry, initialGenre, initialMovies]);

  const handleGenreChange = async (genre: string) => {
    if (genre === selectedGenre || isLoading) return;

    setSelectedGenre(genre);
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        industry: industry || "ALL",
        genre,
        excludeMovieId: String(currentMovieId),
      });

      const res = await fetch(`/api/movies/popular?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMovies(Array.isArray(data) ? data : []);
      } else {
        setMovies([]);
      }
    } catch (err) {
      console.error("Failed to fetch similar movies for genre:", genre, err);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  // If there are no genres and no movies returned at all, do not render empty section
  if (genres.length === 0 && movies.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="mt-14 sm:mt-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
            More Movies Like This
          </h2>

          {!isLoading && movies.length > 0 && (
            <span className="text-xs text-zinc-400 font-semibold bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
              {movies.length} Movies
            </span>
          )}
        </div>

        {/* Genre Switcher Pills (If movie has multiple genres) & Scroll Hint */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {genres.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {genres.map((genre) => {
                const isActive = genre === selectedGenre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreChange(genre)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? "bg-red-600 border-red-500 text-white shadow-sm shadow-red-600/30"
                        : "bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          )}

          <span className="text-xs font-medium text-zinc-500 hidden md:inline ml-1">
            Scroll horizontally →
          </span>
        </div>
      </div>

      {/* Movies Rail */}
      {isLoading ? (
        <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-[2/3] w-36 sm:w-44 md:w-48 rounded-xl bg-zinc-900/80 border border-zinc-800/60 animate-pulse shrink-0"
            />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
          No other {selectedGenre} movies found in {industry}.
        </div>
      ) : (
        <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scroll-smooth">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </section>
  );
}

