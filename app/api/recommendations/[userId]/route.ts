import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "50";

    // Extract access token from Authorization header or cookie
    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    const recServiceUrl =
      process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL || "http://localhost:8083";
    const targetUrl = `${recServiceUrl}/api/v1/recommendations/${userId}?limit=${limit}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }

    const res = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: `Recommendation service returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Direct Recommendation API proxy error:", err);
    return NextResponse.json(
      {
        message:
          "Unable to connect to recommendation service on port 8083.",
      },
      { status: 503 }
    );
  }
}

