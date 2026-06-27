"use client";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Play, Star, Eye, TrendingUp } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import ContentGrid from "@/components/shared/ContentGrid";
import SkeletonGrid from "@/components/shared/SkeletonGrid";
import EmptyState from "@/components/shared/EmptyState";
import { useData } from "@/context/DataContext";
import { formatViews, formatRating } from "@/utils/format";
import type { ContentItem } from "@/firebase/types";

export default function TrendingPage() {
  const { movies, series, loading, getCategoryById } = useData();

  const trending = useMemo(
    () =>
      [...movies, ...series]
        .filter((i) => i.trending)
        .sort((a, b) => b.views - a.views),
    [movies, series]
  );

  const top10 = trending.slice(0, 10);
  const rest = trending.slice(10);

  const handleToggleList = (e: React.MouseEvent, _item: ContentItem) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (loading) {
    return (
      <div className="pb-12">
        <PageHeader
          title="Trending Now"
          subtitle="The most-watched titles on FLIXNET right now"
          icon={<Flame className="w-7 h-7" />}
        />
        <SkeletonGrid count={18} />
      </div>
    );
  }

  if (trending.length === 0) {
    return (
      <div className="pb-12">
        <PageHeader
          title="Trending Now"
          subtitle="The most-watched titles on FLIXNET right now"
          icon={<Flame className="w-7 h-7" />}
        />
        <EmptyState
          icon={Flame}
          title="No trending content yet"
          description="Check back soon as we update our trending list daily."
          actionLabel="Browse Movies"
          actionTo="/movies"
        />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Trending Now"
        subtitle="The most-watched titles on FLIXNET right now"
        icon={<Flame className="w-7 h-7" />}
      />

      {/* Top 10 numbered ranking */}
      <section className="mb-10 sm:mb-14">
        <div className="px-4 sm:px-6 lg:px-12 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Top 10 Today</h2>
        </div>

        <div className="px-4 sm:px-6 lg:px-12 space-y-3 sm:space-y-4">
          {top10.map((item, idx) => {
            const inList = false;
            const category = getCategoryById(item.category);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.5) }}
              >
                <Link
                  to={`/details/${item.type}/${item.id}`}
                  className="group flex items-stretch gap-2 sm:gap-4 hover:bg-muted rounded-lg p-2 sm:p-3 transition-colors"
                >
                  {/* Big rank number */}
                  <div className="flex items-center justify-center select-none shrink-0 w-12 sm:w-20 md:w-24">
                    <span
                      className="text-[80px] sm:text-[110px] md:text-[130px] font-black leading-none text-transparent"
                      style={{
                        WebkitTextStroke: "2px #e50914",
                        textShadow: "0 4px 20px rgba(229,9,20,0.3)",
                      }}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-28 sm:w-44 md:w-52 aspect-video rounded-md overflow-hidden bg-muted shrink-0">
                    <img
                      src={item.banner || item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/500/750`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-[11px] font-semibold">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      {formatRating(item.rating)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                    <h3 className="text-foreground font-bold text-base sm:text-xl line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
                      <span>{item.year}</span>
                      <span>•</span>
                      <span className="uppercase">{item.type}</span>
                      {category && (
                        <>
                          <span>•</span>
                          <span>{category.name}</span>
                        </>
                      )}
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {formatViews(item.views)}
                      </span>
                    </div>
                    <p className="hidden md:block text-muted-foreground text-sm mt-2 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 bg-white text-black text-xs sm:text-sm font-semibold px-3 py-1.5 rounded">
                        <Play className="w-3.5 h-3.5 fill-black" /> Play
                      </span>
                      <button
                        onClick={(e) => handleToggleList(e, item)}
                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-accent hover:bg-accent rounded text-foreground transition-colors"
                        aria-label={inList ? "Remove from list" : "Add to list"}
                      >
                        {inList ? (
                          <span className="text-primary text-lg font-bold leading-none">✓</span>
                        ) : (
                          <span className="text-foreground text-lg font-bold leading-none">+</span>
                        )}
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Remaining trending */}
      {rest.length > 0 && (
        <section>
          <div className="px-4 sm:px-6 lg:px-12 mb-4 flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">More Trending</h2>
          </div>
          <ContentGrid items={rest} />
        </section>
      )}
    </div>
  );
}
