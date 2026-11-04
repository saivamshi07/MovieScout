import {
  ActorDetail,
  CrewDetail,
  Movie,
  MovieDetail,
  MultiSearchResponse,
  Review,
  ReviewPageResponse,
  SearchType,
  SectionResponse,
} from "@/types/movie";
import { fetchDirectRecommendations } from "@/services/recommendationService";

/**
 * Supported Section Endpoints in movie-service
 */
export type HomeSectionKey =
  | "trending-today"
  | "trending-week"
  | "popular"
  | "top-rated"
  | "now-playing";

export interface SectionConfig {
  key: HomeSectionKey;
  title: string;
  endpoint: string;
}

/**
 * Metadata configuration for each home feed section
 */
export const HOME_SECTIONS: SectionConfig[] = [
  {
    key: "trending-today",
    title: "Trending Today",
    endpoint: "trending-today",
  },
  {
    key: "trending-week",
    title: "Trending This Week",
    endpoint: "trending-week",
  },
  {
    key: "popular",
    title: "All-Time Popular",
    endpoint: "popular",
  },
  {
    key: "top-rated",
    title: "Top Rated Classics",
    endpoint: "top-rated",
  },
  {
    key: "now-playing",
    title: "Now In Theatres",
    endpoint: "now-playing",
  },
];

/**
 * Parameters that can be passed to any section endpoint
 */
export interface FetchSectionParams {
  industry?: string;
  genre?: string;
  page?: number;
  token?: string;
}

/**
 * Resolves the JWT authentication token from:
 * 1. Explicitly provided parameter
 * 2. Server-side cookie store (Next.js Server Components & Route Handlers)
 * 3. Client-side localStorage or document.cookie (Browser environment)
 */
export async function resolveToken(explicitToken?: string): Promise<string | undefined> {
  if (explicitToken) return explicitToken;

  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get("access_token")?.value;
      if (cookieToken) return cookieToken;
    } catch {
      // Ignored: outside request lifecycle
    }
  } else {
    try {
      const localToken = localStorage.getItem("cineverse_token");
      if (localToken) return localToken;

      const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) return match[1];
    } catch {
      // Ignored
    }
  }

  return undefined;
}

/**
 * Helper to construct standard authorization headers
 */
export async function buildHeaders(token?: string): Promise<Record<string, string>> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }
  return headers;
}

/**
 * Generic fetcher for any movie section endpoint
 * e.g. fetchMoviesBySection("trending-today", { page: 1 })
 * Automatically attaches Authorization Bearer when user is logged in
 */
export async function fetchMoviesBySection(
  endpoint: string,
  params: FetchSectionParams = {}
): Promise<Movie[]> {
  const serviceUrl = process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";

  // Build query string dynamically (e.g. ?industry=TOLLYWOOD&page=1)
  const query = new URLSearchParams();
  if (params.industry && params.industry !== "ALL") {
    query.append("industry", params.industry);
  }
  if (params.genre) {
    query.append("genre", params.genre);
  }
  query.append("page", String(params.page || 1));

  const url = `${serviceUrl}/api/v1/movies/home/${endpoint}?${query.toString()}`;
  const resolvedToken = await resolveToken(params.token);
  const headers = await buildHeaders(resolvedToken);

  console.log(
    `[movieService] GET ${endpoint} | Auth: ${headers["Authorization"] ? "Bearer [ATTACHED]" : "NONE"}`
  );

  try {
    // When authenticated, do not cache across users so user-specific composite feeds are fresh
    const fetchOptions: RequestInit = resolvedToken
      ? { headers, cache: "no-store" }
      : { headers, next: { revalidate: 60 } };

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      console.error(`movie-service (${endpoint}) failed with status: ${res.status}`);
      return [];
    }

    const data: SectionResponse = await res.json();
    return data.movies || [];
  } catch (err) {
    console.error(`Error connecting to movie-service for endpoint '${endpoint}':`, err);
    return [];
  }
}

/**
 * Extracts userId (sub claim) from JWT access token
 */
