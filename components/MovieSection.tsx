import Link from "next/link";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";

interface MovieSectionProps {
  title: string;
  movies: Movie[];
  badge?: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function MovieSection({
  title,
  movies,
  badge,
  actionHref,
  actionLabel,
}: MovieSectionProps) {
  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            {badge || `${movies.length} Movies`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {actionHref && (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              <span>{actionLabel || "Edit"}</span>
              <span>→</span>
            </Link>
          )}
          <span className="text-xs font-medium text-zinc-500 hidden sm:inline">
            Scroll horizontally →
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Rail */}
      <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}

