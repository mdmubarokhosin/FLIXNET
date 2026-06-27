"use client";
// TMDB (The Movie Database) API integration service
// Docs: https://developer.themoviedb.org/docs
// All functions are defensive (try/catch, return null/[] on error, log warnings).

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_POSTER = "https://image.tmdb.org/t/p/w500";
const IMG_BACKDROP = "https://image.tmdb.org/t/p/w1280";

export interface TmdbResult {
  title: string;
  description: string;
  thumbnail: string; // poster URL (w500)
  banner: string; // backdrop URL (w1280 or original)
  year: number;
  rating: number; // 0-10
  genres: string[]; // genre names
  cast: string[]; // top 5-8 cast member names
  director: string; // director name (movie) or creator name (tv)
  duration: string; // "2h 15m" for movie, "45m" per episode for tv
  trailerURL: string; // YouTube URL from videos
  tmdbId: number;
  posterPath?: string;
  backdropPath?: string;
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  year: number;
  poster: string;
  overview: string;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbCastMember {
  name: string;
}

interface TmdbCrewMember {
  job: string;
  name: string;
}

interface TmdbVideo {
  key: string;
  site: string;
  type: string;
}

interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  genres: TmdbGenre[];
  credits?: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
  videos?: {
    results: TmdbVideo[];
  };
}

interface TmdbTvDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  episode_run_time: number[];
  genres: TmdbGenre[];
  created_by: { name: string }[];
  credits?: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
  videos?: {
    results: TmdbVideo[];
  };
}

interface TmdbSearchResponse {
  page: number;
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    overview: string;
    release_date?: string;
    first_air_date?: string;
  }>;
  total_pages: number;
  total_results: number;
}

/** Format a runtime (minutes) as "2h 15m" / "45m" / "" */
function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0 || !isFinite(minutes)) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Extract year (as number) from a "YYYY-MM-DD" style date string. */
function yearFromDate(dateStr: string | undefined | null): number {
  if (!dateStr || typeof dateStr !== "string" || dateStr.length < 4) return 0;
  const y = parseInt(dateStr.slice(0, 4), 10);
  return isFinite(y) ? y : 0;
}

/** Find the best YouTube trailer URL from a TMDB videos array. */
function pickTrailerUrl(videos: TmdbVideo[] | undefined): string {
  if (!videos || !Array.isArray(videos)) return "";
  const yt = videos.filter((v) => v.site === "YouTube");
  const trailer = yt.find((v) => v.type === "Trailer") || yt[0];
  if (trailer && trailer.key) {
    return `https://www.youtube.com/watch?v=${trailer.key}`;
  }
  return "";
}

/**
 * Fetch a movie or TV show from TMDB by its ID.
 * Returns null on any error (bad key, not found, network, etc.).
 */
