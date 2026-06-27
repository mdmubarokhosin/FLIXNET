"use client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { useRef } from "react";
import {
  Flame,
  Sparkles,
  Clock,
  Film,
  Tv,
  Star,
  LayoutGrid,
  Play,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Clapperboard,
  Drama,
  Laugh,
  Rocket,
  Ghost,
  Heart,
  Zap,
  BookOpen,
  Baby,
  type LucideIcon,
} from "lucide-react";
import ContentGrid from "@/components/shared/ContentGrid";
import TrendingCarousel from "@/components/shared/TrendingCarousel";
import RecommendedSlider from "@/components/shared/RecommendedSlider";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import type { ContentItem } from "@/firebase/types";

const iconMap: Record<string, LucideIcon> = {
  Flame,
  Drama,
  Laugh,
  Rocket,
  Ghost,
  Heart,
  Zap,
  BookOpen,
};

function getIcon(name?: string): LucideIcon {
  if (name && iconMap[name]) return iconMap[name];
  return Clapperboard;
}

// Per-category gradient palette (no blue/indigo)
const gradients = [
  "from-red-600/80 via-rose-700/60 to-muted",
  "from-amber-600/80 via-orange-700/60 to-muted",
  "from-emerald-600/80 via-teal-700/60 to-muted",
  "from-fuchsia-600/80 via-purple-700/60 to-muted",
  "from-rose-700/80 via-red-800/60 to-muted",
  "from-yellow-600/80 via-amber-700/60 to-muted",
  "from-orange-600/80 via-red-700/60 to-muted",
  "from-purple-700/80 via-fuchsia-800/60 to-muted",
];

