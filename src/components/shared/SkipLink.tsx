"use client";
import { cn } from "@/lib/utils";

/**
 * SkipLink
 * --------
 * A "Skip to main content" link for screen-reader and keyboard users.
 * Invisible by default; becomes visible when focused.
 *
 * Place once near the top of MainLayout. The link targets the `id="main"`
 * (or supplied `targetId`) element on the page.
 */
export default function SkipLink({
  targetId = "main-content",
  className,
}: {
  targetId?: string;
  className?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]",
        "focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2",
        "focus:rounded-md focus:shadow-lg focus:text-sm focus:font-semibold",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    >
      Skip to main content
    </a>
  );
}
