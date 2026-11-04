import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, phone, password } = body;

    // user-service requires username (min 3) and password (min 8)
    const finalUsername = username?.trim() || email?.split("@")[0] || "user";

    const payload = {
      username: finalUsername,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      password,
    };

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/auth/register`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Registration failed. Please check your details." },
        { status: res.status }
      );
    }

    // Extract access_token and refresh_token from Set-Cookie headers
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

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
      if (accMatch && !accessToken) {
        accessToken = accMatch[1];
      }
      const refMatch = cookieStr.match(/refresh_token=([^;,\s]+)/);
      if (refMatch && !refreshToken) {
        refreshToken = refMatch[1];
      }
    }

    // Prepare response with user data, accessToken, and refreshToken
    const response = NextResponse.json({
      user: data,
      accessToken,
      refreshToken,
    });

    // Explicitly set cookies on NextResponse so Next.js serializes them to the client browser
    if (accessToken) {
      response.cookies.set("access_token", accessToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    if (refreshToken) {
      response.cookies.set("refresh_token", refreshToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (err: any) {
    console.error("Register API route error:", err);
    return NextResponse.json(
      {
        message:
          "Unable to connect to authentication service. Please ensure user-service is running on port 8080.",
      },
      { status: 503 }
    );
  }
}
