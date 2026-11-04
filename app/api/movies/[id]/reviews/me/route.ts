import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

/**
 * GET: Fetch current user's review for a movie
 * Route: /api/movies/[id]/reviews/me
 */
export async function GET(
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
      return NextResponse.json(null);
    }

    const movieServiceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const targetUrl = `${movieServiceUrl}/api/v1/movies/${id}/reviews/me`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };

    let res = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    let rotatedTokens = null;
    if (res.status === 401) {
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
      return NextResponse.json(null);
    }

    const data = await res.json();
    // movie-service returns Page<ReviewResponseDTO>
    const userReview =
      data && Array.isArray(data.content) && data.content.length > 0
        ? data.content[0]
        : data && data.id
        ? data
        : null;

    const response = NextResponse.json(userReview);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }
    return response;
  } catch (err: any) {
    console.error("My review GET proxy error:", err);
    return NextResponse.json(null);
  }
}

