import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const viewerId = searchParams.get("viewerId");

    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const queryParam = viewerId ? `?viewerId=${viewerId}` : "";
    const targetUrl = `${userServiceUrl}/api/v1/users/${id}/follow-status${queryParam}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
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
        { isFollowing: false, status: null },
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
    console.error("Follow status API proxy error:", err);
    return NextResponse.json(
      { isFollowing: false, status: null },
      { status: 500 }
    );
  }
}

