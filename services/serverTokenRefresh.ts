import { NextRequest, NextResponse } from "next/server";

export interface RotatedTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Attempts to rotate tokens server-side using the incoming refresh_token cookie.
 * Returns the new tokens or null if refresh fails.
 */
export async function attemptServerTokenRefresh(
  request: NextRequest
): Promise<RotatedTokens | null> {
  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (!refreshToken) return null;

  try {
    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const res = await fetch(`${userServiceUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    if (!res.ok) return null;

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
      if (accMatch && !newAccessToken) newAccessToken = accMatch[1];
      const refMatch = cookieStr.match(/refresh_token=([^;,\s]+)/);
      if (refMatch && !newRefreshToken) newRefreshToken = refMatch[1];
    }

    if (newAccessToken && newRefreshToken) {
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    }
  } catch (e) {
    console.error("Server token refresh error:", e);
  }
  return null;
}

/**
 * Attaches rotated cookies to an outgoing NextResponse so client browser stays updated
 */
export function applyRotatedCookies(
  response: NextResponse,
  tokens: RotatedTokens
): void {
  response.cookies.set("access_token", tokens.accessToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  response.cookies.set("refresh_token", tokens.refreshToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
}

