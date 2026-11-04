"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchSentFollowRequests,
  unfollowUser,
  FollowRequestItem,
} from "@/services/userService";
import FollowRequestsHeader from "@/components/FollowRequestsHeader";

export default function SentFollowRequestsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<FollowRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingIds, setCancellingIds] = useState<Record<string, boolean>>({});

  // 1. Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // 2. Fetch sent follow requests
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadRequests() {
      try {
        const res = await fetchSentFollowRequests(0, 50, token || undefined);
        if (isMounted) {
          setRequests(res.content);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load sent requests.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [user, token]);

  // 3. Handle Cancel Outgoing Request
  const handleCancelRequest = async (targetUserId: string) => {
    setCancellingIds((prev) => ({ ...prev, [targetUserId]: true }));

    const res = await unfollowUser(targetUserId, token || undefined);

    setCancellingIds((prev) => {
      const next = { ...prev };
      delete next[targetUserId];
      return next;
    });

    if (res.success) {
      setRequests((prev) =>
        prev.filter((r) => (r.followingId || r.id) !== targetUserId)
      );
    } else {
      alert(res.error || "Failed to cancel follow request.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Navigation Header */}
      <FollowRequestsHeader />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-zinc-800" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-zinc-800" />
                  <div className="h-3 w-20 rounded bg-zinc-800/60" />
                </div>
              </div>
              <div className="h-9 w-28 rounded-xl bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          <p>{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center shadow-xl backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 text-3xl mb-4 border border-zinc-700/50">
            ⏳
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Outgoing Follow Requests</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            When you send a follow request to a private account, it will appear here until approved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((item) => {
            const targetUserId = item.followingId || item.id || "";
            const isCancelling = Boolean(cancellingIds[targetUserId]);

            return (
              <div
                key={targetUserId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all hover:border-zinc-700"
              >
                {/* Target User Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <Link
                    href={`/user/${targetUserId}`}
                    className="relative group shrink-0"
                  >
                    {item.pictureUrl ? (
                      <img
                        src={item.pictureUrl}
                        alt={item.username}
                        className="h-12 w-12 rounded-full object-cover border border-zinc-700 group-hover:border-red-500 transition-colors"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base font-bold text-zinc-300 group-hover:border-red-500 transition-colors">
                        {item.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/user/${targetUserId}`}
                        className="text-sm sm:text-base font-bold text-white hover:text-red-400 transition-colors"
                      >
                        @{item.username}
                      </Link>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending Approval
                      </span>
                    </div>
                    {item.createdAt && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Sent on {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cancel Request Button */}
                <div className="self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => handleCancelRequest(targetUserId)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-red-600/20 text-zinc-300 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isCancelling ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

