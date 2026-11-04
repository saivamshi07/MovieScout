# 🎬 CineVerse Web Frontend

> **Modern, reactive streaming cinema web application built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and Turbopack.**

CineVerse connects cinephiles with real-time movie catalogs, community reviews, social networking, and a **hybrid 20-movie personalized recommendation engine** backed by a distributed microservice ecosystem.

---

## 🌟 Key Features

### 1. ⚡ Streaming Home Feed & Targeted Sections
- **Instant Initial Render**: Search bar and welcome banner render in `< 15ms`.
- **Parallel Suspense Streaming**: 5 dedicated catalog sections stream independently as soon as backend caches or TMDB queries resolve:
  - 🌟 **Trending Today** (Releases in the last 4 weeks up to today + next 7 days)
  - 🔥 **Trending This Week** (Releases in the last 3 months up to today + next 7 days)
  - 👑 **All-Time Popular** (Ranked by all-time vote counts)
  - 🏆 **Top Rated Classics** (High-rated cinematic masterpieces)
  - 🎟️ **Now In Theatres** (Current theatrical releases)
- **Multi-Industry Support**: Seamlessly filter catalogs across **Hollywood** (English), **Tollywood** (Telugu), **Bollywood** (Hindi), **Mollywood** (Malayalam), and **Kollywood** (Tamil).

---

### 2. 🧠 Hybrid 20-Movie Recommendation Engine
- **Parallel Dispatch**: Simultaneously queries the collaborative filtering engine (`recommendation-service:8083`) and preference-based suggestions (`movie-service:8082`).
- **Batch Hydration**: Resolves collaborative filtering `itemIds` into full movie cards via `POST /api/v1/movies/batch/cards`.
- **Deficit Backfill & Deduplication**: If collaborative filtering returns fewer than 20 items (or on cold start), automatically backfills from preferred recommendations up to **exactly 20 unique movies**.
- **Real-Time Feedback Loop**: Whenever a user rates or reviews a movie, an event is dispatched to `POST /api/recommendations/ratings` to immediately update user similarity vectors.

---

### 3. 🎯 Cinema Preferences & Curated Feeds
- **Curated Experience**: Personalize your home feed and recommendation algorithms by selecting preferred cinema industries and genres.
- **Bi-Directional Navigation**:
  - Jump directly to `/preferences` from the **Home Page Banner** (`from=home`) or your **Profile Header** (`from=profile`).
  - Automatically returns to your previous screen upon saving with zero-delay server cache invalidation (`router.refresh()`).
- **Pre-Selected State**: Loads saved preferences dynamically via `GET /api/movies/preferences`.
- **Owner-Only Privacy**: Preferences configuration is strictly guarded for profile owners; hidden on public profiles.

---

### 4. 🍿 Rich Movie Details & Lazy Similar Movies
- **Dynamic SEO Metadata**: Server-side `generateMetadata` for titles, years, and descriptions.
- **Deduplicated Crew**: Crew members holding multiple positions (e.g. "Director, Screenplay") are grouped cleanly under a single profile card.
- **Lazy "More Movies Like This"**:
  - Decoupled from the initial page SSR using React `<Suspense>` and skeleton fallbacks.
  - Interactive **Genre Switcher Pills** to explore similar movies by genre without page reloads.
  - Queries `GET /api/v1/movies/popular?industry={industry}&genre={genre}&excludeMovieId={id}`.
- **CineVerse Platform Reviews & 5-Star Ratings**:
  - Verified community average rating and vote counters.
  - Interactive 5-star rating selector and owner review edit/delete tools.
  - **3-Mode Sorting**: Sort community reviews by `latest` (default), `top` (highest rated), or `low` (lowest rated).
  - Native image fallback handling for local avatars (`ReviewUserAvatar`).

---

### 5. 🔖 Instant Watchlist Synchronization
- **Global Optimistic State**: Powered by `WatchlistContext.tsx` with instant membership checks (`Set<number>`).
- **Zero-Flicker Toggle**: Instant UI updates with automatic rollback on network failure.
- **Synchronized Badge**: Real-time counter badge displayed in the navigation header across all pages.

---

### 6. 👥 Social Profiles & Follow Graph
- **Responsive Profile Header**: Clean multi-viewport layout with wrap-safe action buttons (`Requests`, `Edit Profile`, `Preferences`, `Logout`).
- **Follow Requests Workflow**: Dedicated dashboards for pending incoming requests (`/user/requests/pending`) and outgoing sent requests (`/user/requests/sent`).
- **Follower Removal Provision**: Profile owners can remove followers from their audience via `DELETE /api/users/followers/[id]`.
- **Presigned Avatar Uploads**: Secure direct-to-S3 / MinIO profile avatar uploads.

---

## 🏛️ Microservice Ecosystem Architecture

The CineVerse frontend acts as an edge BFF (Backend-for-Frontend) orchestrating communication across three core services:

```
+-----------------------------------------------------------------------+
|                    CineVerse Frontend (:3000)                         |
|             Next.js 16 App Router | React 19 | Turbopack              |
+-----------------------------------------------------------------------+
         |                              |                          |
   [HTTP / REST]                  [HTTP / REST]              [HTTP / REST]
         v                              v                          v
+------------------+          +-------------------+      +----------------------+
|   user-service   |          |   movie-service   |      |recommendation-service|
|   Port: 8080     |          |   Port: 8082      |      |   Port: 8083         |
| - Authentication |          | - Movie Catalog   |      | - Collaborative      |
| - JWT Rotation   |          | - 5 Home Feeds    |      |   Filtering (UBCF)   |
| - Social Graph   |          | - Batch Cards     |      | - Rating Ingestion   |
| - User Profiles  |          | - Watchlist       |      | - 20-Item ID Output  |
| - S3 Presigned   |          | - Reviews/Ratings |      +----------------------+
+------------------+          | - Preferences     |
                              +-------------------+
```

