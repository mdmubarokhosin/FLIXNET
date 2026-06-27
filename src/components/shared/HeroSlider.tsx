"use client";
import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { Play, Info, Plus, Check, Star, ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie, Series } from "@/firebase/types";
import { useData } from "@/context/DataContext";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";
import { formatViews, formatRating } from "@/utils/format";

interface HeroSliderProps {
  items: (Movie | Series)[];
}

export default function HeroSlider({ items }: HeroSliderProps) {
  const { getCategoryById } = useData();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const [myList, setMyList] = useState<Set<string>>(new Set());

  if (!items || items.length === 0) {
    return (
      <div className="relative h-[60vh] sm:h-[80vh] min-h-[400px] bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-2">Welcome to {settings.siteName || "FLIXNET"}</h1>
          <p className="text-muted-foreground">No featured content yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] sm:h-[85vh] min-h-[480px] w-full overflow-hidden">
      <Swiper
        modules={[Autoplay]}
        slidesPerView={1}
        autoplay={
          settings.heroAutoplay
            ? { delay: settings.heroInterval, disableOnInteraction: false }
            : false
        }
        loop={items.length > 1}
        onBeforeInit={(sw) => (swiperRef.current = sw)}
        onSlideChange={(sw) => setActiveIndex(sw.realIndex)}
        className="h-full w-full"
      >
        {items.map((item) => {
          const category = getCategoryById(item.category);
          const inList = myList.has(item.id);
          return (
            <SwiperSlide key={item.id} className="h-full">
              <div className="relative h-full w-full">
                {/* Background banner */}
                <img
                  src={item.banner || item.thumbnail}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}-banner/1280/720`;
                  }}
                />
                {/* Gradients */}
                <div className="absolute inset-0 hero-gradient" />
                <div className="absolute inset-0 hero-gradient-left" />

                {/* Content */}
                <div className="absolute inset-0 flex items-end sm:items-center">
                  <div className="px-4 sm:px-6 lg:px-12 pb-20 sm:pb-0 max-w-2xl">
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      {item.trending && (
                        <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded uppercase mb-3">
                          #{activeIndex + 1} Trending
                        </span>
                      )}
                      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-3 drop-shadow-lg leading-tight">
                        {item.title}
                      </h1>

                      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                        <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                          <Star className="w-4 h-4 fill-yellow-400" /> {formatRating(item.rating)}
                        </span>
                        <span className="text-white/80">{item.year}</span>
                        <span className="text-white/80">{item.duration}</span>
                        {category && <span className="text-white/80">{category.name}</span>}
                        <span className="text-white/60">{formatViews(item.views)}</span>
                      </div>

                      <p className="text-white/90 text-sm sm:text-base mb-6 line-clamp-3 max-w-xl drop-shadow">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          to={`/watch/${item.type}/${item.id}`}
                          className="flex items-center gap-2 bg-white text-black font-semibold px-5 sm:px-8 py-2.5 sm:py-3 rounded hover:bg-white/80 transition-colors"
                        >
                          <Play className="w-5 h-5 fill-black" /> Play
                        </Link>
                        <Link
                          to={`/details/${item.type}/${item.id}`}
                          className="flex items-center gap-2 bg-white/20 backdrop-blur text-white font-semibold px-5 sm:px-8 py-2.5 sm:py-3 rounded hover:bg-white/30 transition-colors"
                        >
                          <Info className="w-5 h-5" /> More Info
                        </Link>
                        <button
                          onClick={() => {
                            setMyList((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            });
                            toast.success(inList ? "Removed from My List" : "Added to My List");
                          }}
                          className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-white/20 backdrop-blur rounded-full hover:bg-white/30 transition-colors border-2 border-white/40"
                          aria-label={inList ? "Remove from list" : "Add to list"}
                        >
                          {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Custom nav buttons */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-black/40 hover:bg-black/70 rounded-full transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-black/40 hover:bg-black/70 rounded-full transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 right-6 sm:right-12 z-20 flex items-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => swiperRef.current?.slideToLoop(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-white/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
