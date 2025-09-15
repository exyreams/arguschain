import type { TraceAnalysisResults } from "./types";

export class DataPersistenceService {
  private static readonly STORAGE_KEYS = {
    ANALYSIS_HISTORY: "arguschain_analysis_history",
    BOOKMARKS: "arguschain_bookmarks",
    FAVORITES: "arguschain_favorites",
    SETTINGS: "arguschain_persistence_settings",
  } as const;

  private static readonly MAX_HISTORY_ITEMS = 100;
  private static readonly MAX_BOOKMARKS = 50;

  static saveAnalysisToHistory(analysis: TraceAnalysisResults): void {
    try {
      const history = this.getAnalysisHistory();

      const historyItem: AnalysisHistoryItem = {
        id: this.generateId(),
        transactionHash: analysis.transactionHash,
        timestamp: Date.now(),
        summary: {
          totalActions: analysis.summary.totalActions,
          totalGasUsed: analysis.summary.totalGasUsed,
          errorsCount: analysis.summary.errorsCount,
          pyusdInteractions: analysis.summary.pyusdInteractions,
          pattern: analysis.patternAnalysis.pattern,
          riskLevel: analysis.securityAssessment.overallRisk,
          mevDetected: analysis.mevAnalysis.mevDetected,
        },
        tags: this.generateAutoTags(analysis),
        size: this.calculateAnalysisSize(analysis),
      };

      history.unshift(historyItem);

      if (history.length > this.MAX_HISTORY_ITEMS) {
        history.splice(this.MAX_HISTORY_ITEMS);
      }

      localStorage.setItem(
        this.STORAGE_KEYS.ANALYSIS_HISTORY,
        JSON.stringify(history),
      );

      this.saveFullAnalysis(analysis);
    } catch (error) {
      console.error("Failed to save analysis to history:", error);
    }
  }

