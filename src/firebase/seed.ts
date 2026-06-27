import type { Movie, Series, Episode, Category, Settings } from "@/firebase/types";

// Public sample videos (Google sample bucket) + high-quality royalty-free posters via picsum
const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

function img(seed: string, w = 500, h = 750) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}
function banner(seed: string) {
  return `https://picsum.photos/seed/${seed}/1280/720`;
}

export const seedCategories: Category[] = [
  { id: "cat-action", name: "Action", icon: "Flame", description: "High-octane thrills", createdAt: Date.now() },
  { id: "cat-drama", name: "Drama", icon: "Drama", description: "Compelling stories", createdAt: Date.now() },
  { id: "cat-comedy", name: "Comedy", icon: "Laugh", description: "Laugh out loud", createdAt: Date.now() },
  { id: "cat-scifi", name: "Sci-Fi", icon: "Rocket", description: "Beyond the stars", createdAt: Date.now() },
  { id: "cat-horror", name: "Horror", icon: "Ghost", description: "Sleep with the lights on", createdAt: Date.now() },
  { id: "cat-romance", name: "Romance", icon: "Heart", description: "Matters of the heart", createdAt: Date.now() },
  { id: "cat-thriller", name: "Thriller", icon: "Zap", description: "Edge of your seat", createdAt: Date.now() },
  { id: "cat-documentary", name: "Documentary", icon: "BookOpen", description: "True stories", createdAt: Date.now() },
];

const titles = [
  "Shadow Protocol", "Crimson Tide Rising", "Neon Horizon", "The Last Frontier", "Echoes of Tomorrow",
  "Midnight Reverie", "Quantum Paradox", "Velvet Thunder", "Silent Empire", "Forsaken Realm",
  "Crimson Skyline", "Phantom Pursuit", "Eternal Vigil", "Broken Compass", "Hollow Crown",
  "Wild Horizon", "Frozen Empire", "Dark Horizon", "Lost Civilization", "Rising Storm",
  "Iron Resolve", "Silent Witness", "Burning Bridges", "Final Reckoning", "Hidden Truth",
  "Scarlet Letter", "Golden Hour", "Silver Lining", "Bronze Age", "Obsidian Night",
];

const descriptions = [
  "A gripping tale of courage and sacrifice that will keep you on the edge of your seat from start to finish.",
  "When the world faces its darkest hour, an unlikely hero emerges to challenge destiny itself.",
  "An emotional journey through love, loss, and the unbreakable bonds that define who we are.",
  "In a future where reality bends, one discovery changes everything we thought we knew.",
  "A masterful blend of action and intrigue set against a breathtaking visual landscape.",
  "Sometimes the most dangerous secrets are the ones we keep from ourselves.",
  "A heart-pounding adventure that redefines the meaning of survival against all odds.",
  "Two worlds collide in this sweeping epic of power, passion, and betrayal.",
];

const genresPool = ["Action", "Drama", "Thriller", "Sci-Fi", "Romance", "Comedy", "Horror", "Adventure", "Crime", "Mystery"];
const castPool = ["Jordan Blake", "Maya Chen", "Liam Foster", "Aria Khan", "Noah Reed", "Sofia Martinez", "Ethan Cole", "Zara Ali", "Lucas Wright", "Ivy Stone"];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }
function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[(seed + i * 3) % arr.length]);
  return Array.from(new Set(out));
}

const now = Date.now();

export const seedMovies: Movie[] = titles.slice(0, 20).map((title, i) => {
  const cat = seedCategories[i % seedCategories.length];
  return {
    id: `mv-${i + 1}`,
    title,
    description: pick(descriptions, i),
    thumbnail: img(`movie-${i}`),
    banner: banner(`movie-banner-${i}`),
    videoURL: pick(SAMPLE_VIDEOS, i),
    category: cat.id,
    genres: pickN(genresPool, 3, i),
    year: 2018 + (i % 7),
    rating: Math.round((6 + (i % 4) + 0.3) * 10) / 10,
    duration: `${1 + (i % 2)}h ${(10 + (i % 50)).toString().padStart(2, "0")}m`,
    featured: i < 5,
    trending: i % 3 === 0,
    type: "movie",
    views: 10000 + i * 1357 + (i % 7) * 421,
    createdAt: now - i * 86400000,
    trailerURL: pick(SAMPLE_VIDEOS, i + 2),
    cast: pickN(castPool, 3, i),
    director: pick(castPool, i + 5),
    screenshots: [
      img(`movie-shot-${i}-1`, 640, 360),
      img(`movie-shot-${i}-2`, 640, 360),
      img(`movie-shot-${i}-3`, 640, 360),
      img(`movie-shot-${i}-4`, 640, 360),
    ],
    subtitles: [
      { label: "English", srclang: "en", src: "" },
      { label: "Spanish", srclang: "es", src: "" },
    ],
  };
});

export const seedSeries: Series[] = titles.slice(10, 26).map((title, i) => {
  const cat = seedCategories[(i + 2) % seedCategories.length];
  const realIndex = i + 10;
  return {
    id: `sr-${i + 1}`,
    title,
    description: pick(descriptions, i + 2),
    thumbnail: img(`series-${i}`),
    banner: banner(`series-banner-${i}`),
    category: cat.id,
    genres: pickN(genresPool, 3, i + 1),
    year: 2019 + (i % 5),
    rating: Math.round((6.5 + (i % 4) + 0.2) * 10) / 10,
    duration: `${40 + (i % 20)}m`,
    featured: i < 4,
    trending: i % 2 === 0,
    type: "series",
    views: 8000 + i * 2310 + (i % 5) * 333,
    createdAt: now - realIndex * 86400000,
    seasons: 1 + (i % 4),
    trailerURL: pick(SAMPLE_VIDEOS, i + 4),
    cast: pickN(castPool, 4, i + 2),
    director: pick(castPool, i + 7),
    screenshots: [
      img(`series-shot-${i}-1`, 640, 360),
      img(`series-shot-${i}-2`, 640, 360),
      img(`series-shot-${i}-3`, 640, 360),
      img(`series-shot-${i}-4`, 640, 360),
    ],
  };
});

export const seedEpisodes: Episode[] = [];
seedSeries.forEach((s) => {
  const epsPerSeason = 6;
  for (let season = 1; season <= s.seasons; season++) {
    for (let ep = 1; ep <= epsPerSeason; ep++) {
      const idx = (parseInt(s.id.split("-")[1]) - 1) * 24 + (season - 1) * epsPerSeason + ep;
      seedEpisodes.push({
        id: `ep-${s.id}-s${season}e${ep}`,
        seriesId: s.id,
        season,
        episodeNumber: ep,
        title: `Episode ${ep}: ${pick(titles, idx)} `,
        description: pick(descriptions, idx),
        thumbnail: img(`ep-${s.id}-${season}-${ep}`, 400, 225),
        videoURL: pick(SAMPLE_VIDEOS, idx),
        duration: `${40 + (ep % 20)}m`,
        views: 1000 + idx * 137,
        createdAt: now - idx * 3600000,
      });
    }
  }
});

export const defaultSettings: Settings = {
  siteName: "FLIXNET",
  logo: "",
  primaryColor: "#e50914",
  backgroundColor: "#0f0f0f",
  seoTitle: "FLIXNET - Watch Movies & TV Shows Online",
  seoDescription:
    "Stream unlimited movies and TV shows online. Watch the latest releases, trending content, and exclusive originals on FLIXNET.",
  seoKeywords: "movies, tv shows, streaming, watch online, netflix alternative, flixnet",
  heroAutoplay: true,
  heroInterval: 6000,
  tmdbApiKey: "",
};
