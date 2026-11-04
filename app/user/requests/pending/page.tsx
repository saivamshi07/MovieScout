"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchPendingFollowRequests,
  respondToFollowRequest,
  FollowRequestItem,
} from "@/services/userService";
import FollowRequestsHeader from "@/components/FollowRequestsHeader";

export default function PendingFollowRequestsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<FollowRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<Record<string, "accept" | "reject">>({});
  const [resolvedStatus, setResolvedStatus] = useState<Record<string, "ACCEPTED" | "REJECTED">>({});

  // 1. Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // 2. Fetch pending follow requests
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadRequests() {
      try {
        const res = await fetchPendingFollowRequests(0, 50, token || undefined);
        if (isMounted) {
          setRequests(res.content);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load pending requests.");
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

  // 3. Handle Accept / Reject Decision
  const handleDecision = async (followerId: string, accept: boolean) => {
    setActionInProgress((prev) => ({ ...prev, [followerId]: accept ? "accept" : "reject" }));

    const res = await respondToFollowRequest(followerId, accept, token || undefined);

    setActionInProgress((prev) => {
      const next = { ...prev };
      delete next[followerId];
      return next;
    });

    if (res.success) {
      setResolvedStatus((prev) => ({
        ...prev,
        [followerId]: accept ? "ACCEPTED" : "REJECTED",
      }));

      // Remove item after a short delay so user sees feedback
      setTimeout(() => {
        setRequests((prev) => prev.filter((r) => (r.followerId || r.id) !== followerId));
      }, 1200);
    } else {
      alert(res.error || `Failed to ${accept ? "accept" : "reject"} request.`);
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
              <div className="flex gap-2">
                <div className="h-9 w-20 rounded-xl bg-zinc-800" />
                <div className="h-9 w-20 rounded-xl bg-zinc-800" />
              </div>
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
            📬
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Pending Follow Requests</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            When someone requests to follow your private profile, their request will appear here for your approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((item) => {
            const followerId = item.followerId || item.id || "";
            const currentAction = actionInProgress[followerId];
            const resolved = resolvedStatus[followerId];

            return (
              <div
                key={followerId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all hover:border-zinc-700"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <Link
                    href={`/user/${followerId}`}
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
                    <Link
                      href={`/user/${followerId}`}
                      className="text-sm sm:text-base font-bold text-white hover:text-red-400 transition-colors"
                    >
                      @{item.username}
                    </Link>
                    {item.createdAt && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Requested on {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons or Resolved Badge */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {resolved === "ACCEPTED" ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Accepted
                    </span>
                  ) : resolved === "REJECTED" ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Declined
                    </span>
                  ) : (
                    <>
                      {/* Accept Button */}
                      <button
                        type="button"
                        disabled={Boolean(currentAction)}
                        onClick={() => handleDecision(followerId, true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {currentAction === "accept" ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Confirm
                          </>
                        )}
                      </button>

                      {/* Reject Button */}
                      <button
                        type="button"
                        disabled={Boolean(currentAction)}
                        onClick={() => handleDecision(followerId, false)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {currentAction === "reject" ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

