"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Movie } from "@/types/movie";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMyWatchlist,
  fetchWatchlistIds,
  addToWatchlist as apiAddToWatchlist,
  removeFromWatchlist as apiRemoveFromWatchlist,
} from "@/services/movieService";

interface WatchlistContextType {
  watchlist: Movie[];
  watchlistIds: Set<number>;
  isInWatchlist: (movieId: number | string) => boolean;
  addToWatchlist: (movieId: number | string, movie?: Movie) => Promise<boolean>;
  removeFromWatchlist: (movieId: number | string) => Promise<boolean>;
  toggleWatchlist: (movieId: number | string, movie?: Movie) => Promise<boolean>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  totalElements: number;
  loadMoreWatchlist: () => Promise<void>;
  refreshWatchlist: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading: authLoading } = useAuth();
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Load watchlist IDs instantly when user logs in
  const refreshWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      setWatchlistIds(new Set());
      setCurrentPage(0);
      setTotalElements(0);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Instantly fetch all IDs (takes < 2ms without N+1 overhead)
      const ids = await fetchWatchlistIds(token || undefined);
      const numericIds = (ids || []).map((id) => Number(id));
      setWatchlistIds(new Set(numericIds));

      // 2. Fetch first 20 hydrated movie cards
      const res = await fetchMyWatchlist(0, 20, token || undefined);
      setWatchlist(res.movies || []);
      setCurrentPage(0);
      const total = numericIds.length > 0 ? numericIds.length : (res.totalElements || (res.movies || []).length);
      setTotalElements(total);
      setHasMore((res.movies || []).length < total);
    } catch (err) {
      console.error("Failed to load watchlist:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  const loadMoreWatchlist = useCallback(async () => {
    if (!user || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await fetchMyWatchlist(nextPage, 20, token || undefined);

      if (res.movies && res.movies.length > 0) {
        setWatchlist((prev) => {
          const existingIds = new Set(prev.map((m) => Number(m.id)));
          const newUnique = res.movies.filter((m) => !existingIds.has(Number(m.id)));
          const updated = [...prev, ...newUnique];
          const total = watchlistIds.size || totalElements || res.totalElements || updated.length;
          setHasMore(updated.length < total);
          return updated;
        });
        setCurrentPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more watchlist items:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, isLoadingMore, hasMore, currentPage, totalElements, watchlistIds.size, token]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      refreshWatchlist();
    } else {
      setWatchlist([]);
      setWatchlistIds(new Set());
      setTotalElements(0);
      setHasMore(false);
    }
  }, [user, authLoading, refreshWatchlist]);

  const isInWatchlist = useCallback(
    (movieId: number | string) => {
      return watchlistIds.has(Number(movieId));
    },
    [watchlistIds]
  );

  const addToWatchlist = useCallback(
    async (movieId: number | string, movie?: Movie): Promise<boolean> => {
      if (!user) return false;
      const numId = Number(movieId);

      // Optimistic update
      setWatchlistIds((prev) => new Set(prev).add(numId));
      setWatchlist((prev) => {
        const alreadyExists = prev.some((m) => Number(m.id) === numId);
        const nextList = movie && !alreadyExists ? [movie, ...prev] : prev;
        setTotalElements((prevTotal) => {
          const nextTotal = prevTotal + 1;
          setHasMore(nextList.length < nextTotal);
          return nextTotal;
        });
        return nextList;
      });

      const success = await apiAddToWatchlist(numId, token || undefined);
      if (!success) {
        // Rollback
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(numId);
          return next;
        });
        setWatchlist((prev) => {
          const nextList = prev.filter((m) => Number(m.id) !== numId);
          setTotalElements((prevTotal) => {
            const nextTotal = Math.max(0, prevTotal - 1);
            setHasMore(nextList.length < nextTotal);
            return nextTotal;
          });
          return nextList;
        });
        return false;
      }

      return true;
    },
    [user, token]
  );

  const removeFromWatchlist = useCallback(
    async (movieId: number | string): Promise<boolean> => {
      if (!user) return false;
      const numId = Number(movieId);

      // Save previous state for potential rollback
      const prevMovie = watchlist.find((m) => Number(m.id) === numId);

      // Optimistic update: decrement Set, filter list, and decrement totalElements count
      setWatchlistIds((prev) => {
        const next = new Set(prev);
        next.delete(numId);
        return next;
      });

      setWatchlist((prev) => {
        const nextList = prev.filter((m) => Number(m.id) !== numId);
        setTotalElements((prevTotal) => {
          const nextTotal = Math.max(0, prevTotal - 1);
          setHasMore(nextList.length < nextTotal);
          return nextTotal;
        });
        return nextList;
      });

      const success = await apiRemoveFromWatchlist(numId, token || undefined);
      if (!success) {
        // Rollback on network/API failure
        setWatchlistIds((prev) => new Set(prev).add(numId));
        setWatchlist((prev) => {
          const nextList = prevMovie ? [prevMovie, ...prev] : prev;
          setTotalElements((prevTotal) => {
            const nextTotal = prevTotal + 1;
            setHasMore(nextList.length < nextTotal);
            return nextTotal;
          });
          return nextList;
        });
        return false;
      }

      return true;
    },
    [user, token, watchlist]
  );

  const toggleWatchlist = useCallback(
    async (movieId: number | string, movie?: Movie): Promise<boolean> => {
      const numId = Number(movieId);
      if (isInWatchlist(numId)) {
        return removeFromWatchlist(numId);
      } else {
        return addToWatchlist(numId, movie);
      }
    },
    [isInWatchlist, removeFromWatchlist, addToWatchlist]
  );

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        watchlistIds,
        isInWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isLoading,
        isLoadingMore,
        hasMore,
        totalElements,
        loadMoreWatchlist,
        refreshWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

const defaultWatchlistContext: WatchlistContextType = {
  watchlist: [],
  watchlistIds: new Set(),
  isInWatchlist: () => false,
  addToWatchlist: async () => false,
  removeFromWatchlist: async () => false,
  toggleWatchlist: async () => false,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  totalElements: 0,
  loadMoreWatchlist: async () => {},
  refreshWatchlist: async () => {},
};

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  return context || defaultWatchlistContext;
}

