"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Subtitles,
  SkipForward,
  Loader2,
  X,
  ChevronRight,
  PictureInPicture2,
  FastForward,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatTime } from "@/utils/format";

export interface SubtitleTrack {
  label: string;
  srclang: string;
  src: string;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: SubtitleTrack[];
  onProgress?: (currentTime: number, duration: number, percent: number) => void;
  onEnded?: () => void;
  autoNext?: boolean;
  nextEpisodeLabel?: string;
  onNext?: () => void;
  className?: string;
  /** Live stream — hides the seek bar + auto-next, shows a LIVE indicator. */
  isLive?: boolean;
  /** Seconds at which the intro ends — a "Skip Intro" button is shown until this point. */
  introEnd?: number;
  /** Seconds at which the outro/credits start — a "Skip Credits" button is shown after this point. */
  outroStart?: number;
  /**
   * Optional resume position as a percentage (0–100) of the total duration.
   * When supplied, the player will seek to (percent / 100) * duration as
   * soon as the media metadata has loaded. Used by the "Resume from XX:XX"
   * feature on the watch page.
   */
  resumeAtPercent?: number;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_OPTIONS = ["Auto", "1080p", "720p", "480p", "360p"];
const HIDE_CONTROLS_DELAY = 3000;
const AUTO_NEXT_TRIGGER_SECONDS = 10; // show countdown when this many seconds remain
const AUTO_NEXT_COUNTDOWN_FROM = 10;

const VOLUME_STORAGE_KEY = "flixnet-player-volume";
const MUTED_STORAGE_KEY = "flixnet-player-muted";
const QUALITY_STORAGE_KEY = "flixnet-quality";

function getStoredQuality(): string {
  if (typeof window === "undefined") return "Auto";
  const v = window.localStorage.getItem(QUALITY_STORAGE_KEY);
  return v && QUALITY_OPTIONS.includes(v) ? v : "Auto";
}

/**
 * PiP is a browser-provided API (`document.pictureInPictureEnabled`).
 * Not every browser/OS supports it, so we feature-detect before showing
 * the toggle button.
 */
function isPiPSupported(): boolean {
  return typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled);
}

function getStoredVolume(): number {
  if (typeof window === "undefined") return 1;
  const v = window.localStorage.getItem(VOLUME_STORAGE_KEY);
  const n = v ? parseFloat(v) : 1;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 1;
}

function getStoredMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTED_STORAGE_KEY) === "true";
}

