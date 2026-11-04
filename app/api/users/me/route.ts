import { NextRequest, NextResponse } from "next/server";
import {
  attemptServerTokenRefresh,
  applyRotatedCookies,
} from "@/services/serverTokenRefresh";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract access token from Authorization header or cookie
    let token = request.headers.get("Authorization");
    if (!token) {
      const cookieToken = request.cookies.get("access_token")?.value;
      if (cookieToken) {
        token = `Bearer ${cookieToken}`;
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required to update profile." },
        { status: 401 }
      );
    }

    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const targetUrl = `${userServiceUrl}/api/v1/users/me`;

    // Ensure privacy fields are reflected in publicProfiles JSONB as well
    if (body.isPrivate !== undefined || body.isEmailPrivate !== undefined || body.isPhonePrivate !== undefined) {
      body.publicProfiles = {
        ...(body.publicProfiles || {}),
        ...(body.isPrivate !== undefined ? { isPrivate: body.isPrivate } : {}),
        ...(body.isEmailPrivate !== undefined ? { isEmailPrivate: body.isEmailPrivate } : {}),
        ...(body.isPhonePrivate !== undefined ? { isPhonePrivate: body.isPhonePrivate } : {}),
      };
    }

    let res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    let rotatedTokens = null;
    if (res.status === 401) {
      rotatedTokens = await attemptServerTokenRefresh(request);
      if (rotatedTokens) {
        token = `Bearer ${rotatedTokens.accessToken}`;
        res = await fetch(targetUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(body),
        });
      }
    }

    const data = await res.json().catch(() => ({}));
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

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to update profile." },
        { status: res.status }
      );
    }

    const response = NextResponse.json(data);
    if (rotatedTokens) {
      applyRotatedCookies(response, rotatedTokens);
    }

    return response;
  } catch (err: any) {
    console.error("Update profile API proxy error:", err);
    return NextResponse.json(
      { message: "Unable to connect to user-service on port 8080." },
      { status: 503 }
    );
  }
}

