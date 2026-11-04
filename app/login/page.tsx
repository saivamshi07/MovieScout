"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await login(username.trim(), password);

    if (result.success) {
      router.push("/home");
      router.refresh();
    } else {
      setError(result.error || "Invalid username or password. Please try again.");
      setIsSubmitting(false);
      // Stays on the same page!
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span> Back to Home
          </Link>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sign In to <span className="text-red-500">CineVerse</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400">
              Enter your credentials to access your watchlist and preferences.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs sm:text-sm text-red-200 flex items-start gap-2.5 animate-in fade-in duration-200">
              <svg
                className="h-5 w-5 text-red-400 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <span className="font-semibold block">Authentication Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Identifier */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
              >
                Username or Email
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter your username or email"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base text-white bg-red-600 hover:bg-red-500 active:scale-[0.99] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Sign Up / Register Button */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <p className="text-xs sm:text-sm text-zinc-400">
              Don't have an account yet?
            </p>
            <Link
              href="/register"
              className="mt-2.5 inline-flex w-full items-center justify-center py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 hover:text-white border border-zinc-700/60 transition-all duration-200 shadow cursor-pointer"
            >
              Sign Up / Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

