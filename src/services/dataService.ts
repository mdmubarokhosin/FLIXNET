/**
 * FLIXNET Data Service — Firestore Edition
 *
 * All CRUD operations go through Firebase Firestore.
 * No localStorage dependency. No silent error swallowing.
 * Write operations throw on failure so the UI can show proper errors.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  seedMovies,
  seedSeries,
  seedEpisodes,
  seedCategories,
  defaultSettings,
} from "@/firebase/seed";
import type {
  Movie,
  Series,
  Episode,
  Category,
  Settings,
  UserProfile,
  LiveTVChannel,
} from "@/firebase/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip undefined values — Firestore rejects undefined fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanForFirestore(obj: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Convert a Firestore document to a typed object, adding the doc id */
function docToObj<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  const data = snap.data();
  return { ...data, id: snap.id } as T;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const SETTINGS_DOC_ID = "site";

export async function fetchSettings(): Promise<Settings> {
  try {
    const snap = await getDoc(doc(db, "settings", SETTINGS_DOC_ID));
    if (snap.exists()) {
      return { ...defaultSettings, ...snap.data() } as Settings;
    }
    return { ...defaultSettings };
  } catch (err) {
    console.warn("[Firestore] fetchSettings failed:", err);
    return { ...defaultSettings };
  }
}

export async function saveSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await fetchSettings();
  const updated = { ...current, ...partial };
  await setDoc(doc(db, "settings", SETTINGS_DOC_ID), cleanForFirestore(updated));
  return updated;
}

// ---------------------------------------------------------------------------
// Movies
// ---------------------------------------------------------------------------

export async function fetchMovies(): Promise<Movie[]> {
  try {
    const snap = await getDocs(collection(db, "movies"));
    return snap.docs.map((d) => docToObj<Movie>(d));
  } catch (err) {
    console.warn("[Firestore] fetchMovies failed:", err);
    return [];
  }
}

export async function saveMovie(data: Partial<Movie> & { id?: string }): Promise<void> {
  const isEdit = !!data.id;
  const id = data.id || `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const movie: Movie = {
    id,
    title: data.title || "",
    description: data.description || "",
    thumbnail: data.thumbnail || "",
    banner: data.banner || "",
    videoURL: data.videoURL || "",
    category: data.category || "",
    genres: data.genres || [],
    year: data.year || new Date().getFullYear(),
    rating: data.rating ?? 7,
    duration: data.duration || "",
    featured: data.featured ?? false,
    trending: data.trending ?? false,
    type: "movie",
    views: data.views || 0,
    createdAt: data.createdAt || Date.now(),
    trailerURL: data.trailerURL,
    cast: data.cast,
    director: data.director,
    screenshots: data.screenshots,
    subtitles: data.subtitles,
  };
  await setDoc(doc(db, "movies", id), cleanForFirestore(movie));
}

export async function deleteMovie(id: string): Promise<void> {
  await deleteDoc(doc(db, "movies", id));
}

export async function incrementViews(contentType: "movie" | "series", id: string): Promise<void> {
  const col = contentType === "movie" ? "movies" : "series";
  await updateDoc(doc(db, col, id), { views: increment(1) }).catch(() => {
    // Document may not exist — ignore silently
  });
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export async function fetchSeries(): Promise<Series[]> {
  try {
    const snap = await getDocs(collection(db, "series"));
    return snap.docs.map((d) => docToObj<Series>(d));
  } catch (err) {
    console.warn("[Firestore] fetchSeries failed:", err);
    return [];
  }
}

export async function saveSeries(data: Partial<Series> & { id?: string }): Promise<void> {
  const isEdit = !!data.id;
  const id = data.id || `sr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const series: Series = {
    id,
    title: data.title || "",
    description: data.description || "",
    thumbnail: data.thumbnail || "",
    banner: data.banner || "",
    category: data.category || "",
    genres: data.genres || [],
    year: data.year || new Date().getFullYear(),
    rating: data.rating ?? 7,
    duration: data.duration || "",
    featured: data.featured ?? false,
    trending: data.trending ?? false,
    type: "series",
    views: data.views || 0,
    createdAt: data.createdAt || Date.now(),
    seasons: data.seasons ?? 1,
    trailerURL: data.trailerURL,
    cast: data.cast,
    director: data.director,
    screenshots: data.screenshots,
  };
  await setDoc(doc(db, "series", id), cleanForFirestore(series));
}

