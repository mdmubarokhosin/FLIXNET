// Shared TypeScript types for the FLIXNET streaming platform
// Cleaned up — subscription/payment/monetization types removed

export type Role = "admin" | "user";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: Role;
  banned?: boolean;
  createdAt?: number;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  banner: string;
  videoURL: string;
  category: string; // category id
  genres: string[];
  year: number;
  rating: number; // 0-10
  duration: string; // e.g. "2h 15m"
  featured: boolean;
  trending: boolean;
  type: "movie";
  views: number;
  createdAt: number;
  trailerURL?: string;
  cast?: string[];
  director?: string;
  screenshots?: string[];
  subtitles?: { label: string; srclang: string; src: string }[];
}

export interface Series {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  banner: string;
  category: string;
  genres: string[];
  year: number;
  rating: number;
  duration: string;
  featured: boolean;
  trending: boolean;
  type: "series";
  views: number;
  createdAt: number;
  seasons: number;
  trailerURL?: string;
  cast?: string[];
  director?: string;
  screenshots?: string[];
}

export interface Episode {
  id: string;
  seriesId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnail: string;
  videoURL: string;
  duration: string;
  views: number;
  createdAt: number;
  subtitles?: { label: string; srclang: string; src: string }[];
}

export interface LiveTVChannel {
  id: string;
  name: string;
  description: string;
  logo: string;
  banner?: string;
  streamURL: string;
  category: string;
  tags: string[];
  language?: string;
  country?: string;
  live: boolean;
  featured: boolean;
  views: number;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: number;
}

export interface Settings {
  siteName: string;
  logo: string;
  primaryColor: string;
  backgroundColor: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  heroAutoplay: boolean;
  heroInterval: number;
  tmdbApiKey?: string;
}

export type ContentItem = Movie | Series;
