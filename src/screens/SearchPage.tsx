"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  TrendingUp,
  X,
  Sparkles,
  Film,
  Tv,
  Flame,
  SlidersHorizontal,
  Star,
  Calendar,
  Radio,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import ContentGrid from "@/components/shared/ContentGrid";
import SkeletonGrid from "@/components/shared/SkeletonGrid";
import EmptyState from "@/components/shared/EmptyState";
import ContentRow from "@/components/shared/ContentRow";
import { useData } from "@/context/DataContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ContentItem, LiveTVChannel } from "@/firebase/types";

const trendingSearchTerms = [
  "Action",
  "Drama",
  "Thriller",
  "Sci-Fi",
  "Romance",
  "Comedy",
  "Horror",
  "Mystery",
  "Adventure",
  "Crime",
];

type ContentTypeFilter = "all" | "movie" | "series" | "channel";
type SortKey = "relevance" | "views" | "rating" | "newest";

interface FilterState {
  type: ContentTypeFilter;
  genre: string;
  yearMin: number;
  yearMax: number;
  ratingMin: number;
  ratingMax: number;
  sort: SortKey;
}

const DEFAULT_FILTERS: FilterState = {
  type: "all",
  genre: "all",
  yearMin: 1950,
  yearMax: new Date().getFullYear() + 1,
  ratingMin: 0,
  ratingMax: 10,
  sort: "relevance",
};

// Channel-search row type (channels don't have rating/year so we map minimal fields).
interface ChannelRow {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  type: "channel";
  views: number;
  rating: number;
  year: number;
  genres: string[];
  cast?: string[];
  director?: string;
}

type Searchable = ContentItem | ChannelRow;

