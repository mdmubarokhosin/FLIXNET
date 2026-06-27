"use client";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import {
  Flame,
  Play,
  Plus,
  Check,
  Star,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Movie, Series } from "@/firebase/types";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";
import { formatViews, formatRating } from "@/utils/format";

interface TrendingCarouselProps {
  items: (Movie | Series)[];
  showRank?: boolean;
  autoplayDelay?: number;
}

/**
 * TrendingCarousel — Netflix-style "Top 10" horizontal slider.
 * Each slide shows a big rank number + landscape banner + title/meta + actions.
 * Plays automatically, loops, has hover-visible arrow controls on desktop,
 * and dot pagination underneath. Responsive: ~1.1 slides on mobile, 1.6 on
 * tablet, 2.2 on desktop, 2.7 on large desktop.
 */
export default function TrendingCarousel({
  items,
  showRank = true,
  autoplayDelay = 5000,
}: TrendingCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Filter out any malformed records (missing title or thumbnail) so the
  // carousel always renders clean slides even if a stale Firebase record
  // slipped through with empty fields.
  const slides = (items || []).filter(
    (it) => it && (it.title || "").trim() && (it.thumbnail || it.banner)
  );

  if (slides.length === 0) return null;

  return (
    <section className="relative group/tc mb-10 sm:mb-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-4 px-4 sm:px-6 lg:px-12">
        <div className="flex items-center gap-2.5">
          <motion.span
            initial={{ scale: 0.85, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 ring-1 ring-primary/30"
          >
            <Flame className="w-5 h-5 text-primary" />
          </motion.span>
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight leading-none">
              Trending Now
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Top {Math.min(slides.length, 10)} most-watched titles today
            </p>
          </div>
        </div>

        <Link
          to="/trending"
          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors group/va shrink-0"
        >
          <span className="hidden sm:inline">View All</span>
          <span className="sm:hidden">All</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover/va:translate-x-0.5" />
        </Link>
      </div>

      {/* Carousel body */}
      <div className="relative">
        {/* Prev button — desktop hover only */}
        <button
          onClick={() => swiperRef.current?.slidePrev()}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 w-12 lg:w-14 items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent opacity-0 group-hover/tc:opacity-100 transition-opacity"
          aria-label="Previous trending"
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground/10 hover:bg-primary hover:text-primary-foreground text-foreground transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </span>
        </button>

        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          slidesPerView={1.08}
          spaceBetween={12}
          grabCursor
          autoplay={{
            delay: autoplayDelay,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          loop={slides.length > 2}
          pagination={{
            clickable: true,
            bulletActiveClass: "tc-bullet-active",
            bulletClass: "tc-bullet",
          }}
          onBeforeInit={(sw) => (swiperRef.current = sw)}
          onSlideChange={(sw) => setActiveIdx(sw.realIndex)}
          breakpoints={{
            480: { slidesPerView: 1.25, spaceBetween: 14 },
            640: { slidesPerView: 1.5, spaceBetween: 16 },
            768: { slidesPerView: 1.7, spaceBetween: 18 },
            1024: { slidesPerView: 2.15, spaceBetween: 20 },
            1280: { slidesPerView: 2.4, spaceBetween: 22 },
            1536: { slidesPerView: 2.7, spaceBetween: 24 },
          }}
          className="!px-4 sm:!px-6 lg:!px-12 !pb-12 tc-swiper"
        >
          {slides.map((item, idx) => (
            <SwiperSlide key={item.id} className="!h-auto">
              <TrendingSlide
                item={item}
                rank={idx + 1}
                isActive={idx === activeIdx}
                showRank={showRank}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Next button — desktop hover only */}
        <button
          onClick={() => swiperRef.current?.slideNext()}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 w-12 lg:w-14 items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent opacity-0 group-hover/tc:opacity-100 transition-opacity"
          aria-label="Next trending"
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground/10 hover:bg-primary hover:text-primary-foreground text-foreground transition-colors">
            <ChevronRight className="w-6 h-6" />
          </span>
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

interface SlideProps {
  item: Movie | Series;
  rank: number;
  isActive: boolean;
  showRank: boolean;
}

function TrendingSlide({ item, rank, isActive, showRank }: SlideProps) {
  const { getCategoryById } = useData();
  const navigate = useNavigate();
  const [inList, setInList] = useState(false);
  const category = getCategoryById(item.category);

  const title = item.title || "Untitled";
  const year = item.year || "—";
  const duration = item.duration || "—";
  const type = item.type || "movie";

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

  return (
    <motion.div
      initial={false}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.92, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative h-full"
    >
      <Link
        to={`/details/${item.type}/${item.id}`}
        className="group/slide relative flex items-stretch gap-2 sm:gap-3 rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 hover:ring-2 hover:ring-primary/25 transition-all p-2 sm:p-3"
      >
        {/* Big rank number */}
        {showRank && (
          <div className="relative flex items-center justify-center shrink-0 w-10 sm:w-14 md:w-16 select-none">
            <span
              className="text-[72px] sm:text-[96px] md:text-[120px] font-black leading-none text-transparent"
              style={{
                WebkitTextStroke: "2px var(--primary)",
                textShadow: "0 4px 24px rgba(229,9,20,0.25)",
                fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
              }}
            >
              {rank}
            </span>
          </div>
        )}

        {/* Banner image */}
        <div className="relative flex-1 min-w-0 aspect-[16/10] sm:aspect-[16/9] rounded-lg overflow-hidden bg-muted">
          <img
            src={item.banner || item.thumbnail}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/slide:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/640/360`;
            }}
          />
          {/* Always-visible bottom gradient for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Top-right badges */}
          <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
            {item.trending && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shadow-md">
                Trending
              </span>
            )}
            <span className="flex items-center gap-1 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-[11px] font-semibold text-white">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {formatRating(item.rating)}
            </span>
          </div>

          {/* Bottom overlay: title + meta + actions */}
          <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3.5 text-white">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold leading-tight line-clamp-1 drop-shadow">
              {title}
            </h3>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-white/80 mt-1">
              <span className="bg-white/20 backdrop-blur px-1.5 py-0.5 rounded uppercase font-semibold">
                {type}
              </span>
              <span>{year}</span>
              <span>•</span>
              <span>{duration}</span>
              {category && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline truncate max-w-[100px]">
                    {category.name}
                  </span>
                </>
              )}
              <span className="hidden md:inline-flex items-center gap-1 ml-auto">
                <Eye className="w-3 h-3" />
                {formatViews(item.views)}
              </span>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                onClick={handlePlay}
                className="flex-1 inline-flex items-center justify-center gap-1 bg-white text-black text-xs font-semibold py-1.5 sm:py-2 rounded group-hover/slide:bg-primary group-hover/slide:text-primary-foreground transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-black group-hover/slide:fill-white transition-colors" />
                Play
              </button>
              <button
                onClick={handleAdd}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur rounded text-white transition-colors"
                aria-label={inList ? "Remove from list" : "Add to list"}
              >
                {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
