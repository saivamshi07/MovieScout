import Image from "next/image";
import Link from "next/link";
import { ActorSearchResult, CrewSearchResult } from "@/types/movie";

interface SearchPersonCardProps {
  person: ActorSearchResult | CrewSearchResult;
  type: "actor" | "crew";
}

export default function SearchPersonCard({ person, type }: SearchPersonCardProps) {
  const isActor = type === "actor";
  const href = isActor ? `/cast/${person.id}` : `/crew/${person.id}`;
  const department = "department" in person ? person.department : "Acting";

  return (
    <Link
      href={href}
      className="group flex flex-col shrink-0 w-36 sm:w-44 md:w-48 transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Profile Photo */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 shadow-md transition-all duration-300 group-hover:border-zinc-700 group-hover:shadow-red-500/10 group-hover:shadow-lg">
        {person.profileUrl ? (
          <Image
            src={person.profileUrl}
            alt={person.name}
            fill
            sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 192px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-zinc-600">
            <svg
              className="h-12 w-12 mb-2 opacity-40"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            <span className="text-xs font-medium">No Photo</span>
          </div>
        )}

        {/* Department / Role Badge */}
        <div className="absolute top-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-200 backdrop-blur-sm border border-zinc-700/60 shadow">
          {isActor ? "Actor" : department || "Crew"}
        </div>
      </div>

      {/* Name and Known For */}
      <div className="mt-2.5 px-0.5">
        <h3
          className="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-1 transition-colors group-hover:text-red-400"
          title={person.name}
        >
          {person.name}
        </h3>

        {person.knownFor && person.knownFor.length > 0 ? (
          <p
            className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1"
            title={person.knownFor.join(", ")}
          >
            {person.knownFor.join(", ")}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {isActor ? "Film & Television" : department || "Cinema Crew"}
          </p>
        )}
      </div>
    </Link>
  );
}

