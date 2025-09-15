import { supabase } from "@/lib/auth";
import {
  sanitizeQueryConfig,
  validateQueryConfigSecurity,
} from "@/lib/security/sanitize";

export interface DebugTraceBookmark {
  analysis_results: any;
  id: string;
  user_id: string;
  title: string;
  description?: string;
  query_config: {
    tx_hash: string;
    network: string;
    trace_method: "both" | "callTracer" | "structLog";
    analysis_depth: "full" | "summary" | "custom";
    // rpc_url removed for security - API keys should never be stored
    analysis_results?: {
      gas_used?: number;
      call_count?: number;
      opcode_count?: number;
      success_rate?: number;
      optimization_score?: number;
    };
  };
  bookmark_type: "debug_trace";
  created_at: string;
  updated_at: string;
}

export interface CreateDebugTraceBookmarkRequest {
  title: string;
  description?: string;
  tx_hash: string;
  network: string;
  analysis_config: {
    trace_method: "both" | "callTracer" | "structLog";
    analysis_depth: "full" | "summary" | "custom";
    rpc_url?: string;
  };
  analysis_results?: {
    gas_used?: number;
    call_count?: number;
    opcode_count?: number;
    success_rate?: number;
    optimization_score?: number;
  };
}

export interface UpdateDebugTraceBookmarkRequest {
  title?: string;
  description?: string;
  query_config?: Partial<DebugTraceBookmark["query_config"]>;
}

export class DebugTraceBookmarksService {
  static async getBookmarks(): Promise<DebugTraceBookmark[]> {
    try {
      // First try with bookmark_type column (if migration was run)
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("bookmark_type", "debug_trace")
        .order("created_at", { ascending: false });

      if (error) {
        // If bookmark_type column doesn't exist, fall back to filtering all bookmarks
        if (error.code === "42703" || error.message.includes("bookmark_type")) {
          console.warn(
            "bookmark_type column not found, falling back to client-side filtering"
          );
          return await this.getBookmarksFallback();
        }
        throw new Error(
          `Failed to fetch debug trace bookmarks: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.warn("Error fetching bookmarks, trying fallback:", error);
      return await this.getBookmarksFallback();
    }
  }

  private static async getBookmarksFallback(): Promise<DebugTraceBookmark[]> {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    // Filter client-side for debug trace bookmarks (look for tx_hash in query_config)
    const debugTraceBookmarks = (data || []).filter(
      (bookmark) =>
        bookmark.query_config?.tx_hash && bookmark.query_config?.trace_method
    );

    return debugTraceBookmarks.map((bookmark) => ({
      ...bookmark,
      bookmark_type: "debug_trace" as const,
    }));
  }

  static async createBookmark(
    bookmark: CreateDebugTraceBookmarkRequest
  ): Promise<DebugTraceBookmark> {
    // SECURITY: Create base query config without sensitive data
    const baseQueryConfig = {
      tx_hash: bookmark.tx_hash,
      network: bookmark.network,
      trace_method: bookmark.analysis_config.trace_method,
      analysis_depth: bookmark.analysis_config.analysis_depth,
      analysis_results: bookmark.analysis_results,
    };

    // SECURITY: Sanitize the query config to remove any sensitive fields
    const query_config = sanitizeQueryConfig(baseQueryConfig);

    // SECURITY: Validate that no sensitive data remains
    validateQueryConfigSecurity(query_config);

    try {
      // Try with bookmark_type column first
      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User must be authenticated to create bookmarks");
      }

      const { data, error } = await supabase
        .from("bookmarks")
        .insert([
          {
            title: bookmark.title,
            description: bookmark.description,
            query_config,
            bookmark_type: "debug_trace",
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        // If bookmark_type column doesn't exist, fall back to basic insert
        if (error.code === "42703" || error.message.includes("bookmark_type")) {
          console.warn("bookmark_type column not found, creating without it");
          return await this.createBookmarkFallback(bookmark, query_config);
        }

        if (error.code === "23505") {
          throw new Error("A bookmark with this title already exists");
        }
        throw new Error(
          `Failed to create debug trace bookmark: ${error.message}`
        );
      }

      return data;
    } catch (error: any) {
      if (error.message?.includes("bookmark_type")) {
        return await this.createBookmarkFallback(bookmark, query_config);
      }
      throw error;
    }
  }

  private static async createBookmarkFallback(
    bookmark: CreateDebugTraceBookmarkRequest,
    query_config: any
  ): Promise<DebugTraceBookmark> {
    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to create bookmarks");
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .insert([
        {
          title: bookmark.title,
          description: bookmark.description,
          query_config,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A bookmark with this title already exists");
      }
      throw new Error(
        `Failed to create debug trace bookmark: ${error.message}`
      );
    }

    return {
      ...data,
      bookmark_type: "debug_trace" as const,
    };
  }

  static async updateBookmark(
    id: string,
    updates: UpdateDebugTraceBookmarkRequest
  ): Promise<DebugTraceBookmark> {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.query_config) {
      // Get current query_config and merge with updates
      const { data: current } = await supabase
        .from("bookmarks")
        .select("query_config")
        .eq("id", id)
        .single();

      if (current) {
        updateData.query_config = {
          ...current.query_config,
          ...updates.query_config,
        };
      }
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update(updateData)
      .eq("id", id)
      .eq("bookmark_type", "debug_trace")
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to update debug trace bookmark: ${error.message}`
      );
    }

    return data;
  }

  static async deleteBookmark(id: string): Promise<void> {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("bookmark_type", "debug_trace");

    if (error) {
      throw new Error(
        `Failed to delete debug trace bookmark: ${error.message}`
      );
    }
  }

  static async getBookmarkByTxHash(
    txHash: string,
    network: string
  ): Promise<DebugTraceBookmark | null> {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("bookmark_type", "debug_trace");

    if (error) {
      throw new Error(`Failed to fetch debug trace bookmark: ${error.message}`);
    }

    // Filter on client side to avoid complex Supabase query issues
    const bookmark = data?.find(
      (b) =>
        b.query_config?.tx_hash === txHash &&
        b.query_config?.network === network
    );

    return bookmark || null;
  }
}
