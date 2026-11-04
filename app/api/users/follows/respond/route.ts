import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { followerId, accept } = body;

    if (!followerId || typeof accept !== "boolean") {
      return NextResponse.json(
        { message: "followerId and accept (boolean) are required." },
        { status: 400 }
      );
    }

    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required to respond to follow requests." },
        { status: 401 }
      );
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/follows/respond`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };

    let res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ followerId, accept }),
    });

    let rotatedTokens = null;
    if (res.status === 401) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        headers["Authorization"] = `Bearer ${rotatedTokens.accessToken}`;
        res = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ followerId, accept }),
        });
      }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to respond to follow request." },
        { status: res.status }
      );
    }

    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }

    return response;
  } catch (err: any) {
    console.error("Respond follow request API proxy error:", err);
    return NextResponse.json(
      { message: "Unable to connect to user-service on port 8080." },
      { status: 503 }
    );
  }
}

