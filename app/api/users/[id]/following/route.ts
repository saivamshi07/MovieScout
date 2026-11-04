import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "50";

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/${id}/following?page=${page}&size=${size}`;

    const res = await fetch(targetUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    const formatted = (data.content || []).map((item: any) => ({
      id: item.followingId,
      username: item.username,
      pictureUrl: item.pictureUrl,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("Get following API proxy error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

