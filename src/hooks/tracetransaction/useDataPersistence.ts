import { useCallback, useEffect, useState } from "react";
import {
  type AnalysisHistoryItem,
  type BookmarkItem,
  DataPersistenceService,
  type HistorySearchFilters,
  type StorageStats,
} from "@/lib/tracetransaction/dataPersistence";
import type { TraceAnalysisResults } from "@/lib/tracetransaction/types";

interface DataPersistenceState {
  history: AnalysisHistoryItem[];
  bookmarks: BookmarkItem[];
  favorites: string[];
  storageStats: StorageStats;
  isLoading: boolean;
  error: string | null;
}

export function useDataPersistence() {
  const [state, setState] = useState<DataPersistenceState>({
    history: [],
    bookmarks: [],
    favorites: [],
    storageStats: {
      historyCount: 0,
      bookmarkCount: 0,
      favoriteCount: 0,
      totalStorageSize: 0,
      storageUsagePercent: 0,
    },
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const history = DataPersistenceService.getAnalysisHistory();
      const bookmarks = DataPersistenceService.getBookmarks();
      const favorites = DataPersistenceService.getFavorites();
      const storageStats = DataPersistenceService.getStorageStats();

      setState({
        history,
        bookmarks,
        favorites,
        storageStats,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load data",
      }));
    }
  }, []);

  const saveAnalysis = useCallback(
    (analysis: TraceAnalysisResults) => {
      try {
        DataPersistenceService.saveAnalysisToHistory(analysis);
        loadData();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to save analysis",
        }));
      }
    },
    [loadData]
  );

  const deleteFromHistory = useCallback(
    (transactionHash: string) => {
      try {
        DataPersistenceService.deleteFromHistory(transactionHash);
        loadData();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete from history",
        }));
      }
    },
    [loadData]
  );

  const clearHistory = useCallback(() => {
    try {
      DataPersistenceService.clearHistory();
      loadData();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to clear history",
      }));
    }
  }, [loadData]);

  const addBookmark = useCallback(
    (bookmark: BookmarkItem) => {
      try {
        DataPersistenceService.addBookmark(bookmark);
        loadData();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to add bookmark",
        }));
      }
    },
    [loadData]
  );

  const removeBookmark = useCallback(
    (transactionHash: string) => {
      try {
        DataPersistenceService.removeBookmark(transactionHash);
        loadData();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to remove bookmark",
        }));
      }
    },
    [loadData]
  );

  const toggleFavorite = useCallback(
    (transactionHash: string) => {
      try {
        if (DataPersistenceService.isFavorite(transactionHash)) {
          DataPersistenceService.removeFromFavorites(transactionHash);
        } else {
          DataPersistenceService.addToFavorites(transactionHash);
        }
        loadData();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to toggle favorite",
        }));
      }
    },
    [loadData]
  );

  const searchHistory = useCallback(
    (query: string, filters?: HistorySearchFilters) => {
      try {
        return DataPersistenceService.searchHistory(query, filters);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to search history",
        }));
        return [];
      }
    },
    []
  );

  const getFullAnalysis = useCallback((transactionHash: string) => {
    try {
      return DataPersistenceService.getFullAnalysis(transactionHash);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to load analysis",
      }));
      return null;
    }
  }, []);

  const exportAnalysis = useCallback(
    (transactionHash: string, format: "json" | "csv") => {
      try {
        return DataPersistenceService.exportAnalysis(transactionHash, format);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to export analysis",
        }));
        return null;
      }
    },
    []
  );

  const generateShareData = useCallback((transactionHash: string) => {
    try {
      return DataPersistenceService.generateShareData(transactionHash);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate share data",
      }));
      return null;
    }
  }, []);

  const isBookmarked = useCallback((transactionHash: string) => {
    return DataPersistenceService.isBookmarked(transactionHash);
  }, []);

  const isFavorite = useCallback((transactionHash: string) => {
    return DataPersistenceService.isFavorite(transactionHash);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    history: state.history,
    bookmarks: state.bookmarks,
    favorites: state.favorites,
    storageStats: state.storageStats,
    isLoading: state.isLoading,
    error: state.error,

    saveAnalysis,
    deleteFromHistory,
    clearHistory,
    addBookmark,
    removeBookmark,
    toggleFavorite,
    searchHistory,
    getFullAnalysis,
    exportAnalysis,
    generateShareData,
    loadData,
    clearError,

    isBookmarked,
    isFavorite,
  };
}
