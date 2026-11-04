import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/auth/logout`;

    const cookies = request.headers.get("cookie") || "";
    await fetch(targetUrl, {
      method: "POST",
      headers: {
        Cookie: cookies,
      },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  } catch (err) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }
}

