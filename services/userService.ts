import { User, UserSearchItem } from "@/types/auth";
import { resolveToken } from "@/services/movieService";

export interface UserFollowItem {
  id: string;
  username: string;
  pictureUrl?: string | null;
}

export interface FollowStatusResponse {
  currentUserId?: string;
  targetUserId?: string;
  isFollowing: boolean;
  status: "ACCEPTED" | "PENDING" | "REJECTED" | null;
}

export interface FollowRequestItem {
  id?: string;
  followerId?: string;
  followingId?: string;
  username: string;
  pictureUrl?: string | null;
  status: "ACCEPTED" | "PENDING" | "REJECTED";
  createdAt?: string;
}

/**
 * Fetch a user profile by UUID
 */
export async function fetchUserProfile(
  userId: string,
  token?: string
): Promise<User | null> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    // When called client-side, hit our Next.js API proxy route
    const baseUrl =
      typeof window !== "undefined"
        ? ""
        : process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";

    const url =
      typeof window !== "undefined"
        ? `/api/users/${userId}`
        : `${baseUrl}/api/v1/users/${userId}`;

    const res = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`fetchUserProfile failed with status ${res.status}`);
      return null;
    }

    const data: User = await res.json();
    return data;
  } catch (err) {
    console.error(`Error fetching user profile (${userId}):`, err);
    return null;
  }
}

/**
 * Update authenticated user profile details
 */
export async function updateUserProfile(
  data: {
    username?: string;
    bio?: string;
    pictureUrl?: string;
    isPrivate?: boolean;
    isEmailPrivate?: boolean;
    isPhonePrivate?: boolean;
    isPicturePrivate?: boolean;
  },
  token?: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    const resData = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: resData.message || "Failed to update profile",
      };
    }

    return {
      success: true,
      user: resData,
    };
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    return {
      success: false,
      error: err.message || "Network error updating profile",
    };
  }
}

/**
 * Generate S3 / MinIO presigned URL and upload avatar image binary
 */
export async function uploadAvatar(
  file: File,
  token?: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    // 1. Request presigned upload URL from user-service
    const presignRes = await fetch("/api/users/me/avatar/presigned-url", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        fileSizeBytes: file.size,
      }),
    });

    if (!presignRes.ok) {
      const presignErr = await presignRes.json().catch(() => ({}));
      return {
        success: false,
        error: presignErr.message || "Failed to get upload authorization",
      };
    }

    const { uploadUrl, fileUrl } = await presignRes.json();

    // 2. Direct binary PUT upload to S3 / MinIO
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "image/jpeg",
      },
      body: file,
    });

    if (!uploadRes.ok) {
      return {
        success: false,
        error: `Storage upload failed with status ${uploadRes.status}`,
      };
    }

    // 3. Update the user profile with the permanent pictureUrl
    const updateRes = await updateUserProfile({ pictureUrl: fileUrl }, token);
    if (!updateRes.success) {
      return {
        success: false,
        error: updateRes.error || "Failed to attach uploaded image to profile",
      };
    }

    return {
      success: true,
      fileUrl,
    };
  } catch (err: any) {
    console.error("uploadAvatar error:", err);
    return {
      success: false,
      error:
        err.message ||
        "Could not connect to storage server. Please verify MinIO is running.",
    };
  }
}

/**
 * Fetch relationship follow status (ACCEPTED, PENDING, REJECTED, or null)
 */
export async function fetchFollowStatus(
  targetUserId: string,
  viewerId?: string,
  token?: string
): Promise<FollowStatusResponse> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const query = viewerId ? `?viewerId=${viewerId}` : "";
    const res = await fetch(`/api/users/${targetUserId}/follow-status${query}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { isFollowing: false, status: null };
    }

    const data: FollowStatusResponse = await res.json();
    return data;
  } catch (err) {
    console.error("fetchFollowStatus error:", err);
    return { isFollowing: false, status: null };
  }
}

/**
 * Check if the viewer is following the target user (backward compatible wrapper)
 */
export async function checkFollowStatus(
  targetUserId: string,
  viewerId?: string,
  token?: string
): Promise<boolean> {
  if (!viewerId) return false;
  const res = await fetchFollowStatus(targetUserId, viewerId, token);
  return res.isFollowing || res.status === "ACCEPTED";
}

/**
 * Follow a target user
 */
export async function followUser(
  targetUserId: string,
  token?: string
): Promise<{ success: boolean; status?: "ACCEPTED" | "PENDING"; error?: string }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const res = await fetch(`/api/users/${targetUserId}/follow`, {
      method: "POST",
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.message || "Failed to follow user",
      };
    }

    return {
      success: true,
      status: (data.status as "ACCEPTED" | "PENDING") || "ACCEPTED",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error following user",
    };
  }
}

/**
 * Unfollow a target user (or cancel pending follow request)
 */
export async function unfollowUser(
  targetUserId: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const res = await fetch(`/api/users/${targetUserId}/follow`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.message || "Failed to unfollow user",
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error unfollowing user",
    };
  }
}

/**
 * Remove a follower from the current authenticated user's followers list
 * DELETE /api/users/followers/{followerId}
 */
export async function removeFollower(
  followerId: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const res = await fetch(`/api/users/followers/${followerId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.message || "Failed to remove follower",
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error removing follower",
    };
  }
}

