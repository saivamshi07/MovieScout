import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

/**
 * DELETE: Remove a follower from current user's followers list
 * Route: /api/users/followers/[id]
 * Target: DELETE http://localhost:8080/api/v1/users/followers/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required to remove a follower." },
        { status: 401 }
      );
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/followers/${id}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };

    let res = await fetch(targetUrl, {
      method: "DELETE",
      headers,
    });

    let rotatedTokens = null;
    if (res.status === 401) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        headers["Authorization"] = `Bearer ${rotatedTokens.accessToken}`;
        res = await fetch(targetUrl, {
          method: "DELETE",
          headers,
        });
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || `Failed to remove follower (${res.status})` },
        { status: res.status }
      );
    }

    const response = new NextResponse(null, { status: 204 });
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }
    return response;
  } catch (err: any) {
    console.error("Remove follower API proxy error:", err);
    return NextResponse.json(
      { message: "Internal server error removing follower." },
      { status: 500 }
    );
  }
}

