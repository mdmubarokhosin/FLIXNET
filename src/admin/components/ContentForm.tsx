"use client";
import * as React from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Download,
  Clapperboard,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Movie, Series, Category } from "@/firebase/types";
import {
  MediaUploadField,
  GenresInput,
} from "@/admin/components/AdminShared";
import {
  fetchFromTMDB,
  searchTMDB,
  type TmdbSearchResult,
} from "@/services/tmdbService";

export interface MovieFormValues {
  title: string;
  description: string;
  thumbnail: string;
  banner: string;
  videoURL: string;
  category: string;
  genres: string[];
  year: number;
  rating: number;
  duration: string;
  featured: boolean;
  trending: boolean;
  trailerURL: string;
  cast: string; // comma separated in form
  director: string;
  screenshots: string; // newline separated image URLs in form
}

export interface SeriesFormValues extends MovieFormValues {
  seasons: number;
}

const inputCls =
  "bg-background border-border text-foreground placeholder:text-muted-foreground/70";

// Use a union type instead of intersection to avoid `never` type
type ContentInitial = Partial<Omit<Movie, "type"> & Omit<Series, "type">> & {
  type?: "movie" | "series";
  seasons?: number;
};

interface ContentFormProps {
  mode: "create" | "edit";
  kind: "movie" | "series";
  initial?: ContentInitial;
  categories: Category[];
  onSubmit: (values: MovieFormValues | SeriesFormValues) => Promise<void>;
  onCancel: () => void;
  onUploadThumbnail?: (file: File, onProgress: (p: number) => void) => Promise<string>;
  onUploadBanner?: (file: File, onProgress: (p: number) => void) => Promise<string>;
  onUploadVideo?: (file: File, onProgress: (p: number) => void) => Promise<string>;
  tmdbApiKey?: string;
}

