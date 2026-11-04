"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthContextType, RegisterData, User } from "@/types/auth";
import { getTokenExpiryMs, refreshAccessToken } from "@/services/apiClient";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "cineverse_user";
const TOKEN_STORAGE_KEY = "cineverse_token";
const REFRESH_TOKEN_STORAGE_KEY = "cineverse_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout request error:", e);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
    }
  }, []);

  /**
   * Schedules a proactive token refresh 1 minute before the access token expires.
   */
  const scheduleTokenRefresh = useCallback(
    (currentToken: string) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      const expiryMs = getTokenExpiryMs(currentToken);
      if (!expiryMs) return;

      const msRemaining = expiryMs - Date.now();
      // Rotate 1 minute before expiry (or in 5 seconds if already close to expiry)
      const refreshInMs = Math.max(msRemaining - 60 * 1000, 5000);

      console.log(
        `[AuthContext] Proactive token rotation scheduled in ${Math.round(refreshInMs / 1000)}s`
      );

      refreshTimerRef.current = setTimeout(async () => {
        console.log("[AuthContext] Triggering scheduled token rotation...");
        const rotatedToken = await refreshToken();
        if (!rotatedToken) {
          console.warn("[AuthContext] Token rotation failed or session expired.");
        }
      }, refreshInMs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Refreshes the session using the refresh token (single-flight mutex protected).
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      setToken(newAccessToken);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // Ignored
        }
      }
      scheduleTokenRefresh(newAccessToken);
      return newAccessToken;
    } else {
      await logout();
      return null;
    }
  }, [logout, scheduleTokenRefresh]);

  // Restore session from localStorage on initial mount and setup token rotation
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (storedToken) {
        setToken(storedToken);

        // Synchronize cookie for server-side rendering
        if (!document.cookie.includes("access_token=")) {
          document.cookie = `access_token=${storedToken}; path=/; max-age=604800; SameSite=Lax`;
        }

        // Check if token is already expired or expiring within 60 seconds
        const expiryMs = getTokenExpiryMs(storedToken);
        if (expiryMs && expiryMs - Date.now() <= 60 * 1000) {
          console.log("[AuthContext] Stored token expired/expiring soon. Rotating now...");
          refreshToken();
        } else {
          scheduleTokenRefresh(storedToken);
        }
      }
    } catch (e) {
      console.error("Failed to parse stored user session:", e);
    } finally {
      setIsLoading(false);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [refreshToken, scheduleTokenRefresh]);

  // Check token validity whenever tab is focused or returns from background
  useEffect(() => {
    const handleFocus = () => {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken) {
        const expiryMs = getTokenExpiryMs(currentToken);
        if (expiryMs && expiryMs - Date.now() <= 60 * 1000) {
          console.log("[AuthContext] Window focused with near-expiry token. Rotating...");
          refreshToken();
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [refreshToken]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.message || "Invalid username or password",
        };
      }

      const loggedInUser: User = data.user || data;
      const accessToken: string | null = data.accessToken || null;
      const refreshTokenValue: string | null = data.refreshToken || null;

      setUser(loggedInUser);
      setToken(accessToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));

      if (accessToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        document.cookie = `access_token=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
        scheduleTokenRefresh(accessToken);
      }

      if (refreshTokenValue) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshTokenValue);
      }

      return { success: true };
    } catch (err: any) {
      console.error("Login request failed:", err);
      return {
        success: false,
        error: "Unable to reach the server. Please check your network connection.",
      };
    }
  };

  const register = async (registerData: RegisterData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.message || "Registration failed. Please check your details.",
        };
      }

      const newUser: User = data.user || data;
      const accessToken: string | null = data.accessToken || null;
      const refreshTokenValue: string | null = data.refreshToken || null;

      setUser(newUser);
      setToken(accessToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));

      if (accessToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        document.cookie = `access_token=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
        scheduleTokenRefresh(accessToken);
      }

      if (refreshTokenValue) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshTokenValue);
      }

      return { success: true };
    } catch (err: any) {
      console.error("Registration request failed:", err);
      return {
        success: false,
        error: "Unable to reach the server. Please check your network connection.",
      };
    }
  };

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist updated user to localStorage:", e);
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        refreshToken,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
