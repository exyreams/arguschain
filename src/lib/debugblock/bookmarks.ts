import { supabase } from "@/lib/auth";
import {
  sanitizeQueryConfig,
  validateQueryConfigSecurity,
} from "@/lib/security/sanitize";

// Debug Block Bookmark Types and Utilities

export interface DebugBlockBookmark {
  id: string;
  title: string;
  description?: string;
  bookmark_type: "debug_block";
  query_config: {
    blockIdentifier: string;
    network: string;
    analysisType: "full" | "summary" | "custom";
    includeInternalTransactions?: boolean;
    includePyusdAnalysis?: boolean;
    includeGasAnalysis?: boolean;
    includeFunctionCategories?: boolean;
    lastAnalysisResults?: {
      totalTransactions?: number;
      totalGasUsed?: number;
      pyusdInteractions?: number;
      failedTraces?: number;
      blockNumber?: number;
    };
  };
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateDebugBlockBookmarkData {
  title: string;
  description?: string;
  bookmark_type: "debug_block";
  query_config: {
    blockIdentifier: string;
    network: string;
    analysisType: "full" | "summary" | "custom";
    includeInternalTransactions?: boolean;
    includePyusdAnalysis?: boolean;
    includeGasAnalysis?: boolean;
    includeFunctionCategories?: boolean;
    lastAnalysisResults?: {
      totalTransactions?: number;
      totalGasUsed?: number;
      pyusdInteractions?: number;
      failedTraces?: number;
      blockNumber?: number;
    };
  };
}

export interface UpdateDebugBlockBookmarkData {
  title?: string;
  description?: string;
  query_config?: Partial<DebugBlockBookmark["query_config"]>;
}

// Utility functions for debug block bookmarks
export const DebugBlockBookmarkUtils = {
  /**
   * Generate a default title for a debug block bookmark
   */
  generateDefaultTitle: (blockIdentifier: string, network: string): string => {
    return `Debug Block ${blockIdentifier} (${network})`;
  },

  /**
   * Generate a default description for a debug block bookmark
   */
  generateDefaultDescription: (
    blockIdentifier: string,
    network: string,
    analysisType: string
  ): string => {
    return `${analysisType} debug block trace analysis for ${blockIdentifier} on ${network}`;
  },

  /**
   * Validate debug block bookmark data
   */
  validateBookmarkData: (
    data: CreateDebugBlockBookmarkData
  ): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push("Title is required");
    }

    if (!data.query_config?.blockIdentifier?.trim()) {
      errors.push("Block identifier is required");
    }

    if (!data.query_config?.network?.trim()) {
      errors.push("Network is required");
    }

    if (
      !["full", "summary", "custom"].includes(data.query_config?.analysisType)
    ) {
      errors.push("Valid analysis type is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Format bookmark for display
   */
  formatForDisplay: (bookmark: DebugBlockBookmark) => {
    const config = bookmark.query_config;
    const results = config.lastAnalysisResults;

    return {
      id: bookmark.id,
      title: bookmark.title,
      description: bookmark.description,
      blockIdentifier: config.blockIdentifier,
      network: config.network,
      analysisType: config.analysisType,
      createdAt: new Date(bookmark.created_at),
      updatedAt: new Date(bookmark.updated_at),
      stats: results
        ? {
            totalTransactions: results.totalTransactions || 0,
            totalGasUsed: results.totalGasUsed || 0,
            pyusdInteractions: results.pyusdInteractions || 0,
            failedTraces: results.failedTraces || 0,
            blockNumber: results.blockNumber || 0,
          }
        : null,
    };
  },

  /**
   * Check if two bookmarks are similar (same block and network)
   */
  areSimilar: (
    bookmark1: DebugBlockBookmark,
    bookmark2: DebugBlockBookmark
  ): boolean => {
    return (
      bookmark1.query_config.blockIdentifier ===
        bookmark2.query_config.blockIdentifier &&
      bookmark1.query_config.network === bookmark2.query_config.network
    );
  },

  /**
   * Generate search keywords for a bookmark
   */
  generateSearchKeywords: (bookmark: DebugBlockBookmark): string[] => {
    const config = bookmark.query_config;
    const keywords = [
      bookmark.title.toLowerCase(),
      config.blockIdentifier.toLowerCase(),
      config.network.toLowerCase(),
      config.analysisType.toLowerCase(),
      "debug",
      "block",
      "trace",
    ];

    if (bookmark.description) {
      keywords.push(bookmark.description.toLowerCase());
    }

    return keywords.filter(Boolean);
  },

  /**
   * Sort bookmarks by various criteria
   */
  sortBookmarks: (
    bookmarks: DebugBlockBookmark[],
    sortBy: "created_at" | "updated_at" | "title" | "block_number",
    direction: "asc" | "desc" = "desc"
  ): DebugBlockBookmark[] => {
    return [...bookmarks].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "updated_at":
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "block_number":
          aVal = a.query_config.lastAnalysisResults?.blockNumber || 0;
          bVal = b.query_config.lastAnalysisResults?.blockNumber || 0;
          break;
        default:
          return 0;
      }

      if (direction === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  },

  /**
   * Filter bookmarks by various criteria
   */
  filterBookmarks: (
    bookmarks: DebugBlockBookmark[],
    filters: {
      network?: string;
      analysisType?: string;
      searchQuery?: string;
      dateRange?: {
        start: Date;
        end: Date;
      };
    }
  ): DebugBlockBookmark[] => {
    return bookmarks.filter((bookmark) => {
      // Network filter
      if (filters.network && filters.network !== "all") {
        if (bookmark.query_config.network !== filters.network) {
          return false;
        }
      }

      // Analysis type filter
      if (filters.analysisType && filters.analysisType !== "all") {
        if (bookmark.query_config.analysisType !== filters.analysisType) {
          return false;
        }
      }

      // Search query filter
      if (filters.searchQuery) {
        const keywords =
          DebugBlockBookmarkUtils.generateSearchKeywords(bookmark);
        const query = filters.searchQuery.toLowerCase();
        if (!keywords.some((keyword) => keyword.includes(query))) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const createdAt = new Date(bookmark.created_at);
        if (
          createdAt < filters.dateRange.start ||
          createdAt > filters.dateRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  },

  /**
   * Export bookmarks to various formats
   */
  exportBookmarks: (
    bookmarks: DebugBlockBookmark[],
    format: "json" | "csv"
  ): string => {
    if (format === "json") {
      return JSON.stringify(bookmarks, null, 2);
    }

    if (format === "csv") {
      const headers = [
        "Title",
        "Description",
        "Block Identifier",
        "Network",
        "Analysis Type",
        "Total Transactions",
        "Total Gas Used",
        "PYUSD Interactions",
        "Failed Traces",
        "Created At",
        "Updated At",
      ];

      const rows = bookmarks.map((bookmark) => {
        const config = bookmark.query_config;
        const results = config.lastAnalysisResults;

        return [
          bookmark.title,
          bookmark.description || "",
          config.blockIdentifier,
          config.network,
          config.analysisType,
          results?.totalTransactions?.toString() || "0",
          results?.totalGasUsed?.toString() || "0",
          results?.pyusdInteractions?.toString() || "0",
          results?.failedTraces?.toString() || "0",
          bookmark.created_at,
          bookmark.updated_at,
        ];
      });

      return [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              if (
                typeof cell === "string" &&
                (cell.includes(",") || cell.includes('"'))
              ) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            })
            .join(",")
        )
        .join("\n");
    }

    throw new Error(`Unsupported export format: ${format}`);
  },
};
export class DebugBlockBookmarksService {
  static async getBookmarks(): Promise<DebugBlockBookmark[]> {
    try {
      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      // Query bookmarks with debug_block type
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .eq("bookmark_type", "debug_block")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching debug block bookmarks:", error);
        throw new Error("Failed to fetch bookmarks");
      }

      return data || [];
    } catch (error) {
      console.error("Error in getBookmarks:", error);
      throw error;
    }
  }

  static async getBookmarkById(id: string): Promise<DebugBlockBookmark | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("bookmark_type", "debug_block")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        console.error("Error fetching bookmark:", error);
        throw new Error("Failed to fetch bookmark");
      }

      return data;
    } catch (error) {
      console.error("Error in getBookmarkById:", error);
      throw error;
    }
  }

