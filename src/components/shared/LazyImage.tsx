"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LazyImage
 * --------
 * A smart <img> wrapper combining:
 *   - native `loading="lazy"` for browser-level deferral
 *   - IntersectionObserver fallback for older browsers / finer control
 *     (renders a shimmer placeholder until the image is actually visible)
 *   - onError fallback to picsum.photos so broken thumbnails never look broken
 *
 * The shimmer placeholder is a subtle animated gradient that matches the
 * platform's dark theme. When the image enters the viewport we set `src`
 * from the `data-src` attribute, set the loaded flag, and fade in.
 *
 * Usage:
 *   <LazyImage src={movie.thumbnail} alt={movie.title} className="w-full h-40" />
 */
export interface LazyImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "loading"> {
  src?: string;
  alt: string;
  /** Aspect ratio box height auto, default to "aspect-[2/3]" via className */
  className?: string;
  /** Picsum seed for the fallback image (defaults to a random number). */
  fallbackSeed?: string | number;
  /** Optional eager loading (skip lazy). Use for above-the-fold hero images. */
  eager?: boolean;
  /** Optional blur-up placeholder colour while loading. */
  placeholderClassName?: string;
}

const LazyImage = React.forwardRef<HTMLImageElement, LazyImageProps>(
  function LazyImage(
    {
      src,
      alt,
      className,
      fallbackSeed,
      eager = false,
      placeholderClassName,
      ...rest
    },
    ref
  ) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [inView, setInView] = React.useState<boolean>(eager);
    const [loaded, setLoaded] = React.useState<boolean>(false);
    const [errored, setErrored] = React.useState<boolean>(false);

    // Build a picsum fallback URL — deterministic when a seed is supplied.
    const fallback = React.useMemo(() => {
      const seed =
        fallbackSeed ??
        Math.abs(
          Array.from(alt || "x").reduce((acc, c) => acc + c.charCodeAt(0), 0)
        );
      return `https://picsum.photos/seed/${seed}/400/600`;
    }, [fallbackSeed, alt]);

    // IntersectionObserver: reveal the image only when it scrolls near.
    React.useEffect(() => {
      if (eager || inView) return;
      const node = containerRef.current;
      if (!node) return;
      if (typeof IntersectionObserver === "undefined") {
        setInView(true);
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              setInView(true);
              obs.disconnect();
              break;
            }
          }
        },
        { rootMargin: "200px" }
      );
      obs.observe(node);
      return () => obs.disconnect();
    }, [eager, inView]);

    // Reset load/errored flags when src changes.
    React.useEffect(() => {
      setLoaded(false);
      setErrored(false);
    }, [src]);

    const effectiveSrc = errored ? fallback : inView ? src : undefined;

    // Expose the inner <img> via the forwarded ref.
    const setInnerRef = React.useCallback(
      (node: HTMLImageElement | null) => {
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLImageElement | null>).current = node;
      },
      [ref]
    );

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden bg-muted/40",
          className
        )}
        aria-busy={!loaded}
      >
        {/* Shimmer placeholder — visible until the image has loaded */}
        {!loaded && (
          <div
            className={cn(
              "absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-secondary/70",
              placeholderClassName
            )}
            aria-hidden
          />
        )}
        {effectiveSrc && (
          <img
            {...rest}
            ref={setInnerRef}
            src={effectiveSrc}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (!errored) {
                setErrored(true);
                // If fallback itself fails, mark as loaded so the shimmer stops.
                setLoaded(true);
              }
            }}
            className={cn(
              "transition-opacity duration-500",
              loaded ? "opacity-100" : "opacity-0",
              className
            )}
          />
        )}
      </div>
    );
  }
);

export default LazyImage;
