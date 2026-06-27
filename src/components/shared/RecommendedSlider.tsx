"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import {
  Wand2,
  Play,
  Plus,
  Check,
  Star,
  Eye,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import type { Movie, Series, ContentItem } from "@/firebase/types";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";
import { formatViews, formatRating } from "@/utils/format";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface RecommendedSliderProps {
  /** Personalized picks (already filtered/sorted by caller). */
  items: (Movie | Series)[];
  /**
   * Optional reason text per item — e.g. "Because you watched Inception" or
   * "Top picks in Action". When provided, shows as a chip on the slide.
   * Keyed by item.id. Falls back to a generic "Top pick for you" message.
   */
  reasons?: Record<string, string>;
  /** Autoplay delay in ms (default 6000). */
  autoplayDelay?: number;
  /** Optional view-all link. */
  viewAllHref?: string;
}

/**
 * RecommendedSlider — premium "Recommended for You" spotlight slider.
 *
 * A large, immersive hero-style slider (one title per slide) with:
 *  - Full-bleed landscape banner + multi-layer gradient for legibility
 *  - Personalized reason chip ("Because you watched …")
 *  - Match-score badge (e.g. "97% Match")
 *  - Big title, meta row, description
 *  - Play + Add-to-List actions
 *  - Autoplay with a thin top progress bar
 *  - Dot pagination (clickable)
 *  - Prev/next arrows on hover (desktop)
 *  - Swipeable on mobile
 *
 * Distinct from TrendingCarousel (which shows rank numbers + multiple per
 * view) — this is a single-spotlight, hero-like experience meant to make
 * the personalized "Recommended for You" row feel premium.
 */
