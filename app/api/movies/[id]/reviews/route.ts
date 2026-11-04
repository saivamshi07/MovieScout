import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

/**
 * GET: Fetch paginated reviews for a movie with sort support
 * Route: /api/movies/[id]/reviews?page=0&size=10&sort=latest
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "10";
    const sort = searchParams.get("sort") || "latest";

    const movieServiceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const targetUrl = `${movieServiceUrl}/api/v1/movies/${id}/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
      sort
    )}`;

    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }

    let res = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    let rotatedTokens = null;
    if (res.status === 401 && token) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        headers["Authorization"] = `Bearer ${rotatedTokens.accessToken}`;
        res = await fetch(targetUrl, {
          headers,
          cache: "no-store",
        });
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { content: [], totalElements: 0, totalPages: 0 },
        { status: res.status }
      );
    }

    const data = await res.json();
    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }
    return response;
  } catch (err: any) {
    console.error("Movie reviews GET proxy error:", err);
    return NextResponse.json(
      { content: [], totalElements: 0, totalPages: 0 },
      { status: 500 }
    );
  }
}

/**
 * POST: Submit or update authenticated user's review & rating for a movie
 * Route: /api/movies/[id]/reviews
 * Body: { rating: number, reviewText?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required to review this movie." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const movieServiceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const targetUrl = `${movieServiceUrl}/api/v1/movies/${id}/reviews`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };

    let res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    let rotatedTokens = null;
    if (res.status === 401) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        headers["Authorization"] = `Bearer ${rotatedTokens.accessToken}`;
        res = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || "Failed to submit review." },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Fire rating update request to recommendation-service asynchronously
    if (data && data.userId && (data.movieId || id) && data.rating !== undefined) {
      const recServiceUrl =
        process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL || "http://localhost:8083";
      fetch(`${recServiceUrl}/api/v1/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: String(data.userId),
          itemId: String(data.movieId || id),
          rating: Number(data.rating),
        }),
      }).catch((syncErr) => {
        console.warn("Async sync to recommendation-service failed:", syncErr);
      });
    }

    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }
    return response;
  } catch (err: any) {
    console.error("Movie review POST proxy error:", err);
    return NextResponse.json(
      { message: "Internal server error submitting review." },
      { status: 500 }
    );
  }
}

