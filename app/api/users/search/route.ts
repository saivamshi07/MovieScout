import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "20";

    if (!query.trim()) {
      return NextResponse.json({
        content: [],
        totalElements: 0,
        totalPages: 0,
      });
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/search?q=${encodeURIComponent(
      query.trim()
    )}&page=${page}&size=${size}`;

    const res = await fetch(targetUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { content: [], totalElements: 0, totalPages: 0 },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("User search API proxy error:", err);
    return NextResponse.json(
      { content: [], totalElements: 0, totalPages: 0 },
      { status: 503 }
    );
  }
}

