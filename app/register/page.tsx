"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory check: either email or username must be provided
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername && !trimmedEmail) {
      setError("Please provide at least a username or email address.");
      return;
    }

    // If username is omitted, use the email prefix so backend validation succeeds
    const finalUsername = trimmedUsername || (trimmedEmail ? trimmedEmail.split("@")[0] : "");

    if (finalUsername.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    // 2. Password validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // 3. Confirm password check
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await register({
      username: finalUsername,
      email: trimmedEmail || undefined,
      phone: phone.trim() || undefined,
      password,
    });

    if (result.success) {
      // On success, navigate to the preferences curation route!
      router.push("/preferences");
    } else {
      setError(result.error || "Registration failed. Please check your information.");
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
            href="/login"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span> Back to Login
          </Link>
        </div>

        {/* Register Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Create an Account on <span className="text-red-500">CineVerse</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400">
              Join CineVerse to curate personalized feeds and track your watchlist.
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
                <span className="font-semibold block">Registration Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
              >
                Username <span className="text-red-400">*</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Choose a username (min 3 chars)"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
              >
                Phone Number <span className="text-zinc-500 text-[10px] lowercase">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="+1 555-0199"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
              >
                Password <span className="text-red-400">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Re-enter Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2"
              >
                Re-enter Password <span className="text-red-400">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base text-white bg-red-600 hover:bg-red-500 active:scale-[0.99] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Register</span>
              )}
            </button>
          </form>

          {/* Already have an account */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <p className="text-xs sm:text-sm text-zinc-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-red-500 hover:text-red-400 transition-colors ml-1"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

