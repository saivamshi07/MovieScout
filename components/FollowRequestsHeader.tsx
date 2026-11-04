"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function FollowRequestsHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isPendingActive = pathname.includes("/pending");
  const isSentActive = pathname.includes("/sent");

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={user?.id ? `/user/${user.id}` : "/home"}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <span>←</span> Back to Profile
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
              📬
            </span>
            Follow Requests
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage your incoming follower requests and outgoing pending approvals.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
          <Link
            href="/user/requests/pending"
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              isPendingActive
                ? "bg-red-600 text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Received
          </Link>
          <Link
            href="/user/requests/sent"
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              isSentActive
                ? "bg-red-600 text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sent
          </Link>
        </div>
      </div>
    </div>
  );
}

