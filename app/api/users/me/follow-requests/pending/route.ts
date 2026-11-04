import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "20";

    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required to view pending follow requests." },
        { status: 401 }
      );
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/me/follow-requests/pending?page=${page}&size=${size}`;

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
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || "Failed to fetch pending requests." },
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
    console.error("Get pending follow requests API proxy error:", err);
    return NextResponse.json(
      { message: "Unable to connect to user-service on port 8080." },
      { status: 503 }
    );
  }
}

