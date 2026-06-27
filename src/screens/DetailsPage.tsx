"use client";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import {
  Play,
  Plus,
  Check,
  Share2,
  Star,
  Calendar,
  Clock,
  Eye,
  Film,
  Tv,
  ChevronRight,
  ChevronLeft,
  Clapperboard,
  ArrowLeft,
  Users,
  ImageIcon,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import ContentGrid from "@/components/shared/ContentGrid";
import EmptyState from "@/components/shared/EmptyState";
import TrailerModal from "@/components/shared/TrailerModal";
import { toast } from "sonner";
import { formatViews, formatRating } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ContentItem, Episode } from "@/firebase/types";

/* Staggered section reveal */
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: Math.min(i * 0.08, 0.4), ease: "easeOut" },
  }),
};

/* ----------------------------------------------------------------
   Trailer-background helper.

   Given a trailer URL, classify it (YouTube / Vimeo / direct file /
   other embed) and build an embed URL pre-configured for muted,
   looping, auto-playing background playback.
----------------------------------------------------------------- */
function buildTrailerEmbedUrl(rawUrl: string, muted: boolean): string {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) {
        const p = new URLSearchParams({
          autoplay: "1",
          mute: muted ? "1" : "0",
          loop: "1",
          playlist: id,
          controls: "0",
          modestbranding: "1",
          rel: "0",
          playsinline: "1",
          iv_load_policy: "3",
        });
        return `https://www.youtube.com/embed/${id}?${p.toString()}`;
      }
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) {
        const p = new URLSearchParams({
          autoplay: "1",
          mute: muted ? "1" : "0",
          loop: "1",
          playlist: id,
          controls: "0",
          modestbranding: "1",
          rel: "0",
          playsinline: "1",
          iv_load_policy: "3",
        });
        return `https://www.youtube.com/embed/${id}?${p.toString()}`;
      }
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) {
        const p = new URLSearchParams({
          autoplay: "1",
          muted: muted ? "1" : "0",
          loop: "1",
          controls: "0",
        });
        return `https://player.vimeo.com/video/${id}?${p.toString()}`;
      }
    }
  } catch {
    /* not a URL — fall through */
  }
  return rawUrl;
}

/**
 * TrailerBackground — renders a muted, looping, auto-playing trailer as a
 * hero background. Used by DetailsPage when the user hovers the hero
 * (desktop) or after a short delay on mobile.
 *
 * - YouTube / Vimeo / other embed pages → sandboxed `<iframe>` with
 *   player params that disable controls, loop, and start muted.
 * - Direct media files (`.mp4`, `.webm`, `.m3u8`…) → native `<video>`
 *   element with `muted + loop + autoplay + playsInline`. The mute
 *   toggle actually works for this case (we control the element).
 *
 * The mute toggle is always shown; for iframe embeds, toggling mute
 * rebuilds the URL (which briefly reloads the iframe — acceptable for
 * a hero trailer).
 */
function TrailerBackground({
  trailerURL,
  muted,
  onToggleMute,
}: {
  trailerURL: string;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const isDirect = useMemo(() => {
    const lower = trailerURL.toLowerCase().split("?")[0];
    return [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".mkv", ".m3u8", ".mpd", ".ts"].some((ext) => lower.endsWith(ext));
  }, [trailerURL]);

  if (isDirect) {
    return (
      <div className="absolute inset-0 z-[1]">
        <video
          src={trailerURL}
          autoPlay
          muted={muted}
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <MuteToggle muted={muted} onToggle={onToggleMute} />
      </div>
    );
  }

  // YouTube / Vimeo / other embed pages.
  const embedSrc = buildTrailerEmbedUrl(trailerURL, muted);
  return (
    <div className="absolute inset-0 z-[1] bg-black">
      <iframe
        key={muted ? "muted" : "unmuted"}
        src={embedSrc}
        title="Trailer preview"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          // Scale up slightly so YouTube's letterboxing doesn't show.
          transform: "scale(1.35)",
          transformOrigin: "center",
          border: "none",
        }}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen={false}
        referrerPolicy="no-referrer"
      />
      <MuteToggle muted={muted} onToggle={onToggleMute} />
    </div>
  );
}

function MuteToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={muted ? "Unmute trailer" : "Mute trailer"}
      title={muted ? "Unmute trailer" : "Mute trailer"}
      className="absolute top-3 right-3 z-20 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur transition-colors"
    >
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
}

