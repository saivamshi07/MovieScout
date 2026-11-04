interface MovieSectionSkeletonProps {
  title: string;
  badge?: string;
}

export default function MovieSectionSkeleton({
  title,
  badge,
}: MovieSectionSkeletonProps) {
  return (
    <section className="space-y-4 animate-pulse">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-300">
            {title}
          </h2>
          {badge && (
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
              {badge}
            </span>
          )}
        </div>

        <div className="h-3 w-28 rounded bg-zinc-800/60" />
      </div>

      {/* Horizontal Skeleton Rail */}
      <div className="flex gap-4 sm:gap-5 overflow-x-hidden pb-4 pt-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex flex-col shrink-0 w-36 sm:w-44 md:w-48 space-y-2.5"
          >
            {/* Poster Card Skeleton */}
            <div className="relative aspect-[2/3] w-full rounded-xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden shadow-md">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-800/40 via-transparent to-transparent" />
            </div>

            {/* Title Skeleton */}
            <div className="h-3.5 w-3/4 rounded bg-zinc-800" />
            {/* Subtitle / Year Skeleton */}
            <div className="h-2.5 w-1/2 rounded bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </section>
  );
}

