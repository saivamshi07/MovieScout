import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Extract refresh_token from cookies or request body (if provided as fallback)
    let refreshToken = request.cookies.get("refresh_token")?.value;
    if (!refreshToken) {
      try {
        const body = await request.json().catch(() => ({}));
        if (body && body.refreshToken) {
          refreshToken = body.refreshToken;
        }
      } catch {
        // Ignored
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token is missing or expired. Please sign in again." },
        { status: 401 }
      );
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/auth/refresh`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const response = NextResponse.json(
        { message: errorData.message || "Session expired. Please log in again." },
        { status: 401 }
      );
      // Clean up invalidated cookies
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    }

    const data = await res.json();

    // Extract newly rotated access_token and refresh_token from Set-Cookie headers
    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;

    const cookieHeaders: string[] = [];
    if (typeof res.headers.getSetCookie === "function") {
      cookieHeaders.push(...res.headers.getSetCookie());
    }
    const singleSetCookie = res.headers.get("set-cookie");
    if (singleSetCookie) {
      cookieHeaders.push(singleSetCookie);
    }

    for (const cookieStr of cookieHeaders) {
      const accMatch = cookieStr.match(/access_token=([^;,\s]+)/);
      if (accMatch && !newAccessToken) {
        newAccessToken = accMatch[1];
      }
      const refMatch = cookieStr.match(/refresh_token=([^;,\s]+)/);
      if (refMatch && !newRefreshToken) {
        newRefreshToken = refMatch[1];
      }
    }

    const response = NextResponse.json({
      success: true,
      user: data,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    // Rotate access_token cookie
    if (newAccessToken) {
      response.cookies.set("access_token", newAccessToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    // Rotate refresh_token cookie
    if (newRefreshToken) {
      response.cookies.set("refresh_token", newRefreshToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (err: any) {
    console.error("Token refresh API route error:", err);
    return NextResponse.json(
      {
        message:
          "Unable to connect to authentication service on port 8080.",
      },
      { status: 503 }
    );
  }
}