export function extractUserIdFromToken(token?: string): string | null {
  if (!token) return null;
  try {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const parts = cleanToken.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    let jsonString: string;
    if (typeof Buffer !== "undefined") {
      jsonString = Buffer.from(base64Url, "base64").toString("utf8");
    } else {
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      jsonString = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    }
    const payload = JSON.parse(jsonString);
    return payload.sub || payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * Fetch a batch of movie cards by IDs from movie-service
 * e.g. POST /api/v1/movies/batch/cards
 */
export async function fetchMovieCardsBatch(
  ids: (string | number)[],
  token?: string
): Promise<Movie[]> {
  if (!ids || ids.length === 0) return [];

  const numericIds = ids
    .map((id) => (typeof id === "string" ? parseInt(id.trim(), 10) : id))
    .filter((id) => !isNaN(id) && id > 0);

  if (numericIds.length === 0) return [];

  const serviceUrl =
    process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
  const url = `${serviceUrl}/api/v1/movies/batch/cards`;
  const resolvedToken = await resolveToken(token);
  const headers = await buildHeaders(resolvedToken);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ movieIds: numericIds }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`movie-service batch cards failed with status: ${res.status}`);
      return [];
    }

    const batchMovies: Movie[] = await res.json();
    if (!Array.isArray(batchMovies)) return [];

    // Map by ID to preserve the exact order of requested IDs
    const movieMap = new Map<number, Movie>();
    for (const movie of batchMovies) {
      if (movie && typeof movie.id === "number") {
        movieMap.set(movie.id, movie);
      }
    }

    const ordered: Movie[] = [];
    for (const id of numericIds) {
      const movie = movieMap.get(id);
      if (movie) {
        ordered.push(movie);
      }
    }

    return ordered;
  } catch (err) {
    console.error("Error connecting to movie-service batch cards:", err);
    return [];
  }
}

/**
 * Fetch preference-based recommendations directly from movie-service
 * GET /api/v1/movies/recommendations
 */
export async function fetchMovieServiceRecommendations(
  token?: string
): Promise<Movie[]> {
  const resolvedToken = await resolveToken(token);
  if (!resolvedToken) return [];

  const serviceUrl =
    process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
  const url = `${serviceUrl}/api/v1/movies/recommendations`;
  const headers = await buildHeaders(resolvedToken);

  console.log(
    `[movieService] GET /api/v1/movies/recommendations | Auth: ${headers["Authorization"] ? "Bearer [ATTACHED]" : "NONE"}`
  );

  try {
    const res = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        `movie-service recommendations failed with status: ${res.status}`
      );
      return [];
    }

    const movies: Movie[] = await res.json();
    return Array.isArray(movies) ? movies : [];
  } catch (err) {
    console.error("Error connecting to movie-service recommendations:", err);
    return [];
  }
}

/**
 * Fetch personalized recommendations combining recommendation-service and movie-service.
 * Target: Exactly 20 recommendations.
 * Process:
 * 1. Hits recommendation-service for current user to get itemIds (collaborative filtering).
 * 2. In parallel, hits movie-service GET /api/v1/movies/recommendations.
 * 3. Takes recommendation-service itemIds and hits movie-service POST /api/v1/movies/batch/cards
 *    to resolve movie details; displays these first.
 * 4. If recommendation-service returned fewer than 20 items (or on cold start / error),
 *    appends movie-service recommendations at the end to fill up the 20.
 */
export async function fetchRecommendations(token?: string): Promise<Movie[]> {
  const TARGET_COUNT = 20;
  const resolvedToken = await resolveToken(token);
  if (!resolvedToken) {
    return [];
  }

  const userId = extractUserIdFromToken(resolvedToken);

  // Parallel Execution:
  // Task 1: Hit recommendation-service for current user itemIds
  const directRecPromise: Promise<string[]> = (async () => {
    if (!userId) return [];
    try {
      const recData = await fetchDirectRecommendations(userId, TARGET_COUNT, resolvedToken);
      return recData?.itemIds || [];
    } catch (err) {
      console.error("[recommendationService] Direct recommendations error:", err);
      return [];
    }
  })();

  // Task 2: Parallely hit movie-service recommendations
  const movieServiceRecPromise = fetchMovieServiceRecommendations(resolvedToken);

  // Await recommendation-service itemIds
  const itemIds = await directRecPromise;
  let directMovies: Movie[] = [];
  if (itemIds.length > 0) {
    try {
      directMovies = await fetchMovieCardsBatch(itemIds, resolvedToken);
    } catch (err) {
      console.error("[movieService] Batch cards fetch for itemIds error:", err);
    }
  }

  // Await movie-service recommendations
  const movieServiceMovies = await movieServiceRecPromise;

  // Build combined list: recommendation-service movies first
  const combined: Movie[] = [...directMovies];

  // If fewer than 20 items, fill up from movie-service recommendations
  if (combined.length < TARGET_COUNT) {
    const existingIds = new Set(combined.map((m) => m.id));
    for (const movie of movieServiceMovies) {
      if (!existingIds.has(movie.id)) {
        combined.push(movie);
        existingIds.add(movie.id);
        if (combined.length >= TARGET_COUNT) {
          break;
        }
      }
    }
  }

  return combined.slice(0, TARGET_COUNT);
}

