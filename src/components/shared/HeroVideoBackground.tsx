"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * HeroVideoBackground
 * -------------------
 * A looping muted video used as a background for the HomePage hero section.
 * Falls back to a subtle gradient when no `videoURL` is provided, or when the
 * video fails to load. Overlays a dark gradient for text legibility.
 *
 * This component is purely visual — it renders behind the HeroSlider content
 * (or any hero section). It does NOT autoplay trailers on the DetailsPage
 * (that's a separate concern handled by VideoPlayer).
 */
export default function HeroVideoBackground({
  videoURL,
  posterURL,
  className,
}: {
  videoURL?: string;
  posterURL?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Track whether the video has started playing successfully. If it errors
  // out (e.g. unsupported format, network issue) we hide it so the gradient
  // fallback shows cleanly.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoURL) return;
    const handlePlay = () => setPlaying(true);
    const handleErr = () => setPlaying(false);
    el.addEventListener("playing", handlePlay);
    el.addEventListener("error", handleErr);
    // Try to play; some browsers reject autoplay with sound, so we keep muted.
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    return () => {
      el.removeEventListener("playing", handlePlay);
      el.removeEventListener("error", handleErr);
    };
  }, [videoURL]);

  if (!videoURL) {
    // Gradient fallback when no video is configured.
    return (
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-background",
          className
        )}
      />
    );
  }

  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)}>
      <video
        ref={videoRef}
        src={videoURL}
        poster={posterURL}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-700",
          playing ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Dark gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent" />
    </div>
  );
}
