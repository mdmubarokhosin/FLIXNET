"use client";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from "lucide-react";
import MovieCard from "./MovieCard";
import type { Movie, Series } from "@/firebase/types";

interface ContentRowProps {
  title: string;
  items: (Movie | Series)[];
  icon?: React.ReactNode;
  viewAllHref?: string;
}

export default function ContentRow({ title, items, icon, viewAllHref }: ContentRowProps) {
  const swiperRef = useRef<SwiperType | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="relative group/row mb-8 sm:mb-10">
      {/* Section header */}
      <div className="flex items-end justify-between mb-3 px-4 sm:px-6 lg:px-12">
        <div className="flex items-center gap-2.5">
          {icon}
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors group/va"
          >
            View All
            <ArrowRight className="w-4 h-4 transition-transform group-hover/va:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="relative">
        {/* Prev button */}
        <button
          onClick={() => swiperRef.current?.slidePrev()}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 w-12 lg:w-14 items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Previous"
        >
          <ChevronLeft className="w-7 h-7 text-foreground" />
        </button>

        <Swiper
          modules={[Navigation, FreeMode]}
          spaceBetween={10}
          slidesPerView={2.2}
          freeMode
          onBeforeInit={(sw) => (swiperRef.current = sw)}
          breakpoints={{
            480: { slidesPerView: 2.5, spaceBetween: 12 },
            640: { slidesPerView: 3.2, spaceBetween: 12 },
            768: { slidesPerView: 4.2, spaceBetween: 14 },
            1024: { slidesPerView: 5.2, spaceBetween: 16 },
            1280: { slidesPerView: 6.2, spaceBetween: 16 },
            1536: { slidesPerView: 7.2, spaceBetween: 16 },
          }}
          className="!px-4 sm:!px-6 lg:!px-12"
        >
          {items.map((item, idx) => (
            <SwiperSlide key={item.id} className="!w-auto">
              <MovieCard item={item} index={idx} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Next button */}
        <button
          onClick={() => swiperRef.current?.slideNext()}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 w-12 lg:w-14 items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Next"
        >
          <ChevronRight className="w-7 h-7 text-foreground" />
        </button>
      </div>
    </section>
  );
}
