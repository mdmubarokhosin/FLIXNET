"use client";
import SkeletonCard from "@/components/shared/SkeletonCard";

/**
 * SkeletonGrid
 * ------------
 * Grid of shimmer skeleton cards used as a loading placeholder for content
 * grids (movies, series, search results, etc.). Matches the responsive
 * 2/3/4-column grid used by ContentGrid so the layout doesn't shift on load.
 */
export default function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-12"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