export default function DetailsPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { movies, series, getEpisodesBySeries, getCategoryById } = useData();
  const [inList, setInList] = useState(false);
  const handleToggleList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInList(!inList);
    toast.success(inList ? "Removed from My List" : "Added to My List");
  };
  const [selectedSeason, setSelectedSeason] = useState<string>("1");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);

  /* ---------- Trailer auto-play state ----------
     On desktop (hover-capable) devices, the trailer starts when the user
     hovers the hero and stops when they leave. On touch devices (no
     hover), it auto-plays after a 3-second delay. The trailer is always
     muted by default; a toggle lets the user unmute. */
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerMuted, setTrailerMuted] = useState(true);
  useEffect(() => {
    // Detect touch / no-hover devices after mount (avoids SSR mismatch).
    const touch = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && !window.matchMedia("(hover: hover)").matches;
    setIsTouchDevice(touch);
  }, []);

  const item: ContentItem | undefined = useMemo(() => {
    if (!type || !id) return undefined;
    if (type === "movie") return movies.find((m) => m.id === id);
    if (type === "series") return series.find((s) => s.id === id);
    return undefined;
  }, [type, id, movies, series]);

  const episodes: Episode[] = useMemo(() => {
    if (item?.type !== "series") return [];
    return getEpisodesBySeries(item.id);
  }, [item, getEpisodesBySeries]);

  const seasons = useMemo(() => {
    const set = new Set<number>();
    episodes.forEach((e) => set.add(e.season));
    return Array.from(set).sort((a, b) => a - b);
  }, [episodes]);

  const seasonEpisodes = useMemo(() => {
    const s = Number(selectedSeason);
    return episodes.filter((e) => e.season === s);
  }, [episodes, selectedSeason]);

  const moreLikeThis = useMemo(() => {
    if (!item) return [];
    const pool: ContentItem[] = [...movies, ...series];
    return pool
      .filter((i) => i.id !== item.id && i.category === item.category)
      .slice(0, 12);
  }, [item, movies, series]);

  // On touch devices, auto-start the trailer after a 3s delay (desktop
  // uses mouse-enter instead). Placed after `item` is computed so we can
  // depend on `item.trailerURL`.
  useEffect(() => {
    if (!isTouchDevice || !item?.trailerURL) return;
    const t = setTimeout(() => setShowTrailer(true), 3000);
    return () => clearTimeout(t);
  }, [isTouchDevice, item?.trailerURL]);

  if (!item) {
    return (
      <div className="pb-12">
        <EmptyState
          icon={Clapperboard}
          title="Title not found"
          description="The title you're looking for doesn't exist or may have been removed."
          actionLabel="Back to Home"
          actionTo="/"
        />
      </div>
    );
  }

  const category = getCategoryById(item.category);
  const isSeries = item.type === "series";
  const hasCast = !!item.cast && item.cast.length > 0;
  const hasScreenshots = !!item.screenshots && item.screenshots.length > 0;
  const screenshots = item.screenshots ?? [];

  // Quality hint derived from year (newer => 4K, older => HD)
  const qualityHint = item.year >= 2022 ? "4K Ultra HD" : "HD";
  // Match % derived from rating, clamped to a believable 70–99 band
  const matchPercent = Math.min(99, Math.max(70, Math.round(item.rating * 10)));

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: item.title,
      text: `Watch ${item.title} on FLIXNET`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } else {
        toast.success("Share: " + url);
      }
    } catch {
      // user cancelled or unsupported — silent
    }
  };

  // Ensure selected season is valid for this series
  const effectiveSeason =
    seasons.length > 0 && seasons.includes(Number(selectedSeason))
      ? selectedSeason
      : seasons.length > 0
        ? String(seasons[0])
        : "1";

  return (
    <div className="pb-12">
      {/* ===================== HERO ===================== */}
      <section
        className="relative w-full h-[60vh] sm:h-[78vh] min-h-[480px] overflow-hidden"
        onMouseEnter={() => {
          // Desktop: start the trailer on hover (skip on touch devices).
          if (!isTouchDevice && item.trailerURL) setShowTrailer(true);
        }}
        onMouseLeave={() => {
          // Desktop: stop the trailer when the cursor leaves.
          if (!isTouchDevice) setShowTrailer(false);
        }}
      >
        <img
          src={item.banner || item.thumbnail}
          alt={item.title}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
            showTrailer && item.trailerURL ? "opacity-0" : "opacity-100"
          )}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/1280/720`;
          }}
        />
        {/* Trailer background — fades in over the static banner when
            the user hovers (desktop) or after a delay (mobile). */}
        {item.trailerURL && (
          <AnimatePresence>
            {showTrailer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 z-[1]"
              >
                <TrailerBackground
                  trailerURL={item.trailerURL}
                  muted={trailerMuted}
                  onToggleMute={() => setTrailerMuted((m) => !m)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {/* Layered gradients — bottom fade, left fade, subtle top sheen */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-background via-background/55 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-background via-background/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-b from-background/40 via-transparent to-transparent pointer-events-none" />

        {/* Hero content pinned to bottom of banner */}
        <div className="relative z-[3] h-full flex flex-col justify-end px-4 sm:px-6 lg:px-12 pb-8 sm:pb-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            {/* Breadcrumb back */}
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className="bg-primary text-primary-foreground border-transparent uppercase">
                {isSeries ? <Tv className="w-3 h-3 mr-1" /> : <Film className="w-3 h-3 mr-1" />}
                {item.type}
              </Badge>
              {item.trending && (
                <Badge variant="outline" className="border-primary/40 text-primary uppercase">
                  <Sparkles className="w-3 h-3 mr-1" /> Trending
                </Badge>
              )}
              {item.featured && (
                <Badge variant="outline" className="border-border text-foreground uppercase">
                  Featured
                </Badge>
              )}
              <Badge variant="outline" className="border-border text-foreground/80 uppercase">
                {qualityHint}
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.05] drop-shadow-lg">
              {item.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm">
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <Star className="w-4 h-4 fill-primary" /> {formatRating(item.rating)}
              </span>
              <span className="px-1.5 py-0.5 rounded border border-primary/40 text-primary text-xs font-semibold">
                {matchPercent}% Match
              </span>
              <span className="flex items-center gap-1.5 text-foreground/85">
                <Calendar className="w-4 h-4 text-muted-foreground" /> {item.year}
              </span>
              <span className="flex items-center gap-1.5 text-foreground/85">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {isSeries ? `${item.seasons} Season${item.seasons !== 1 ? "s" : ""}` : item.duration}
              </span>
              <span className="flex items-center gap-1.5 text-foreground/85">
                <Eye className="w-4 h-4 text-muted-foreground" /> {formatViews(item.views)}
              </span>
              {category && (
                <span className="text-foreground/85">
                  <span className="text-muted-foreground">Category:</span>{" "}
                  <Link
                    to="/categories"
                    className="text-primary hover:underline font-medium"
                  >
                    {category.name}
                  </Link>
                </span>
              )}
            </div>

            {/* Genres */}
            {item.genres && item.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {item.genres.map((g) => (
                  <Badge
                    key={g}
                    variant="outline"
                    className="border-border text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            )}

            {/* Short description (full synopsis below) */}
            <p className="text-foreground/85 text-base sm:text-lg mt-5 max-w-3xl leading-relaxed line-clamp-3">
              {item.description}
            </p>

            {/* Action buttons — Play + Trailer (if any) + Add to List + Share */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base h-12 px-7"
              >
                <Link to={`/watch/${item.type}/${item.id}`}>
                  <Play className="w-5 h-5 fill-primary-foreground mr-2" /> Play
                </Link>
              </Button>

              {item.trailerURL && (
                <Button
                  onClick={() => setTrailerModalOpen(true)}
                  size="lg"
                  variant="outline"
                  className="bg-card/60 backdrop-blur text-foreground border-border hover:bg-card hover:text-foreground font-semibold h-12 px-6"
                >
                  <Film className="w-5 h-5 mr-2" /> Trailer
                </Button>
              )}

              <Button
                onClick={handleToggleList}
                size="lg"
                variant="outline"
                className="bg-card/60 backdrop-blur text-foreground border-border hover:bg-card hover:text-foreground font-semibold h-12 px-6"
              >
                {inList ? (
                  <>
                    <Check className="w-5 h-5 mr-2 text-primary" /> In My List
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" /> My List
                  </>
                )}
              </Button>

              <Button
                onClick={handleShare}
                size="lg"
                variant="outline"
                className="bg-card/60 backdrop-blur text-foreground border-border hover:bg-card hover:text-foreground font-semibold h-12 w-12 p-0"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== SYNOPSIS + DETAILS ===================== */}
      <motion.section
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="px-4 sm:px-6 lg:px-12 mt-10 sm:mt-14"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Synopsis (main, 2/3) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Clapperboard className="w-5 h-5 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Synopsis</h2>
            </div>
            <p className="text-foreground/85 text-base sm:text-lg leading-relaxed whitespace-pre-line">
              {item.description}
            </p>

            {/* Director / Starring as inline text */}
            {(item.director || hasCast) && (
              <div className="mt-6 space-y-2 text-sm">
                {item.director && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-muted-foreground">
                      <span className="text-muted-foreground/80">Director: </span>
                      <span className="text-foreground/90 font-medium">{item.director}</span>
                    </p>
                    {/* Follow director — feature removed */}
                  </div>
                )}
                {hasCast && (
                  <p className="text-muted-foreground">
                    <span className="text-muted-foreground/80">Starring: </span>
                    <span className="text-foreground/90 font-medium">{item.cast!.join(", ")}</span>
                  </p>
                )}
              </div>
            )}

            {/* Share buttons — feature removed */}
          </div>

          {/* Details card (1/3) */}
          <Card className="bg-card/60 border-border p-5 sm:p-6 h-fit shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Details
            </h3>
            <dl className="space-y-3 text-sm">
              {item.director && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Director</dt>
                  <dd className="text-foreground/90 text-right font-medium">{item.director}</dd>
                </div>
              )}
              {hasCast && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Cast</dt>
                  <dd className="text-foreground/90 text-right font-medium line-clamp-3">
                    {item.cast!.join(", ")}
                  </dd>
                </div>
              )}
              {category && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Category</dt>
                  <dd className="text-right">
                    <Link to="/categories" className="text-primary hover:underline font-medium">
                      {category.name}
                    </Link>
                  </dd>
                </div>
              )}
              {item.genres && item.genres.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Genres</dt>
                  <dd className="text-foreground/90 text-right font-medium">
                    {item.genres.join(", ")}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground shrink-0">Year</dt>
                <dd className="text-foreground/90 font-medium">{item.year}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground shrink-0">
                  {isSeries ? "Seasons" : "Duration"}
                </dt>
                <dd className="text-foreground/90 font-medium">
                  {isSeries
                    ? `${item.seasons} season${item.seasons !== 1 ? "s" : ""}`
                    : item.duration}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground shrink-0">Quality</dt>
                <dd className="text-foreground/90 font-medium">{qualityHint}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground shrink-0">Rating</dt>
                <dd className="text-foreground/90 font-medium flex items-center gap-1 justify-end">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  {formatRating(item.rating)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </motion.section>

      {/* ===================== TOP CAST ===================== */}
      {hasCast && (
        <motion.section
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="mt-12 sm:mt-16"
        >
          <div className="px-4 sm:px-6 lg:px-12 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Top Cast</h2>
            <Badge variant="outline" className="border-border text-muted-foreground ml-1">
              {item.cast!.length}
            </Badge>
          </div>
          <Swiper
            modules={[FreeMode]}
            slidesPerView="auto"
            freeMode
            spaceBetween={16}
            className="!px-4 sm:!px-6 lg:!px-12 !pb-2"
          >
            {item.cast!.map((name) => {
              const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`;
              return (
                <SwiperSlide key={name} style={{ width: 128 }} className="sm:!w-36">
                  <div className="group flex flex-col items-center text-center">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-primary transition-all">
                      <img
                        src={avatarUrl}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(name)}/150/150`;
                        }}
                      />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground line-clamp-1 w-full">
                      {name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Cast</p>
                    {/* Follow actor — feature removed */}
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </motion.section>
      )}

      {/* ===================== SCREENSHOTS ===================== */}
      {hasScreenshots && (
        <motion.section
          custom={2}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="mt-12 sm:mt-16"
        >
          <div className="px-4 sm:px-6 lg:px-12 mb-4 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Screenshots</h2>
            <Badge variant="outline" className="border-border text-muted-foreground ml-1">
              {screenshots.length}
            </Badge>
          </div>
          <div className="px-4 sm:px-6 lg:px-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {screenshots.map((src, idx) => (
              <motion.button
                key={`${item.id}-shot-${idx}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
                onClick={() => setLightboxIndex(idx)}
                className="group relative aspect-video rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/60"
                aria-label={`View screenshot ${idx + 1}`}
              >
                <img
                  src={src}
                  alt={`${item.title} screenshot ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}-${idx}/640/360`;
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-background/90 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-foreground" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Lightbox dialog for screenshots */}
      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(o) => !o && setLightboxIndex(null)}
      >
        <DialogContent
          className="sm:max-w-5xl p-0 overflow-hidden bg-black border-border"
          showCloseButton
        >
          <DialogTitle className="sr-only">{item.title} — Screenshot</DialogTitle>
          <DialogDescription className="sr-only">
            Screenshot {lightboxIndex !== null ? lightboxIndex + 1 : 0} of {screenshots.length}
          </DialogDescription>
          {lightboxIndex !== null && screenshots[lightboxIndex] && (
            <div className="relative w-full">
              <img
                src={screenshots[lightboxIndex]}
                alt={`${item.title} screenshot ${lightboxIndex + 1}`}
                className="w-full h-auto max-h-[85vh] object-contain bg-black"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}-${lightboxIndex}/1280/720`;
                }}
              />
              {/* Prev / Next nav arrows */}
              {lightboxIndex > 0 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 hover:bg-background flex items-center justify-center text-foreground transition-colors"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {lightboxIndex < screenshots.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 hover:bg-background flex items-center justify-center text-foreground transition-colors"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/80 text-foreground text-xs font-medium">
                {lightboxIndex + 1} / {screenshots.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===================== EPISODES (series only) ===================== */}
      {isSeries && (
        <motion.section
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="px-4 sm:px-6 lg:px-12 mt-12 sm:mt-16"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Tv className="w-6 h-6 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Episodes</h2>
              {seasonEpisodes.length > 0 && (
                <Badge variant="outline" className="border-border text-muted-foreground ml-1">
                  {seasonEpisodes.length} episode{seasonEpisodes.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            {seasons.length > 1 && (
              <Select value={effectiveSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-[150px] bg-card border-border text-foreground">
                  <SelectValue placeholder="Season" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {seasons.map((s) => (
                    <SelectItem key={s} value={String(s)} className="focus:bg-accent">
                      Season {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {seasonEpisodes.length === 0 ? (
            <p className="text-muted-foreground py-6">
              No episodes available for this season.
            </p>
          ) : (
            <div className="space-y-3">
              {seasonEpisodes.map((ep, idx) => (
                <motion.div
                  key={ep.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.4) }}
                >
                  <Link
                    to={`/watch/series/${item.id}?ep=${ep.id}`}
                    className="group flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
                  >
                    {/* Thumbnail with overlays */}
                    <div className="relative w-full sm:w-64 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={ep.thumbnail}
                        alt={ep.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${ep.id}/400/225`;
                        }}
                      />
                      {/* Episode number overlay */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs font-bold">
                        EP {ep.episodeNumber}
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ep.duration}
                      </div>
                      {/* Hover play overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                          <Play className="w-5 h-5 fill-primary-foreground text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-foreground font-semibold text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">
                            {ep.title}
                          </h3>
                          <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1.5">
                            <span>Season {ep.season}</span>
                            <span>•</span>
                            <span>Episode {ep.episodeNumber}</span>
                            <span>•</span>
                            <span>{ep.duration}</span>
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
                      </div>
                      <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                        {ep.description}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* ===================== MORE LIKE THIS ===================== */}
      {moreLikeThis.length > 0 && (
        <motion.section
          custom={4}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="mt-12 sm:mt-16"
        >
          <div className="px-4 sm:px-6 lg:px-12 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">More Like This</h2>
            </div>
            {category && (
              <Link
                to="/categories"
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                View more in {category.name}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          <ContentGrid items={moreLikeThis} />
        </motion.section>
      )}

      {/* ===================== TRAILER MODAL ===================== */}
      {item.trailerURL && (
        <TrailerModal
          open={trailerModalOpen}
          onOpenChange={setTrailerModalOpen}
          trailerURL={item.trailerURL}
          title={item.title}
          meta={
            <span className="flex items-center gap-2">
              {item.year && <span>{item.year}</span>}
              {item.duration && (
                <>
                  <span>·</span>
                  <span>{item.duration}</span>
                </>
              )}
              {category && (
                <>
                  <span>·</span>
                  <span>{category.name}</span>
                </>
              )}
            </span>
          }
        />
      )}
    </div>
  );
}
