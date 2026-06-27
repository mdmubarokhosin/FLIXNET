"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Loader2, ExternalLink, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Lightweight inline video source classifier (replaces deleted @/utils/videoSource) */
function classifyVideoSource(url: string) {
  const lower = url.toLowerCase().split("?")[0].split("#")[0];
  const directExts = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".mkv", ".m3u8", ".mpd", ".ts"];
  const isDirect = directExts.some((ext) => lower.endsWith(ext));
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      return { kind: id ? "youtube" : "embed", embedUrl: id ? `https://www.youtube.com/embed/${id}` : url };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return { kind: id ? "youtube" : "embed", embedUrl: id ? `https://www.youtube.com/embed/${id}` : url };
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return { kind: id ? "vimeo" : "embed", embedUrl: id ? `https://player.vimeo.com/video/${id}` : url };
    }
    const embedHosts = ["abyssplayer.com", "abyss.to", "doodstream.com", "dood.so", "dood.yt", "streamtape.com", "streamtape.to", "voe.sx", "mixdrop.co", "mixdrop.to", "upstream.to", "streamlare.com", "vidplay.site", "vidplay.online", "vidplay.lol", "filemoon.sx", "filemoon.to", "2embed.cc", "2embed.to", "embed.su", "vidsrc.to", "vidsrc.me"];
    if (embedHosts.includes(host)) return { kind: "embed", embedUrl: url };
    if (u.pathname.toLowerCase().includes("/embed/")) return { kind: "embed", embedUrl: url };
    if (isDirect) return { kind: "direct", embedUrl: url };
    return { kind: "embed", embedUrl: url };
  } catch {
    return { kind: isDirect ? "direct" : "embed", embedUrl: url };
  }
}

/* ----------------------------------------------------------------
   TrailerModal — popup modal that plays a movie/series trailer.

   Supports three source kinds:
     1. Direct media files (.mp4, .webm, .m3u8, …) → native <video>
     2. YouTube / Vimeo watch URLs → embed via iframe with autoplay
     3. Other embed pages (abyssplayer, doodstream, …) → iframe

   The modal is responsive (16:9 aspect, capped at 5xl on desktop) and
   stops playback on close by unmounting the player (keyed by open state).
----------------------------------------------------------------- */

export interface TrailerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerURL: string;
  title?: string;
  /** Optional extra context: year, rating, duration, etc. */
  meta?: React.ReactNode;
}

function buildYouTubeEmbed(url: string, autoplay = true): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtube.com" || host === "m.youtube.com") {
      id = u.searchParams.get("v") || "";
    } else if (host === "youtu.be") {
      id = u.pathname.slice(1);
    }
    if (id) {
      const p = new URLSearchParams({
        autoplay: autoplay ? "1" : "0",
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
        ...(autoplay ? {} : {}),
      });
      return `https://www.youtube.com/embed/${id}?${p.toString()}`;
    }
  } catch {
    /* fall through */
  }
  return url;
}

function buildVimeoEmbed(url: string, autoplay = true): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) {
        const p = new URLSearchParams({
          autoplay: autoplay ? "1" : "0",
        });
        return `https://player.vimeo.com/video/${id}?${p.toString()}`;
      }
    }
  } catch {
    /* fall through */
  }
  return url;
}

export default function TrailerModal({
  open,
  onOpenChange,
  trailerURL,
  title,
  meta,
}: TrailerModalProps) {
  // Classify the source once per URL.
  const info = React.useMemo(
    () => classifyVideoSource(trailerURL),
    [trailerURL]
  );

  // Build the final embed/play URL based on kind.
  const playUrl = React.useMemo(() => {
    if (!trailerURL) return "";
    if (info.kind === "youtube") return buildYouTubeEmbed(trailerURL, true);
    if (info.kind === "vimeo") return buildVimeoEmbed(trailerURL, true);
    return info.embedUrl || trailerURL;
  }, [trailerURL, info]);

  const isDirect = info.kind === "direct";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-black border-border text-foreground p-0 gap-0 max-w-5xl w-[calc(100vw-1rem)] sm:w-full overflow-hidden"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-black/90 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/20 ring-1 ring-primary/30 shrink-0">
              <Film className="w-4 h-4 text-primary" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-white text-sm sm:text-base font-semibold truncate">
                {title || "Trailer"}
              </DialogTitle>
              {meta && (
                <DialogDescription className="text-white/60 text-[11px] sm:text-xs mt-0.5">
                  {meta}
                </DialogDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={trailerURL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => onOpenChange(false)}
              aria-label="Close trailer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Player area — 16:9, responsive height */}
        <div className="relative w-full bg-black">
          {/* Loading skeleton */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-white/50">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading trailer…</span>
            </div>
          </div>

          {/* Player — keyed by `open` + URL so it remounts (stops audio) on close */}
          <AnimatePresence>
            {open && playUrl && (
              <motion.div
                key={`${open}-${playUrl}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative w-full"
                style={{ aspectRatio: "16 / 9" }}
              >
                {isDirect ? (
                  <video
                    src={playUrl}
                    autoPlay
                    controls
                    playsInline
                    className="absolute inset-0 w-full h-full bg-black"
                  />
                ) : (
                  <iframe
                    src={playUrl}
                    title={title || "Trailer"}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fallback when no URL */}
          {!playUrl && (
            <div
              className="flex items-center justify-center text-white/50 text-sm"
              style={{ aspectRatio: "16 / 9" }}
            >
              No trailer URL available.
            </div>
          )}
        </div>

        {/* Footer badge */}
        <div className="px-4 sm:px-5 py-2.5 bg-black/90 border-t border-white/10 flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="border-white/20 text-white/70 bg-white/5 gap-1"
          >
            <Film className="w-3 h-3" />
            {isDirect ? "Direct video" : info.kind === "youtube" ? "YouTube" : info.kind === "vimeo" ? "Vimeo" : "Embed"}
          </Badge>
          <span className="text-[10px] text-white/40">
            Press Esc or tap the X to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