  static getAnalysisHistory(): AnalysisHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.ANALYSIS_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load analysis history:", error);
      return [];
    }
  }

  static getFullAnalysis(transactionHash: string): TraceAnalysisResults | null {
    try {
      const stored = localStorage.getItem(`analysis_${transactionHash}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to load full analysis:", error);
      return null;
    }
  }

  static deleteFromHistory(transactionHash: string): void {
    try {
      const history = this.getAnalysisHistory();
      const filtered = history.filter(
        (item) => item.transactionHash !== transactionHash,
      );
      localStorage.setItem(
        this.STORAGE_KEYS.ANALYSIS_HISTORY,
        JSON.stringify(filtered),
      );

      localStorage.removeItem(`analysis_${transactionHash}`);
    } catch (error) {
      console.error("Failed to delete from history:", error);
    }
  }

  static clearHistory(): void {
    try {
      const history = this.getAnalysisHistory();

      history.forEach((item) => {
        localStorage.removeItem(`analysis_${item.transactionHash}`);
      });

      localStorage.removeItem(this.STORAGE_KEYS.ANALYSIS_HISTORY);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  }

  static addBookmark(bookmark: BookmarkItem): void {
    try {
      const bookmarks = this.getBookmarks();

      if (
        bookmarks.some((b) => b.transactionHash === bookmark.transactionHash)
      ) {
        return;
      }

      bookmarks.unshift({
        ...bookmark,
        id: this.generateId(),
        timestamp: Date.now(),
      });

      if (bookmarks.length > this.MAX_BOOKMARKS) {
        bookmarks.splice(this.MAX_BOOKMARKS);
      }

      localStorage.setItem(
        this.STORAGE_KEYS.BOOKMARKS,
        JSON.stringify(bookmarks),
      );
    } catch (error) {
      console.error("Failed to add bookmark:", error);
    }
  }

  static getBookmarks(): BookmarkItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.BOOKMARKS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
      return [];
    }
  }

  static removeBookmark(transactionHash: string): void {
    try {
      const bookmarks = this.getBookmarks();
      const filtered = bookmarks.filter(
        (b) => b.transactionHash !== transactionHash,
      );
      localStorage.setItem(
        this.STORAGE_KEYS.BOOKMARKS,
        JSON.stringify(filtered),
      );
    } catch (error) {
      console.error("Failed to remove bookmark:", error);
    }
  }

  static isBookmarked(transactionHash: string): boolean {
    const bookmarks = this.getBookmarks();
    return bookmarks.some((b) => b.transactionHash === transactionHash);
  }

  static addToFavorites(transactionHash: string): void {
    try {
      const favorites = this.getFavorites();
      if (!favorites.includes(transactionHash)) {
        favorites.unshift(transactionHash);
        localStorage.setItem(
          this.STORAGE_KEYS.FAVORITES,
          JSON.stringify(favorites),
        );
      }
    } catch (error) {
      console.error("Failed to add to favorites:", error);
    }
  }

  static removeFromFavorites(transactionHash: string): void {
    try {
      const favorites = this.getFavorites();
      const filtered = favorites.filter((hash) => hash !== transactionHash);
      localStorage.setItem(
        this.STORAGE_KEYS.FAVORITES,
        JSON.stringify(filtered),
      );
    } catch (error) {
      console.error("Failed to remove from favorites:", error);
    }
  }

  static getFavorites(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load favorites:", error);
      return [];
    }
  }

  static isFavorite(transactionHash: string): boolean {
    const favorites = this.getFavorites();
    return favorites.includes(transactionHash);
  }

  static exportAnalysis(
    transactionHash: string,
    format: "json" | "csv",
  ): string | null {
    try {
      const analysis = this.getFullAnalysis(transactionHash);
      if (!analysis) return null;

      if (format === "json") {
        return JSON.stringify(analysis, null, 2);
      } else {
        return this.convertToCSV(analysis);
      }
    } catch (error) {
      console.error("Failed to export analysis:", error);
      return null;
    }
  }

  static generateShareData(transactionHash: string): ShareData | null {
    try {
      const analysis = this.getFullAnalysis(transactionHash);
      if (!analysis) return null;

      const shareData: ShareData = {
        transactionHash,
        timestamp: Date.now(),
        summary: {
          totalActions: analysis.summary.totalActions,
          totalGasUsed: analysis.summary.totalGasUsed,
          pattern: analysis.patternAnalysis.pattern,
          riskLevel: analysis.securityAssessment.overallRisk,
          mevDetected: analysis.mevAnalysis.mevDetected,
        },
        url: `${window.location.origin}/trace-transaction-analyzer/${transactionHash}`,
      };

      return shareData;
    } catch (error) {
      console.error("Failed to generate share data:", error);
      return null;
    }
  }

  static getStorageStats(): StorageStats {
    try {
      const history = this.getAnalysisHistory();
      const bookmarks = this.getBookmarks();
      const favorites = this.getFavorites();

      let totalSize = 0;
      history.forEach((item) => {
        totalSize += item.size || 0;
      });

      return {
        historyCount: history.length,
        bookmarkCount: bookmarks.length,
        favoriteCount: favorites.length,
        totalStorageSize: totalSize,
        storageUsagePercent: this.calculateStorageUsage(),
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return {
        historyCount: 0,
        bookmarkCount: 0,
        favoriteCount: 0,
        totalStorageSize: 0,
        storageUsagePercent: 0,
      };
    }
  }

  static searchHistory(
    query: string,
    filters?: HistorySearchFilters,
  ): AnalysisHistoryItem[] {
    try {
      const history = this.getAnalysisHistory();
      let filtered = history;

      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.transactionHash.toLowerCase().includes(lowerQuery) ||
            item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
            item.summary.pattern.toLowerCase().includes(lowerQuery),
        );
      }

      if (filters) {
        if (filters.pattern) {
          filtered = filtered.filter(
            (item) => item.summary.pattern === filters.pattern,
          );
        }
        if (filters.riskLevel) {
          filtered = filtered.filter(
            (item) => item.summary.riskLevel === filters.riskLevel,
          );
        }
        if (filters.mevDetected !== undefined) {
          filtered = filtered.filter(
            (item) => item.summary.mevDetected === filters.mevDetected,
          );
        }
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          filtered = filtered.filter(
            (item) => item.timestamp >= start && item.timestamp <= end,
          );
        }
      }

      return filtered;
    } catch (error) {
      console.error("Failed to search history:", error);
      return [];
    }
  }

  private static saveFullAnalysis(analysis: TraceAnalysisResults): void {
    try {
      localStorage.setItem(
        `analysis_${analysis.transactionHash}`,
        JSON.stringify(analysis),
      );
    } catch (error) {
      console.error("Failed to save full analysis:", error);
    }
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateAutoTags(analysis: TraceAnalysisResults): string[] {
    const tags: string[] = [];

    tags.push(analysis.patternAnalysis.pattern);

    if (analysis.securityAssessment.overallRisk !== "low") {
      tags.push(`${analysis.securityAssessment.overallRisk}-risk`);
    }

    if (analysis.mevAnalysis.mevDetected) {
      tags.push("mev-detected");
    }

    if (analysis.summary.pyusdInteractions > 0) {
      tags.push("pyusd");
    }

    if (analysis.summary.errorsCount > 0) {
      tags.push("has-errors");
    }

    if (analysis.summary.totalGasUsed > 1000000) {
      tags.push("high-gas");
    }

    return tags;
  }

  private static calculateAnalysisSize(analysis: TraceAnalysisResults): number {
    try {
      return JSON.stringify(analysis).length;
    } catch {
      return 0;
    }
  }

  private static calculateStorageUsage(): number {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length;
        }
      }

      return (used / (5 * 1024 * 1024)) * 100;
    } catch {
      return 0;
    }
  }

  private static convertToCSV(analysis: TraceAnalysisResults): string {
    const headers = [
      "Transaction Hash",
      "Total Actions",
      "Total Gas Used",
      "Errors Count",
      "PYUSD Interactions",
      "Pattern",
      "Risk Level",
      "MEV Detected",
      "Timestamp",
    ];

    const row = [
      analysis.transactionHash,
      analysis.summary.totalActions,
      analysis.summary.totalGasUsed,
      analysis.summary.errorsCount,
      analysis.summary.pyusdInteractions,
      analysis.patternAnalysis.pattern,
      analysis.securityAssessment.overallRisk,
      analysis.mevAnalysis.mevDetected,
      new Date().toISOString(),
    ];

    return [headers.join(","), row.join(",")].join("\n");
  }
}

export interface AnalysisHistoryItem {
  id: string;
  transactionHash: string;
  timestamp: number;
  summary: {
    totalActions: number;
    totalGasUsed: number;
    errorsCount: number;
    pyusdInteractions: number;
    pattern: string;
    riskLevel: string;
    mevDetected: boolean;
  };
  tags: string[];
  size: number;
}

export interface BookmarkItem {
  id?: string;
  transactionHash: string;
  title: string;
  description?: string;
  tags: string[];
  timestamp?: number;
}

export interface ShareData {
  transactionHash: string;
  timestamp: number;
  summary: {
    totalActions: number;
    totalGasUsed: number;
    pattern: string;
    riskLevel: string;
    mevDetected: boolean;
  };
  url: string;
}

export interface StorageStats {
  historyCount: number;
  bookmarkCount: number;
  favoriteCount: number;
  totalStorageSize: number;
  storageUsagePercent: number;
}

export interface HistorySearchFilters {
  pattern?: string;
  riskLevel?: string;
  mevDetected?: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
}
