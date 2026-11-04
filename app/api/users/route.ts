import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

/**
 * Batch resolve user details by IDs
 * GET /api/users?ids=uuid1,uuid2,...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids || ids.trim().length === 0) {
      return NextResponse.json([]);
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users?ids=${ids}`;

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
      console.warn(`Batch users lookup failed with status: ${res.status}`);
      return NextResponse.json([]);
    }

    const data = await res.json();
    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }
    return response;
  } catch (err: any) {
    console.error("Batch users GET proxy error:", err);
    return NextResponse.json([]);
  }
}