/**
 * Fetch incoming pending follow requests for the current user
 */
export async function fetchPendingFollowRequests(
  page: number = 0,
  size: number = 20,
  token?: string
): Promise<{ content: FollowRequestItem[]; totalElements: number }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const res = await fetch(
      `/api/users/me/follow-requests/pending?page=${page}&size=${size}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { content: [], totalElements: 0 };
    }

    const data = await res.json();
    return {
      content: Array.isArray(data.content) ? data.content : [],
      totalElements: data.totalElements || (data.content?.length ?? 0),
    };
  } catch (err) {
    console.error("fetchPendingFollowRequests error:", err);
    return { content: [], totalElements: 0 };
  }
}

/**
 * Fetch outgoing sent follow requests made by the current user
 */
export async function fetchSentFollowRequests(
  page: number = 0,
  size: number = 20,
  token?: string
): Promise<{ content: FollowRequestItem[]; totalElements: number }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const res = await fetch(
      `/api/users/me/follow-requests/sent?page=${page}&size=${size}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { content: [], totalElements: 0 };
    }

    const data = await res.json();
    return {
      content: Array.isArray(data.content) ? data.content : [],
      totalElements: data.totalElements || (data.content?.length ?? 0),
    };
  } catch (err) {
    console.error("fetchSentFollowRequests error:", err);
    return { content: [], totalElements: 0 };
  }
}

/**
 * Respond to an incoming follow request (Accept or Reject)
 */
export async function respondToFollowRequest(
  followerId: string,
  accept: boolean,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const resolvedToken = await resolveToken(token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith("Bearer ")
      ? resolvedToken
      : `Bearer ${resolvedToken}`;
  }

  try {
    const res = await fetch(`/api/users/follows/respond`, {
      method: "POST",
      headers,
      body: JSON.stringify({ followerId, accept }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error:
          data.message ||
          `Failed to ${accept ? "accept" : "reject"} follow request`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error responding to follow request",
    };
  }
}

/**
 * Fetch followers of a user
 */
export async function fetchFollowers(userId: string): Promise<UserFollowItem[]> {
  try {
    const res = await fetch(`/api/users/${userId}/followers`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("fetchFollowers error:", err);
    return [];
  }
}

/**
 * Fetch users that a user is following
 */
export async function fetchFollowing(userId: string): Promise<UserFollowItem[]> {
  try {
    const res = await fetch(`/api/users/${userId}/following`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("fetchFollowing error:", err);
    return [];
  }
}

/**
 * Search users by query string (fuzzy trigram matching on username/bio)
 */
export async function searchUsers(
  query: string,
  page: number = 0,
  size: number = 10
): Promise<UserSearchItem[]> {
  if (!query.trim()) return [];

  try {
    const res = await fetch(
      `/api/users/search?q=${encodeURIComponent(query.trim())}&page=${page}&size=${size}`,
      { cache: "no-store" }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return data.content || [];
  } catch (err) {
    console.error("searchUsers error:", err);
    return [];
  }
}

/**
 * Batch resolve multiple users by UUIDs using GET /api/users?ids=...
 * Returns a dictionary mapping userId -> { id, username, pictureUrl }
 */
export async function fetchUsersByIds(
  ids: string[],
  token?: string
): Promise<Record<string, { id: string; username: string; pictureUrl?: string | null }>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  try {
    const isClient = typeof window !== "undefined";
    const userServiceUrl =
      process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8080";
    const url = isClient
      ? `/api/users?ids=${uniqueIds.join(",")}`
      : `${userServiceUrl}/api/v1/users?ids=${uniqueIds.join(",")}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const resolvedToken = await resolveToken(token);
    if (resolvedToken) {
      headers["Authorization"] = resolvedToken.startsWith("Bearer ")
        ? resolvedToken
        : `Bearer ${resolvedToken}`;
    }

    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      console.warn(`fetchUsersByIds failed with status ${res.status}`);
      return {};
    }

    const usersList: Array<{ id: string; username: string; pictureUrl?: string | null }> =
      await res.json();

    const map: Record<string, { id: string; username: string; pictureUrl?: string | null }> = {};
    if (Array.isArray(usersList)) {
      for (const u of usersList) {
        if (u && u.id) {
          const item = {
            id: String(u.id),
            username: u.username || "CineVerse Member",
            pictureUrl: u.pictureUrl || null,
          };
          map[String(u.id)] = item;
          map[String(u.id).toLowerCase()] = item;
        }
      }
    }
    return map;
  } catch (err) {
    console.error("fetchUsersByIds error:", err);
    return {};
  }
}


