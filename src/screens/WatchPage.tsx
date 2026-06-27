"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  List,
  Play,
  Loader2,
  AlertCircle,
  X,
  Lock,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import VideoPlayer from "@/components/player/VideoPlayer";
import type { SubtitleTrack } from "@/components/player/VideoPlayer";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { incrementViews } from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatTime } from "@/utils/format";
import type { Episode, Movie, Series } from "@/firebase/types";

interface RelatedItem {
  id: string;
  title: string;
  thumbnail: string;
  type: "movie" | "series";
  year: number;
}

export default function WatchPage() {
  const { type, id } = useParams<{ type: "movie" | "series"; id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getMovieById, getSeriesById, getEpisodesBySeries, movies, series } = useData();
  // No-op: recordWatch removed (UserContentContext deleted)
  const { user } = useAuth();
  const { settings } = useSettings();

  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const viewsIncrementedRef = useRef<string | null>(null);
  const lastProgressRecordRef = useRef<{ time: number; pct: number }>({ time: 0, pct: 0 });

  // ---------- Resume-watching state ----------
  // `resumePercent` holds the saved progress (0–100) fetched from the DB
  // on mount. `applyResume` is the value actually passed down to the
  // VideoPlayer — it stays undefined until the user clicks the Resume
  // button (so we don't auto-seek past the user's intent).
  const [resumePercent, setResumePercent] = useState<number | undefined>(undefined);
  const [applyResume, setApplyResume] = useState<number | undefined>(undefined);
  const [videoDuration, setVideoDuration] = useState(0);
  const resumeToastShownRef = useRef(false);

  // ---------- Resolve content ----------
  const movie = useMemo(() => (type === "movie" && id ? getMovieById(id) : undefined), [type, id, getMovieById]);
  const seriesItem = useMemo(
    () => (type === "series" && id ? getSeriesById(id) : undefined),
    [type, id, getSeriesById]
  );
  const episodes = useMemo(
    () => (seriesItem ? getEpisodesBySeries(seriesItem.id) : []),
    [seriesItem, getEpisodesBySeries]
  );

  // Current episode for series
  const epParam = searchParams.get("ep");
  const currentEpisode = useMemo(() => {
    if (type !== "series" || !episodes.length) return undefined;
    if (epParam) {
      const found = episodes.find((e) => e.id === epParam);
      if (found) return found;
    }
    return episodes[0];
  }, [type, episodes, epParam]);

  // ---------- Compute player props ----------
  const videoSrc = useMemo(() => {
    if (type === "movie" && movie) return movie.videoURL;
    if (type === "series" && currentEpisode) return currentEpisode.videoURL;
    return "";
  }, [type, movie, currentEpisode]);

  const poster = useMemo(() => {
    if (type === "movie" && movie) return movie.banner;
    if (type === "series" && currentEpisode) return currentEpisode.thumbnail;
    if (seriesItem) return seriesItem.banner;
    return "";
  }, [type, movie, currentEpisode, seriesItem]);

  const playerTitle = useMemo(() => {
    if (type === "movie" && movie) return movie.title;
    if (type === "series" && currentEpisode && seriesItem) {
      return `${seriesItem.title} • S${currentEpisode.season}:E${currentEpisode.episodeNumber} - ${currentEpisode.title}`;
    }
    return "";
  }, [type, movie, currentEpisode, seriesItem]);

  const subtitles: SubtitleTrack[] = useMemo(() => {
    if (type === "movie" && movie?.subtitles) return movie.subtitles as SubtitleTrack[];
    if (type === "series" && currentEpisode?.subtitles) return currentEpisode.subtitles as SubtitleTrack[];
    return [];
  }, [type, movie, currentEpisode]);

  // ---------- Determine next episode ----------
  const nextEpisode = useMemo(() => {
    if (type !== "series" || !currentEpisode || !episodes.length) return undefined;
    const idx = episodes.findIndex((e) => e.id === currentEpisode.id);
    if (idx === -1 || idx >= episodes.length - 1) return undefined;
    return episodes[idx + 1];
  }, [type, currentEpisode, episodes]);

  // ---------- Track views increment on mount ----------
  useEffect(() => {
    if (!id || !type) return;
    if (viewsIncrementedRef.current === `${type}-${id}`) return;
    viewsIncrementedRef.current = `${type}-${id}`;
    incrementViews(type, id).catch(() => {
      /* ignore */
    });
  }, [id, type]);

  // ---------- Fetch saved watch progress (Resume Watching) ----------
  // On mount (or when the content / episode changes), pull the user's
  // saved progress from the DB. If they were between 5% and 95% through,
  // we surface a "Resume from XX:XX" prompt so they can jump back to it.
  // Watch progress fetching removed after Firestore migration
  // Resume-watching feature is disabled until re-implemented
  useEffect(() => {
    if (!id || !type) return;
    setResumePercent(undefined);
    setApplyResume(undefined);
    setVideoDuration(0);
    resumeToastShownRef.current = false;
  }, [id, type]);

  // ---------- Auto-advance to next episode ----------
  const handleAutoNext = useCallback(() => {
    if (type !== "series" || !nextEpisode) return;
    const params = new URLSearchParams(searchParams);
    params.set("ep", nextEpisode.id);
    setSearchParams(params, { replace: true });
    toast.success(`Playing next: ${nextEpisode.title}`);
  }, [type, nextEpisode, searchParams, setSearchParams]);

  // ---------- Record watch progress ----------
  // Called by the VideoPlayer on every `timeupdate`. We:
  //  1. Stash the duration (used to compute the outroStart demo value).
  //  2. Once we know the duration AND we have a stored resume percent,
  //     surface a one-shot "Resume from XX:XX" toast.
  //  3. Throttle save calls to every 10s / 5% change. Persist to BOTH
  //     watch history (for the Continue Watching row) and watch progress
  //     (for the resume-position feature).
  const handleProgress = useCallback(
    (currentTime: number, dur: number, pct: number) => {
      if (!id || !type) return;
      // Stash duration for outroStart demo
      if (dur > 0 && dur !== videoDuration) {
        setVideoDuration(dur);
      }
      // Show the resume toast exactly once, once we know the time.
      if (
        resumePercent !== undefined &&
        !resumeToastShownRef.current &&
        dur > 0
      ) {
        resumeToastShownRef.current = true;
        const seconds = Math.round((resumePercent / 100) * dur);
        toast(`Resume from ${formatTime(seconds)}?`, {
          action: {
            label: "Resume",
            onClick: () => setApplyResume(resumePercent),
          },
        });
      }
      // Throttle: every 10 seconds OR every 5% change
      const last = lastProgressRecordRef.current;
      const timeOk = currentTime - last.time >= 10;
      const pctOk = Math.abs(pct - last.pct) >= 5;
      if (!timeOk && !pctOk) return;
      lastProgressRecordRef.current = { time: currentTime, pct };

      const thumbnail =
        type === "movie"
          ? movie?.thumbnail || movie?.banner || ""
          : currentEpisode?.thumbnail || seriesItem?.thumbnail || "";

      const title =
        type === "movie"
          ? movie?.title || ""
          : currentEpisode
            ? `${seriesItem?.title || ""} • S${currentEpisode.season}E${currentEpisode.episodeNumber}`
            : seriesItem?.title || "";

      // Persist watch history (for the Continue Watching row).
      // Persist precise watch progress (for the resume-position feature).
      // Watch progress saving removed after Firestore migration
    },
    [id, type, movie, seriesItem, currentEpisode, user, resumePercent, videoDuration]
  );

  // ---------- Related content (same category) ----------
  const relatedItems = useMemo<RelatedItem[]>(() => {
    if (!type) return [];
    const catId = type === "movie" ? movie?.category : seriesItem?.category;
    if (!catId) return [];
    const list: RelatedItem[] = [];
    if (type === "movie") {
      for (const s of series) {
        if (s.category === catId) {
          list.push({ id: s.id, title: s.title, thumbnail: s.thumbnail, type: "series", year: s.year });
        }
      }
      for (const m of movies) {
        if (m.id === id) continue;
        if (m.category === catId) {
          list.push({ id: m.id, title: m.title, thumbnail: m.thumbnail, type: "movie", year: m.year });
        }
      }
    } else {
      for (const m of movies) {
        if (m.category === catId) {
          list.push({ id: m.id, title: m.title, thumbnail: m.thumbnail, type: "movie", year: m.year });
        }
      }
      for (const s of series) {
        if (s.id === id) continue;
        if (s.category === catId) {
          list.push({ id: s.id, title: s.title, thumbnail: s.thumbnail, type: "series", year: s.year });
        }
      }
    }
    return list.slice(0, 12);
  }, [type, movie, seriesItem, movies, series, id]);

  // ---------- Group episodes by season ----------
  const episodesBySeason = useMemo(() => {
    if (!episodes.length) return [] as { season: number; items: Episode[] }[];
    const map = new Map<number, Episode[]>();
    for (const ep of episodes) {
      if (!map.has(ep.season)) map.set(ep.season, []);
      map.get(ep.season)!.push(ep);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([season, items]) => ({ season, items }));
  }, [episodes]);

  // ---------- Episode selection ----------
  const selectEpisode = (ep: Episode) => {
    const params = new URLSearchParams(searchParams);
    params.set("ep", ep.id);
    setSearchParams(params, { replace: false });
    setShowEpisodes(false);
  };

  // ---------- Loading / error states ----------
  const loading = !videoSrc && (type === "movie" ? !movie : !seriesItem);
  const notFound =
    (!!type && !!id && type === "movie" && !movie) ||
    (!!type && !!id && type === "series" && !seriesItem);

  // Invalid type
  if (type !== "movie" && type !== "series") {
    return <NotFoundView message="Invalid content type." onBack={() => navigate("/")} />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <NotFoundView
        message="The content you're looking for could not be found."
        onBack={() => navigate("/")}
      />
    );
  }

  // ---------- Subscription gate (removed) ----------

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Top bar (overlay-style; only shows back button + episode toggle on mobile) */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <Link
          to={`/details/${type}/${id}`}
          className="pointer-events-auto inline-flex items-center gap-1.5 text-white hover:text-primary transition-colors bg-black/40 hover:bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>

        <div className="flex items-center gap-2 pointer-events-auto">
          {type === "series" && episodes.length > 0 && (
            <button
              onClick={() => setShowEpisodes((s) => !s)}
              className="inline-flex items-center gap-1.5 text-white bg-black/40 hover:bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-sm font-medium"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Episodes</span>
            </button>
          )}
          {relatedItems.length > 0 && (
            <button
              onClick={() => setShowRelated((s) => !s)}
              className="inline-flex items-center gap-1.5 text-white bg-black/40 hover:bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-sm font-medium"
            >
              <span className="hidden sm:inline">More Like This</span>
              <span className="sm:hidden">Related</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showRelated && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {/* Main player area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Player */}
        <div className="flex-1 relative bg-black">
          {videoSrc ? (
            <PlayerRenderer
              src={videoSrc}
              poster={poster}
              title={playerTitle}
              subtitles={subtitles}
              onProgress={handleProgress}
              autoNext={type === "series" && !!nextEpisode}
              nextEpisodeLabel={nextEpisode?.title}
              onNext={type === "series" && nextEpisode ? handleAutoNext : undefined}
              introEnd={30}
              outroStart={videoDuration > 60 ? videoDuration - 60 : undefined}
              resumeAtPercent={applyResume}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/70">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {/* Resume-watching button overlay.
              Shown when we have a stored resume percent that hasn't been
              applied yet — clicking it seeks the player to that position. */}
          <AnimatePresence>
            {resumePercent !== undefined && applyResume === undefined && videoDuration > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2 }}
                onClick={() => setApplyResume(resumePercent)}
                className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-30 inline-flex items-center gap-2 bg-white/95 hover:bg-white text-black font-semibold text-sm px-4 py-2 rounded-md shadow-lg transition-colors"
                aria-label="Resume watching"
              >
                <Play className="w-4 h-4 fill-black" />
                Resume from {formatTime(Math.round((resumePercent / 100) * videoDuration))}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Episode selector (desktop sidebar) */}
        {type === "series" && (
          <AnimatePresence>
            {showEpisodes && (
              <>
                {/* Mobile backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowEpisodes(false)}
                  className="fixed inset-0 bg-black/60 z-40 md:hidden"
                />
                <motion.aside
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="fixed md:relative top-0 right-0 bottom-0 z-50 w-full max-w-md md:w-[400px] bg-card border-l border-border flex flex-col"
                >
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                      <h3 className="text-foreground text-lg font-bold">Episodes</h3>
                      {seriesItem && (
                        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{seriesItem.title}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowEpisodes(false)}
                      className="text-muted-foreground hover:text-foreground p-2"
                      aria-label="Close episodes"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-5">
                      {episodesBySeason.map((group) => (
                        <div key={group.season}>
                          <h4 className="text-primary text-sm font-bold uppercase tracking-wide px-1 mb-2">
                            Season {group.season}
                          </h4>
                          <div className="space-y-1">
                            {group.items.map((ep) => {
                              const isCurrent = currentEpisode?.id === ep.id;
                              return (
                                <button
                                  key={ep.id}
                                  onClick={() => selectEpisode(ep)}
                                  className={cn(
                                    "w-full flex gap-3 p-2 rounded-md text-left transition-colors",
                                    isCurrent ? "bg-accent" : "hover:bg-muted"
                                  )}
                                >
                                  <div className="relative w-28 h-16 shrink-0 rounded overflow-hidden bg-muted">
                                    <img
                                      src={ep.thumbnail}
                                      alt={ep.title}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${ep.id}/300/170`;
                                      }}
                                    />
                                    {isCurrent ? (
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                          PLAYING
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                        <Play className="w-6 h-6 text-white fill-white" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-foreground text-sm font-semibold truncate">
                                        {ep.episodeNumber}. {ep.title}
                                      </p>
                                      <span className="text-muted-foreground/80 text-xs shrink-0">{ep.duration}</span>
                                    </div>
                                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                                      {ep.description}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {!episodesBySeason.length && (
                        <div className="text-center text-muted-foreground/80 text-sm py-8">
                          No episodes available.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Related content drawer (bottom collapsible) */}
      <AnimatePresence>
        {showRelated && relatedItems.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-30 bg-card border-t border-border overflow-hidden"
          >
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground text-lg font-bold">More Like This</h3>
                <button
                  onClick={() => setShowRelated(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Close related"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {relatedItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={`/watch/${item.type}/${item.id}`}
                    className="group/rel block"
                  >
                    <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/rel:scale-105 transition-transform"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/300/170`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/rel:opacity-100 transition-opacity flex items-end p-2">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                    <p className="text-foreground text-xs font-medium mt-1.5 line-clamp-1">{item.title}</p>
                    <p className="text-muted-foreground/80 text-[11px]">
                      {item.year} • <span className="uppercase">{item.type}</span>
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotFoundView({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <AlertCircle className="w-14 h-14 text-primary mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-2">Unable to play</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button onClick={onBack} className="bg-white text-black hover:bg-white/90">
          <ArrowLeft className="w-4 h-4" /> Back to browse
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   PlayerRenderer — picks the right player for the source URL.

   - Direct media files (`.mp4`, `.webm`, `.m3u8`, …) → native
     `<video>` element with the custom FLIXNET controls.
   - Embed pages → sandboxed `<iframe>`.
----------------------------------------------------------------- */
interface PlayerRendererProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: SubtitleTrack[];
  onProgress?: (currentTime: number, duration: number, percent: number) => void;
  onEnded?: () => void;
  autoNext?: boolean;
  nextEpisodeLabel?: string;
  onNext?: () => void;
  introEnd?: number;
  outroStart?: number;
  resumeAtPercent?: number;
}

function PlayerRenderer({
  src,
  poster,
  title,
  subtitles,
  onProgress,
  onEnded,
  autoNext,
  nextEpisodeLabel,
  onNext,
  introEnd,
  outroStart,
  resumeAtPercent,
}: PlayerRendererProps) {
  const sourceInfo = useMemo(() => {
    const lower = src.toLowerCase().split("?")[0].split("#")[0];
    const directExts = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".mkv", ".m3u8", ".mpd", ".ts"];
    const isDirect = directExts.some((ext) => lower.endsWith(ext));
    try {
      const u = new URL(src);
      const host = u.hostname.replace(/^www\./, "");
      const embedHosts = ["youtube.com", "m.youtube.com", "youtu.be", "vimeo.com", "abyssplayer.com", "abyss.to", "doodstream.com", "dood.so", "dood.yt", "streamtape.com", "streamtape.to", "voe.sx", "mixdrop.co", "mixdrop.to", "upstream.to", "streamlare.com", "vidplay.site", "vidplay.online", "vidplay.lol", "filemoon.sx", "filemoon.to", "2embed.cc", "2embed.to", "embed.su", "vidsrc.to", "vidsrc.me"];
      if (embedHosts.includes(host)) return { isEmbed: true, embedUrl: src };
      if (host === "youtube.com" || host === "m.youtube.com") { const id = u.searchParams.get("v"); return { isEmbed: true, embedUrl: id ? `https://www.youtube.com/embed/${id}` : src }; }
      if (host === "youtu.be") { const id = u.pathname.slice(1); return { isEmbed: true, embedUrl: id ? `https://www.youtube.com/embed/${id}` : src }; }
      if (host === "vimeo.com") { const id = u.pathname.split("/").filter(Boolean)[0]; return { isEmbed: true, embedUrl: id ? `https://player.vimeo.com/video/${id}` : src }; }
      if (u.pathname.toLowerCase().includes("/embed/")) return { isEmbed: true, embedUrl: src };
      if (isDirect) return { isEmbed: false, embedUrl: src };
      return { isEmbed: true, embedUrl: src };
    } catch { return { isEmbed: !isDirect, embedUrl: src }; }
  }, [src]);

  if (sourceInfo.isEmbed) {
    return (
      <iframe
        src={sourceInfo.embedUrl}
        title={title || "Video"}
        className="absolute inset-0 w-full h-full"
        style={{ border: "none" }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <VideoPlayer
      src={src}
      poster={poster}
      title={title}
      subtitles={subtitles}
      onProgress={onProgress}
      onEnded={onEnded}
      autoNext={autoNext}
      nextEpisodeLabel={nextEpisodeLabel}
      onNext={onNext}
      introEnd={introEnd}
      outroStart={outroStart}
      resumeAtPercent={resumeAtPercent}
    />
  );
}
