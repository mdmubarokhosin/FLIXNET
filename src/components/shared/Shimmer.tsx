"use client";
import { cn } from "@/lib/utils";

/**
 * Shimmer
 * -------
 * Animated gradient sweep skeleton block. Uses the theme-aware `.shimmer`
 * CSS class defined in globals.css (driven by `--skeleton-from` and
 * `--skeleton-to` CSS vars so it looks correct in both light and dark mode).
 *
 * This is the low-level primitive — use `<SkeletonCard />` for movie-card
 * skeletons, or compose this directly for custom shapes.
 */
export interface ShimmerProps {
  /** Tailwind className applied to the wrapper. */
  className?: string;
  /** Rounded style; defaults to a soft `rounded-md`. */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

const roundedMap: Record<NonNullable<ShimmerProps["rounded"]>, string> = {
  none: "",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export default function Shimmer({ className, rounded = "md" }: ShimmerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={cn("shimmer", roundedMap[rounded], className)}
    />
  );
}
