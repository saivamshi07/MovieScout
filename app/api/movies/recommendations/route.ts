import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function GET(request: NextRequest) {
  try {
    // Extract access token from Authorization header or cookie
    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required to view personalized recommendations." },
        { status: 401 }
      );
    }

    const movieServiceUrl =
      process.env.NEXT_PUBLIC_MOVIE_SERVICE_URL || "http://localhost:8082";
    const targetUrl = `${movieServiceUrl}/api/v1/movies/recommendations`;

    let res = await fetch(targetUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
      cache: "no-store",
    });

    let rotatedTokens = null;

    // If 401 Unauthorized, access token might be expired -> attempt server token rotation
    if (res.status === 401) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        token = `Bearer ${rotatedTokens.accessToken}`;
        res = await fetch(targetUrl, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          cache: "no-store",
        });
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { message: `Movie service returned status ${res.status}` },
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
    console.error("Recommendations API proxy route error:", err);
    return NextResponse.json(
      {
        message:
          "Unable to connect to movie service recommendations endpoint.",
      },
      { status: 503 }
    );
  }
}