export default function HomePage() {
  const { movies, series, categories, loading } = useData();
  const { user, isAdmin } = useAuth();

  // Watch progress (resume-watching) — currently not available after Firestore migration.
  // The Continue Watching row is disabled until watch progress tracking is re-implemented.
  type WatchProgress = {
    contentId: string;
    contentType: string;
    progress: number;
    episodeId?: string;
    watchedAt: number;
  };
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>([]);

  useEffect(() => {
    if (!user) {
      setWatchProgress([]);
      return;
    }
    // Watch progress fetching not available after Firestore migration
    setWatchProgress([]);
  }, [user]);

  // Defensive: drop any malformed records (missing title or thumbnail) so
  // the home page never shows "Untitled —" cards from stale Firebase entries.
  const valid = useMemo(
    () =>
      [...movies, ...series].filter(
        (i) => i && (i.title || "").trim() && (i.thumbnail || i.banner)
      ),
    [movies, series]
  );

  const all: ContentItem[] = valid;

  const trending = useMemo(
    () => all.filter((i) => i.trending).sort((a, b) => b.views - a.views).slice(0, 10),
    [all]
  );

  const recentlyAdded = useMemo(
    () => [...all].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12),
    [all]
  );

  const topRated = useMemo(
    () => [...all].sort((a, b) => b.rating - a.rating).slice(0, 12),
    [all]
  );

  const popularMovies = useMemo(
    () => [...movies]
      .filter((i) => i && (i.title || "").trim() && (i.thumbnail || i.banner))
      .sort((a, b) => b.views - a.views)
      .slice(0, 12),
    [movies]
  );

  const popularSeries = useMemo(
    () => [...series]
      .filter((i) => i && (i.title || "").trim() && (i.thumbnail || i.banner))
      .sort((a, b) => b.views - a.views)
      .slice(0, 12),
    [series]
  );

  // Continue watching — primarily from watchProgress (with red bar overlay);
  // fall back to watchHistory if watchProgress is empty.
  const continueWatching = useMemo(() => {
    type RowItem = { item: ContentItem; progress: number; episodeId?: string; watchedAt: number };
    const result: RowItem[] = [];
    const seen = new Set<string>();

    for (const p of watchProgress) {
      const contentItem: ContentItem | undefined =
        p.contentType === "movie"
          ? movies.find((m) => m.id === p.contentId)
          : series.find((s) => s.id === p.contentId);
      if (!contentItem) continue;
      const key = `${p.contentType}:${p.contentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (p.progress >= 95) continue;
      result.push({ item: contentItem, progress: p.progress, episodeId: p.episodeId, watchedAt: p.watchedAt });
      if (result.length >= 12) break;
    }

    return result.sort((a, b) => b.watchedAt - a.watchedAt);
  }, [watchProgress, movies, series]);

  // Recommended for You — rule-based: pick the user's most-watched
  // category (from watch history + watch progress), then show the top-rated
  // titles from that category that the user hasn't watched. If the user has
  // no history, fall back to trending. Also produce a per-item "reason"
  // string ("Because you watched X" / "Top picks in {Category}") so the
  // spotlight slider can show a personalized chip on each slide.
  const recommended = useMemo(() => {
    // Build a list of contentIds the user has already engaged with.
    const watchedIds = new Set<string>();
    watchProgress.forEach((p) => watchedIds.add(p.contentId));

    // Map contentId → title (for "Because you watched X" reason chips).
    const titleById: Record<string, string> = {};
    movies.forEach((m) => (titleById[m.id] = m.title));
    series.forEach((s) => (titleById[s.id] = s.title));

    // Tally categories from history + progress.
    const catCounts: Record<string, number> = {};
    const tallyCat = (contentId: string, contentType: string) => {
      const item: ContentItem | undefined =
        contentType === "movie"
          ? movies.find((m) => m.id === contentId)
          : series.find((s) => s.id === contentId);
      if (item && item.category) {
        catCounts[item.category] = (catCounts[item.category] || 0) + 1;
      }
    };
    watchProgress.forEach((p) => tallyCat(p.contentId, p.contentType));

    // Pick the user's top category (most-engaged).
    const topCatId = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!topCatId) {
      // No history → show trending as the "Recommended for You" fallback.
      const items = all
        .filter((i) => i.trending)
        .sort((a, b) => b.views - a.views)
        .slice(0, 12);
      const reasons: Record<string, string> = {};
      items.forEach((i) => {
        reasons[i.id] = "Trending right now";
      });
      return { items, reasons };
    }

    // Top-rated items in the user's favourite category that they haven't watched.
    const items = all
      .filter((i) => i.category === topCatId && !watchedIds.has(i.id))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 12);

    // Build reason chips:
    //  - For the first 3 items: "Because you watched {most-recent-watched title in this category}"
    //  - For the rest: "Top picks in {Category name}"
    const catName =
      categories.find((c) => c.id === topCatId)?.name || "your favourites";

    // Find the most recently watched title in the user's top category
    // (used for the "Because you watched X" chip).
    const recentInCat = [...watchProgress]
      .filter((h) => {
        const item: ContentItem | undefined =
          h.contentType === "movie"
            ? movies.find((m) => m.id === h.contentId)
            : series.find((s) => s.id === h.contentId);
        return item?.category === topCatId;
      })
      .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))[0];
    const recentTitle = recentInCat ? titleById[recentInCat.contentId] : undefined;

    const reasons: Record<string, string> = {};
    items.forEach((i, idx) => {
      if (idx < 3 && recentTitle) {
        reasons[i.id] = `Because you watched ${recentTitle}`;
      } else {
        reasons[i.id] = `Top picks in ${catName}`;
      }
    });

    return { items, reasons };
  }, [watchProgress, movies, series, all, categories]);

  // Category counts for quick-access cards
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    all.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return map;
  }, [all]);

  // Top categories with content (for quick-access strip)
  const topCategories = useMemo(
    () =>
      categories
        .map((cat) => ({ cat, count: counts[cat.id] || 0 }))
        .filter((c) => c.count > 0)
        .slice(0, 8),
    [categories, counts]
  );

  return (
    <div className="pb-12">
      <div className="relative z-10 space-y-10 sm:space-y-12 pt-4 sm:pt-6">
        {/* Empty database state — the platform loads only real data from
            Firebase, so a fresh install shows this until content is added. */}
        {!loading && all.length === 0 && (
          <section className="px-4 sm:px-6 lg:px-12 py-10 sm:py-16">
            <div className="max-w-2xl mx-auto text-center rounded-2xl border border-border bg-card p-8 sm:p-12">
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
                <Clapperboard className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
                {isAdmin ? "Your catalogue is empty" : "No content available yet"}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                {isAdmin
                  ? "This platform loads all data from your database — no demo content is shown automatically. Add movies and series from the admin panel, or load the bundled sample catalogue to see how everything looks."
                  : "We're adding new movies and TV shows all the time. Please check back soon for an amazing streaming experience!"}
              </p>
              {isAdmin ? (
                <Link
                  to="/admin/settings"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> Go to Settings → Load Sample Data
                </Link>
              ) : (
                <Link
                  to="/movies"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded transition-colors"
                >
                  <Play className="w-4 h-4 fill-white" /> Browse Movies
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Continue Watching — horizontal row with red progress-bar overlays */}
        {continueWatching.length > 0 && (
          <ContinueWatchingRow items={continueWatching} />
        )}

        {/* Recommended for You — premium spotlight slider (one title per slide,
            autoplay with progress bar, personalized reason chips, match score) */}
        {recommended.items.length > 0 && (
          <RecommendedSlider
            items={recommended.items}
            reasons={recommended.reasons}
            autoplayDelay={6000}
            viewAllHref="/trending"
          />
        )}

        {/* Browse by Category — quick access cards (like Categories page) */}
        {topCategories.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-12">
            <SectionHeader
              icon={<LayoutGrid className="w-5 h-5 text-primary" />}
              title="Browse by Category"
              subtitle="Jump straight into your favorite genre"
              viewAllHref="/categories"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {topCategories.map(({ cat, count }, idx) => {
                const Icon = getIcon(cat.icon);
                const gradient = gradients[idx % gradients.length];
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
                  >
                    <Link
                      to={`/categories?cat=${cat.id}`}
                      className={`relative block text-left rounded-lg overflow-hidden h-24 sm:h-28 p-3 sm:p-4 bg-gradient-to-br ${gradient} border border-border hover:border-primary/50 hover:ring-2 hover:ring-primary/30 transition-all group`}
                    >
                      <div className="relative z-10 flex flex-col justify-between h-full">
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white/90" />
                        <div>
                          <div className="text-white font-bold text-sm sm:text-base leading-tight line-clamp-1">
                            {cat.name}
                          </div>
                          <div className="text-white/70 text-xs">
                            {count} title{count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="absolute -right-3 -bottom-3 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Icon className="w-20 h-20 sm:w-24 sm:h-24 text-white" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Trending Now — Slider Carousel (Netflix Top 10 style) */}
        {trending.length > 0 && (
          <TrendingCarousel items={trending} autoplayDelay={5000} />
        )}

        {/* Popular Movies — grid 2/3/4 */}
        {popularMovies.length > 0 && (
          <section>
            <div className="px-4 sm:px-6 lg:px-12">
              <SectionHeader
                icon={<Film className="w-5 h-5 text-primary" />}
                title="Popular Movies"
                subtitle="Most-watched films on the platform"
                viewAllHref="/movies"
              />
            </div>
            <ContentGrid items={popularMovies} />
          </section>
        )}

        {/* Recently Added — grid 2/3/4 */}
        {recentlyAdded.length > 0 && (
          <section>
            <div className="px-4 sm:px-6 lg:px-12">
              <SectionHeader
                icon={<Sparkles className="w-5 h-5 text-primary" />}
                title="Recently Added"
                subtitle="Fresh content just landed"
              />
            </div>
            <ContentGrid items={recentlyAdded} />
          </section>
        )}

        {/* Top Rated — grid 2/3/4 */}
        {topRated.length > 0 && (
          <section>
            <div className="px-4 sm:px-6 lg:px-12">
              <SectionHeader
                icon={<Star className="w-5 h-5 text-primary" />}
                title="Top Rated"
                subtitle="Critically acclaimed picks"
              />
            </div>
            <ContentGrid items={topRated} />
          </section>
        )}

        {/* Popular Series — grid 2/3/4 */}
        {popularSeries.length > 0 && (
          <section>
            <div className="px-4 sm:px-6 lg:px-12">
              <SectionHeader
                icon={<Tv className="w-5 h-5 text-primary" />}
                title="Popular Series"
                subtitle="Binge-worthy TV shows"
                viewAllHref="/series"
              />
            </div>
            <ContentGrid items={popularSeries} />
          </section>
        )}

        {/* Welcome banner for new users with empty continue watching */}
        {continueWatching.length === 0 && user && all.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-12">
            <div className="bg-gradient-to-r from-primary/20 via-card to-card rounded-xl p-6 sm:p-8 border border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-7 h-7 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Welcome to FLIXNET!</h2>
              </div>
              <p className="text-muted-foreground mb-4 max-w-2xl">
                Discover thousands of movies and TV shows. Start watching now — your viewing history and recommendations will appear here.
              </p>
              <Link
                to="/movies"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded transition-colors"
              >
                <Play className="w-4 h-4 fill-white" /> Start Watching
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

/* ----------------------------------------------------------------
   SectionHeader — consistent section header with optional View All
----------------------------------------------------------------- */
function SectionHeader({
  icon,
  title,
  subtitle,
  viewAllHref,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-end justify-between gap-3 mb-4 pb-2 border-b border-border"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight line-clamp-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors shrink-0 group/va"
        >
          View All
          <ChevronRight className="w-4 h-4 transition-transform group-hover/va:translate-x-0.5" />
        </Link>
      )}
    </motion.div>
  );
}

/* ----------------------------------------------------------------
   ContinueWatchingRow
   ------------------
   Horizontal swiper of cards the user has started but not finished.
   Each card shows the poster + a RED progress bar at the bottom (overlay)
   showing the percentage watched. Clicking navigates to the watch page.
----------------------------------------------------------------- */
function ContinueWatchingRow({
  items,
}: {
  items: { item: ContentItem; progress: number; episodeId?: string; watchedAt: number }[];
}) {
  const swiperRef = useRef<SwiperType | null>(null);
  // Task 2e: i18n for the section title (Bangla / English).
  return (
    <section className="relative group/row mb-8 sm:mb-10">
      {/* Section header */}
      <div className="flex items-end justify-between mb-3 px-4 sm:px-6 lg:px-12">
        <div className="flex items-center gap-2.5">
          <Clock className="w-6 h-6 text-primary" />
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Continue Watching
          </h2>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {items.length}
          </Badge>
        </div>
        <Link
          to="/history"
          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors group/va"
        >
          View All
          <ChevronRight className="w-4 h-4 transition-transform group-hover/va:translate-x-0.5" />
        </Link>
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
          modules={[FreeMode]}
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
          {items.map(({ item, progress, episodeId }, idx) => (
            <SwiperSlide key={`${item.type}-${item.id}`} className="!w-auto">
              <ContinueWatchingCard
                item={item}
                progress={progress}
                episodeId={episodeId}
                index={idx}
              />
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

function ContinueWatchingCard({
  item,
  progress,
  episodeId,
  index,
}: {
  item: ContentItem;
  progress: number;
  episodeId?: string;
  index: number;
}) {
  const watchHref = episodeId
    ? `/watch/${item.type}/${item.id}?ep=${episodeId}`
    : `/watch/${item.type}/${item.id}`;
  const pct = Math.max(2, Math.min(100, Math.round(progress || 0)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      className="shrink-0 w-full group"
    >
      <Link to={watchHref} className="block">
        {/* 16:9 landscape thumbnail (more "player"-like than portrait) */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary transition-all">
          <img
            src={item.banner || item.thumbnail}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/640/360`;
            }}
          />

          {/* Bottom gradient always visible */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Top-left type badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              {item.type}
            </span>
          </div>

          {/* Center play button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 fill-primary-foreground text-primary-foreground ml-0.5" />
            </div>
          </div>

          {/* Title overlay (bottom-left) */}
          <div className="absolute bottom-3 left-2.5 right-2.5">
            <h3 className="text-white text-sm font-semibold line-clamp-1 drop-shadow">
              {item.title}
            </h3>
            <p className="text-white/70 text-[10px] mt-0.5">
              {pct >= 95 ? "Finished" : `${pct}% watched`}
            </p>
          </div>

          {/* Red progress bar at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
            <div
              className="h-full bg-red-600"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% watched`}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