export async function fetchFromTMDB(
  apiKey: string,
  tmdbId: number,
  kind: "movie" | "series"
): Promise<TmdbResult | null> {
  if (!apiKey) {
    console.warn("[tmdbService] fetchFromTMDB: missing API key");
    return null;
  }
  if (!tmdbId || tmdbId <= 0) {
    console.warn("[tmdbService] fetchFromTMDB: invalid tmdbId", tmdbId);
    return null;
  }

  const endpoint =
    kind === "movie"
      ? `${TMDB_BASE}/movie/${encodeURIComponent(tmdbId)}`
      : `${TMDB_BASE}/tv/${encodeURIComponent(tmdbId)}`;
  const url = `${endpoint}?api_key=${encodeURIComponent(
    apiKey
  )}&append_to_response=videos,credits`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(
        `[tmdbService] fetchFromTMDB: HTTP ${res.status} ${res.statusText} for ${kind} id=${tmdbId}`
      );
      return null;
    }
    const data = (await res.json()) as TmdbMovieDetail & TmdbTvDetail;

    const isMovie = kind === "movie";
    const title = isMovie ? data.title || "" : data.name || "";
    const description = data.overview || "";
    const posterPath = data.poster_path || "";
    const backdropPath = data.backdrop_path || "";
    const thumbnail = posterPath ? `${IMG_POSTER}${posterPath}` : "";
    const banner = backdropPath
      ? `${IMG_BACKDROP}${backdropPath}`
      : posterPath
      ? `${IMG_BACKDROP}${posterPath}`
      : "";
    const year = isMovie
      ? yearFromDate(data.release_date)
      : yearFromDate(data.first_air_date);
    const rating = typeof data.vote_average === "number" ? data.vote_average : 0;
    const genres = Array.isArray(data.genres)
      ? data.genres.map((g) => g.name).filter(Boolean)
      : [];

    // Cast — top 8 names
    const cast: string[] = Array.isArray(data.credits?.cast)
      ? data.credits!.cast.slice(0, 8).map((c) => c.name).filter(Boolean)
      : [];

    // Director / Creator
    let director = "";
    if (isMovie) {
      const dir = Array.isArray(data.credits?.crew)
        ? data.credits!.crew.find((c) => c.job === "Director")
        : undefined;
      director = dir?.name || "";
    } else {
      // TV: prefer created_by (joined), fallback to crew Director/Creator
      const creators = Array.isArray(data.created_by)
        ? data.created_by.map((c) => c.name).filter(Boolean)
        : [];
      if (creators.length > 0) {
        director = creators.join(", ");
      } else if (Array.isArray(data.credits?.crew)) {
        const dir =
          data.credits!.crew.find((c) => c.job === "Creator") ||
          data.credits!.crew.find((c) => c.job === "Director");
        director = dir?.name || "";
      }
    }

    // Duration
    let duration = "";
    if (isMovie) {
      duration = formatRuntime(data.runtime);
    } else {
      const epRun = Array.isArray(data.episode_run_time)
        ? data.episode_run_time[0]
        : undefined;
      duration = formatRuntime(epRun);
    }

    const trailerURL = pickTrailerUrl(data.videos?.results);

    return {
      title,
      description,
      thumbnail,
      banner,
      year,
      rating,
      genres,
      cast,
      director,
      duration,
      trailerURL,
      tmdbId: data.id,
      posterPath: posterPath || undefined,
      backdropPath: backdropPath || undefined,
    };
  } catch (err) {
    console.warn(
      `[tmdbService] fetchFromTMDB: network/parse error for ${kind} id=${tmdbId}`,
      err
    );
    return null;
  }
}

/**
 * Search TMDB for movies or TV shows by title.
 * Returns an array (possibly empty) of {id, title, year, poster, overview}.
 */
export async function searchTMDB(
  apiKey: string,
  query: string,
  kind: "movie" | "series"
): Promise<TmdbSearchResult[]> {
  if (!apiKey) {
    console.warn("[tmdbService] searchTMDB: missing API key");
    return [];
  }
  const q = (query || "").trim();
  if (!q) return [];

  const endpoint =
    kind === "movie" ? `${TMDB_BASE}/search/movie` : `${TMDB_BASE}/search/tv`;
  const url = `${endpoint}?api_key=${encodeURIComponent(
    apiKey
  )}&query=${encodeURIComponent(q)}&include_adult=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(
        `[tmdbService] searchTMDB: HTTP ${res.status} ${res.statusText} for query="${q}"`
      );
      return [];
    }
    const data = (await res.json()) as TmdbSearchResponse;
    if (!data || !Array.isArray(data.results)) return [];

    return data.results
      .filter((r) => r && (r.title || r.name))
      .map((r) => {
        const title = r.title || r.name || "";
        const dateStr = r.release_date || r.first_air_date;
        return {
          id: r.id,
          title,
          year: yearFromDate(dateStr),
          poster: r.poster_path ? `${IMG_POSTER}${r.poster_path}` : "",
          overview: r.overview || "",
        };
      });
  } catch (err) {
    console.warn(
      `[tmdbService] searchTMDB: network/parse error for query="${q}"`,
      err
    );
    return [];
  }
}