export default function VideoPlayer({
  src,
  poster,
  title,
  subtitles,
  onProgress,
  onEnded,
  autoNext = false,
  nextEpisodeLabel,
  onNext,
  className,
  isLive = false,
  introEnd,
  outroStart,
  resumeAtPercent,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFlashRef = useRef<{ kind: "back" | "forward"; key: number } | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState<number>(getStoredVolume());
  const [isMuted, setIsMuted] = useState<boolean>(getStoredMuted());
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState<string>(getStoredQuality());
  const [activeSubtitle, setActiveSubtitle] = useState<string>("off");
  const [isPiP, setIsPiP] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekHoverPct, setSeekHoverPct] = useState<number | null>(null);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [skipFlash, setSkipFlash] = useState<{ kind: "back" | "forward"; key: number } | null>(null);
  const [showVolumeBar, setShowVolumeBar] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Track if next was triggered to avoid repeat calls
  const nextTriggeredRef = useRef(false);

  // Filter valid subtitles (with non-empty src)
  const validSubtitles = React.useMemo(
    () => (subtitles || []).filter((s) => s && s.src && s.srclang),
    [subtitles]
  );

  // ---------- Load src + autoplay ----------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    nextTriggeredRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoNextCountdown(null);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setHasStarted(false);
    setIsPlaying(false);
    v.load();
    // Try to autoplay muted-allowed (most browsers allow muted autoplay)
    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Autoplay blocked - user must press play
        setIsPlaying(false);
      });
    }
  }, [src]);

  // ---------- Resume-from-position ----------
  // When a resume percentage is supplied (from the watch-progress store),
  // seek to that position once the media metadata has loaded. We only do
  // this once per src — the `resumeAppliedRef` guards against repeat seeks
  // if the user manually scrubs back to the start.
  const resumeAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (resumeAtPercent === undefined) return;
    if (resumeAppliedRef.current === src) return;
    if (!(resumeAtPercent > 5 && resumeAtPercent < 95)) return;
    if (!(duration > 0)) return;
    const target = (resumeAtPercent / 100) * duration;
    if (Number.isFinite(target) && target > 0 && target < duration) {
      v.currentTime = target;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentTime(target);
      resumeAppliedRef.current = src;
    }
  }, [resumeAtPercent, duration, src]);

  // ---------- Volume + mute persistence ----------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = isMuted;
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
      window.localStorage.setItem(MUTED_STORAGE_KEY, String(isMuted));
    } catch {
      /* ignore */
    }
  }, [volume, isMuted]);

  // ---------- Playback rate ----------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
  }, [playbackRate]);

  // ---------- Subtitle track switching ----------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      // Match by srclang or by index ordering of validSubtitles
      const sub = validSubtitles[i];
      if (activeSubtitle === "off") {
        track.mode = "hidden";
      } else if (sub && sub.srclang === activeSubtitle) {
        track.mode = "showing";
      } else {
        track.mode = "hidden";
      }
    }
  }, [activeSubtitle, validSubtitles, src]);

  // ---------- Video event listeners ----------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (!isSeeking) setCurrentTime(v.currentTime);
      if (v.duration > 0) {
        const pct = (v.currentTime / v.duration) * 100;
        if (onProgress) onProgress(v.currentTime, v.duration, pct);
      }
    };
    const onLoadedMetadata = () => {
      setDuration(v.duration || 0);
      v.volume = volume;
      v.muted = isMuted;
      v.playbackRate = playbackRate;
    };
    const onProgressEvt = () => {
      if (v.buffered.length > 0 && v.duration > 0) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
      }
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setHasStarted(true);
    };
    const onCanPlay = () => setIsBuffering(false);
    const onEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
      // If auto-next is enabled and onNext exists, trigger immediately
      if (autoNext && onNext && !nextTriggeredRef.current) {
        nextTriggeredRef.current = true;
        onNext();
      }
    };
    const onVolumeChange = () => {
      setIsMuted(v.muted);
      setVolume(v.volume);
    };
    const onError = () => {
      setIsBuffering(false);
      toast.error("Failed to load video. Please try again later.");
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("progress", onProgressEvt);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("ended", onEnded);
    v.addEventListener("volumechange", onVolumeChange);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("progress", onProgressEvt);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("volumechange", onVolumeChange);
      v.removeEventListener("error", onError);
    };
  }, [isSeeking, onProgress, onEnded, autoNext, onNext]);

  // ---------- Auto-next countdown ----------
  useEffect(() => {
    if (!autoNext || !onNext || isLive) return;
    // Trigger countdown when within last N seconds
    const remaining = duration - currentTime;
    if (
      isPlaying &&
      remaining > 0 &&
      remaining <= AUTO_NEXT_TRIGGER_SECONDS &&
      !nextTriggeredRef.current &&
      hasStarted
    ) {
      if (autoNextCountdown === null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAutoNextCountdown(AUTO_NEXT_COUNTDOWN_FROM);
      }
    } else if (remaining > AUTO_NEXT_TRIGGER_SECONDS + 1) {
      // Reset countdown if user seeks back
      if (autoNextCountdown !== null) setAutoNextCountdown(null);
      nextTriggeredRef.current = false;
    }
  }, [currentTime, duration, isPlaying, autoNext, onNext, autoNextCountdown, hasStarted, isLive]);

  // Countdown ticker
  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      if (onNext && !nextTriggeredRef.current) {
        nextTriggeredRef.current = true;
        onNext();
      }
      return;
    }
    const t = setTimeout(() => {
      setAutoNextCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [autoNextCountdown, onNext]);

  // ---------- Fullscreen change listener ----------
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ---------- Picture-in-Picture change listener ----------
  useEffect(() => {
    const onPiPChange = () => {
      setIsPiP(Boolean(document.pictureInPictureElement));
    };
    document.addEventListener("enterpictureinpicture", onPiPChange);
    document.addEventListener("leavepictureinpicture", onPiPChange);
    return () => {
      document.removeEventListener("enterpictureinpicture", onPiPChange);
      document.removeEventListener("leavepictureinpicture", onPiPChange);
    };
  }, []);

  // ---------- Auto-hide controls ----------
  const scheduleHideControls = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      // Only hide if playing (not paused) and no dropdown open
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowVolumeBar(false);
      }
    }, HIDE_CONTROLS_DELAY);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  // When paused, always show controls
  useEffect(() => {
    if (!isPlaying) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      scheduleHideControls();
    }
  }, [isPlaying, scheduleHideControls]);

  // ---------- Controls core actions ----------
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* ignore autoplay block */
        });
      }
    } else {
      v.pause();
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const target = Math.max(0, Math.min(v.duration, v.currentTime + delta));
    v.currentTime = target;
    setCurrentTime(target);
    // Flash skip indicator
    const kind = delta < 0 ? "back" : "forward";
    skipFlashRef.current = { kind, key: Date.now() };
    setSkipFlash({ kind, key: Date.now() });
  }, []);

  const seekTo = useCallback((pct: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const target = Math.max(0, Math.min(v.duration, (pct / 100) * v.duration));
    v.currentTime = target;
    setCurrentTime(target);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      const req = el.requestFullscreen?.();
      if (req && typeof (req as Promise<void>).catch === "function") {
        (req as Promise<void>).catch(() => toast.error("Fullscreen not available"));
      }
    } else {
      document.exitFullscreen?.().catch(() => {
        /* ignore */
      });
    }
  }, []);

  // ---------- Picture-in-Picture toggle ----------
  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !isPiPSupported()) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {
      toast.error("Picture-in-Picture is not available right now.");
    }
  }, []);

  // ---------- Seek to a specific time (used by Skip Intro / Skip Credits) ----------
  const seekToTime = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(t)) return;
    const clamped = Math.max(0, Math.min(v.duration || t, t));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  // ---------- Seek bar interaction ----------
  const getPctFromEvent = useCallback((clientX: number) => {
    const el = seekBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  }, []);

  const handleSeekBarPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsSeeking(true);
      const pct = getPctFromEvent(e.clientX);
      seekTo(pct);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getPctFromEvent, seekTo]
  );

  const handleSeekBarPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pct = getPctFromEvent(e.clientX);
      setSeekHoverPct(pct);
      if (isSeeking) seekTo(pct);
    },
    [getPctFromEvent, isSeeking, seekTo]
  );

  const handleSeekBarPointerUp = useCallback((e: React.PointerEvent) => {
    setIsSeeking(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSeekBarPointerLeave = useCallback(() => {
    setSeekHoverPct(null);
  }, []);

  // ---------- Video click / tap (single + double tap) ----------
  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
      // Ignore clicks that originated from buttons / sliders / menus
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-toggle]")) return;

      const now = Date.now();
      const x = e.clientX;
      const last = lastTapRef.current;

      if (last && now - last.time < 300) {
        // Double tap
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        lastTapRef.current = null;
        // Determine side based on click position relative to viewport width
        const vw = window.innerWidth;
        const side = x < vw / 2 ? "left" : "right";
        if (side === "left") {
          seekBy(-10);
        } else {
          seekBy(10);
        }
      } else {
        // Wait to see if it becomes a double tap
        lastTapRef.current = { time: now, x };
        singleTapTimerRef.current = setTimeout(() => {
          singleTapTimerRef.current = null;
          togglePlay();
          lastTapRef.current = null;
        }, 280);
      }
    },
    [seekBy, togglePlay]
  );

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in form fields
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      // Only respond when player is mounted/visible (always in this page)
      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          revealControls();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-10);
          revealControls();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(10);
          revealControls();
          break;
        case "ArrowUp":
          e.preventDefault();
          setIsMuted(false);
          setVolume((v) => Math.min(1, +(v + 0.1).toFixed(2)));
          revealControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, +(v - 0.1).toFixed(2)));
          revealControls();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          revealControls();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen, toggleMute, revealControls]);

  // ---------- Auto-clear skip flash ----------
  useEffect(() => {
    if (!skipFlash) return;
    const t = setTimeout(() => setSkipFlash(null), 600);
    return () => clearTimeout(t);
  }, [skipFlash]);

  // ---------- Cleanup ----------
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  // ---------- Derived values ----------
  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const handleQualityChange = (q: string) => {
    setQuality(q);
    try {
      window.localStorage.setItem(QUALITY_STORAGE_KEY, q);
    } catch {
      /* ignore */
    }
    toast.success(`Quality: ${q}`);
  };

  const handleSubtitleChange = (lang: string) => {
    setActiveSubtitle(lang);
    if (lang === "off") toast.info("Subtitles off");
    else {
      const sub = validSubtitles.find((s) => s.srclang === lang);
      if (sub) toast.info(`Subtitles: ${sub.label}`);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black overflow-hidden select-none group/player",
        className
      )}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onTouchStart={revealControls}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 w-full h-full bg-black object-contain"
        style={{ pointerEvents: "none" }}
      >
        {validSubtitles.map((s, i) => (
          <track
            key={`${s.srclang}-${i}`}
            kind="subtitles"
            src={s.src}
            srcLang={s.srclang}
            label={s.label}
            default={false}
          />
        ))}
      </video>

      {/* Click / tap capture layer (sits above video, below controls) */}
      <div
        className="absolute inset-0 z-10"
        onClick={handleVideoClick}
        onDoubleClick={(e) => {
          // Double click outside tap detection: also toggle fullscreen
          e.preventDefault();
          toggleFullscreen();
        }}
        aria-hidden="true"
      />

      {/* Buffering spinner */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip flash indicators (double-tap / arrow seek) */}
      <AnimatePresence>
        {skipFlash && (
          <motion.div
            key={skipFlash.key}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none",
              skipFlash.kind === "back" ? "left-8 md:left-16" : "right-8 md:right-16"
            )}
          >
            <div className="flex flex-col items-center gap-1 bg-black/60 rounded-full p-3">
              {skipFlash.kind === "back" ? (
                <RotateCcw className="w-7 h-7 text-white" />
              ) : (
                <RotateCw className="w-7 h-7 text-white" />
              )}
              <span className="text-white text-xs font-semibold">10s</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big center play button (when paused) */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            onClick={togglePlay}
            data-no-toggle
            aria-label="Play"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white ml-1" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Auto-Next Countdown Overlay */}
      <AnimatePresence>
        {autoNextCountdown !== null && autoNext && onNext && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute bottom-24 right-4 md:right-8 z-30 max-w-[90vw]"
          >
            <div className="bg-black/85 backdrop-blur-md border border-white/15 rounded-lg p-4 w-[320px] max-w-full">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="22" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
                    <circle
                      cx="24"
                      cy="24"
                      r="22"
                      stroke="#e50914"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={
                        2 * Math.PI * 22 * (1 - autoNextCountdown / AUTO_NEXT_COUNTDOWN_FROM)
                      }
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <span className="text-white font-bold text-lg">{autoNextCountdown}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#b3b3b3] uppercase tracking-wide">Next Episode</p>
                  <p className="text-white text-sm font-semibold truncate">
                    {nextEpisodeLabel || "Up Next"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    if (!nextTriggeredRef.current) {
                      nextTriggeredRef.current = true;
                      onNext();
                    }
                  }}
                  className="flex-1 bg-white text-black text-sm font-semibold py-2 rounded hover:bg-white/90 transition-colors flex items-center justify-center gap-1"
                >
                  <SkipForward className="w-4 h-4" /> Play Next
                </button>
                <button
                  onClick={() => {
                    setAutoNextCountdown(null);
                    nextTriggeredRef.current = true;
                  }}
                  className="px-3 bg-white/10 text-white text-sm font-semibold py-2 rounded hover:bg-white/20 transition-colors"
                  aria-label="Cancel autoplay"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title overlay (top) */}
      <AnimatePresence>
        {showControls && title && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none"
          >
            <h2 className="text-white text-lg md:text-2xl font-bold drop-shadow-lg line-clamp-2">
              {title}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Intro / Skip Credits buttons (Netflix-style, bottom-right) */}
      <AnimatePresence>
        {!isLive && introEnd !== undefined && introEnd > 0 && currentTime > 2 && currentTime < introEnd && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={() => seekToTime(introEnd)}
            data-no-toggle
            className="absolute bottom-24 md:bottom-28 right-4 md:right-8 z-30 inline-flex items-center gap-2 bg-white/95 hover:bg-white text-black font-semibold text-sm px-4 py-2 rounded-md shadow-lg transition-colors"
            aria-label="Skip intro"
          >
            Skip Intro
            <FastForward className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {/* Hide the Skip Credits button once the auto-next countdown kicks
            in (last 10s) so the two overlays don't visually collide. */}
        {!isLive && outroStart !== undefined && outroStart > 0 && currentTime >= outroStart && currentTime < duration - AUTO_NEXT_TRIGGER_SECONDS && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={() => seekToTime(Math.max(0, duration - 0.5))}
            data-no-toggle
            className="absolute bottom-24 md:bottom-28 right-4 md:right-8 z-30 inline-flex items-center gap-2 bg-white/95 hover:bg-white text-black font-semibold text-sm px-4 py-2 rounded-md shadow-lg transition-colors"
            aria-label="Skip credits"
          >
            Skip Credits
            <FastForward className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 md:px-5 md:pb-5 pt-16 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
            data-no-toggle
          >
            {/* Seek bar (hidden for live streams — replaced by LIVE badge) */}
            {isLive ? (
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 bg-[#e50914] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
                <span className="text-[11px] md:text-xs text-[#ccc] font-medium">
                  Live broadcast
                </span>
              </div>
            ) : (
            <div className="mb-2 group/seek">
              <div
                ref={seekBarRef}
                onPointerDown={handleSeekBarPointerDown}
                onPointerMove={handleSeekBarPointerMove}
                onPointerUp={handleSeekBarPointerUp}
                onPointerLeave={handleSeekBarPointerLeave}
                onPointerCancel={handleSeekBarPointerUp}
                className="relative h-4 flex items-center cursor-pointer touch-none"
                role="slider"
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(playedPct)}
              >
                {/* Track */}
                <div className="relative w-full h-1 group-hover/seek:h-1.5 transition-all bg-white/25 rounded-full overflow-hidden">
                  {/* Buffered */}
                  <div
                    className="absolute top-0 left-0 h-full bg-white/40 rounded-full"
                    style={{ width: `${buffered}%` }}
                  />
                  {/* Played */}
                  <div
                    className="absolute top-0 left-0 h-full bg-[#e50914] rounded-full"
                    style={{ width: `${playedPct}%` }}
                  />
                </div>
                {/* Hover preview marker */}
                {seekHoverPct !== null && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ left: `${seekHoverPct}%` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow" />
                  </div>
                )}
                {/* Thumb (always show when seeking or hovering) */}
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#e50914] border-2 border-white shadow-md transition-opacity",
                    isSeeking || seekHoverPct !== null
                      ? "opacity-100"
                      : "opacity-0 group-hover/seek:opacity-100"
                  )}
                  style={{ left: `${playedPct}%` }}
                />

                {/* Intro-end / outro-start markers on the seek bar */}
                {!isLive && duration > 0 && (
                  <>
                    {introEnd !== undefined && introEnd > 0 && introEnd < duration && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3 bg-white/70 rounded-full pointer-events-none"
                        style={{ left: `${(introEnd / duration) * 100}%` }}
                        aria-hidden="true"
                      />
                    )}
                    {outroStart !== undefined && outroStart > 0 && outroStart < duration && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3 bg-white/70 rounded-full pointer-events-none"
                        style={{ left: `${(outroStart / duration) * 100}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </div>

              {/* Time display */}
              <div className="flex justify-between items-center mt-1 text-[11px] md:text-xs text-[#ccc] font-medium tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            )}

            {/* Controls row */}
            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="player-control-btn"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
                ) : (
                  <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
                )}
              </button>

              {/* Skip back — hidden for live streams (no seeking allowed) */}
              {!isLive && (
              <button
                onClick={() => seekBy(-10)}
                className="player-control-btn"
                aria-label="Skip back 10 seconds"
              >
                <div className="relative">
                  <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white mt-0.5">
                    10
                  </span>
                </div>
              </button>
              )}

              {/* Skip forward — hidden for live streams */}
              {!isLive && (
              <button
                onClick={() => seekBy(10)}
                className="player-control-btn"
                aria-label="Skip forward 10 seconds"
              >
                <div className="relative">
                  <RotateCw className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white mt-0.5">
                    10
                  </span>
                </div>
              </button>
              )}

              {/* Volume */}
              <div
                className="flex items-center"
                onMouseEnter={() => setShowVolumeBar(true)}
                onMouseLeave={() => setShowVolumeBar(false)}
              >
                <button
                  onClick={toggleMute}
                  className="player-control-btn"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  <VolumeIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </button>
                <div
                  className={cn(
                    "transition-all overflow-hidden",
                    showVolumeBar ? "w-20 md:w-28 opacity-100" : "w-0 opacity-0"
                  )}
                >
                  <Slider
                    value={[Math.round((isMuted ? 0 : volume) * 100)]}
                    max={100}
                    min={0}
                    step={1}
                    onValueChange={(val) => {
                      const v = (val[0] ?? 0) / 100;
                      setVolume(v);
                      if (v > 0) setIsMuted(false);
                    }}
                    aria-label="Volume"
                    className="px-2"
                  />
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Subtitles */}
              {validSubtitles.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="player-control-btn relative"
                      aria-label="Subtitles"
                      data-no-toggle
                    >
                      <Subtitles className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      {activeSubtitle !== "off" && (
                        <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#e50914]" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="top"
                    className="bg-[#181818] border-white/10 text-white min-w-[180px]"
                  >
                    <DropdownMenuLabel className="text-[#b3b3b3]">Subtitles</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuRadioGroup
                      value={activeSubtitle}
                      onValueChange={handleSubtitleChange}
                    >
                      <DropdownMenuRadioItem value="off" className="text-white">
                        Off
                      </DropdownMenuRadioItem>
                      {validSubtitles.map((s) => (
                        <DropdownMenuRadioItem
                          key={s.srclang}
                          value={s.srclang}
                          className="text-white"
                        >
                          {s.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Settings: Playback speed + Quality */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="player-control-btn" aria-label="Settings" data-no-toggle>
                    <Settings className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="top"
                  className="bg-[#181818] border-white/10 text-white min-w-[200px]"
                >
                  <DropdownMenuLabel className="text-[#b3b3b3]">Playback Speed</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuRadioGroup
                    value={String(playbackRate)}
                    onValueChange={(v) => {
                      const rate = parseFloat(v);
                      setPlaybackRate(rate);
                      toast.success(`Speed: ${rate}x`);
                    }}
                  >
                    {PLAYBACK_RATES.map((rate) => (
                      <DropdownMenuRadioItem
                        key={rate}
                        value={String(rate)}
                        className="text-white"
                      >
                        {rate}x{rate === 1 ? " (Normal)" : ""}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-[#b3b3b3]">Quality</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuRadioGroup
                    value={quality}
                    onValueChange={handleQualityChange}
                  >
                    {QUALITY_OPTIONS.map((q) => (
                      <DropdownMenuRadioItem key={q} value={q} className="text-white">
                        {q}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Picture-in-Picture (hidden if the browser doesn't support it) */}
              {isPiPSupported() && (
                <button
                  onClick={togglePiP}
                  className="player-control-btn"
                  aria-label={isPiP ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
                  title={isPiP ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
                  data-no-toggle
                >
                  <PictureInPicture2
                    className={cn(
                      "w-5 h-5 md:w-6 md:h-6 text-white transition-colors",
                      isPiP && "text-primary"
                    )}
                  />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="player-control-btn"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 md:w-6 md:h-6 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 md:w-6 md:h-6 text-white" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile hint about double-tap (shown briefly when first mounted, hidden after a few seconds) */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-full text-[11px] text-white/90 flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3" />
              Double-tap to skip 10s
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
