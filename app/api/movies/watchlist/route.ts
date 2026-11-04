import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "50";

    const movieServiceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";

    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    // If querying another user's watchlist
    if (userId) {
      const targetUrl = `${movieServiceUrl}/api/v1/movies/watchlist/users/${userId}?page=${page}&size=${size}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }

      const res = await fetch(targetUrl, { headers, cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json({ content: [], totalElements: 0 }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Querying current authenticated user's own watchlist
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required to view watchlist." },
        { status: 401 }
      );
    }

    const targetUrl = `${movieServiceUrl}/api/v1/movies/watchlist/me?page=${page}&size=${size}`;
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
      return NextResponse.json({ content: [], totalElements: 0 }, { status: res.status });
    }

    const data = await res.json();
    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }

    return response;
  } catch (err: any) {
    console.error("Watchlist GET proxy error:", err);
    return NextResponse.json(
      { content: [], totalElements: 0 },
      { status: 500 }
    );
  }
}

