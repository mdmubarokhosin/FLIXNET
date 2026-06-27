"use client";
import { useMemo, useState } from "react";
import { Film, Filter, X, Sparkles } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import ContentGrid from "@/components/shared/ContentGrid";
import SkeletonGrid from "@/components/shared/SkeletonGrid";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Movie } from "@/firebase/types";

type SortKey = "popular" | "rating" | "newest";

const sortLabels: Record<SortKey, string> = {
  popular: "Popular",
  rating: "Top Rated",
  newest: "Newest",
};

export default function MoviesPage() {
  const { movies, categories, loading } = useData();
  const [category, setCategory] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("popular");

  const genres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m: Movie) => m.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [movies]);

  const years = useMemo(() => {
    const set = new Set<number>();
    movies.forEach((m: Movie) => set.add(m.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [movies]);

  const filtered = useMemo(() => {
    let list = movies.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (genre !== "all" && !m.genres?.includes(genre)) return false;
      if (year !== "all" && m.year !== Number(year)) return false;
      return true;
    });
    if (sort === "popular") list = [...list].sort((a, b) => b.views - a.views);
    else if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [movies, category, genre, year, sort]);

  const hasFilters = category !== "all" || genre !== "all" || year !== "all" || sort !== "popular";

  const reset = () => {
    setCategory("all");
    setGenre("all");
    setYear("all");
    setSort("popular");
  };

  return (
    <div className="pb-12">
      <PageHeader
        title="Movies"
        subtitle={`Browse our collection of ${movies.length} movies`}
        icon={<Film className="w-7 h-7" />}
      />

      {/* Filter bar */}
      <div className="px-4 sm:px-6 lg:px-12 mb-6">
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Refine</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Category */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px] sm:w-[180px] bg-background border-border text-foreground">
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

            {/* Genre */}
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-[140px] sm:w-[170px] bg-background border-border text-foreground">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground max-h-72">
                <SelectItem value="all" className="focus:bg-accent">All Genres</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g} value={g} className="focus:bg-accent">
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year */}
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[110px] sm:w-[130px] bg-background border-border text-foreground">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground max-h-72">
                <SelectItem value="all" className="focus:bg-accent">All Years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="focus:bg-accent">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
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
      <div className="px-4 sm:px-6 lg:px-12 mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        Showing <span className="text-foreground font-semibold">{filtered.length}</span> movie{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonGrid count={18} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No movies match your filters</h3>
          <p className="text-muted-foreground text-sm max-w-md mb-6">
            Try removing some filters or browsing a different category.
          </p>
          <Button
            onClick={reset}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <X className="w-4 h-4 mr-2" /> Reset Filters
          </Button>
        </div>
      ) : (
        <ContentGrid items={filtered} />
      )}
    </div>
  );
}
