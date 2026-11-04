import { NextRequest, NextResponse } from "next/server";

/**
 * POST: Forward rating submission directly to recommendation-service
 * Route: /api/recommendations/ratings
 * Target: http://localhost:8083/api/v1/ratings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const recServiceUrl =
      process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL || "http://localhost:8083";
    const targetUrl = `${recServiceUrl}/api/v1/ratings`;

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

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: String(body.userId),
        itemId: String(body.itemId),
        rating: Number(body.rating),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || `Recommendation rating sync failed (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Recommendations ratings POST proxy error:", err);
    return NextResponse.json(
      { message: "Internal server error syncing rating to recommendation service." },
      { status: 500 }
    );
  }
}