export default function SearchPage() {
  const { movies, series, liveTVs, loading } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [input, setInput] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Keep input in sync with URL (e.g., navbar search)
  useEffect(() => {
    setInput(q);
  }, [q]);

  // Autofocus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // All searchable content — include live channels.
  const all: Searchable[] = useMemo(
    () => [
      ...movies,
      ...series,
      ...liveTVs.map((c) => ({
        id: c.id,
        title: c.name,
        description: c.description,
        thumbnail: c.logo,
        type: "channel" as const,
        views: c.views || 0,
        rating: 0,
        year: 0,
        genres: c.tags || [],
        cast: [],
        director: "",
      })),
    ],
    [movies, series, liveTVs]
  );

  // Collect all genres for the genre dropdown.
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => (m.genres || []).forEach((g) => set.add(g)));
    series.forEach((s) => (s.genres || []).forEach((g) => set.add(g)));
    liveTVs.forEach((c) => (c.tags || []).forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [movies, series, liveTVs]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];

    const baseMatches = all.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        ...(item.genres || []),
        ...(item.cast || []),
        item.director || "",
        item.type,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    const filtered = baseMatches.filter((item) => {
      // Type filter
      if (filters.type !== "all" && item.type !== filters.type) return false;
      // Genre filter (channels use tags; movies/series use genres)
      if (filters.genre !== "all") {
        const genres = item.genres || [];
        if (!genres.includes(filters.genre)) return false;
      }
      // Year range (skip for channels — year 0)
      if (item.type !== "channel") {
        if (item.year && (item.year < filters.yearMin || item.year > filters.yearMax)) {
          return false;
        }
      }
      // Rating range (skip for channels — rating 0)
      if (item.type !== "channel") {
        if (item.rating < filters.ratingMin || item.rating > filters.ratingMax) {
          return false;
        }
      }
      return true;
    });

    // Sort
    const sorted = [...filtered];
    switch (filters.sort) {
      case "views":
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "rating":
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        // Use year desc (channels sink to bottom because year=0)
        sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case "relevance":
      default:
        // Keep term-match order; exact-title matches first.
        sorted.sort((a, b) => {
          const aExact = a.title.toLowerCase() === term ? 0 : 1;
          const bExact = b.title.toLowerCase() === term ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          return (b.views || 0) - (a.views || 0);
        });
        break;
    }
    return sorted;
  }, [all, q, filters]);

  // For preview rows when no search is active.
  const trendingItems = useMemo(
    () =>
      [...movies, ...series]
        .filter((i) => i.trending)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 20),
    [movies, series]
  );
  const popularItems = useMemo(
    () =>
      [...movies, ...series]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 20),
    [movies, series]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = input.trim();
    if (term) {
      setSearchParams({ q: term }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSuggestion = (term: string) => {
    setInput(term);
    setSearchParams({ q: term }, { replace: true });
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setInput("");
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.type !== "all") n++;
    if (filters.genre !== "all") n++;
    if (filters.yearMin !== DEFAULT_FILTERS.yearMin || filters.yearMax !== DEFAULT_FILTERS.yearMax) n++;
    if (filters.ratingMin !== DEFAULT_FILTERS.ratingMin || filters.ratingMax !== DEFAULT_FILTERS.ratingMax) n++;
    if (filters.sort !== "relevance") n++;
    return n;
  }, [filters]);

  // The filter panel JSX — shared between the inline collapsible + the mobile Sheet.
  const FilterPanel = (
    <div className="space-y-5">
      {/* Type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Type
        </Label>
        <Select
          value={filters.type}
          onValueChange={(v) => setFilters((f) => ({ ...f, type: v as ContentTypeFilter }))}
        >
          <SelectTrigger className="bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="movie">
              <span className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5" /> Movies
              </span>
            </SelectItem>
            <SelectItem value="series">
              <span className="flex items-center gap-2">
                <Tv className="w-3.5 h-3.5" /> Series
              </span>
            </SelectItem>
            <SelectItem value="channel">
              <span className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" /> Live channels
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Genre */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Genre
        </Label>
        <Select
          value={filters.genre}
          onValueChange={(v) => setFilters((f) => ({ ...f, genre: v }))}
        >
          <SelectTrigger className="bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground max-h-72">
            <SelectItem value="all">All genres</SelectItem>
            {allGenres.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year range */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Year range
          </Label>
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">
            {filters.yearMin} – {filters.yearMax}
          </span>
        </div>
        <Slider
          value={[filters.yearMin, filters.yearMax]}
          min={1950}
          max={new Date().getFullYear() + 1}
          step={1}
          onValueChange={(vals) =>
            setFilters((f) => ({
              ...f,
              yearMin: vals[0],
              yearMax: vals[1],
            }))
          }
        />
      </div>

      {/* Rating range */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
            <Star className="w-3 h-3" /> Rating range
          </Label>
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">
            {filters.ratingMin.toFixed(1)} – {filters.ratingMax.toFixed(1)}
          </span>
        </div>
        <Slider
          value={[filters.ratingMin, filters.ratingMax]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={(vals) =>
            setFilters((f) => ({
              ...f,
              ratingMin: vals[0],
              ratingMax: vals[1],
            }))
          }
        />
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Sort by
        </Label>
        <Select
          value={filters.sort}
          onValueChange={(v) => setFilters((f) => ({ ...f, sort: v as SortKey }))}
        >
          <SelectTrigger className="bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="views">Most viewed</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
            <SelectItem value="newest">Newest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={resetFilters}
        disabled={activeFilterCount === 0}
        className="w-full bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Reset filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </div>
  );

  return (
    <div className="pb-12">
      <PageHeader
        title="Search"
        subtitle="Find movies, TV shows, and live channels by title, genre, cast, or director"
        icon={<SearchIcon className="w-7 h-7" />}
      />

      {/* Search input */}
      <div className="px-4 sm:px-6 lg:px-12 mb-6">
        <form onSubmit={handleSubmit} className="relative max-w-3xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search for movies, series, genres, cast, channels…"
            className="h-14 pl-12 pr-44 text-base sm:text-lg bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-primary focus-visible:border-primary rounded-lg"
            aria-label="Search query"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {input && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={clearSearch}
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {/* Mobile filter sheet trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="lg:hidden bg-background border-border text-foreground hover:bg-accent relative"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-card border-border text-foreground w-[85vw] sm:w-96 overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    Filters
                  </SheetTitle>
                </SheetHeader>
                <div className="p-4">{FilterPanel}</div>
              </SheetContent>
            </Sheet>
            <Button
              type="submit"
              className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Search
            </Button>
          </div>
        </form>

        {/* Trending search chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Trending
          </span>
          {trendingSearchTerms.map((term) => (
            <button
              key={term}
              onClick={() => handleSuggestion(term)}
              className="px-3 py-1 rounded-full bg-muted border border-border text-xs text-foreground/85 hover:border-primary/60 hover:text-foreground transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <SkeletonGrid count={18} />
      ) : !q.trim() ? (
        <div className="space-y-8">
          {trendingItems.length > 0 && (
            <ContentRow
              title="Trending Now"
              icon={<Flame className="w-6 h-6 text-primary" />}
              items={trendingItems}
            />
          )}
          {popularItems.length > 0 && (
            <ContentRow
              title="Popular on FLIXNET"
              icon={<Sparkles className="w-6 h-6 text-primary" />}
              items={popularItems}
            />
          )}
          <div className="px-4 sm:px-6 lg:px-12 mt-8">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
              <Film className="w-4 h-4 text-primary" />
              <span>Search across {movies.length} movies</span>
              <span className="mx-2">•</span>
              <Tv className="w-4 h-4 text-primary" />
              <span>{series.length} series</span>
              <span className="mx-2">•</span>
              <Radio className="w-4 h-4 text-primary" />
              <span>{liveTVs.length} channels</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-12">
          {/* Desktop filter sidebar + results layout */}
          <div className="flex gap-6">
            {/* Desktop filter sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-4 rounded-lg border border-border bg-card p-4">
                <button
                  type="button"
                  onClick={() => setShowFilters((s) => !s)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </span>
                  {showFilters ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">{FilterPanel}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </aside>

            {/* Results */}
            <div className="flex-1 min-w-0">
              <div className="mb-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <SearchIcon className="w-4 h-4 text-primary" />
                  Found <span className="text-foreground font-semibold">{results.length}</span> result{results.length !== 1 ? "s" : ""} for{" "}
                  <span className="text-foreground font-semibold">&ldquo;{q}&rdquo;</span>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear filters
                  </Button>
                )}
              </div>
              {results.length === 0 ? (
                <EmptyState
                  icon={SearchIcon}
                  title="No results found"
                  description={`We couldn't find anything matching "${q}" with your current filters. Try a different keyword or reset the filters.`}
                  actionLabel="Browse Trending"
                  actionTo="/trending"
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <ContentGrid items={results.filter((r) => r.type !== "channel") as ContentItem[]} />
                  {/* Channels (separate grid since ContentGrid expects ContentItem) */}
                  {results.some((r) => r.type === "channel") && (
                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                        <Radio className="w-5 h-5 text-cyan-400" /> Live Channels
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {results
                          .filter((r) => r.type === "channel")
                          .map((c) => (
                            <div
                              key={c.id}
                              className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
                            >
                              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                                {c.thumbnail ? (
                                  <img
                                    src={c.thumbnail}
                                    alt={c.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <Radio className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                              <div className="p-2">
                                <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                                <p className="text-[10px] text-muted-foreground/70">
                                  {(c as ChannelRow).views || 0} views
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
