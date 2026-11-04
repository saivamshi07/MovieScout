import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import MovieSection from "@/components/MovieSection";
import MovieSectionSkeleton from "@/components/MovieSectionSkeleton";
import HomeSearch from "@/components/HomeSearch";
import {
  HOME_SECTIONS,
  fetchMoviesBySection,
  fetchRecommendations,
} from "@/services/movieService";

/**
 * Async Server Component for streaming an individual movie catalog section.
 * Renders and streams directly to the browser as soon as its data is ready.
 */
async function AsyncMovieSection({
  title,
  endpoint,
  badge,
  token,
}: {
  title: string;
  endpoint: string;
  badge?: string;
  token?: string;
}) {
  const movies = await fetchMoviesBySection(endpoint, { token });
  if (!movies || movies.length === 0) return null;
  return <MovieSection title={title} movies={movies} badge={badge} />;
}

/**
 * Async Server Component for streaming personalized recommendations.
 * Uses 50-movie waterfall fallback without blocking the rest of the home feed.
 */
async function AsyncRecommendationsSection({ token }: { token?: string }) {
  if (!token) return null;
  const movies = await fetchRecommendations(token);
  if (!movies || movies.length === 0) return null;
  return (
    <MovieSection
      title="✨ Recommended For You"
      badge="Personalized"
      movies={movies}
    />
  );
}

export default async function HomePage() {
  // Extract access token from incoming request cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const isCurated = Boolean(token);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Welcome Banner Container - Renders INSTANTLY in < 15ms */}
      {isCurated ? (
        <div className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 sm:p-10 text-center backdrop-blur-sm shadow-xl shadow-red-950/20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/30 text-red-400 text-xs font-semibold mb-3 sm:mb-4 tracking-wider uppercase">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Curated Experience Active
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Curated For <span className="text-red-500">You</span>
          </h1>
          <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base text-zinc-400">
            Your home feed and recommendations are dynamically tailored to your preferred cinema industries and genres.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/preferences?from=home"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 hover:border-red-500/60 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-red-500/10 cursor-pointer group"
              title="Customize your cinema industries and genres"
            >
              <svg className="h-4 w-4 text-red-500 transition-transform group-hover:rotate-45 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Edit Preferences</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 sm:p-10 text-center backdrop-blur-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Explore <span className="text-red-500">Cinema</span>
          </h1>
          <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base text-zinc-400">
            Welcome to your gateway to endless cinematic discoveries.
            Discover hidden gems, explore new favorites, and find your next unforgettable movie.
          </p>
        </div>
      )}

      {/* Multi-Entity Search Bar (All, Movies, Persons) - Renders INSTANTLY */}
      <HomeSearch />

      {/* Movie Catalogs (Each section streams in parallel as soon as its data is ready!) */}
      {HOME_SECTIONS.map((section) => (
        <Suspense
          key={section.key}
          fallback={<MovieSectionSkeleton title={section.title} />}
        >
          <AsyncMovieSection
            title={section.title}
            endpoint={section.endpoint}
            token={token}
          />
        </Suspense>
      ))}

       {/* Recommended For You Section (Streamed independently if logged in) */}
      {isCurated && (
        <Suspense
          fallback={
            <MovieSectionSkeleton
              title="✨ Recommended For You"
              badge="Personalized"
            />
          }
        >
          <AsyncRecommendationsSection token={token} />
        </Suspense>
      )}
      
    </div>
  );
}