export function ContentForm({
  mode,
  kind,
  initial,
  categories,
  onSubmit,
  onCancel,
  tmdbApiKey,
}: ContentFormProps) {
  const isSeries = kind === "series";
  const defaultValues: SeriesFormValues = {
    title: initial?.title || "",
    description: initial?.description || "",
    thumbnail: initial?.thumbnail || "",
    banner: initial?.banner || "",
    videoURL: initial?.videoURL || "",
    category: initial?.category || categories[0]?.id || "",
    genres: initial?.genres || [],
    year: initial?.year || new Date().getFullYear(),
    rating: initial?.rating ?? 7,
    duration: initial?.duration || "",
    featured: initial?.featured ?? false,
    trending: initial?.trending ?? false,
    trailerURL: initial?.trailerURL || "",
    cast: (initial?.cast || []).join(", "),
    director: initial?.director || "",
    screenshots: (initial?.screenshots || []).join("\n"),
    seasons: initial?.seasons ?? 1,
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SeriesFormValues>({
    defaultValues,
  });

  React.useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id, reset]);

  const liveThumbnail = useWatch({ control, name: "thumbnail" }) ?? "";
  const liveBanner = useWatch({ control, name: "banner" }) ?? "";
  const liveVideoURL = useWatch({ control, name: "videoURL" }) ?? "";

  // ---- TMDB auto-fill state ----
  const [tmdbIdInput, setTmdbIdInput] = React.useState("");
  const [fetchingTmdb, setFetchingTmdb] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<TmdbSearchResult[]>(
    []
  );

  const defaultsRef = React.useRef(defaultValues);
  React.useEffect(() => {
    defaultsRef.current = defaultValues;
  });

  const doFetch = React.useCallback(
    async (id: number) => {
      if (!tmdbApiKey) {
        toast.error("TMDB API key missing", {
          description:
            "Set the TMDB API key in Admin → Settings → TMDB Integration first.",
        });
        return;
      }
      setFetchingTmdb(true);
      try {
        const result = await fetchFromTMDB(tmdbApiKey, id, kind);
        if (!result) {
          toast.error("TMDB fetch failed", {
            description: `Could not load ${kind} with ID ${id}. Check the ID and API key, then try again.`,
          });
          return;
        }
        const merged: SeriesFormValues = {
          ...defaultsRef.current,
          title: result.title || defaultsRef.current.title,
          description:
            result.description || defaultsRef.current.description,
          thumbnail: result.thumbnail || defaultsRef.current.thumbnail,
          banner: result.banner || defaultsRef.current.banner,
          year: Number(result.year) || defaultsRef.current.year,
          rating: Number(result.rating) || defaultsRef.current.rating,
          genres: Array.isArray(result.genres) ? result.genres : [],
          cast: (result.cast || []).join(", "),
          director: result.director || defaultsRef.current.director,
          duration: result.duration || defaultsRef.current.duration,
          trailerURL: result.trailerURL || defaultsRef.current.trailerURL,
        };
        reset(merged);
        toast.success("Auto-filled from TMDB", {
          description: `${result.title || "Content"} loaded successfully.`,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unexpected error fetching TMDB";
        toast.error("TMDB fetch failed", { description: msg });
      } finally {
        setFetchingTmdb(false);
      }
    },
    [kind, reset, tmdbApiKey]
  );

  const onFetchClick = React.useCallback(() => {
    const id = parseInt(tmdbIdInput, 10);
    if (!tmdbIdInput || isNaN(id) || id <= 0) {
      toast.error("Enter a valid TMDB ID", {
        description: "TMDB ID must be a positive number (e.g. 27205).",
      });
      return;
    }
    void doFetch(id);
  }, [doFetch, tmdbIdInput]);

  const onRunSearch = React.useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    if (!tmdbApiKey) {
      toast.error("TMDB API key missing", {
        description:
          "Set the TMDB API key in Admin → Settings → TMDB Integration first.",
      });
      return;
    }
    setSearching(true);
    try {
      const results = await searchTMDB(tmdbApiKey, q, kind);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info("No results", {
          description: `No ${kind} matches "${q}" on TMDB.`,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Search failed";
      toast.error("TMDB search failed", { description: msg });
    } finally {
      setSearching(false);
    }
  }, [kind, searchQuery, tmdbApiKey]);

  const onPickResult = React.useCallback(
    (r: TmdbSearchResult) => {
      setTmdbIdInput(String(r.id));
      setShowSearch(false);
      setSearchResults([]);
      setSearchQuery("");
      void doFetch(r.id);
    },
    [doFetch]
  );

  const submit = handleSubmit(async (vals) => {
    await onSubmit(vals);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <Clapperboard className="w-4 h-4 text-primary" />
                Auto-fill from TMDB
              </Label>
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                Get API key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a TMDB ID for this {kind} and click Fetch to auto-fill all
              metadata fields below.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={tmdbIdInput}
                onChange={(e) => setTmdbIdInput(e.target.value)}
                placeholder="e.g. 27205"
                className={`${inputCls} flex-1 min-w-0`}
                aria-label="TMDB ID"
              />
              <Button
                type="button"
                size="sm"
                onClick={onFetchClick}
                disabled={fetchingTmdb}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {fetchingTmdb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Fetch
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowSearch((s) => !s)}
                className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
              >
                <Search className="w-4 h-4" />
                Search by title
              </Button>
            </div>

            {showSearch && (
              <div className="rounded-md border border-border bg-background p-3 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onRunSearch();
                      }
                    }}
                    placeholder={`Search TMDB for a ${kind} title…`}
                    className={`${inputCls} flex-1 min-w-0`}
                    aria-label="TMDB search query"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={onRunSearch}
                    disabled={searching}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto rounded-md border border-border divide-y divide-border">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onPickResult(r)}
                        className="flex w-full items-start gap-3 p-2 text-left hover:bg-accent transition-colors"
                      >
                        {r.poster ? (
                          <img
                            src={r.poster}
                            alt={r.title}
                            className="w-10 h-14 rounded shrink-0 object-cover bg-muted"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-14 rounded shrink-0 bg-muted flex items-center justify-center">
                            <Clapperboard className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {r.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            TMDB ID: {r.id}
                            {r.year ? ` · ${r.year}` : ""}
                          </p>
                          {r.overview && (
                            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 mt-0.5">
                              {r.overview}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Title <span className="text-primary">*</span>
            </Label>
            <Input
              {...register("title", { required: "Title is required" })}
              placeholder="e.g. Shadow Protocol"
              className={inputCls}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Description</Label>
            <Textarea
              {...register("description")}
              placeholder="Short synopsis…"
              rows={3}
              className={`${inputCls} resize-y`}
            />
          </div>

          {/* Media — link-based */}
          <MediaUploadField
            label="Thumbnail URL"
            url={liveThumbnail}
            onUrlChange={(url) =>
              reset((prev) => ({ ...prev, thumbnail: url }) as SeriesFormValues)
            }
            hint="portrait 500×750"
          />
          <MediaUploadField
            label="Banner URL"
            url={liveBanner}
            onUrlChange={(url) =>
              reset((prev) => ({ ...prev, banner: url }) as SeriesFormValues)
            }
            hint="landscape 1280×720"
          />
          <MediaUploadField
            label="Video URL"
            url={liveVideoURL}
            onUrlChange={(url) =>
              reset((prev) => ({ ...prev, videoURL: url }) as SeriesFormValues)
            }
            preview="video"
            hint="mp4 / webm direct link OR embed page"
          />

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={`w-full ${inputCls}`}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Genres */}
          <Controller
            control={control}
            name="genres"
            render={({ field }) => (
              <GenresInput value={field.value} onChange={field.onChange} />
            )}
          />

          {/* Year / Rating / Duration */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Year</Label>
              <Input
                type="number"
                {...register("year", {
                  valueAsNumber: true,
                  min: 1900,
                  max: 2100,
                })}
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Rating (0-10)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                {...register("rating", { valueAsNumber: true })}
                className={inputCls}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label className="text-muted-foreground">Duration</Label>
              <Input
                {...register("duration")}
                placeholder="2h 15m or 45m"
                className={inputCls}
              />
            </div>
          </div>

          {/* Series-specific: seasons */}
          {isSeries && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Seasons</Label>
              <Input
                type="number"
                min="1"
                {...register("seasons", { valueAsNumber: true })}
                className={inputCls}
              />
            </div>
          )}

          {/* Trailer URL */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Trailer URL</Label>
            <Input
              {...register("trailerURL")}
              placeholder="https://youtube.com/…"
              className={inputCls}
            />
          </div>

          {/* Cast / Director */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Cast (comma separated)</Label>
              <Input
                {...register("cast")}
                placeholder="Jordan Blake, Maya Chen"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Director</Label>
              <Input
                {...register("director")}
                placeholder="Director name"
                className={inputCls}
              />
            </div>
          </div>

          {/* Screenshots gallery */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Screenshots (one URL per line)</Label>
            <Textarea
              {...register("screenshots")}
              rows={3}
              placeholder={"https://example.com/shot1.jpg\nhttps://example.com/shot2.jpg"}
              className={`${inputCls} resize-y text-sm font-mono`}
            />
            <p className="text-[10px] text-muted-foreground/70">
              Still images shown in the screenshots gallery on the details page.
            </p>
          </div>

          {/* Switches */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Controller
              control={control}
              name="featured"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2.5 cursor-pointer">
                  <span className="text-sm text-muted-foreground">Featured</span>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </label>
              )}
            />
            <Controller
              control={control}
              name="trending"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2.5 cursor-pointer">
                  <span className="text-sm text-muted-foreground">Trending</span>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </label>
              )}
            />
          </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "create" ? "Create" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
