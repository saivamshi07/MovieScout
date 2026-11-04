import Image from "next/image";
import Link from "next/link";
import { CastMember } from "@/types/movie";

interface CastCardProps {
  cast: CastMember;
}

export default function CastCard({ cast }: CastCardProps) {
  return (
    <Link
      href={`/cast/${cast.id}`}
      className="flex flex-col shrink-0 w-28 sm:w-32 text-center group cursor-pointer"
    >
      {/* Profile Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:border-zinc-700">
        {cast.profileUrl ? (
          <Image
            src={cast.profileUrl}
            alt={cast.name}
            fill
            sizes="(max-width: 640px) 112px, 128px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-zinc-600 bg-zinc-900/60">
            <svg
              className="h-9 w-9 opacity-40 mb-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            <span className="text-[10px] text-zinc-500 font-medium">No Image</span>
          </div>
        )}
      </div>

      {/* Actor Name and Character */}
      <div className="mt-2 px-1">
        <h4 className="text-xs sm:text-sm font-medium text-zinc-100 line-clamp-1 transition-colors group-hover:text-red-400">
          {cast.name}
        </h4>
        {cast.character ? (
          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5" title={cast.character}>
            {cast.character}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

