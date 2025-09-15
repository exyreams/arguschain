import { supabase } from "@/lib/auth";
import {
  sanitizeQueryConfig,
  validateQueryConfigSecurity,
} from "@/lib/security/sanitize";

export interface StorageAnalysisBookmark {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  bookmark_type: "storage_analysis";
  query_config: {
    contractAddress: string;
    blockNumber: string;
    network: string;
    analysisDepth: "basic" | "detailed" | "comprehensive";
    includeHistory?: boolean;
    maxSlots?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateStorageAnalysisBookmarkRequest {
  title: string;
  description?: string;
  query_config: {
    contractAddress: string;
    blockNumber: string;
    network: string;
    analysisDepth: "basic" | "detailed" | "comprehensive";
    includeHistory?: boolean;
    maxSlots?: number;
  };
}

export interface UpdateStorageAnalysisBookmarkRequest {
  title?: string;
  description?: string;
  query_config?: Partial<StorageAnalysisBookmark["query_config"]>;
}

// API Service
export class StorageAnalysisBookmarksService {
  static async getBookmarks(): Promise<StorageAnalysisBookmark[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .eq("bookmark_type", "storage_analysis")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42703" || error.message.includes("bookmark_type")) {
          console.warn(
            "bookmark_type column not found, falling back to client-side filtering"
          );
          return await this.getBookmarksFallback();
        }
        throw new Error(
          `Failed to fetch storage analysis bookmarks: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.warn(
        "Error fetching storage analysis bookmarks, trying fallback:",
        error
      );
      return await this.getBookmarksFallback();
    }
  }

  private static async getBookmarksFallback(): Promise<
    StorageAnalysisBookmark[]
  > {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    // Client-side filtering for storage analysis bookmarks
    return (data || []).filter(
      (bookmark: any) =>
        bookmark.query_config?.contractAddress &&
        bookmark.query_config?.blockNumber &&
        bookmark.query_config?.analysisDepth
    ) as StorageAnalysisBookmark[];
  }

  static async createBookmark(
    request: CreateStorageAnalysisBookmarkRequest
  ): Promise<StorageAnalysisBookmark> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Sanitize the query config
    const sanitizedQueryConfig = sanitizeQueryConfig(request.query_config);
    validateQueryConfigSecurity(sanitizedQueryConfig);

    const bookmarkData = {
      user_id: user.id,
      title: request.title,
      description: request.description,
      bookmark_type: "storage_analysis",
      query_config: sanitizedQueryConfig,
    };

    const { data, error } = await supabase
      .from("bookmarks")
      .insert(bookmarkData)
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to create storage analysis bookmark: ${error.message}`
      );
    }

    return data;
  }

  static async updateBookmark(
    id: string,
    updates: UpdateStorageAnalysisBookmarkRequest
  ): Promise<StorageAnalysisBookmark> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Sanitize any query config updates
    const sanitizedUpdates = { ...updates };
    if (updates.query_config) {
      sanitizedUpdates.query_config = sanitizeQueryConfig(updates.query_config);
      validateQueryConfigSecurity(sanitizedUpdates.query_config);
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(sanitizedUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to update storage analysis bookmark: ${error.message}`
      );
    }

    return data;
  }

  static async deleteBookmark(id: string): Promise<void> {
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
      .eq("user_id", user.id);

    if (error) {
      throw new Error(
        `Failed to delete storage analysis bookmark: ${error.message}`
      );
    }
  }

  static async getBookmarkByQuery(
    contractAddress: string,
    blockNumber: string,
    network: string,
    analysisDepth: string
  ): Promise<StorageAnalysisBookmark | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const queryFilter = {
      contractAddress,
      blockNumber,
      network,
      analysisDepth,
    };

    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .eq("bookmark_type", "storage_analysis")
      .contains("query_config", queryFilter)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to find storage analysis bookmark: ${error.message}`
      );
    }

    return data;
  }
}
