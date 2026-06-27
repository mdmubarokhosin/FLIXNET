# FLIXNET — OTT Streaming Platform

A full-featured Netflix-style streaming platform built with Next.js 16, React Router, Firebase, and Tailwind CSS. Includes a complete admin panel with TMDB integration.

## Features

### User-Facing
- 🎬 Browse Movies, TV Series, Trending, Categories
- 🔍 Advanced search with filters
- 🎥 Custom video player (play/pause/seek/volume/fullscreen/subtitles/auto-next-episode)
- 🎞️ **Trailer popup modal** — click Trailer on any movie/series to watch in an in-app modal (YouTube, Vimeo, direct files)
- 📋 My List (watchlist) & Watch History
- 👤 User profile & subscription plans
- 🎟️ **Coupon / Promo Code** — apply discount codes on the Subscription page (percentage or fixed amount)
- 🎁 **Gift Card redeem** — redeem gift card codes for subscription credit on the Subscription page
- 🎁 **Buy Gift Cards** — purchase gift cards for friends (Bohudur checkout)
- 🌙 Dark / Light mode toggle
- 📱 Fully responsive (mobile-first) + PWA support
- 🔓 Browse freely without login (auth optional for browsing, required for personal features)

### Admin Panel
- 📊 Dashboard with stats & recent activity
- 🎬 Full CRUD for Movies, Series, Episodes, Categories
- 👥 User management (edit, delete, ban/unban, role control, subscription control)
- 💳 Subscription Plans CRUD + Payment Gateway control (Bohudur API key, currency, enable/disable, subscription gate)
- 🎟️ **Coupons Admin** — full CRUD for promo codes (create, edit, delete, search, stats)
- 🎁 **Gift Cards Admin** — issue, view, and delete gift cards; track redemption status
- 📈 Analytics with charts (Recharts)
- ⚙️ Site settings (SEO, colors, hero config, TMDB API key, payment gateway)
- 🎯 **TMDB Integration**: Auto-fill movie/series metadata by TMDB ID or title search
- 📱 Fully mobile-responsive admin UI

