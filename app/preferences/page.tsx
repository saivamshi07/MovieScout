"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const INDUSTRY_OPTIONS = [
  { code: "HOLLYWOOD", label: "Hollywood", sub: "English" },
  { code: "TOLLYWOOD", label: "Tollywood", sub: "Telugu" },
  { code: "BOLLYWOOD", label: "Bollywood", sub: "Hindi" },
  { code: "MOLLYWOOD", label: "Mollywood", sub: "Malayalam" },
  { code: "KOLLYWOOD", label: "Kollywood", sub: "Tamil" },
];

const GENRE_OPTIONS = [
  { code: "ACTION", label: "Action" },
  { code: "ADVENTURE", label: "Adventure" },
  { code: "THRILLER", label: "Thriller" },
  { code: "HORROR", label: "Horror" },
  { code: "DRAMA", label: "Drama" },
  { code: "COMEDY", label: "Comedy" },
  { code: "CRIME", label: "Crime" },
  { code: "DOCUMENTARY", label: "Documentary" },
  { code: "FAMILY", label: "Family" },
  { code: "ROMANCE", label: "Romance" },
  { code: "SCIENCE_FICTION", label: "Sci-Fi" },
];

function PreferencesContent() {
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const isFromProfile = fromParam === "profile";
  const isFromHome = fromParam === "home";
  const isEditing = isFromProfile || isFromHome;

  useEffect(() => {
    let isMounted = true;

    async function fetchPreferences() {
      if (isAuthLoading) return;

      try {
        setIsLoadingPreferences(true);
        const res = await fetch("/api/movies/preferences", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            if (Array.isArray(data.industries) && data.industries.length > 0) {
              setSelectedIndustries(new Set(data.industries));
            }
            if (Array.isArray(data.genres) && data.genres.length > 0) {
              setSelectedGenres(new Set(data.genres));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user preferences:", err);
      } finally {
        if (isMounted) {
          setIsLoadingPreferences(false);
        }
      }
    }

    fetchPreferences();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, token]);

  const toggleIndustry = (code: string) => {
    setSelectedIndustries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
    if (error) setError(null);
  };

  const toggleGenre = (code: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
    if (error) setError(null);
  };

  const totalSelected = selectedIndustries.size + selectedGenres.size;
  const canSave = totalSelected >= 1;

  const handleCancelOrSkip = () => {
    if (isFromProfile) {
      if (user?.id) {
        router.push(`/user/${user.id}`);
      } else {
        router.back();
      }
    } else {
      router.push("/home");
      router.refresh();
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    setError(null);

    // If user selected only industry, default genres to all genres so backend @NotEmpty passes
    const finalIndustries =
      selectedIndustries.size > 0
        ? Array.from(selectedIndustries)
        : INDUSTRY_OPTIONS.map((i) => i.code);

    const finalGenres =
      selectedGenres.size > 0
        ? Array.from(selectedGenres)
        : GENRE_OPTIONS.map((g) => g.code);

    try {
      const res = await fetch("/api/movies/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          industries: finalIndustries,
          genres: finalGenres,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to persist preferences.");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        if (isFromProfile) {
          if (user?.id) {
            router.push(`/user/${user.id}`);
          } else {
            router.back();
          }
        } else {
          router.push("/home");
        }
        router.refresh();
      }, 350);
    } catch (err: any) {
      console.error("Save preferences error:", err);
      setError(err.message || "Failed to save preferences.");
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingPreferences) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        <p className="text-xs text-zinc-400 font-medium">Loading your preferences...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background ambient red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 space-y-8">
        {/* Curated Experience Header Info */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-950/60 px-3.5 py-1 text-xs font-semibold text-red-400 border border-red-800/40 uppercase tracking-wider mb-3">
            {isEditing ? "Edit Your Preferences" : "Curate Your Experience"}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            {isEditing ? (
              <>
                Update Your <span className="text-red-500">Preferences</span>
              </>
            ) : (
              <>
                Select Your <span className="text-red-500">Preferences</span>
              </>
            )}
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
            {isEditing
              ? "Modify your favorite cinema industries and movie genres. Your personalized feeds and recommendations will adapt to these choices."
              : "Select to have a curated experience! Choose your favorite cinema industries and genres to personalize your home screen feeds and recommendations."}
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs sm:text-sm text-red-200 text-left">
              {error}
            </div>
          )}

          {/* Success Banner */}
          {saveSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs sm:text-sm text-emerald-200 text-center font-medium">
              ✓ Preferences saved successfully! Redirecting...
            </div>
          )}
        </div>

        {/* 1. Industry Selection */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Cinema Industries
            </h2>
            <span className="text-xs text-zinc-500">
              {selectedIndustries.size} selected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDUSTRY_OPTIONS.map((ind) => {
              const isSelected = selectedIndustries.has(ind.code);
              return (
                <button
                  key={ind.code}
                  type="button"
                  onClick={() => toggleIndustry(ind.code)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all duration-200 text-center cursor-pointer ${
                    isSelected
                      ? "border-red-500 bg-red-600/15 text-white shadow-md shadow-red-600/20"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">{ind.label}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">{ind.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Genre Selection */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Movie Genres
            </h2>
            <span className="text-xs text-zinc-500">
              {selectedGenres.size} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {GENRE_OPTIONS.map((genre) => {
              const isSelected = selectedGenres.has(genre.code);
              return (
                <button
                  key={genre.code}
                  type="button"
                  onClick={() => toggleGenre(genre.code)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-red-500 bg-red-600 text-white shadow-md shadow-red-600/25"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {genre.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: Cancel/Skip and Save */}
        <div className="flex items-center justify-between gap-4 pt-2">
          {/* Cancel or Skip Button */}
          <button
            type="button"
            onClick={handleCancelOrSkip}
            className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer border border-transparent hover:border-zinc-700"
          >
            {isFromHome
              ? "← Back to Home"
              : isFromProfile
              ? "← Back to Profile"
              : "Skip for Now →"}
          </button>

          {/* Save Button */}
          <button
            type="button"
            disabled={!canSave || isSaving || saveSuccess}
            onClick={handleSave}
            className={`px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all duration-200 shadow-lg flex items-center gap-2 ${
              canSave && !isSaving && !saveSuccess
                ? "bg-red-600 hover:bg-red-500 active:scale-95 shadow-red-600/30 cursor-pointer"
                : "bg-zinc-800/60 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-50"
            }`}
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Preferences...</span>
              </>
            ) : saveSuccess ? (
              <span>Saved!</span>
            ) : (
              <span>Save Preferences ({totalSelected})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        </div>
      }
    >
      <PreferencesContent />
    </Suspense>
  );
}
