import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { fetchActorById } from "@/services/movieService";
import MovieCard from "@/components/MovieCard";

interface CastPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CastPageProps): Promise<Metadata> {
  const { id } = await params;
  const actor = await fetchActorById(id);

  if (!actor) {
    return {
      title: "Actor Not Found | CineVerse",
    };
  }

  return {
    title: `${actor.name} - Filmography | CineVerse`,
    description: actor.biography
      ? actor.biography.slice(0, 160)
      : `Explore the filmography of ${actor.name} on CineVerse.`,
  };
}

export default async function CastDetailPage({ params }: CastPageProps) {
  const { id } = await params;
  const actor = await fetchActorById(id);

  if (!actor) {
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
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Actor Not Found</h1>
          <p className="text-sm text-zinc-400 mb-6">
            We couldn't retrieve the details for actor #{id}. The profile may not exist or the movie service is currently unavailable.
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

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Top Navigation Bar / Breadcrumb */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span> Back to Movies
          </Link>
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
            Cast Profile
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Profile Card Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start pb-12 border-b border-zinc-800/80">
          {/* Profile Photo */}
          <div className="relative aspect-[3/4] w-44 sm:w-56 md:w-64 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl mx-auto md:mx-0">
            {actor.profileUrl ? (
              <Image
                src={actor.profileUrl}
                alt={actor.name}
                fill
                priority
                sizes="(max-width: 640px) 176px, (max-width: 768px) 224px, 256px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-zinc-600">
                <svg
                  className="h-14 w-14 mb-2 opacity-40"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
                <span className="text-xs font-medium">No Photo</span>
              </div>
            )}
          </div>

          {/* Actor Info & Bio */}
          <div className="flex-1 w-full text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-950/60 px-3 py-1 text-xs font-semibold text-red-400 border border-red-800/40 uppercase tracking-wider mb-3">
              Actor
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              {actor.name}
            </h1>

            {/* Quick Stats Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-zinc-300">
              {actor.age ? (
                <span className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium border border-zinc-800">
                  {actor.age} years old
                </span>
              ) : null}

              {actor.birthday ? (
                <span className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium border border-zinc-800 text-zinc-400">
                  Born: {actor.birthday}
                </span>
              ) : null}

              {actor.deathday ? (
                <span className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium border border-zinc-800 text-zinc-400">
                  Died: {actor.deathday}
                </span>
              ) : null}

              {actor.placeOfBirth ? (
                <span className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium border border-zinc-800 text-zinc-400">
                  📍 {actor.placeOfBirth}
                </span>
              ) : null}
            </div>

            {/* Biography */}
            {actor.biography ? (
              <div className="mt-6 text-left">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
                  Biography
                </h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-4xl whitespace-pre-line">
                  {actor.biography}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Films Acted Section */}
        <section className="mt-12 sm:mt-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Films Acted
            </h2>
            {actor.filmsActed && actor.filmsActed.length > 0 ? (
              <span className="text-xs text-zinc-400 font-medium bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
                {actor.filmsActed.length} {actor.filmsActed.length === 1 ? "movie" : "movies"}
              </span>
            ) : null}
          </div>

          {actor.filmsActed && actor.filmsActed.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {actor.filmsActed.map((movie) => (
                <div key={movie.id} className="flex justify-center">
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
              No filmography records currently available for this actor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