### Payments (Bohudur)
- 💳 **Subscription checkout** via the [Bohudur](https://bohudur.one) payment gateway
- 🔒 **API key stays server-side** — browser calls a same-origin proxy (`/api/bohudur/*`), never the Bohudur API directly. This fixes the "Failed to fetch" CORS error you get from direct browser→Bohudur calls.
- 🔄 **Full payment flow**: Create Payment → redirect to hosted checkout → return → Query + Execute → activate subscription
- 🛠️ **Two proxy runtimes** (same URL works in both):
  - **Dev** (`next dev`): Next.js API route at `src/app/api/bohudur/{create,query,execute}/route.ts`
  - **Production** (Cloudflare Pages): Cloudflare Pages Function at `functions/api/bohudur/{create,query,execute}.js`

### Tech Stack
- **Framework**: Next.js 16 (App Router, static export)
- **Routing**: React Router DOM v7 (HashRouter)
- **Backend**: Firebase (Auth, Realtime Database, Storage)
- **Serverless**: Cloudflare Pages Functions (`/api/*` → Bohudur proxy)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Animations**: Framer Motion
- **Carousels**: SwiperJS
- **Forms**: React Hook Form
- **Charts**: Recharts
- **PWA**: manifest.json + service worker

## Quick Start

### Prerequisites
- Node.js 18+ (or Bun)
- A Firebase project (free tier works)
- A TMDB API key (optional, for auto-fill feature)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/flixnet.git
cd flixnet

# 2. Install dependencies
npm install
# or: bun install / yarn install

# 3. Configure Firebase
# Option A: Edit src/firebase/config.ts with your Firebase config
# Option B: Copy .env.example to .env.local and fill in values (then update config.ts to read from env)

# 4. Start the dev server
npm run dev
# App runs on http://localhost:3000

# 5. Build for production
npm run build
# Static site generated in /out folder

# 6. Preview production build locally
npm run start
```

## Running on Termux (Android)

```bash
# 1. Install Termux from F-Droid (not Play Store)
# 2. Update packages
pkg update && pkg upgrade -y

# 3. Install Node.js and Git
pkg install nodejs git -y

# 4. Clone and enter the project
git clone https://github.com/yourusername/flixnet.git
cd flixnet

# 5. Install dependencies
npm install

# 6. Start dev server
npm run dev
# Open http://localhost:3000 in your phone's browser
```

**Tip:** Termux can be slow on first install. If `npm install` fails, try `npm install --no-optimize` or use `bun` (`pkg install bun`).

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable **Authentication** → Sign-in methods → Email/Password and Google
3. Create a **Realtime Database** (start in test mode for development)
4. Enable **Storage** (start in test mode for development)
5. Add your app → copy the Firebase config → paste into `src/firebase/config.ts`
6. (Optional) Set up Storage and Database security rules (see below)

### Admin Access
By default, users with these emails are automatically assigned the admin role:
- `admin@flixnet.com`
- `admin@gmail.com`

To change admin emails, edit `ADMIN_EMAILS` in `src/services/authService.ts`.

## TMDB Integration

1. Get a free API key from [TMDB Settings](https://www.themoviedb.org/settings/api)
2. Log in as admin → Settings → TMDB Integration → paste your API key
3. Go to Movies or Series admin → Add New → enter a TMDB ID or search by title → click Fetch
4. All fields (title, description, poster, banner, genres, cast, director, trailer, etc.) auto-fill

## Deploy to Cloudflare Pages

### Option A: Git Integration (Recommended)
1. Push your code to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/) → Create a project → Connect to Git
3. Select your repo
4. Build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Node version**: 18 (or 20)
5. Add environment variables (Settings → Environment variables):
   - All `NEXT_PUBLIC_*` vars from `.env.example` (Firebase config, TMDB key, etc.)
   - `BOHUDUR_API_KEY` — your Bohudur API key (read server-side by the Pages Function; **NOT** prefixed with NEXT_PUBLIC_ so it stays secret)
6. Deploy → Cloudflare will auto-build and deploy on every push
7. The `functions/` directory at the project root is automatically picked up by Cloudflare Pages as [Pages Functions](https://developers.cloudflare.com/pages/functions/) — no extra config needed. They serve `/api/bohudur/create`, `/api/bohudur/query`, `/api/bohudur/execute`.

> **Note on the `_routes.json`**: `functions/_routes.json` limits which paths are handled by Functions (only `/api/*`). Everything else falls through to the static `out/` site — so the SPA, assets, and service worker all load fast from the CDN.

### Option B: Direct Upload (no serverless — payments will NOT work)
1. Run `npm run build` locally
2. The `out/` folder contains your static site
3. Go to Cloudflare Pages → Create a project → Direct Upload
4. Upload the `out/` folder
5. ⚠️ **Limitation**: Direct upload does NOT deploy Pages Functions, so the Bohudur proxy (`/api/bohudur/*`) will be missing and subscription checkout will fail. **Use Git Integration (Option A) for full payment functionality.**

### Custom Domain
After deployment, go to Cloudflare Pages → Custom domains → Add your domain. Cloudflare handles SSL automatically.

## Bohudur Payment Setup

1. Sign up at [bohudur.one](https://bohudur.one) and get your API key from the dashboard.
2. **Two ways to configure the API key** (pick ONE):
   - **Recommended (production)**: Set `BOHUDUR_API_KEY` as an environment variable in Cloudflare Pages → Settings → Environment variables. This keeps the key out of the database.
   - **Quick (admin panel)**: Log in as admin → Settings → Payment Gateway → paste the API key into the "Bohudur API Key" field → Save. The key is stored in Firebase `settings/site.bohudurApiKey` and read by the proxy at runtime.
3. Enable payments: admin → Settings → Payment Gateway → toggle "Enable Payments" ON → set Gateway to "Bohudur" → set Currency → Save.
4. Optionally enable "Subscription Gate" to require an active paid subscription before watching videos.
5. Create subscription plans: admin → Subscription Plans → Add New (set name, price, currency, period, quality, devices, features).
6. Test the connection: admin → Settings → Payment Gateway → "Test Connection" button. It pings `/api/bohudur/query` and reports whether the proxy + API key work.
7. Users can now subscribe from `/subscription` → they're redirected to Bohudur's hosted checkout → on return, their subscription is activated automatically.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (metadata, fonts)
│   ├── page.tsx            # Client-only page mounting the SPA
│   ├── globals.css         # Global styles + theme variables
│   └── api/                # Dev-only API routes (NOT in static export)
│       └── bohudur/        # Bohudur proxy (create/query/execute) — dev mode
├── admin/                  # Admin panel
│   ├── components/         # Admin shared components
│   └── pages/              # 9 admin pages (Dashboard, Movies, Series, Episodes,
│                           #   Categories, Subscriptions, Users, Analytics, Settings)
├── components/             # Shared UI components
│   ├── player/             # Custom video player
│   ├── shared/             # MovieCard, ContentRow, HeroSlider, etc.
│   └── ui/                 # shadcn/ui components
├── context/                # React contexts (Auth, Data, Settings, UserContent)
├── firebase/               # Firebase config, types, seed data
├── layouts/                # MainLayout, AdminLayout, Navbar, Footer
├── pages/                  # User-facing pages (incl. SubscriptionPage, PaymentReturnPage)
├── services/               # dataService, authService, storageService, tmdbService, bohudurService
├── hooks/                  # Custom React hooks
├── lib/                    # Utils
└── utils/                  # cn, format, sitemap helpers

functions/                  # Cloudflare Pages Functions (production serverless)
├── _routes.json            # Routes only /api/* to Functions; rest → static
└── api/
    └── bohudur/            # create.js, query.js, execute.js (Bohudur proxy)

public/                     # Static assets (served as-is)
├── _redirects              # SPA fallback: /* → /index.html 200
├── _headers                # Security headers
├── manifest.json           # PWA manifest
└── sw.js                   # Service worker
```

## Security Rules (Firebase)

### Realtime Database Rules

These rules allow the admin (role === 'admin') to manage users, plans, payments, and content. Regular users can read all public content and write only their own profile, watch history, and my-list.

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid || root.child('users/'+auth.uid+'/role').val() === 'admin'",
        ".write": "auth.uid === $uid || root.child('users/'+auth.uid+'/role').val() === 'admin'"
      }
    },
    "movies": { ".read": true, ".write": "auth != null && root.child('users/'+auth.uid+'/role').val() === 'admin'" },
    "series": { ".read": true, ".write": "auth != null && root.child('users/'+auth.uid+'/role').val() === 'admin'" },
    "episodes": { ".read": true, ".write": "auth != null && root.child('users/'+auth.uid+'/role').val() === 'admin'" },
    "categories": { ".read": true, ".write": "auth != null && root.child('users/'+auth.uid+'/role').val() === 'admin'" },
    "subscriptionPlans": { ".read": true, ".write": "auth != null && root.child('users/'+auth.uid+'/role').val() === 'admin'" },
    "payments": { ".read": "auth != null && root.child('users/'+auth.uid+'/role').val() === 'admin'", ".write": "auth != null" },
    "settings": { ".read": true, ".write": "auth != null && root.child('users/'+auth.uid+'/role').val() === 'admin'" },
    "watchHistory": { "$uid": { ".read": "auth.uid === $uid || root.child('users/'+auth.uid+'/role').val() === 'admin'", ".write": "auth.uid === $uid || root.child('users/'+auth.uid+'/role').val() === 'admin'" } },
    "myList": { "$uid": { ".read": "auth.uid === $uid || root.child('users/'+auth.uid+'/role').val() === 'admin'", ".write": "auth.uid === $uid || root.child('users/'+auth.uid+'/role').val() === 'admin'" } }
  }
}
```

> **Why admins need write access to `users`, `watchHistory`, `myList`**: the admin panel can edit/ban/delete users, which writes to these paths. The Bohudur proxy also reads `settings/site.bohudurApiKey` server-side (via the Firebase REST API with no auth — so make sure your `settings` rules allow public read, OR set the API key via the `BOHUDUR_API_KEY` env var on Cloudflare Pages instead).

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /thumbnails/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /banners/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /videos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /logos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## License

MIT — feel free to use this project for your own streaming platform.

## Credits

Built with Next.js, Firebase, Tailwind CSS, shadcn/ui, and TMDB.
