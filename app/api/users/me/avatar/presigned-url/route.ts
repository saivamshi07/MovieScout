import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
        { message: "Authentication required to generate avatar upload URL." },
        { status: 401 }
      );
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/me/avatar/presigned-url`;

    let res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    let rotatedTokens = null;
    if (res.status === 401) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        token = `Bearer ${rotatedTokens.accessToken}`;
        res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(body),
        });
      }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to generate presigned upload URL." },
        { status: res.status }
      );
    }

    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }

    return response;
  } catch (err: any) {
    console.error("Avatar presigned URL API proxy error:", err);
    return NextResponse.json(
      { message: "Unable to connect to user-service on port 8080." },
      { status: 503 }
    );
  }
}

