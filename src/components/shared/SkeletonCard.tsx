"use client";
import Shimmer from "@/components/shared/Shimmer";
import { cn } from "@/lib/utils";

/**
 * SkeletonCard
 * ------------
 * Shimmer version of the MovieCard skeleton. Mirrors the MovieCard layout:
 *   - 2/3 aspect poster (shimmer)
 *   - thin title bar (shimmer)
 *   - thin meta bar (shimmer, half-width)
 *
 * Drop-in replacement wherever a grid of movie cards is loading.
 */
export default function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)} aria-hidden>
      <Shimmer rounded="lg" className="aspect-[2/3] w-full ring-1 ring-border" />
      <div className="mt-2 px-0.5 space-y-1.5">
        <Shimmer rounded="sm" className="h-3.5 w-11/12" />
        <Shimmer rounded="sm" className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}