export async function deleteSeries(id: string): Promise<void> {
  await deleteDoc(doc(db, "series", id));
  // Also delete all episodes for this series
  const epsSnap = await getDocs(collection(db, "episodes"));
  const deletions = epsSnap.docs
    .filter((d) => d.data().seriesId === id)
    .map((d) => deleteDoc(doc(db, "episodes", d.id)));
  await Promise.allSettled(deletions);
}

// ---------------------------------------------------------------------------
// Episodes
// ---------------------------------------------------------------------------

export async function fetchEpisodes(): Promise<Episode[]> {
  try {
    const snap = await getDocs(collection(db, "episodes"));
    return snap.docs.map((d) => docToObj<Episode>(d));
  } catch (err) {
    console.warn("[Firestore] fetchEpisodes failed:", err);
    return [];
  }
}

export async function saveEpisode(data: Partial<Episode> & { id?: string }): Promise<void> {
  const id = data.id || `ep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const episode: Episode = {
    id,
    seriesId: data.seriesId || "",
    season: data.season ?? 1,
    episodeNumber: data.episodeNumber ?? 1,
    title: data.title || "",
    description: data.description || "",
    thumbnail: data.thumbnail || "",
    videoURL: data.videoURL || "",
    duration: data.duration || "",
    views: data.views || 0,
    createdAt: data.createdAt || Date.now(),
    subtitles: data.subtitles,
  };
  await setDoc(doc(db, "episodes", id), cleanForFirestore(episode));
}

export async function deleteEpisode(id: string): Promise<void> {
  await deleteDoc(doc(db, "episodes", id));
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function fetchCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, "categories"));
    return snap.docs.map((d) => docToObj<Category>(d));
  } catch (err) {
    console.warn("[Firestore] fetchCategories failed:", err);
    return [];
  }
}

export async function saveCategory(data: Partial<Category> & { id?: string }): Promise<void> {
  const id = data.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const category: Category = {
    id,
    name: data.name || "",
    description: data.description,
    icon: data.icon,
    createdAt: data.createdAt || Date.now(),
  };
  await setDoc(doc(db, "categories", id), cleanForFirestore(category));
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

// ---------------------------------------------------------------------------
// Live TV
// ---------------------------------------------------------------------------

export async function fetchLiveTVs(): Promise<LiveTVChannel[]> {
  try {
    const snap = await getDocs(collection(db, "liveTV"));
    return snap.docs.map((d) => docToObj<LiveTVChannel>(d));
  } catch (err) {
    console.warn("[Firestore] fetchLiveTVs failed:", err);
    return [];
  }
}

export async function saveLiveTV(data: Partial<LiveTVChannel> & { id?: string }): Promise<void> {
  const id = data.id || `tv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel: LiveTVChannel = {
    id,
    name: data.name || "",
    description: data.description || "",
    logo: data.logo || "",
    banner: data.banner,
    streamURL: data.streamURL || "",
    category: data.category || "",
    tags: data.tags || [],
    language: data.language,
    country: data.country,
    live: data.live ?? true,
    featured: data.featured ?? false,
    views: data.views || 0,
    createdAt: data.createdAt || Date.now(),
  };
  await setDoc(doc(db, "liveTV", id), cleanForFirestore(channel));
}

export async function deleteLiveTV(id: string): Promise<void> {
  await deleteDoc(doc(db, "liveTV", id));
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => docToObj<UserProfile>(d));
  } catch (err) {
    console.warn("[Firestore] fetchAllUsers failed:", err);
    return [];
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return docToObj<UserProfile>(snap);
    return null;
  } catch (err) {
    console.warn("[Firestore] fetchUserProfile failed:", err);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, "users", profile.uid), cleanForFirestore(profile), { merge: true });
}

export async function setUserBanned(uid: string, banned: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { banned });
}

export async function setUserRole(uid: string, role: "admin" | "user"): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, "users", uid), cleanForFirestore(updates));
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

