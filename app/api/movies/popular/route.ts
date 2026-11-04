import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get("industry") || "ALL";
    const genre = searchParams.get("genre") || "ALL";
    const excludeMovieId = searchParams.get("excludeMovieId");

    const query = new URLSearchParams({
      industry,
      genre,
    });
    if (excludeMovieId) {
      query.set("excludeMovieId", excludeMovieId);
    }

    const movieServiceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const targetUrl = `${movieServiceUrl}/api/v1/movies/popular?${query.toString()}`;

    // Extract access token if present
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
      method: "GET",
      headers,
    });

    let rotatedTokens = null;

    if (res.status === 401) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        token = `Bearer ${rotatedTokens.accessToken}`;
        headers["Authorization"] = token;
        res = await fetch(targetUrl, {
          method: "GET",
          headers,
        });
      }
    }

    const data = await res.json().catch(() => []);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "Failed to fetch popular similar movies." },
        { status: res.status }
      );
    }

    const response = NextResponse.json(Array.isArray(data) ? data : []);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }

    return response;
  } catch (err: any) {
    console.error("Popular similar movies API route error:", err);
    return NextResponse.json(
      {
        message:
          "Unable to connect to movie service. Please ensure movie-service is running.",
      },
      { status: 503 }
    );
  }
}

