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
    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/${id}`;

    // Extract access token from Authorization header or cookie if present
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
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || `User not found (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    if (data) {
      if (data.isPrivate === undefined && data.private !== undefined) {
        data.isPrivate = data.private;
      }
      if (data.publicProfiles) {
        if (data.isEmailPrivate === undefined && data.publicProfiles.isEmailPrivate !== undefined) {
          data.isEmailPrivate = data.publicProfiles.isEmailPrivate;
        }
        if (data.isPhonePrivate === undefined && data.publicProfiles.isPhonePrivate !== undefined) {
          data.isPhonePrivate = data.publicProfiles.isPhonePrivate;
        }
        if (data.isPrivate === undefined && data.publicProfiles.isPrivate !== undefined) {
          data.isPrivate = data.publicProfiles.isPrivate;
        }
      }
    }
    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }

    return response;
  } catch (err: any) {
    console.error("Get user by ID API proxy error:", err);
    return NextResponse.json(
      { message: "Unable to connect to user-service on port 8080." },
      { status: 503 }
    );
  }
}