/**
 * Fetch detailed movie information including full cast and crew by ID
 * e.g. GET /api/v1/movies/550
 */
export async function fetchMovieById(
  id: string | number,
  token?: string
): Promise<MovieDetail | null> {
  const serviceUrl = process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
  const url = `${serviceUrl}/api/v1/movies/${id}`;
  const headers = await buildHeaders(token);

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 300 }, // Cache metadata on server for 5 minutes
    });

    if (!res.ok) {
      console.error(`movie-service fetchMovieById(${id}) failed with status: ${res.status}`);
      return null;
    }

    const data: MovieDetail = await res.json();
    return data;
  } catch (err) {
    console.error(`Error connecting to movie-service for movie ID '${id}':`, err);
    return null;
  }
}

/**
 * Fetch popular similar movies by industry and genre, excluding current movie ID
 * GET /api/v1/movies/popular?industry={industry}&genre={genre}&excludeMovieId={id}
 */
export async function fetchPopularSimilarMovies(
  industry: string,
  genre: string,
  excludeMovieId: number | string,
  token?: string
): Promise<Movie[]> {
  const serviceUrl =
    process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
  const params = new URLSearchParams({
    industry: industry || "ALL",
    genre: genre || "DRAMA",
    excludeMovieId: String(excludeMovieId),
  });

  const url = `${serviceUrl}/api/v1/movies/popular?${params.toString()}`;
  const resolvedToken = await resolveToken(token);
  const headers = await buildHeaders(resolvedToken);

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 300 }, // Cache similar movies on server for 5 minutes
    });

    if (!res.ok) {
      console.error(
        `movie-service /api/v1/movies/popular failed with status: ${res.status}`
      );
      return [];
    }

    const data: Movie[] = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error connecting to movie-service popular movies:", err);
    return [];
  }
}

/**
 * Fetch actor profile and filmography by person ID
 * e.g. GET /api/v1/movies/actors/287
 */
export async function fetchActorById(
  id: string | number,
  token?: string
): Promise<ActorDetail | null> {
  const serviceUrl = process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
  const url = `${serviceUrl}/api/v1/movies/actors/${id}`;
  const headers = await buildHeaders(token);

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`movie-service fetchActorById(${id}) failed with status: ${res.status}`);
      return null;
    }

    const data: ActorDetail = await res.json();
    return data;
  } catch (err) {
    console.error(`Error connecting to movie-service for actor ID '${id}':`, err);
    return null;
  }
}

/**
 * Fetch crew member profile, primary designations, and filmography by person ID
 * e.g. GET /api/v1/movies/crew/7467
 */
export async function fetchCrewById(
  id: string | number,
  token?: string
): Promise<CrewDetail | null> {
  const serviceUrl = process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
  const url = `${serviceUrl}/api/v1/movies/crew/${id}`;
  const headers = await buildHeaders(token);

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`movie-service fetchCrewById(${id}) failed with status: ${res.status}`);
      return null;
    }

    const data: CrewDetail = await res.json();
    return data;
  } catch (err) {
    console.error(`Error connecting to movie-service for crew ID '${id}':`, err);
    return null;
  }
}

/**
 * Multi-search query across movies, actors, and crew
 * GET /api/v1/movies/search?query=...&type=...&page=...
 */
export async function searchCatalog(
  query: string,
  type: SearchType = "ALL",
  page: number = 1,
  token?: string
): Promise<MultiSearchResponse> {
  const serviceUrl = process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
  const params = new URLSearchParams({
    query: query.trim(),
    type,
    page: String(page),
  });

  const url = `${serviceUrl}/api/v1/movies/search?${params.toString()}`;
  const headers = await buildHeaders(token);

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error(`movie-service search failed with status: ${res.status}`);
      return { query, totalMatches: 0, movies: [], actors: [], crew: [] };
    }

    const data: MultiSearchResponse = await res.json();
    return {
      query: data.query || query,
      totalMatches: data.totalMatches || 0,
      movies: data.movies || [],
      actors: data.actors || [],
      crew: data.crew || [],
    };
  } catch (err) {
    console.error(`Error connecting to movie-service search for '${query}':`, err);
    return { query, totalMatches: 0, movies: [], actors: [], crew: [] };
  }
}