For detailed architectural specifications, data models, and sequence diagrams, refer to:
👉 **[`PROJECT_CONTEXT.md`](file:///Users/saivamshi/projects/movie-frontend/PROJECT_CONTEXT.md)**

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `20.x` or later
- **npm**: `10.x` or later (or `pnpm` / `yarn`)
- Running instances of backend microservices (`user-service`, `movie-service`, `recommendation-service`).

---

### Environment Configuration

Create a `.env.local` file in the project root:

```env
# Backend Microservice URLs
NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:8080
NEXT_PUBLIC_MOVIE_SERVICE_URL=http://localhost:8082
NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL=http://localhost:8083
```

---

### Installation & Execution

```bash
# 1. Install dependencies
npm install

# 2. Start the development server with Turbopack
npm run dev

# 3. Open in browser
open http://localhost:3000
```

---

### Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Runs the Next.js app in development mode using Turbopack on port `3000`. |
| **Build** | `npm run build` | Compiles and builds the production bundle. |
| **Start** | `npm run start` | Runs the compiled production build. |
| **Lint** | `npm run lint` | Runs ESLint 9 checks across all source files. |
| **Type Check** | `npx tsc --noEmit` | Validates TypeScript types across the entire project. |

---

## 📁 Project Structure

```
movie-frontend/
├── app/                              # Next.js App Router routes & API proxies
│   ├── api/                          # Edge API Route Handlers (BFF layer)
│   │   ├── auth/                     # Login, register, refresh, logout
│   │   ├── movies/                   # Preferences, recommendations, popular, watchlist, reviews
│   │   ├── recommendations/          # Collaborative filtering & ratings proxy
│   │   └── users/                    # Profiles, follows, search, avatar uploads
│   ├── home/page.tsx                 # Streaming Home Feed
│   ├── preferences/page.tsx          # Preferences selector with bi-directional navigation
│   ├── movie/[id]/page.tsx           # Movie details, lazy similar movies, reviews
│   ├── cast/[id]/page.tsx            # Actor profile & filmography
│   ├── crew/[id]/page.tsx            # Crew member profile & works
│   ├── user/[id]/page.tsx            # User profile, follower lists, user reviews
│   ├── user/requests/                # Pending & sent follow requests
│   ├── watchlist/page.tsx            # Personal user watchlist page
│   ├── login/page.tsx                # User sign-in
│   └── register/page.tsx             # New account sign-up
├── components/                       # Reusable React components
│   ├── Navbar.tsx                    # Header with real-time watchlist counter
│   ├── MovieCard.tsx                 # Poster card with hover rating & watchlist action
│   ├── MovieSection.tsx              # Horizontal scroll carousel
│   ├── MovieSectionSkeleton.tsx      # Pulse placeholder skeleton
│   ├── MoreMoviesSection.tsx         # Similar movies with dynamic genre pills
│   ├── MovieReviewsSection.tsx       # 5-star ratings with latest/top/low sorting
│   ├── UserReviewsSection.tsx        # Profile reviews list with edit/delete modals
│   ├── WatchlistDetailButton.tsx     # Large hero banner watchlist button
│   └── HomeSearch.tsx                # Universal multi-search (Movies & Persons)
├── context/                          # Client-side React context providers
│   ├── AuthContext.tsx               # User authentication & token state
│   └── WatchlistContext.tsx          # Optimistic watchlist cache & sync
├── services/                         # Microservice client SDKs & token utilities
│   ├── apiClient.ts                  # Fetch client with client token handling
│   ├── serverTokenRefresh.ts         # Single-flight server token rotation
│   ├── movieService.ts               # Movie catalog & review operations
│   ├── userService.ts                # Profile, avatar, and social graph client
│   └── recommendationService.ts      # Collaborative filtering & rating ingestion
├── types/                            # TypeScript domain definitions
│   ├── auth.ts                       # User, session, and follow types
│   └── movie.ts                      # Movie, credits, reviews, and section types
├── next.config.ts                    # Next.js configuration (local IP image allow, redirects)
├── PROJECT_CONTEXT.md                # Comprehensive engineering & architecture specification
└── README.md                         # Project overview and setup guide
```

---

## 🛡️ Security & Token Rotation

- **HTTP-Only Cookies**: Authentication tokens are safely stored in HTTP-Only cookies (`access_token`, `refresh_token`), shielding them from XSS attacks.
- **Single-Flight Server Rotation**: When an access token expires, `serverTokenRefresh.ts` automatically contacts `user-service:8080/api/v1/auth/refresh`, updates the cookies, and replays the failed request seamlessly.
- **Private Profile Walls**: Non-public user watchlists and reviews are strictly guarded unless an active follower relationship is established and accepted.

---

## 🤝 Contributing & Guidelines

- Maintain code style consistency with existing TypeScript and Tailwind CSS patterns.
- Ensure all API calls pass through Route Handlers when cookies or server token rotation are involved.
- Verify that `npx tsc --noEmit` and `npm run lint` pass cleanly before submitting changes.
