/**
 * Client-Side API & Token Rotation Utility
 * Provides single-flight token rotation and automatic 401 retry interceptor.
 */

let activeRefreshPromise: Promise<string | null> | null = null;

/**
 * Extracts expiration timestamp (milliseconds) from JWT payload without external dependencies
 */
export function getTokenExpiryMs(jwtToken: string): number | null {
  try {
    const parts = jwtToken.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Single-flight token rotation mechanism.
 * If multiple requests trigger refresh concurrently, they share a single in-flight Promise
 * to prevent race conditions and invalidation of rotated refresh tokens in Redis.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const storedRefreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("cineverse_refresh_token")
          : null;

      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!res.ok) {
        // If refresh fails, session is expired
        if (typeof window !== "undefined") {
          localStorage.removeItem("cineverse_token");
          localStorage.removeItem("cineverse_refresh_token");
          localStorage.removeItem("cineverse_user");
          document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
        }
        return null;
      }

      const data = await res.json();
      const newAccessToken: string | null = data.accessToken;
      const newRefreshToken: string | null = data.refreshToken;
      const updatedUser = data.user;

      if (typeof window !== "undefined") {
        if (newAccessToken) {
          localStorage.setItem("cineverse_token", newAccessToken);
          document.cookie = `access_token=${newAccessToken}; path=/; max-age=604800; SameSite=Lax`;
        }
        if (newRefreshToken) {
          localStorage.setItem("cineverse_refresh_token", newRefreshToken);
        }
        if (updatedUser) {
          localStorage.setItem("cineverse_user", JSON.stringify(updatedUser));
        }
      }

      console.log("[apiClient] Token successfully rotated via refresh token.");
      return newAccessToken;
    } catch (err) {
      console.error("[apiClient] Token refresh error:", err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Universal fetch wrapper with automatic Authorization header injection
 * and seamless single-attempt retry on 401 Unauthorized via token rotation.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("cineverse_token");
  }

  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(input, { ...init, headers });

  // If 401 Unauthorized, attempt token rotation and retry the request once
  if (res.status === 401 && typeof window !== "undefined") {
    console.warn("[apiClient] 401 Unauthorized encountered. Attempting token rotation...");
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(input, { ...init, headers });
    }
  }

  return res;
}