/**
 * Fetch list of movie IDs in the user's watchlist (super fast index lookup)
 */
export async function fetchWatchlistIds(token?: string): Promise<number[]> {
  try {
    const isClient = typeof window !== "undefined";
    const serviceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const url = isClient
      ? `/api/movies/watchlist/ids`
      : `${serviceUrl}/api/v1/movies/watchlist/ids`;

    const headers = await buildHeaders(token);
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("fetchWatchlistIds error:", err);
    return [];
  }
}

/**
 * Fetch the authenticated user's watchlist
 */
export async function fetchMyWatchlist(
  page: number = 0,
  size: number = 50,
  token?: string
): Promise<{ movies: Movie[]; totalElements: number }> {
  try {
    const isClient = typeof window !== "undefined";
    const serviceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const url = isClient
      ? `/api/movies/watchlist?page=${page}&size=${size}`
      : `${serviceUrl}/api/v1/movies/watchlist/me?page=${page}&size=${size}`;

    const headers = await buildHeaders(token);
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      return { movies: [], totalElements: 0 };
    }

    const data = await res.json();
    const movies = Array.isArray(data.content)
      ? data.content
      : Array.isArray(data)
      ? data
      : [];
    const totalElements = data.totalElements ?? movies.length;

    return { movies, totalElements };
  } catch (err) {
    console.error("fetchMyWatchlist error:", err);
    return { movies: [], totalElements: 0 };
  }
}

/**
 * Fetch a specific user's public watchlist by UUID
 */
export async function fetchUserWatchlist(
  userId: string,
  page: number = 0,
  size: number = 50,
  token?: string
): Promise<{ movies: Movie[]; totalElements: number }> {
  try {
    const isClient = typeof window !== "undefined";
    const serviceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const url = isClient
      ? `/api/movies/watchlist?userId=${userId}&page=${page}&size=${size}`
      : `${serviceUrl}/api/v1/movies/watchlist/users/${userId}?page=${page}&size=${size}`;

    const headers = await buildHeaders(token);
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      return { movies: [], totalElements: 0 };
    }

    const data = await res.json();
    const movies = Array.isArray(data.content)
      ? data.content
      : Array.isArray(data)
      ? data
      : [];
    const totalElements = data.totalElements ?? movies.length;

    return { movies, totalElements };
  } catch (err) {
    console.error(`fetchUserWatchlist error for user ${userId}:`, err);
    return { movies: [], totalElements: 0 };
  }
}

/**
 * Add a movie to the current user's watchlist
 */
export async function addToWatchlist(
  movieId: number,
  token?: string
): Promise<boolean> {
  try {
    const headers = await buildHeaders(token);
    const res = await fetch(`/api/movies/${movieId}/watchlist`, {
      method: "POST",
      headers,
    });
    return res.ok;
  } catch (err) {
    console.error(`addToWatchlist error (${movieId}):`, err);
    return false;
  }
}

/**
 * Remove a movie from the current user's watchlist
 */
export async function removeFromWatchlist(
  movieId: number,
  token?: string
): Promise<boolean> {
  try {
    const headers = await buildHeaders(token);
    const res = await fetch(`/api/movies/${movieId}/watchlist`, {
      method: "DELETE",
      headers,
    });
    return res.ok;
  } catch (err) {
    console.error(`removeFromWatchlist error (${movieId}):`, err);
    return false;
  }
}

/**
 * Check if a movie is in the current user's watchlist
 */
export async function checkWatchlistStatus(
  movieId: number,
  token?: string
): Promise<boolean> {
  try {
    const headers = await buildHeaders(token);
    const res = await fetch(`/api/movies/${movieId}/watchlist/status`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.inWatchlist);
  } catch {
    return false;
  }
}

/**
 * Fetch reviews for a movie with sort and pagination
 * e.g. GET /api/movies/{id}/reviews?page=0&size=10&sort=latest
 */
export async function fetchMovieReviews(
  movieId: number | string,
  page: number = 0,
  size: number = 10,
  sort: string = "latest",
  token?: string
): Promise<ReviewPageResponse> {
  const emptyRes: ReviewPageResponse = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: page,
    size,
    first: true,
    last: true,
    empty: true,
  };

  try {
    const isClient = typeof window !== "undefined";
    const serviceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const url = isClient
      ? `/api/movies/${movieId}/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
          sort
        )}`
      : `${serviceUrl}/api/v1/movies/${movieId}/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
          sort
        )}`;

    const headers = await buildHeaders(token);
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) return emptyRes;

    const data = await res.json();
    return {
      content: Array.isArray(data.content) ? data.content : [],
      totalElements: data.totalElements ?? 0,
      totalPages: data.totalPages ?? 0,
      number: data.number ?? page,
      size: data.size ?? size,
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? (Array.isArray(data.content) ? data.content.length === 0 : true),
    };
  } catch (err) {
    console.error(`fetchMovieReviews error for movie ${movieId}:`, err);
    return emptyRes;
  }
}

