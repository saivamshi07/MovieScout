import { resolveToken } from "@/services/movieService";

/**
 * Recommendation Service Client
 * Handles communication with recommendation-service (port 8083).
 * Supports Bearer token authorization for forward compatibility when authentication
 * filters or gateway authorization are enforced.
 */

export interface RecommendationResponse {
  userId: string;
  itemIds: string[];
  count: number;
  source: string;
}

export interface RatingSubmission {
  userId: string;
  itemId: string;
  rating: number;
}

export interface RatingResponse {
  id: number;
  userId: string;
  itemId: string;
  rating: number;
  updatedAt: string;
}

async function buildHeaders(token?: string): Promise<Record<string, string>> {
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
 * Fetch raw collaborative filtering recommendation item IDs directly from recommendation-service
 * e.g. GET /api/v1/recommendations/{userId}?limit=50
 */
export async function fetchDirectRecommendations(
  userId: string,
  limit: number = 50,
  token?: string
): Promise<RecommendationResponse | null> {
  const serviceUrl =
    process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL || "http://localhost:8083";
  const url = `${serviceUrl}/api/v1/recommendations/${userId}?limit=${limit}`;
  const resolvedToken = await resolveToken(token);
  const headers = await buildHeaders(resolvedToken);

  console.log(
    `[recommendationService] GET /api/v1/recommendations/${userId} | Auth: ${headers["Authorization"] ? "Bearer [ATTACHED]" : "NONE"}`
  );

  try {
    const res = await fetch(url, {
      headers,
      cache: "no-store", // Recommendations are dynamic per user interaction
    });

    if (!res.ok) {
      console.error(
        `recommendation-service failed for user '${userId}' with status: ${res.status}`
      );
      return null;
    }

    const data: RecommendationResponse = await res.json();
    return data;
  } catch (err) {
    console.error(
      `Error connecting to recommendation-service for user '${userId}':`,
      err
    );
    return null;
  }
}

/**
 * Submit or update a user rating directly in recommendation-service
 * e.g. POST /api/v1/ratings
 */
export async function submitRatingToRecommendationService(
  ratingData: RatingSubmission,
  token?: string
): Promise<RatingResponse | null> {
  const isClient = typeof window !== "undefined";
  const serviceUrl =
    process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL || "http://localhost:8083";
  const url = isClient
    ? `/api/recommendations/ratings`
    : `${serviceUrl}/api/v1/ratings`;

  const resolvedToken = await resolveToken(token);
  const headers = await buildHeaders(resolvedToken);

  console.log(
    `[recommendationService] POST ${url} | Rating: ${ratingData.rating} for item ${ratingData.itemId} | Auth: ${
      headers["Authorization"] ? "Bearer [ATTACHED]" : "NONE"
    }`
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: String(ratingData.userId),
        itemId: String(ratingData.itemId),
        rating: Number(ratingData.rating),
      }),
    });

    if (!res.ok) {
      console.error(
        `recommendation-service submitRating failed with status: ${res.status}`
      );
      return null;
    }

    const data: RatingResponse = await res.json();
    return data;
  } catch (err) {
    console.error("Error submitting rating to recommendation-service:", err);
    return null;
  }
}
