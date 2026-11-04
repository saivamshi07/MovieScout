import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { fetchCrewById } from "@/services/movieService";
import { CrewWorkedFilm } from "@/types/movie";

interface CrewPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Deduplicate films by movie ID and combine all roles/departments
 * the crew member performed on that specific movie.
 */
function groupWorkedFilms(films?: CrewWorkedFilm[]): CrewWorkedFilm[] {
  if (!films || films.length === 0) return [];

  const map = new Map<number, CrewWorkedFilm>();

  for (const film of films) {
    const role = film.job?.trim() || film.department?.trim();
    const existing = map.get(film.id);

    if (!existing) {
      map.set(film.id, {
        ...film,
        roles: role ? [role] : [],
      });
    } else {
      if (role && existing.roles && !existing.roles.includes(role)) {
        existing.roles.push(role);
      }
      if (!existing.posterUrl && film.posterUrl) {
        existing.posterUrl = film.posterUrl;
      }
      if (existing.tmdbVoteAverage == null && film.tmdbVoteAverage != null) {
        existing.tmdbVoteAverage = film.tmdbVoteAverage;
      }
    }
  }

  return Array.from(map.values());
}

export async function generateMetadata({ params }: CrewPageProps): Promise<Metadata> {
  const { id } = await params;
  const crew = await fetchCrewById(id);

  if (!crew) {
    return {
      title: "Crew Member Not Found | CineVerse",
    };
  }

  return {
    title: `${crew.name} - Filmography | CineVerse`,
    description: crew.biography
      ? crew.biography.slice(0, 160)
      : `Explore films worked on by ${crew.name} on CineVerse.`,
  };
}

export default async function CrewDetailPage({ params }: CrewPageProps) {
  const { id } = await params;
  const crew = await fetchCrewById(id);

  if (!crew) {
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
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Crew Member Not Found</h1>
          <p className="text-sm text-zinc-400 mb-6">
            We couldn't retrieve the details for crew member #{id}. The profile may not exist or the movie service is currently unavailable.
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

  const uniqueFilms = groupWorkedFilms(crew.filmsWorked);

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
            Crew Profile
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Profile Card Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start pb-12 border-b border-zinc-800/80">
          {/* Profile Photo */}
          <div className="relative aspect-[3/4] w-44 sm:w-56 md:w-64 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl mx-auto md:mx-0">
            {crew.profileUrl ? (
              <Image
                src={crew.profileUrl}
                alt={crew.name}
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

          {/* Crew Info & Bio */}
          <div className="flex-1 w-full text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 border border-zinc-700 uppercase tracking-wider mb-3">
              {crew.knownForDepartment || "Crew Member"}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              {crew.name}
            </h1>

            {/* Primary Designations (e.g. Director, Screenplay, Producer) */}
            {crew.primaryDesignations && crew.primaryDesignations.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2">
                {crew.primaryDesignations.map((designation) => (
                  <span
                    key={designation}
                    className="rounded-md bg-red-950/60 text-red-300 border border-red-800/40 px-2.5 py-1 text-xs font-medium"
                  >
                    {designation}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Quick Stats Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-zinc-300">
              {crew.birthday ? (
                <span className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium border border-zinc-800 text-zinc-400">
                  Born: {crew.birthday}
                </span>
              ) : null}

              {crew.deathday ? (
                <span className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium border border-zinc-800 text-zinc-400">
                  Died: {crew.deathday}
                </span>
              ) : null}
            </div>

            {/* Biography */}
            {crew.biography ? (
              <div className="mt-6 text-left">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2">
                  Biography
                </h3>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-4xl whitespace-pre-line">
                  {crew.biography}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Films Worked Section */}
        <section className="mt-12 sm:mt-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Films Worked
            </h2>
            {uniqueFilms.length > 0 ? (
              <span className="text-xs text-zinc-400 font-medium bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
                {uniqueFilms.length} {uniqueFilms.length === 1 ? "film" : "films"}
              </span>
            ) : null}
          </div>

          {uniqueFilms.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {uniqueFilms.map((film) => {
                const roleText =
                  film.roles && film.roles.length > 0
                    ? film.roles.join(", ")
                    : film.job || film.department;

                return (
                  <div key={film.id} className="flex justify-center">
                    <Link
                      href={`/movie/${film.id}`}
                      className="group flex flex-col shrink-0 w-36 sm:w-44 md:w-48 transition-transform duration-300 hover:-translate-y-1"
                    >
                      {/* Poster */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 shadow-md transition-all duration-300 group-hover:border-zinc-700 group-hover:shadow-red-500/10 group-hover:shadow-lg">
                        {film.posterUrl ? (
                          <Image
                            src={film.posterUrl}
                            alt={film.title}
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

                        {/* Rating Badge */}
                        {film.tmdbVoteAverage ? (
                          <div className="absolute top-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur-sm border border-black/40">
                            ★ {film.tmdbVoteAverage.toFixed(1)}
                          </div>
                        ) : null}
                      </div>

                      {/* Movie Info and Grouped Crew Job Badge */}
                      <div className="mt-2.5 px-0.5">
                        <h3
                          className="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-1 transition-colors group-hover:text-red-400"
                          title={film.title}
                        >
                          {film.title}
                        </h3>

                        <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
                          <span className="text-zinc-500">
                            {film.releaseYear || ""}
                          </span>
                          {roleText ? (
                            <span
                              className="text-[10px] font-medium text-red-400 bg-red-950/40 border border-red-900/30 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                              title={roleText}
                            >
                              {roleText}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
              No filmography records currently available for this crew member.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

