"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Movie, Series, Episode, Category, LiveTVChannel } from "@/firebase/types";
import {
  fetchMovies,
  fetchSeries,
  fetchEpisodes,
  fetchCategories,
  fetchLiveTVs,
  subscribeMovies,
  subscribeSeries,
  subscribeCategories,
  subscribeLiveTV,
} from "@/services/dataService";

interface DataContextValue {
  movies: Movie[];
  series: Series[];
  episodes: Episode[];
  categories: Category[];
  liveTVs: LiveTVChannel[];
  loading: boolean;
  refresh: () => Promise<void>;
  getMovieById: (id: string) => Movie | undefined;
  getSeriesById: (id: string) => Series | undefined;
  getEpisodesBySeries: (seriesId: string) => Episode[];
  getCategoryById: (id: string) => Category | undefined;
  getLiveTVById: (id: string) => LiveTVChannel | undefined;
}

// Safe default value for SSR — prevents build errors during static export
const defaultContext: DataContextValue = {
  movies: [],
  series: [],
  episodes: [],
  categories: [],
  liveTVs: [],
  loading: true,
  refresh: async () => {},
  getMovieById: () => undefined,
  getSeriesById: () => undefined,
  getEpisodesBySeries: () => [],
  getCategoryById: () => undefined,
  getLiveTVById: () => undefined,
};

const DataContext = createContext<DataContextValue>(defaultContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liveTVs, setLiveTVs] = useState<LiveTVChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [m, s, e, c, tv] = await Promise.all([
      fetchMovies(),
      fetchSeries(),
      fetchEpisodes(),
      fetchCategories(),
      fetchLiveTVs(),
    ]);
    setMovies(m);
    setSeries(s);
    setEpisodes(e);
    setCategories(c);
    setLiveTVs(tv);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const unsubM = subscribeMovies(setMovies);
    const unsubS = subscribeSeries(setSeries);
    const unsubC = subscribeCategories(setCategories);
    const unsubTV = subscribeLiveTV(setLiveTVs);
    return () => {
      unsubM();
      unsubS();
      unsubC();
      unsubTV();
    };
  }, [refresh]);

  const getMovieById = useCallback((id: string) => movies.find((m) => m.id === id), [movies]);
  const getSeriesById = useCallback((id: string) => series.find((s) => s.id === id), [series]);
  const getEpisodesBySeries = useCallback(
    (seriesId: string) =>
      episodes
        .filter((e) => e.seriesId === seriesId)
        .sort((a, b) => a.season - b.season || a.episodeNumber - b.episodeNumber),
    [episodes]
  );
  const getCategoryById = useCallback((id: string) => categories.find((c) => c.id === id), [categories]);
  const getLiveTVById = useCallback((id: string) => liveTVs.find((c) => c.id === id), [liveTVs]);

  return (
    <DataContext.Provider
      value={{
        movies,
        series,
        episodes,
        categories,
        liveTVs,
        loading,
        refresh,
        getMovieById,
        getSeriesById,
        getEpisodesBySeries,
        getCategoryById,
        getLiveTVById,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