export default function RecommendedSlider({
  items,
  reasons,
  autoplayDelay = 6000,
  viewAllHref = "/trending",
}: RecommendedSliderProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  // i18n removed

  // Filter out any malformed records (missing title or banner) so the
  // slider always renders clean slides.
  const slides = (items || []).filter(
    (it) => it && (it.title || "").trim() && (it.banner || it.thumbnail)
  );

  // Keep activeIdx inside bounds when the slides list changes.
  useEffect(() => {
    if (activeIdx >= slides.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIdx(0);
    }
  }, [slides.length, activeIdx]);

  const goPrev = useCallback(() => {
    swiperRef.current?.slidePrev();
  }, []);
  const goNext = useCallback(() => {
    swiperRef.current?.slideNext();
  }, []);

  if (slides.length === 0) return null;

  return (
    <section className="relative group/rs mb-10 sm:mb-14">
      {/* Section header */}
      <div className="flex items-end justify-between gap-3 mb-4 px-4 sm:px-6 lg:px-12">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.span
            initial={{ scale: 0.85, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 shrink-0"
          >
            <Wand2 className="w-5 h-5 text-primary" />
          </motion.span>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight leading-none line-clamp-1">
              Recommended for You
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
              Hand-picked titles based on what you watch
            </p>
          </div>
        </div>

        <Link
          to={viewAllHref}
          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors group/va shrink-0"
        >
          <span className="hidden sm:inline">View All</span>
          <span className="sm:hidden">All</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover/va:translate-x-0.5" />
        </Link>
      </div>

      {/* Slider body */}
      <div className="relative">
        {/* Top autoplay progress bar */}
        <AutoplayProgress
          key={activeIdx}
          duration={autoplayDelay}
          className="absolute top-0 left-0 right-0 z-30 h-0.5 bg-white/10 rounded-full overflow-hidden mx-4 sm:mx-6 lg:mx-12"
        />

        {/* Prev arrow — desktop hover only */}
        <button
          onClick={goPrev}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 w-12 lg:w-14 items-center justify-center bg-gradient-to-r from-background via-background/70 to-transparent opacity-0 group-hover/rs:opacity-100 transition-opacity"
          aria-label="Previous recommendation"
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground/10 hover:bg-primary hover:text-primary-foreground text-foreground transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </span>
        </button>

        <Swiper
          modules={[Autoplay, Pagination, EffectFade]}
          slidesPerView={1}
          spaceBetween={0}
          grabCursor
          autoplay={{
            delay: autoplayDelay,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          loop={slides.length > 1}
          pagination={{
            clickable: true,
            bulletActiveClass: "rs-bullet-active",
            bulletClass: "rs-bullet",
          }}
          onBeforeInit={(sw) => (swiperRef.current = sw)}
          onSlideChange={(sw) => setActiveIdx(sw.realIndex)}
          className="!px-0 rs-swiper !pb-12"
        >
          {slides.map((item, idx) => (
            <SwiperSlide key={item.id} className="!h-auto">
              <RecommendedSlide
                item={item}
                reason={reasons?.[item.id]}
                isActive={idx === activeIdx}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Next arrow — desktop hover only */}
        <button
          onClick={goNext}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 w-12 lg:w-14 items-center justify-center bg-gradient-to-l from-background via-background/70 to-transparent opacity-0 group-hover/rs:opacity-100 transition-opacity"
          aria-label="Next recommendation"
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground/10 hover:bg-primary hover:text-primary-foreground text-foreground transition-colors">
            <ChevronRight className="w-6 h-6" />
          </span>
        </button>
      </div>

      {/* Slide counter (bottom-right, outside swiper) */}
      <div className="absolute bottom-3 right-4 sm:right-6 lg:right-12 z-20 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-semibold">
        <span className="text-primary">{String(activeIdx + 1).padStart(2, "0")}</span>
        <span className="text-white/40">/</span>
        <span className="text-white/60">{String(slides.length).padStart(2, "0")}</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

interface SlideProps {
  item: Movie | Series;
  reason?: string;
  isActive: boolean;
}

function RecommendedSlide({ item, reason, isActive }: SlideProps) {
  const { getCategoryById } = useData();
  const navigate = useNavigate();
  const [inList, setInList] = useState(false);
  const category = getCategoryById(item.category);

  const title = item.title || "Untitled";
  const year = item.year || "—";
  const duration = item.duration || "—";
  const type = item.type || "movie";
  const description = item.description || "";

  // Derive a "match score" from the rating (0–10 → 70–99%).
  const ratingNum = Number(item.rating) || 0;
  const matchScore = Math.min(99, Math.max(70, Math.round(70 + (ratingNum / 10) * 29)));

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInList(!inList);
    toast.success(inList ? "Removed from My List" : "Added to My List");
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/watch/${item.type}/${item.id}`);
  };

  // The slide wrapper is NOT a <Link> — it's a clickable <div> that navigates
  // programmatically. This avoids illegal nested <a> tags: the "Details"
  // button below is a real <Link> (an <a>), and <a> cannot contain another <a>.
  const handleSlideClick = () => {
    navigate(`/details/${item.type}/${item.id}`);
  };

  return (
    <motion.div
      initial={false}
      animate={isActive ? { opacity: 1 } : { opacity: 0.95 }}
      transition={{ duration: 0.4 }}
      className="relative h-full"
    >
      <div
        onClick={handleSlideClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/details/${item.type}/${item.id}`);
          }
        }}
        className="group/slide relative block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
      >
        {/* 16:9 banner (with a min-height for very small screens) */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[21/9] min-h-[220px] bg-muted">
          <img
            src={item.banner || item.thumbnail}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/slide:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/1280/720`;
            }}
          />

          {/* Multi-layer gradient: left-to-right (for text panel) + bottom-up */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

          {/* Top-left "Recommended" chip */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur text-primary-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wide shadow-lg">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            For You
          </div>

          {/* Top-right rating badge */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur text-white text-[11px] sm:text-xs font-semibold shadow-md">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 fill-yellow-400" />
            {formatRating(item.rating)}
          </div>

          {/* Bottom-left content panel */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8 text-white">
            <div className="max-w-2xl">
              {/* Personalized reason chip */}
              <div className="mb-2 sm:mb-3">
                {reason ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20 text-[10px] sm:text-xs font-medium text-white/90">
                    <Wand2 className="w-3 h-3 text-primary" />
                    {reason}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20 text-[10px] sm:text-xs font-medium text-white/90">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Top pick for you
                  </span>
                )}
              </div>

              {/* Match score + type badge row */}
              <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                  {matchScore}% Match
                </span>
                <span className="text-white/40">•</span>
                <span className="bg-white/20 backdrop-blur px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                  {type}
                </span>
                {item.trending && (
                  <span className="bg-primary px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                    Trending
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-3xl lg:text-4xl font-extrabold leading-tight drop-shadow-lg line-clamp-2 mb-2 sm:mb-3">
                {title}
              </h3>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-sm text-white/80 mb-2 sm:mb-3">
                <span>{year}</span>
                <span className="text-white/40">•</span>
                <span>{duration}</span>
                {category && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="truncate max-w-[140px]">{category.name}</span>
                  </>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 ml-2">
                  <Eye className="w-3 h-3" />
                  {formatViews(item.views)}
                </span>
              </div>

              {/* Description */}
              {description && (
                <p className="hidden sm:block text-sm text-white/75 line-clamp-2 mb-4 max-w-xl">
                  {description}
                </p>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handlePlay}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white text-black hover:bg-white/90 text-xs sm:text-base font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-md transition-colors shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-black" />
                  Play
                </button>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white text-xs sm:text-base font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-md transition-colors"
                  aria-label={inList ? "Remove from list" : "Add to list"}
                >
                  {inList ? (
                    <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  )}
                  <span className="hidden sm:inline">{inList ? "In My List" : "My List"}</span>
                </button>
                <Link
                  to={`/details/${item.type}/${item.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-md transition-colors"
                >
                  <Info className="w-4 h-4" />
                  Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * AutoplayProgress — a thin bar at the top of the slider that animates
 * from 0% → 100% over `duration` ms, then resets. Keyed by activeIdx so
 * it restarts whenever the slide changes. Mimics the Netflix "stories"
 * progress indicator.
 */
function AutoplayProgress({
  duration,
  className,
}: {
  duration: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className="h-full bg-primary"
      />
    </div>
  );
}
