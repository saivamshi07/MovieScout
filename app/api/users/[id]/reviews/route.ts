import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

/**
 * GET: Fetch reviews written by a specific user with sort & pagination support
 * Route: /api/users/[id]/reviews?page=0&size=10&sort=latest
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
    const targetUrl = `${movieServiceUrl}/api/v1/movies/users/${id}/reviews?page=${page}&size=${size}&sort=${encodeURIComponent(
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
    console.error("User reviews GET proxy error:", err);
    return NextResponse.json(
      { content: [], totalElements: 0, totalPages: 0 },
      { status: 500 }
    );
  }
}

