"use client";

import { useEffect, useState, useTransition, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { User, UserSearchItem } from "@/types/auth";
import { Movie } from "@/types/movie";
import MovieCard from "@/components/MovieCard";
import UserReviewsSection from "@/components/UserReviewsSection";
import { fetchMyWatchlist, fetchUserWatchlist } from "@/services/movieService";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadAvatar,
  fetchFollowStatus,
  checkFollowStatus,
  followUser,
  unfollowUser,
  removeFollower,
  searchUsers,
  fetchFollowers,
  fetchFollowing,
  UserFollowItem,
} from "@/services/userService";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function UserProfilePage({ params }: ProfilePageProps) {
  const { id: profileUserId } = use(params);
  const { user: currentUser, token, logout, updateUser } = useAuth();
  const router = useRouter();

  // Profile data states
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Follow relationship states
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followStatus, setFollowStatus] = useState<"ACCEPTED" | "PENDING" | "REJECTED" | null>(null);
  const [isFollowHovered, setIsFollowHovered] = useState<boolean>(false);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);

  // Edit Profile Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPictureUrl, setEditPictureUrl] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editIsEmailPrivate, setEditIsEmailPrivate] = useState(false);
  const [editIsPhonePrivate, setEditIsPhonePrivate] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Avatar Upload states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [manualPictureUrl, setManualPictureUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // User Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startTransition] = useTransition();

  // Followers / Following Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<"followers" | "following" | null>(null);
  const [dropdownList, setDropdownList] = useState<UserFollowItem[]>([]);
  const [isDropdownLoading, setIsDropdownLoading] = useState(false);
  const [removingFollowerId, setRemovingFollowerId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // User Watchlist states
  const [userWatchlist, setUserWatchlist] = useState<Movie[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }

    if (activeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown]);

  const toggleDropdown = async (type: "followers" | "following") => {
    if (activeDropdown === type) {
      setActiveDropdown(null);
      return;
    }

    setActiveDropdown(type);
    setIsDropdownLoading(true);
    setDropdownList([]);

    try {
      const items =
        type === "followers"
          ? await fetchFollowers(profileUserId)
          : await fetchFollowing(profileUserId);
      setDropdownList(items);
    } catch (err) {
      console.error(`Failed to load ${type}:`, err);
      setDropdownList([]);
    } finally {
      setIsDropdownLoading(false);
    }
  };

  const handleRemoveFollower = async (followerId: string, followerUsername: string) => {
    if (!confirm(`Are you sure you want to remove @${followerUsername} from your followers?`)) {
      return;
    }

    setRemovingFollowerId(followerId);
    try {
      const res = await removeFollower(followerId, token || undefined);
      if (res.success) {
        setDropdownList((prev) => prev.filter((item) => item.id !== followerId));
        setProfile((prev) =>
          prev
            ? { ...prev, followersCount: Math.max((prev.followersCount || 1) - 1, 0) }
            : null
        );
      } else {
        alert(res.error || "Failed to remove follower.");
      }
    } catch {
      alert("An unexpected error occurred while removing follower.");
    } finally {
      setRemovingFollowerId(null);
    }
  };

  const isOwner = Boolean(currentUser && currentUser.id === profileUserId);

  // 1. Load Profile & Follow status
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProfile(true);
    setProfileError(null);
    setActiveDropdown(null);

    async function loadData() {
      try {
        const fetchedUser = await fetchUserProfile(profileUserId, token || undefined);
        if (!isMounted) return;

        if (!fetchedUser) {
          setProfileError("User not found or account is deactivated.");
          setIsLoadingProfile(false);
          return;
        }

        // Resolve privacy settings taking into account API normalization and local caching
        let savedPrivacy: { isPrivate?: boolean; isEmailPrivate?: boolean; isPhonePrivate?: boolean } = {};
        try {
          const cached = localStorage.getItem(`cineverse_privacy_${profileUserId}`);
          if (cached) savedPrivacy = JSON.parse(cached);
        } catch {}

        const finalIsPrivate = Boolean(
          fetchedUser.isPrivate ??
          (fetchedUser as any).private ??
          fetchedUser.publicProfiles?.isPrivate ??
          savedPrivacy.isPrivate
        );
        const finalIsEmailPrivate = Boolean(
          fetchedUser.isEmailPrivate ??
          (fetchedUser as any).emailPrivate ??
          fetchedUser.publicProfiles?.isEmailPrivate ??
          savedPrivacy.isEmailPrivate
        );
        const finalIsPhonePrivate = Boolean(
          fetchedUser.isPhonePrivate ??
          (fetchedUser as any).phonePrivate ??
          fetchedUser.publicProfiles?.isPhonePrivate ??
          savedPrivacy.isPhonePrivate
        );

        const hydratedUser: User = {
          ...fetchedUser,
          isPrivate: finalIsPrivate,
          isEmailPrivate: finalIsEmailPrivate,
          isPhonePrivate: finalIsPhonePrivate,
        };

        setProfile(hydratedUser);

        // Pre-fill edit modal fields
        setEditUsername(hydratedUser.username || "");
        setEditBio(hydratedUser.bio || "");
        setEditPictureUrl(hydratedUser.pictureUrl || "");
        setEditIsPrivate(finalIsPrivate);
        setEditIsEmailPrivate(finalIsEmailPrivate);
        setEditIsPhonePrivate(finalIsPhonePrivate);

        // If viewing someone else, check follow status
        if (currentUser && currentUser.id !== profileUserId) {
          const statusRes = await fetchFollowStatus(
            profileUserId,
            currentUser.id,
            token || undefined
          );
          if (isMounted) {
            setFollowStatus(statusRes.status);
            setIsFollowing(statusRes.isFollowing || statusRes.status === "ACCEPTED");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setProfileError(err.message || "Failed to load user profile.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [profileUserId, currentUser, token]);

  // 2. Load User Watchlist
  useEffect(() => {
    if (!profile) return;

    // If profile is private and viewer is not the owner and not accepted follower
    const isPrivateLocked = !isOwner && profile.isPrivate && !isFollowing;
    if (isPrivateLocked) {
      setUserWatchlist([]);
      return;
    }

    let isMounted = true;
    setIsLoadingWatchlist(true);

    async function loadWatchlist() {
      try {
        const res = isOwner
          ? await fetchMyWatchlist(0, 50, token || undefined)
          : await fetchUserWatchlist(profileUserId, 0, 50, token || undefined);
        if (isMounted) {
          setUserWatchlist(res.movies);
        }
      } catch (err) {
        console.error("Failed to load user watchlist:", err);
      } finally {
        if (isMounted) {
          setIsLoadingWatchlist(false);
        }
      }
    }

    loadWatchlist();

    return () => {
      isMounted = false;
    };
  }, [profileUserId, isOwner, profile?.isPrivate, isFollowing, token]);

  // 2. Debounced User Search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchUsers(trimmed, 0, 10);
        startTransition(() => {
          setSearchResults(results);
          setIsSearching(false);
        });
      } catch (err) {
        console.error("Search error:", err);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // 3. Handle Follow / Unfollow Toggle
  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    setIsFollowLoading(true);

    if (followStatus === "ACCEPTED" || (isFollowing && followStatus !== "PENDING")) {
      // Unfollow an accepted follow
      const res = await unfollowUser(profileUserId, token || undefined);
      if (res.success) {
        setIsFollowing(false);
        setFollowStatus(null);
        setProfile((prev) =>
          prev
            ? { ...prev, followersCount: Math.max((prev.followersCount || 1) - 1, 0) }
            : null
        );
      } else {
        alert(res.error || "Failed to unfollow user.");
      }
    } else if (followStatus === "PENDING") {
      // Cancel a pending follow request
      const res = await unfollowUser(profileUserId, token || undefined);
      if (res.success) {
        setIsFollowing(false);
        setFollowStatus(null);
        // Do not decrement follower count because it was never incremented while pending
      } else {
        alert(res.error || "Failed to cancel follow request.");
      }
    } else {
      // Send Follow request
      const res = await followUser(profileUserId, token || undefined);
      if (res.success) {
        const returnedStatus = res.status || (profile?.isPrivate ? "PENDING" : "ACCEPTED");
        setFollowStatus(returnedStatus);
        if (returnedStatus === "ACCEPTED") {
          setIsFollowing(true);
          setProfile((prev) =>
            prev
              ? { ...prev, followersCount: (prev.followersCount || 0) + 1 }
              : null
          );
        } else {
          // Status is PENDING (user is private) -> Do NOT increment follower count!
          setIsFollowing(false);
        }
      } else {
        alert(res.error || "Failed to follow user.");
      }
    }

    setIsFollowLoading(false);
  };

  // 4. Open Edit Profile Modal with fresh state
  const handleOpenEditModal = () => {
    if (profile) {
      setEditUsername(profile.username || "");
      setEditBio(profile.bio || "");
      setEditPictureUrl(profile.pictureUrl || "");

      let savedPrivacy: any = {};
      try {
        const cached = localStorage.getItem(`cineverse_privacy_${profileUserId}`);
        if (cached) savedPrivacy = JSON.parse(cached);
      } catch {}

      const isPriv = Boolean(
        profile.isPrivate ??
        (profile as any).private ??
        profile.publicProfiles?.isPrivate ??
        savedPrivacy.isPrivate
      );
      const isEmailPriv = Boolean(
        profile.isEmailPrivate ??
        (profile as any).emailPrivate ??
        profile.publicProfiles?.isEmailPrivate ??
        savedPrivacy.isEmailPrivate
      );
      const isPhonePriv = Boolean(
        profile.isPhonePrivate ??
        (profile as any).phonePrivate ??
        profile.publicProfiles?.isPhonePrivate ??
        savedPrivacy.isPhonePrivate
      );

      setEditIsPrivate(isPriv);
      setEditIsEmailPrivate(isEmailPriv);
      setEditIsPhonePrivate(isPhonePriv);
    }
    setEditError(null);
    setEditSuccess(null);
    setIsEditModalOpen(true);
  };

  // 5. Handle Edit Profile Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim() || editUsername.trim().length < 3) {
      setEditError("Username must be at least 3 characters long.");
      return;
    }

    setIsSavingProfile(true);
    setEditError(null);
    setEditSuccess(null);

    const payload = {
      username: editUsername.trim(),
      bio: editBio.trim() || undefined,
      pictureUrl: editPictureUrl.trim() || undefined,
      isPrivate: editIsPrivate,
      isEmailPrivate: editIsEmailPrivate,
      isPhonePrivate: editIsPhonePrivate,
    };

    const res = await updateUserProfile(payload, token || undefined);

    if (res.success && res.user) {
      const mergedUser: User = {
        ...res.user,
        isPrivate: editIsPrivate,
        isEmailPrivate: editIsEmailPrivate,
        isPhonePrivate: editIsPhonePrivate,
      };
      setProfile(mergedUser);
      updateUser(mergedUser);

      // Save to localStorage as well for instant retention
      try {
        localStorage.setItem(
          `cineverse_privacy_${profileUserId}`,
          JSON.stringify({
            isPrivate: editIsPrivate,
            isEmailPrivate: editIsEmailPrivate,
            isPhonePrivate: editIsPhonePrivate,
          })
        );
      } catch (e) {
        console.error("Failed to save privacy settings to localStorage:", e);
      }

      setEditSuccess("Profile updated successfully!");
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccess(null);
      }, 1000);
    } else {
      setEditError(res.error || "Failed to update profile.");
    }

    setIsSavingProfile(false);
  };

  // 5. Handle File Selection for Avatar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be 5MB or less.");
      return;
    }

    setUploadFile(file);
    setUploadError(null);
    setUploadPreview(URL.createObjectURL(file));
  };

  // 6. Handle Avatar Upload / Update
  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadError(null);

    // If file is selected, upload to S3 / MinIO via presigned URL
    if (uploadFile) {
      const res = await uploadAvatar(uploadFile, token || undefined);
      if (res.success && res.fileUrl) {
        setProfile((prev) => (prev ? { ...prev, pictureUrl: res.fileUrl } : null));
        updateUser({ pictureUrl: res.fileUrl });
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadPreview(null);
        setIsUploading(false);
        return;
      } else {
        // If storage upload fails (e.g. MinIO container offline), notify and offer URL fallback
        setUploadError(
          res.error ||
            "Storage upload failed. You can also paste an Image URL directly below."
        );
        setIsUploading(false);
        return;
      }
    }

    // Fallback: If manual picture URL was pasted
    if (manualPictureUrl.trim()) {
      const res = await updateUserProfile(
        { pictureUrl: manualPictureUrl.trim() },
        token || undefined
      );
      if (res.success && res.user) {
        setProfile(res.user);
        updateUser({ pictureUrl: manualPictureUrl.trim() });
        setIsUploadModalOpen(false);
        setManualPictureUrl("");
      } else {
        setUploadError(res.error || "Failed to update profile picture URL.");
      }
    } else {
      setUploadError("Please choose an image file or enter an Image URL.");
    }

    setIsUploading(false);
  };

  // 7. Handle Logout (Moved from Navbar to here)
  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) return;
    await logout();
    router.push("/home");
    router.refresh();
  };

  // Format creation date
  const formatJoinDate = (isoString?: string) => {
    if (!isoString) return "Member";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Member";
    }
  };

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        <p className="text-sm font-medium text-zinc-400">Loading user profile...</p>
      </div>
    );
  }

  // Error state
  if (profileError || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600/10 text-red-500 mb-4">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Profile Not Available</h2>
          <p className="text-sm text-zinc-400 mb-6">{profileError || "This user profile does not exist."}</p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Back button */}
      <div>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <span>←</span> Back to Movies
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <div className="relative rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 sm:p-10 shadow-2xl backdrop-blur-md z-20">
        {/* Ambient background glow isolated with internal rounded overflow clip */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Avatar Container with Upload trigger for Owner */}
          <div className="relative group shrink-0">
            {profile.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                alt={profile.username}
                className="h-28 w-28 sm:h-36 sm:w-36 rounded-full object-cover border-4 border-zinc-800 shadow-xl group-hover:border-red-500/50 transition-all duration-300"
              />
            ) : (
              <div className="flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-full bg-red-600/20 text-red-400 border-4 border-zinc-800 shadow-xl text-4xl sm:text-5xl font-black uppercase group-hover:border-red-500/50 transition-all duration-300">
                {profile.username.charAt(0)}
              </div>
            )}

            {/* If Owner: Overlay button to upload or change image */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-white"
                title="Change Profile Picture"
              >
                <svg className="h-6 w-6 sm:h-8 sm:w-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] sm:text-xs font-semibold">Change Photo</span>
              </button>
            )}
          </div>

          {/* User Details & Counts */}
          <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {profile.username}
                  </h1>
                  {(profile.isPrivate || (profile as any).private) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Private
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Public
                    </span>
                  )}
                </div>
                {profile.email && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 truncate">
                    {profile.email}
                  </p>
                )}
                {profile.phone && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    📞 {profile.phone}
                  </p>
                )}
              </div>

              {/* Action Buttons: Edit/Logout for Owner, Follow/Unfollow for Others */}
              <div className="flex items-center justify-center md:justify-start xl:justify-end gap-2 flex-wrap">
                {isOwner ? (
                  <>
                    <Link
                      href="/user/requests/pending"
                      className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-all cursor-pointer shadow-sm hover:border-zinc-500"
                      title="View Pending & Sent Follow Requests"
                    >
                      <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Requests
                    </Link>
                    <button
                      type="button"
                      onClick={handleOpenEditModal}
                      className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-all cursor-pointer shadow-sm hover:border-zinc-500"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Profile
                    </button>
                    <Link
                      href="/preferences?from=profile"
                      className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-all cursor-pointer shadow-sm hover:border-zinc-500"
                      title="Edit Cinema Preferences"
                    >
                      <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Preferences
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 transition-all cursor-pointer hover:border-red-500/60"
                      title="Sign Out of CineVerse"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </>
                ) : (
                  currentUser ? (
                    <button
                      type="button"
                      disabled={isFollowLoading}
                      onClick={handleFollowToggle}
                      onMouseEnter={() => setIsFollowHovered(true)}
                      onMouseLeave={() => setIsFollowHovered(false)}
                      className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md ${
                        followStatus === "ACCEPTED" || (isFollowing && followStatus !== "PENDING")
                          ? isFollowHovered
                            ? "bg-red-600/20 text-red-400 border border-red-500/40"
                            : "bg-zinc-800 text-zinc-200 border border-zinc-700"
                          : followStatus === "PENDING"
                          ? isFollowHovered
                            ? "bg-red-600/20 text-red-400 border border-red-500/40"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/25"
                      }`}
                    >
                      {isFollowLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : followStatus === "ACCEPTED" || (isFollowing && followStatus !== "PENDING") ? (
                        isFollowHovered ? (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Unfollow
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Following
                          </>
                        )
                      ) : followStatus === "PENDING" ? (
                        isFollowHovered ? (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel Request
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Requested
                          </>
                        )
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Follow
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/25"
                    >
                      Sign In to Follow
                    </Link>
                  )
                )}
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed whitespace-pre-line pt-1">
              {profile.bio || (isOwner ? "Add a short bio to introduce yourself to the CineVerse community." : "No bio provided.")}
            </p>

            {/* Social Counts & Interactive Dropdowns */}
            <div className="relative pt-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 text-xs sm:text-sm">
                {/* Followers Button */}
                <button
                  type="button"
                  onClick={() => toggleDropdown("followers")}
                  className={`group/btn inline-flex items-center gap-1.5 px-3 py-1.5 -ml-1.5 rounded-xl border transition-all cursor-pointer ${
                    activeDropdown === "followers"
                      ? "border-red-500/50 bg-red-600/10 text-white shadow-sm"
                      : "border-transparent hover:border-zinc-800 hover:bg-zinc-800/40 text-zinc-300"
                  }`}
                  title="Click to view followers"
                >
                  <span className="font-extrabold text-white text-base group-hover/btn:text-red-400 transition-colors">
                    {profile.followersCount || 0}
                  </span>
                  <span className="text-zinc-400 group-hover/btn:text-zinc-200 transition-colors">
                    Followers
                  </span>
                  <svg
                    className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${
                      activeDropdown === "followers" ? "rotate-180 text-red-400" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div className="h-4 w-[1px] bg-zinc-800" />

                {/* Following Button */}
                <button
                  type="button"
                  onClick={() => toggleDropdown("following")}
                  className={`group/btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    activeDropdown === "following"
                      ? "border-red-500/50 bg-red-600/10 text-white shadow-sm"
                      : "border-transparent hover:border-zinc-800 hover:bg-zinc-800/40 text-zinc-300"
                  }`}
                  title="Click to view following"
                >
                  <span className="font-extrabold text-white text-base group-hover/btn:text-red-400 transition-colors">
                    {profile.followingCount || 0}
                  </span>
                  <span className="text-zinc-400 group-hover/btn:text-zinc-200 transition-colors">
                    Following
                  </span>
                  <svg
                    className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${
                      activeDropdown === "following" ? "rotate-180 text-red-400" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div className="h-4 w-[1px] bg-zinc-800" />

                {/* Joined Date */}
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>🗓️ Joined {formatJoinDate(profile.createdAt)}</span>
                </div>
              </div>

              {/* Followers / Following Dropdown Popup */}
              {activeDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 sm:left-2 mt-3 w-72 sm:w-80 rounded-2xl border border-zinc-700/80 bg-zinc-950/98 shadow-2xl shadow-black/90 backdrop-blur-2xl z-50 p-3 space-y-2 max-h-84 overflow-y-auto ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {activeDropdown === "followers" ? "Followers" : "Following"}
                      </span>
                      {!isDropdownLoading && (
                        <span className="text-[10px] font-semibold text-zinc-400 px-1.5 py-0.5 rounded-md bg-zinc-800/80">
                          {dropdownList.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(null)}
                      className="text-zinc-400 hover:text-white text-xs font-bold cursor-pointer p-1 rounded-md hover:bg-zinc-800/60 transition-colors"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Dropdown Content */}
                  {isDropdownLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                      <span className="text-xs text-zinc-400">
                        Loading {activeDropdown}...
                      </span>
                    </div>
                  ) : dropdownList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      {activeDropdown === "followers"
                        ? "No followers yet."
                        : "Not following anyone yet."}
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1">
                      {dropdownList.map((userItem) => (
                        <div
                          key={userItem.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group"
                        >
                          <Link
                            href={`/user/${userItem.id}`}
                            onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2.5 min-w-0 flex-1"
                          >
                            {userItem.pictureUrl ? (
                              <img
                                src={userItem.pictureUrl}
                                alt={userItem.username}
                                className="h-8 w-8 rounded-full object-cover border border-zinc-700 shrink-0 group-hover:border-red-500/50 transition-colors"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase shrink-0 group-hover:border-red-500/50 transition-colors">
                                {userItem.username.charAt(0)}
                              </div>
                            )}
                            <span className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 truncate transition-colors">
                              {userItem.username}
                            </span>
                          </Link>

                          <div className="flex items-center gap-2 shrink-0 pl-2">
                            {isOwner && activeDropdown === "followers" ? (
                              <button
                                type="button"
                                disabled={removingFollowerId === userItem.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveFollower(userItem.id, userItem.username);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-red-400 bg-zinc-800/60 hover:bg-red-950/40 border border-zinc-700 hover:border-red-800/60 px-2 py-0.5 rounded-md transition-all cursor-pointer disabled:opacity-50"
                                title={`Remove @${userItem.username} from your followers`}
                              >
                                {removingFollowerId === userItem.id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                                ) : (
                                  <>
                                    <svg
                                      className="h-3 w-3 text-zinc-400 group-hover:text-red-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                    <span>Remove</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <Link
                                href={`/user/${userItem.id}`}
                                onClick={() => setActiveDropdown(null)}
                                className="text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors"
                              >
                                View →
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist Section */}
      {!isOwner && profile.isPrivate && !isFollowing ? (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-2xl mb-3 border border-zinc-700/50">
            🔒
          </div>
          <h3 className="text-base font-bold text-white mb-1">This Account is Private</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Follow @{profile.username} to view their full watchlist, movie ratings, and activity.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/15 text-red-500 border border-red-500/30">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {isOwner ? "My Watchlist" : `@${profile.username}'s Watchlist`}
                </h2>
                {userWatchlist.length > 0 && (
                  <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-300 border border-zinc-700">
                    {userWatchlist.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isOwner
                  ? "Movies saved to your watchlist. Click (-) to remove."
                  : `Movies @${profile.username} wants to watch. Click (+) to add to your own watchlist.`}
              </p>
            </div>

            {isOwner && (
              <Link
                href="/watchlist"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors self-start sm:self-auto"
              >
                <span>Manage Watchlist</span>
                <span>→</span>
              </Link>
            )}
          </div>

          {isLoadingWatchlist ? (
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-[2/3] w-36 sm:w-44 md:w-48 rounded-xl bg-zinc-800/60 animate-pulse shrink-0" />
              ))}
            </div>
          ) : userWatchlist.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-zinc-500">
              {isOwner
                ? "Your watchlist is empty. Browse movies and save your favorites!"
                : `@${profile.username} hasn't added any movies to their watchlist yet.`}
            </div>
          ) : (
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth">
              {userWatchlist.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onRemove={
                    isOwner
                      ? (removedId) => {
                          setUserWatchlist((prev) =>
                            prev.filter((m) => Number(m.id) !== Number(removedId))
                          );
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* User Ratings & Reviews Section */}
        <UserReviewsSection
          userId={profileUserId}
          username={profile.username}
          isOwner={isOwner}
        />
      </>
    )}

      {/* User Search Section */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>🔍</span> Discover CineVerse Members
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Search and connect with other movie lovers across industries and genres.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or bio (e.g. nolan_fan, sci-fi buff)..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 pl-11 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all shadow-inner"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
            {isSearching ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {searchResults.map((userItem) => (
              <Link
                key={userItem.id}
                href={`/user/${userItem.id}`}
                className="group flex items-center justify-between p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {userItem.pictureUrl ? (
                    <img
                      src={userItem.pictureUrl}
                      alt={userItem.username}
                      className="h-11 w-11 rounded-full object-cover border border-zinc-700 shrink-0 group-hover:border-red-500/50 transition-colors"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-sm font-bold uppercase shrink-0 group-hover:border-red-500/50 transition-colors">
                      {userItem.username.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 group-hover:text-red-400 transition-colors truncate">
                      {userItem.username}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[150px]">
                      {userItem.bio || `${userItem.followersCount} followers`}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0 pl-2">
                  View →
                </span>
              </Link>
            ))}
          </div>
        )}

        {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No CineVerse members found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>

      {/* Edit Profile Modal (Only accessible by Owner) */}
      {isOwner && isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">Edit Profile Details</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                {editSuccess}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Bio
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    {160 - editBio.length} chars left
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={160}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell others what movies, directors, or genres you love..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              {/* Picture URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Profile Picture URL (HTTPS)
                </label>
                <input
                  type="url"
                  value={editPictureUrl}
                  onChange={(e) => setEditPictureUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Privacy Toggles */}
              <div className="pt-2 border-t border-zinc-800 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Privacy Settings
                </p>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">Private Account</span>
                  <input
                    type="checkbox"
                    checked={editIsPrivate}
                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                    className="h-4 w-4 rounded accent-red-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">Hide Email from Public</span>
                  <input
                    type="checkbox"
                    checked={editIsEmailPrivate}
                    onChange={(e) => setEditIsEmailPrivate(e.target.checked)}
                    className="h-4 w-4 rounded accent-red-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">Hide Phone from Public</span>
                  <input
                    type="checkbox"
                    checked={editIsPhonePrivate}
                    onChange={(e) => setEditIsPhonePrivate(e.target.checked)}
                    className="h-4 w-4 rounded accent-red-600 cursor-pointer"
                  />
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal (Only accessible by Owner) */}
      {isOwner && isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">Update Profile Picture</h3>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                  setUploadPreview(null);
                }}
                className="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleAvatarSubmit} className="space-y-5">
              {/* Image Preview */}
              <div className="flex flex-col items-center justify-center">
                {uploadPreview ? (
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="h-28 w-28 rounded-full object-cover border-4 border-red-500/50 shadow-md"
                  />
                ) : profile.pictureUrl ? (
                  <img
                    src={profile.pictureUrl}
                    alt="Current"
                    className="h-28 w-28 rounded-full object-cover border-4 border-zinc-800 shadow-md"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-600/20 text-red-400 border-4 border-zinc-800 text-3xl font-black">
                    {profile.username.charAt(0)}
                  </div>
                )}
              </div>

              {/* File input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Choose Image File (JPEG, PNG, WebP — Max 5MB)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>

              <div className="relative flex items-center justify-center">
                <span className="h-[1px] w-full bg-zinc-800" />
                <span className="bg-zinc-900 px-3 text-[10px] font-bold text-zinc-500 uppercase">
                  Or enter URL
                </span>
                <span className="h-[1px] w-full bg-zinc-800" />
              </div>

              {/* Manual URL input fallback */}
              <div>
                <input
                  type="url"
                  placeholder="Paste direct HTTPS image link..."
                  value={manualPictureUrl}
                  onChange={(e) => setManualPictureUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadFile(null);
                    setUploadPreview(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? "Uploading..." : "Save Photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