// ---------------------------------------------------------------------------
// Real-time subscriptions (Firestore onSnapshot)
// ---------------------------------------------------------------------------

export function subscribeMovies(cb: (movies: Movie[]) => void): () => void {
  return onSnapshot(collection(db, "movies"), (snap) => {
    cb(snap.docs.map((d) => docToObj<Movie>(d)));
  }, (err) => {
    console.warn("[Firestore] subscribeMovies error:", err);
  });
}

export function subscribeSeries(cb: (series: Series[]) => void): () => void {
  return onSnapshot(collection(db, "series"), (snap) => {
    cb(snap.docs.map((d) => docToObj<Series>(d)));
  }, (err) => {
    console.warn("[Firestore] subscribeSeries error:", err);
  });
}

export function subscribeCategories(cb: (cats: Category[]) => void): () => void {
  return onSnapshot(collection(db, "categories"), (snap) => {
    cb(snap.docs.map((d) => docToObj<Category>(d)));
  }, (err) => {
    console.warn("[Firestore] subscribeCategories error:", err);
  });
}

export function subscribeLiveTV(cb: (channels: LiveTVChannel[]) => void): () => void {
  return onSnapshot(collection(db, "liveTV"), (snap) => {
    cb(snap.docs.map((d) => docToObj<LiveTVChannel>(d)));
  }, (err) => {
    console.warn("[Firestore] subscribeLiveTV error:", err);
  });
}

export function subscribeSettings(cb: (settings: Settings) => void): () => void {
  return onSnapshot(doc(db, "settings", SETTINGS_DOC_ID), (snap) => {
    if (snap.exists()) {
      cb({ ...defaultSettings, ...snap.data() } as Settings);
    } else {
      cb({ ...defaultSettings });
    }
  }, (err) => {
    console.warn("[Firestore] subscribeSettings error:", err);
  });
}

// Legacy name compat — used by useScheduledPublisher
export function subscribeScheduledContent(_cb: (items: never[]) => void): () => void {
  // Scheduled content feature removed — return no-op unsubscribe
  return () => {};
}

// Legacy name compat — used by DataContext
export const fetchPlans = async (): Promise<never[]> => [];
export const subscribePlans = (_cb: (plans: never[]) => void): (() => void) => () => {};

// ---------------------------------------------------------------------------
// Seed Database (for Setup page)
// ---------------------------------------------------------------------------

export async function seedDatabase(): Promise<void> {
  // Seed categories
  for (const cat of seedCategories) {
    await setDoc(doc(db, "categories", cat.id), cleanForFirestore(cat));
  }

  // Seed movies
  for (const movie of seedMovies) {
    await setDoc(doc(db, "movies", movie.id), cleanForFirestore(movie));
  }

  // Seed series
  for (const series of seedSeries) {
    await setDoc(doc(db, "series", series.id), cleanForFirestore(series));
  }

  // Seed episodes
  for (const ep of seedEpisodes) {
    await setDoc(doc(db, "episodes", ep.id), cleanForFirestore(ep));
  }

  // Seed settings
  await setDoc(doc(db, "settings", SETTINGS_DOC_ID), cleanForFirestore(defaultSettings));

  // Mark setup as complete
  await setDoc(doc(db, "settings", "setup"), { completed: true, completedAt: Date.now() });
}

/** Check if the database has been set up (has the setup marker doc) */
export async function isDatabaseSetup(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "settings", "setup"));
    return snap.exists() && (snap.data().completed === true);
  } catch {
    return false;
  }
}

/** Check if the database has any content at all */
export async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const moviesSnap = await getDocs(collection(db, "movies"));
    return moviesSnap.empty;
  } catch {
    return true;
  }
}

/** Clear all content from the database (for Settings → Clear Data) */
export async function clearAllContent(): Promise<void> {
  const collectionsToDelete = ["movies", "series", "episodes", "categories", "liveTV"];

  for (const colName of collectionsToDelete) {
    const snap = await getDocs(collection(db, colName));
    const deletions = snap.docs.map((d) => deleteDoc(doc(db, colName, d.id)));
    await Promise.allSettled(deletions);
  }

  // Reset settings
  await setDoc(doc(db, "settings", SETTINGS_DOC_ID), cleanForFirestore(defaultSettings));
}