  static async getBookmarkByBlockId(
    blockIdentifier: string,
    network: string
  ): Promise<DebugBlockBookmark | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .eq("bookmark_type", "debug_block")
        .contains("query_config", { blockIdentifier, network })
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        console.error("Error fetching bookmark by block ID:", error);
        throw new Error("Failed to fetch bookmark");
      }

      return data;
    } catch (error) {
      console.error("Error in getBookmarkByBlockId:", error);
      throw error;
    }
  }

  static async createBookmark(
    data: CreateDebugBlockBookmarkData
  ): Promise<DebugBlockBookmark> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Validate and sanitize the query config
      const validation = DebugBlockBookmarkUtils.validateBookmarkData(data);
      if (!validation.isValid) {
        throw new Error(
          `Invalid bookmark data: ${validation.errors.join(", ")}`
        );
      }

      // Sanitize query config for security
      const sanitizedQueryConfig = sanitizeQueryConfig(data.query_config);
      validateQueryConfigSecurity(sanitizedQueryConfig);

      const bookmarkData = {
        user_id: user.id,
        title: data.title,
        description: data.description,
        bookmark_type: data.bookmark_type,
        query_config: sanitizedQueryConfig,
      };

      const { data: bookmark, error } = await supabase
        .from("bookmarks")
        .insert([bookmarkData])
        .select()
        .single();

      if (error) {
        console.error("Error creating bookmark:", error);
        throw new Error("Failed to create bookmark");
      }

      return bookmark;
    } catch (error) {
      console.error("Error in createBookmark:", error);
      throw error;
    }
  }

  static async updateBookmark(
    id: string,
    updates: UpdateDebugBlockBookmarkData
  ): Promise<DebugBlockBookmark> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Sanitize query config if provided
      let sanitizedUpdates = { ...updates };
      if (updates.query_config) {
        sanitizedUpdates.query_config = sanitizeQueryConfig(
          updates.query_config
        );
        validateQueryConfigSecurity(sanitizedUpdates.query_config);
      }

      const { data, error } = await supabase
        .from("bookmarks")
        .update(sanitizedUpdates)
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("bookmark_type", "debug_block")
        .select()
        .single();

      if (error) {
        console.error("Error updating bookmark:", error);
        throw new Error("Failed to update bookmark");
      }

      return data;
    } catch (error) {
      console.error("Error in updateBookmark:", error);
      throw error;
    }
  }

  static async deleteBookmark(id: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("bookmark_type", "debug_block");

      if (error) {
        console.error("Error deleting bookmark:", error);
        throw new Error("Failed to delete bookmark");
      }
    } catch (error) {
      console.error("Error in deleteBookmark:", error);
      throw error;
    }
  }
}
