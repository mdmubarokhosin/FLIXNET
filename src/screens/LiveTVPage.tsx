"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tv,
  Search,
  Flame,
  Globe,
  Languages,
  Eye,
  Play,
  X,
  Sparkles,
  Heart,
  LayoutGrid,
  History,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatViews } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { LiveTVChannel } from "@/firebase/types";

type SortKey = "popular" | "featured" | "newest";

const sortLabels: Record<SortKey, string> = {
  popular: "Most Watched",
  featured: "Featured",
  newest: "Newest",
};

export default function LiveTVPage() {
  const { liveTVs, categories, getCategoryById, loading } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("featured");

  // Quick-tab filter (separate from the dropdowns above the grid).
  // "" = All; otherwise a category id.
  const [tabCategory, setTabCategory] = useState<string>("all");

  // Favorites (logged-in only) — local-only after Firestore migration (no remote persistence).
  const [favIds, setFavIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favBusy, setFavBusy] = useState<Record<string, boolean>>({});
  const mountedRef = useRef(false);
  const [multiOpen, setMultiOpen] = useState(false); // Multi-screen removed

  // Load favorites + recently watched when the user is logged in.
  // After Firestore migration, these are local-only (no remote fetch).
  useEffect(() => {
    mountedRef.current = true;
    if (!user?.uid) {
      setFavIds([]);
      setRecentIds([]);
      return;
    }
    // No remote persistence — initialize empty
    setFavIds([]);
    setRecentIds([]);
    return () => {
      // cleanup
    };
  }, [user?.uid]);

  // Derived filter options
  const tags = useMemo(() => {
    const set = new Set<string>();
    liveTVs.forEach((c) => c.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [liveTVs]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    liveTVs.forEach((c) => c.language && set.add(c.language));
    return Array.from(set).sort();
  }, [liveTVs]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    liveTVs.forEach((c) => c.country && set.add(c.country));
    return Array.from(set).sort();
  }, [liveTVs]);

  // Categories that actually have live channels (for the tab bar).
  const categoriesWithChannels = useMemo(() => {
    const usedIds = new Set(liveTVs.map((c) => c.category).filter(Boolean));
    return categories.filter((c) => usedIds.has(c.id));
  }, [categories, liveTVs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const effectiveCategory = tabCategory !== "all" ? tabCategory : category;
    let list = liveTVs.filter((c) => {
      if (q && !(c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q))) return false;
      if (effectiveCategory !== "all" && c.category !== effectiveCategory) return false;
      if (tag !== "all" && !c.tags?.includes(tag)) return false;
      if (language !== "all" && c.language !== language) return false;
      if (country !== "all" && c.country !== country) return false;
      return true;
    });
    if (sort === "popular") list = [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sort === "newest") list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    else list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || (b.views || 0) - (a.views || 0));
    return list;
  }, [liveTVs, search, category, tabCategory, tag, language, country, sort]);

  const featuredChannels = useMemo(
    () => liveTVs.filter((c) => c.featured).slice(0, 8),
    [liveTVs]
  );

  // Map favorite ids + recent ids to actual channel objects (skip missing).
  const favoriteChannels = useMemo(() => {
    return favIds
      .map((id) => liveTVs.find((c) => c.id === id))
      .filter((c): c is LiveTVChannel => Boolean(c))
      .slice(0, 12);
  }, [favIds, liveTVs]);

  const recentChannels = useMemo(() => {
    return recentIds
      .map((id) => liveTVs.find((c) => c.id === id))
      .filter((c): c is LiveTVChannel => Boolean(c))
      .slice(0, 12);
  }, [recentIds, liveTVs]);

  const hasFilters =
    search !== "" ||
    category !== "all" ||
    tag !== "all" ||
    language !== "all" ||
    country !== "all" ||
    sort !== "featured";

  const reset = () => {
    setSearch("");
    setCategory("all");
    setTabCategory("all");
    setTag("all");
    setLanguage("all");
    setCountry("all");
    setSort("featured");
  };

  // Toggle a channel in/out of favorites (local-only after Firestore migration).
  const handleToggleFav = async (channelId: string, name: string) => {
    if (!user?.uid) {
      toast.error("Sign in to save favorites", {
        description: "You need an account to bookmark channels.",
      });
      return;
    }
    setFavBusy((b) => ({ ...b, [channelId]: true }));
    try {
      const wasFav = favIds.includes(channelId);
      setFavIds((prev) =>
        wasFav
          ? prev.filter((id) => id !== channelId)
          : prev.includes(channelId)
            ? prev
            : [channelId, ...prev]
      );
      toast.success(wasFav ? "Removed from Favorites" : "Added to Favorites", {
        description: name,
      });
    } catch {
      toast.error("Could not update favorites");
    } finally {
      setFavBusy((b) => ({ ...b, [channelId]: false }));
    }
  };

  if (loading && liveTVs.length === 0) {
    return (
      <div className="pb-12">
        <PageHeader
          title="Live TV"
          subtitle="Loading channels…"
          icon={<Tv className="w-7 h-7" />}
        />
        <div className="px-4 sm:px-6 lg:px-12 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (liveTVs.length === 0) {
    return (
      <div className="pb-12">
        <PageHeader
          title="Live TV"
          subtitle="Stream live television channels from around the world"
          icon={<Tv className="w-7 h-7" />}
        />
        <EmptyState
          icon={Tv}
          title="No live channels available"
          description="The admin hasn't added any live TV channels yet. Please check back later."
        />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="Live TV"
        subtitle={`${liveTVs.length} channel${liveTVs.length !== 1 ? "s" : ""} streaming live`}
        icon={<Tv className="w-7 h-7" />}
      />

      {/* Quick actions row (multi-screen removed) */}

      {/* Category quick-tabs (pill buttons) */}
      <div className="px-4 sm:px-6 lg:px-12 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto custom-scroll-thin pb-1.5 -mx-1 px-1">
          <PillTab
            active={tabCategory === "all"}
            onClick={() => setTabCategory("all")}
            label="All"
            count={liveTVs.length}
          />
          {categoriesWithChannels.map((c) => {
            const count = liveTVs.filter((tv) => tv.category === c.id).length;
            return (
              <PillTab
                key={c.id}
                active={tabCategory === c.id}
                onClick={() => setTabCategory(c.id)}
                label={c.name}
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* Recently watched + Favorites sections (logged-in only) */}
      {user && (
        <>
          {recentChannels.length > 0 && (
            <ChannelStrip
              icon={<History className="w-4 h-4 text-primary" />}
              title="Recently Watched"
              channels={recentChannels}
              getCategoryById={getCategoryById}
            />
          )}
          {favoriteChannels.length > 0 && (
            <ChannelStrip
              icon={<Heart className="w-4 h-4 text-primary" />}
              title="Your Favorites"
              channels={favoriteChannels}
              getCategoryById={getCategoryById}
              favIds={favIds}
              onToggleFav={handleToggleFav}
              favBusy={favBusy}
            />
          )}
        </>
      )}

      {/* Featured strip — circular row, only when no filters applied */}
      {!hasFilters && tabCategory === "all" && featuredChannels.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-12 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Featured Channels
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-5">
            {featuredChannels.map((c, i) => (
              <CircularChannel
                key={c.id}
                channel={c}
                size="lg"
                showMeta
                delay={i * 0.04}
                isFavorite={user ? favIds.includes(c.id) : false}
                onToggleFav={user ? handleToggleFav : undefined}
                favBusy={favBusy[c.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="px-4 sm:px-6 lg:px-12 mb-6">
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Search className="w-3.5 h-3.5" />
            <span>Find a channel</span>
            {tabCategory !== "all" && (
              <span className="ml-auto inline-flex items-center gap-1 text-primary normal-case font-normal">
                Filtered by tab:{" "}
                <strong className="font-semibold">
                  {categories.find((c) => c.id === tabCategory)?.name || tabCategory}
                </strong>
                <button
                  onClick={() => setTabCategory("all")}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear tab filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description…"
              className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px] sm:w-[170px] bg-background border-border text-foreground">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all" className="focus:bg-accent">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="focus:bg-accent">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {tags.length > 0 && (
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="w-[130px] sm:w-[150px] bg-background border-border text-foreground">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground max-h-72">
                  <SelectItem value="all" className="focus:bg-accent">All Tags</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t} value={t} className="focus:bg-accent">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {languages.length > 0 && (
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[130px] sm:w-[150px] bg-background border-border text-foreground">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground max-h-72">
                  <SelectItem value="all" className="focus:bg-accent">All Languages</SelectItem>
                  {languages.map((l) => (
                    <SelectItem key={l} value={l} className="focus:bg-accent">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {countries.length > 0 && (
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-[130px] sm:w-[150px] bg-background border-border text-foreground">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground max-h-72">
                  <SelectItem value="all" className="focus:bg-accent">All Countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c} className="focus:bg-accent">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[140px] sm:w-[160px] bg-background border-border text-foreground">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k} className="focus:bg-accent">
                    {sortLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                onClick={reset}
                variant="ghost"
                size="sm"
                className="ml-auto text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="w-4 h-4 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="px-4 sm:px-6 lg:px-12 mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        Showing <span className="text-foreground font-semibold">{filtered.length}</span> channel{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Circular channel grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Tv className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No channels match your filters</h3>
          <p className="text-muted-foreground text-sm max-w-md mb-6">
            Try removing some filters or searching for a different term.
          </p>
          <Button
            onClick={reset}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <X className="w-4 h-4 mr-2" /> Reset Filters
          </Button>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-12 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4 sm:gap-5">
          {filtered.map((c, i) => {
            const cat = getCategoryById(c.category);
            return (
              <CircularChannel
                key={c.id}
                channel={c}
                categoryName={cat?.name}
                size="md"
                showMeta
                delay={i * 0.025}
                isFavorite={user ? favIds.includes(c.id) : false}
                onToggleFav={user ? handleToggleFav : undefined}
                favBusy={favBusy[c.id]}
              />
            );
          })}
        </div>
      )}

      {/* Multi-Screen overlay (removed) */}
    </div>
  );
}

/* ----------------------------------------------------------------
   PillTab — quick-filter pill button used for category tabs.
----------------------------------------------------------------- */
function PillTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ----------------------------------------------------------------
   ChannelStrip — horizontal circular row used for Favorites +
   Recently Watched sections.
----------------------------------------------------------------- */
function ChannelStrip({
  icon,
  title,
  channels,
  getCategoryById,
  favIds,
  onToggleFav,
  favBusy,
}: {
  icon: React.ReactNode;
  title: string;
  channels: LiveTVChannel[];
  getCategoryById: (id: string) => { name?: string } | undefined;
  favIds?: string[];
  onToggleFav?: (channelId: string, name: string) => void;
  favBusy?: Record<string, boolean>;
}) {
  return (
    <div className="px-4 sm:px-6 lg:px-12 mb-8">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            {title}
          </h2>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
            {channels.length}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-5">
        {channels.map((c, i) => {
          const cat = getCategoryById(c.category);
          return (
            <CircularChannel
              key={c.id}
              channel={c}
              categoryName={cat?.name}
              size="md"
              showMeta
              delay={i * 0.03}
              isFavorite={favIds ? favIds.includes(c.id) : false}
              onToggleFav={onToggleFav}
              favBusy={favBusy?.[c.id]}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   CircularChannel — round/circular channel logo card.
   Modeled after toffeelive.com/en/live where each channel is a
   circular logo with the channel name below + a LIVE pulse dot.
   Now also includes an optional heart toggle (top-left) for the
   Favorites feature.
----------------------------------------------------------------- */
function CircularChannel({
  channel,
  categoryName,
  size = "md",
  showMeta = true,
  delay = 0,
  isFavorite = false,
  onToggleFav,
  favBusy,
}: {
  channel: LiveTVChannel;
  categoryName?: string;
  size?: "sm" | "md" | "lg";
  showMeta?: boolean;
  delay?: number;
  isFavorite?: boolean;
  onToggleFav?: (channelId: string, name: string) => void;
  favBusy?: boolean;
}) {
  const dimensions = {
    sm: "w-16 h-16",
    md: "w-20 h-20 sm:w-24 sm:h-24",
    lg: "w-24 h-24 sm:w-28 sm:h-28",
  }[size];

  const playIcon = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-8 h-8",
  }[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col items-center text-center"
    >
      <div className="relative">
        {/* Favorite heart toggle (top-left) */}
        {onToggleFav && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!favBusy) onToggleFav(channel.id, channel.name);
            }}
            disabled={favBusy}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "absolute -top-1 -left-1 z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background shadow-md transition-all",
              isFavorite
                ? "bg-primary text-primary-foreground"
                : "bg-background/95 text-muted-foreground hover:text-primary",
              favBusy && "opacity-60 cursor-wait"
            )}
          >
            <Heart
              className={cn("w-3.5 h-3.5", isFavorite && "fill-current")}
            />
          </button>
        )}

        <Link
          to={`/watch-live/${channel.id}`}
          className="group relative block"
          aria-label={`Watch ${channel.name} live`}
        >
          {/* Glowing ring for live channels */}
          <div
            className={cn(
              "relative rounded-full p-[3px] transition-all duration-300",
              channel.live
                ? "bg-gradient-to-tr from-primary via-primary/70 to-primary ring-2 ring-primary/40 group-hover:ring-primary/70"
                : "bg-border group-hover:bg-primary/50"
            )}
          >
            <div className="relative rounded-full overflow-hidden bg-muted group-hover:shadow-xl transition-shadow">
              <img
                src={channel.logo || channel.banner}
                alt={channel.name}
                loading="lazy"
                className={cn(
                  dimensions,
                  "object-cover group-hover:scale-110 transition-transform duration-300"
                )}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${channel.id}/200/200`;
                }}
              />
              {/* Dark overlay on hover */}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <div className="rounded-full bg-primary flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className={cn(playIcon, "text-primary-foreground fill-primary-foreground ml-0.5")} />
                </div>
              </div>
            </div>
          </div>

          {/* LIVE / OFFLINE badge — floating top-right on the circle */}
          <span
            className={cn(
              "absolute -top-1 -right-1 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md border-2 border-background whitespace-nowrap",
              channel.live
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {channel.live && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
            {channel.live ? "LIVE" : "OFF"}
          </span>

          {/* Views badge — floating bottom-left on the circle */}
          <span className="absolute -bottom-1 -left-1 inline-flex items-center gap-0.5 bg-background/95 text-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-md border border-border whitespace-nowrap">
            <Eye className="w-2.5 h-2.5 text-primary" />
            {formatViews(channel.views || 0)}
          </span>
        </Link>
      </div>

      {/* Channel name + meta below the circle */}
      {showMeta && (
        <div className="mt-2.5 w-full px-0.5">
          <p className="text-foreground text-xs sm:text-sm font-semibold line-clamp-1 leading-tight">
            {channel.name}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground">
            {categoryName && (
              <span className="truncate max-w-[90px]">{categoryName}</span>
            )}
            {channel.language && (
              <span className="inline-flex items-center gap-0.5">
                {categoryName && <span className="opacity-50">·</span>}
                <Languages className="w-2.5 h-2.5" />
                {channel.language}
              </span>
            )}
            {channel.country && (
              <span className="inline-flex items-center gap-0.5">
                {(categoryName || channel.language) && <span className="opacity-50">·</span>}
                <Globe className="w-2.5 h-2.5" />
                {channel.country}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