/**
 * Fetch currently authenticated user's review for a movie
 * e.g. GET /api/movies/{id}/reviews/me
 */
export async function fetchMyMovieReview(
  movieId: number | string,
  token?: string
): Promise<Review | null> {
  try {
    const isClient = typeof window !== "undefined";
    const serviceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const url = isClient
      ? `/api/movies/${movieId}/reviews/me`
      : `${serviceUrl}/api/v1/movies/${movieId}/reviews/me`;

    const headers = await buildHeaders(token);
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data) return null;
    if (Array.isArray(data.content)) {
      return data.content.length > 0 ? data.content[0] : null;
    }
    return data.id ? data : null;
  } catch (err) {
    console.error(`fetchMyMovieReview error for movie ${movieId}:`, err);
    return null;
  }
}

/**
 * Submit or update rating & review for a movie
 * e.g. POST /api/movies/{id}/reviews
 */
export async function submitMovieReview(
  movieId: number | string,
  rating: number,
  reviewText?: string,
  token?: string
): Promise<Review | null> {
  try {
    const headers = await buildHeaders(token);
    headers["Content-Type"] = "application/json";

    const res = await fetch(`/api/movies/${movieId}/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        rating,
        reviewText: reviewText?.trim() || undefined,
      }),
    });

    if (!res.ok) {
      console.error(`submitMovieReview failed with status ${res.status}`);
      return null;
    }

    const data: Review = await res.json();
    return data;
  } catch (err) {
    console.error(`submitMovieReview error for movie ${movieId}:`, err);
    return null;
  }
}

/**
 * Fetch reviews written by a specific user by UUID
 * e.g. GET /api/users/{userId}/reviews?page=0&size=10&sort=latest
 */
export async function fetchUserReviews(
  userId: string,
  page: number = 0,
  size: number = 10,
  sort: string = "latest",
  token?: string
): Promise<ReviewPageResponse> {
  const emptyRes: ReviewPageResponse = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: page,
    size,
    first: true,
    last: true,
    empty: true,
  };

  try {
    const isClient = typeof window !== "undefined";
    const serviceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const url = isClient
      ? `/api/users/${userId}/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
          sort
        )}`
      : `${serviceUrl}/api/v1/movies/users/${userId}/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
          sort
        )}`;

    const headers = await buildHeaders(token);
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) return emptyRes;

    const data = await res.json();
    return {
      content: Array.isArray(data.content) ? data.content : [],
      totalElements: data.totalElements ?? 0,
      totalPages: data.totalPages ?? 0,
      number: data.number ?? page,
      size: data.size ?? size,
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? (Array.isArray(data.content) ? data.content.length === 0 : true),
    };
  } catch (err) {
    console.error(`fetchUserReviews error for user ${userId}:`, err);
    return emptyRes;
  }
}

/**
 * Fetch reviews written by currently authenticated user
 * e.g. GET /api/users/me/reviews?page=0&size=10&sort=latest
 */
export async function fetchMyReviews(
  page: number = 0,
  size: number = 10,
  sort: string = "latest",
  token?: string
): Promise<ReviewPageResponse> {
  const emptyRes: ReviewPageResponse = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: page,
    size,
    first: true,
    last: true,
    empty: true,
  };

  try {
    const isClient = typeof window !== "undefined";
    const serviceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const url = isClient
      ? `/api/users/me/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
          sort
        )}`
      : `${serviceUrl}/api/v1/movies/users/me/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
          sort
        )}`;

    const headers = await buildHeaders(token);
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) return emptyRes;

    const data = await res.json();
    return {
      content: Array.isArray(data.content) ? data.content : [],
      totalElements: data.totalElements ?? 0,
      totalPages: data.totalPages ?? 0,
      number: data.number ?? page,
      size: data.size ?? size,
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? (Array.isArray(data.content) ? data.content.length === 0 : true),
    };
  } catch (err) {
    console.error("fetchMyReviews error:", err);
    return emptyRes;
  }
}
