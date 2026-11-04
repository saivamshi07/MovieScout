import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { fetchMovieById, fetchPopularSimilarMovies } from "@/services/movieService";
import { CrewMember } from "@/types/movie";
import CastCard from "@/components/CastCard";
import CrewCard from "@/components/CrewCard";
import WatchlistDetailButton from "@/components/WatchlistDetailButton";
import MovieReviewsSection from "@/components/MovieReviewsSection";
import MoreMoviesSection, {
  MoreMoviesSectionSkeleton,
} from "@/components/MoreMoviesSection";

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Deduplicate crew members by person ID and group their roles/departments
 */
function groupCrewMembers(crewList?: CrewMember[]): CrewMember[] {
  if (!crewList || crewList.length === 0) return [];

  const map = new Map<number, CrewMember>();

  for (const member of crewList) {
    const role = member.job?.trim() || member.department?.trim();
    const existing = map.get(member.id);

    if (!existing) {
      map.set(member.id, {
        ...member,
        roles: role ? [role] : [],
      });
    } else {
      if (role && existing.roles && !existing.roles.includes(role)) {
        existing.roles.push(role);
      }
      if (!existing.profileUrl && member.profileUrl) {
        existing.profileUrl = member.profileUrl;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Format minutes into "2h 19m"
 */
function formatRuntime(minutes?: number): string {
  if (!minutes || minutes <= 0) return "";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/**
 * Dynamic SEO metadata for each movie
 */
export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await fetchMovieById(id);

  if (!movie) {
    return {
      title: "Movie Not Found | CineVerse",
    };
  }

  return {
    title: `${movie.title} ${movie.releaseYear ? `(${movie.releaseYear})` : ""} | CineVerse`,
    description: movie.overview || movie.tagline || "Discover movie details on CineVerse",
  };
}

/**
 * Async Server Component for streaming popular similar movies without blocking
 * the initial page render.
 */
async function AsyncMoreMoviesSection({
  movieId,
  industry,
  genres,
}: {
  movieId: number;
  industry: string;
  genres: string[];
}) {
  const initialGenre = genres && genres.length > 0 ? genres[0] : "Action";
  const similarMovies = await fetchPopularSimilarMovies(
    industry,
    initialGenre,
    movieId
  );

  return (
    <MoreMoviesSection
      currentMovieId={movieId}
      industry={industry}
      genres={genres}
      initialMovies={similarMovies}
    />
  );
}

/**
 * Movie Detail Server Component
 * Route: /movie/[id]
 */
export default async function MovieDetailPage({ params }: MoviePageProps) {
  const { id } = await params;
  const movie = await fetchMovieById(id);

  // Fallback state if movie is not found or service returned null
  if (!movie) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Movie Not Found</h1>
          <p className="text-sm text-zinc-400 mb-6">
            We couldn't retrieve the details for movie #{id}. It may not exist in our catalog or the movie service is unavailable.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-red-600/20"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const runtimeText = formatRuntime(movie.runtime);
  const uniqueCrew = groupCrewMembers(movie.crew);

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* 1. Backdrop Hero Banner */}
      <div className="relative w-full h-[360px] sm:h-[440px] md:h-[500px] overflow-hidden bg-zinc-900">
        {movie.backdropUrl ? (
          <Image
            src={movie.backdropUrl}
            alt={movie.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-50"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900" />
        )}

        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />

        {/* Back navigation button */}
        <div className="absolute top-6 left-4 sm:left-8 z-20">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-zinc-200 hover:text-white text-xs sm:text-sm font-medium backdrop-blur-md border border-white/10 transition-all shadow-md"
          >
            <span>←</span> Back to Movies
          </Link>
        </div>
      </div>

      {/* 2. Main Content Container (Floating over backdrop) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-56 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Movie Poster */}
          <div className="relative aspect-[2/3] w-48 sm:w-60 md:w-72 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl mx-auto md:mx-0">
            {movie.posterUrl ? (
              <Image
                src={movie.posterUrl}
                alt={movie.title}
                fill
                priority
                sizes="(max-width: 640px) 192px, (max-width: 768px) 240px, 288px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <span>No Poster</span>
              </div>
            )}

            {/* Poster Rating Ribbon */}
            {movie.tmdbVoteAverage ? (
              <div className="absolute top-3 right-3 rounded-lg bg-black/80 px-2.5 py-1 text-xs font-bold text-amber-400 backdrop-blur-md border border-amber-500/20 shadow-lg">
                ★ {movie.tmdbVoteAverage.toFixed(1)}
              </div>
            ) : null}
          </div>

          {/* Movie Header Info */}
          <div className="flex-1 w-full text-center md:text-left pt-2">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {movie.title}
            </h1>

            {movie.tagline ? (
              <p className="mt-2 text-sm sm:text-base text-zinc-400 italic">
                "{movie.tagline}"
              </p>
            ) : null}

            {/* Metadata Badges Row */}
            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-zinc-300">
              {movie.releaseYear ? (
                <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 font-medium border border-zinc-700/60">
                  {movie.releaseYear}
                </span>
              ) : null}

              {runtimeText ? (
                <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 font-medium border border-zinc-700/60">
                  {runtimeText}
                </span>
              ) : null}

              {movie.industry ? (
                <span className="rounded-md bg-red-950/60 text-red-300 border border-red-800/40 px-2.5 py-1 font-semibold uppercase tracking-wider text-[11px]">
                  {movie.industry}
                </span>
              ) : null}

              {movie.status ? (
                <span className="rounded-md bg-zinc-800/50 px-2.5 py-1 text-zinc-400 border border-zinc-800">
                  {movie.status}
                </span>
              ) : null}

              {movie.originalLanguage ? (
                <span className="rounded-md bg-zinc-800/50 px-2 py-1 text-zinc-400 uppercase text-[10px] border border-zinc-800">
                  {movie.originalLanguage}
                </span>
              ) : null}
            </div>

            {/* Genres Pills */}
            {movie.genres && movie.genres.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 border border-zinc-700/40 transition-colors"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Action Row: Watchlist Button */}
            <div className="mt-5 flex items-center justify-center md:justify-start gap-3">
              <WatchlistDetailButton movie={movie} />
            </div>

            {/* Overview / Synopsis */}
            {movie.overview ? (
              <div className="mt-6 text-left">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
                  Overview
                </h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
                  {movie.overview}
                </p>
              </div>
            ) : null}

            {/* Directors & Writers Info */}
            <div className="mt-6 pt-5 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {movie.directors && movie.directors.length > 0 ? (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Director
                  </h4>
                  <p className="text-sm font-semibold text-zinc-200 mt-1">
                    {movie.directors[0].name}
                  </p>
                </div>
              ) : null}

              {movie.writers && movie.writers.length > 0 ? (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Writer
                  </h4>
                  <p className="text-sm font-semibold text-zinc-200 mt-1">
                    {movie.writers[0].name}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* 3. Cast Section */}
        <section className="mt-14 sm:mt-16">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Top Cast
            </h2>
            {movie.topCast && movie.topCast.length > 0 ? (
              <span className="text-xs text-zinc-400 font-medium bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                {movie.topCast.length}
              </span>
            ) : null}
          </div>

          {movie.topCast && movie.topCast.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
              {movie.topCast.map((actor) => (
                <CastCard key={`${actor.id}-${actor.character || actor.name}`} cast={actor} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-850 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
              No cast details currently available for this movie.
            </div>
          )}
        </section>

        {/* 4. Crew Section (Grouped by Person ID) */}
        <section className="mt-12 sm:mt-14">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Key Crew
            </h2>
            {uniqueCrew.length > 0 ? (
              <span className="text-xs text-zinc-400 font-medium bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                {uniqueCrew.length}
              </span>
            ) : null}
          </div>

          {uniqueCrew.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
              {uniqueCrew.map((member) => (
                <CrewCard key={member.id} crew={member} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-850 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
              No crew details currently available for this movie.
            </div>
          )}
        </section>

        {/* 5. More Movies Like This Section (Lazy streamed via Suspense) */}
        <Suspense fallback={<MoreMoviesSectionSkeleton />}>
          <AsyncMoreMoviesSection
            movieId={movie.id}
            industry={movie.industry || "HOLLYWOOD"}
            genres={movie.genres || []}
          />
        </Suspense>

        {/* 6. CineVerse Platform Ratings & User Reviews Section */}
        <MovieReviewsSection
          movieId={movie.id}
          movieTitle={movie.title}
          initialPlatformRating={movie.platformRating}
          initialPlatformRatingCount={movie.platformRatingCount}
        />
      </div>
    </main>
  );
}

