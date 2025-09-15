import { supabase } from "@/lib/auth";
import {
  sanitizeQueryConfig,
  validateQueryConfigSecurity,
} from "@/lib/security/sanitize";

export interface TraceTransactionBookmark {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  query_config: {
    tx_hash: string;
    network: string;
  };
  // analysis_results not stored in database - only query_config is persisted
  bookmark_type: "trace_transactions";
  created_at: string;
  updated_at: string;
}

export interface CreateTraceTransactionBookmarkRequest {
  title: string;
  description?: string;
  query_config: {
    tx_hash: string;
    network: string;
  };
  // analysis_results not stored in database - only query_config is persisted
}

export interface UpdateTraceTransactionBookmarkRequest {
  title?: string;
  description?: string;
  query_config?: Partial<TraceTransactionBookmark["query_config"]>;
}

export class TraceTransactionBookmarksService {
  static async getBookmarks(): Promise<TraceTransactionBookmark[]> {
    try {
      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      // First try with bookmark_type column (if migration was run)
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .eq("bookmark_type", "trace_transactions")
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
          `Failed to fetch trace transaction bookmarks: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.warn("Error fetching bookmarks, trying fallback:", error);
      return await this.getBookmarksFallback();
    }
  }

  private static async getBookmarksFallback(): Promise<
    TraceTransactionBookmark[]
  > {
    // Get current user ID
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

    // Filter client-side for trace transaction bookmarks (look for tx_hash in query_config)
    // Exclude debug trace bookmarks (which have trace_method) and eventlogs (which have contract_address)
    const traceTransactionBookmarks = (data || []).filter(
      (bookmark) =>
        bookmark.query_config?.tx_hash &&
        !bookmark.query_config?.trace_method && // Not debug trace
        !bookmark.query_config?.contract_address // Not eventlogs
    );

    return traceTransactionBookmarks.map((bookmark) => ({
      ...bookmark,
      bookmark_type: "trace_transactions" as const,
    }));
  }

  static async createBookmark(
    bookmark: CreateTraceTransactionBookmarkRequest
  ): Promise<TraceTransactionBookmark> {
    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to create bookmarks");
    }

    // SECURITY: Sanitize the query config to remove any sensitive fields
    const query_config = sanitizeQueryConfig(bookmark.query_config);

    // SECURITY: Validate that no sensitive data remains
    validateQueryConfigSecurity(query_config);

    // Try with bookmark_type first, fall back if constraint fails
    let data, error;

    try {
      const result = await supabase
        .from("bookmarks")
        .insert([
          {
            title: bookmark.title,
            description: bookmark.description,
            query_config,
            bookmark_type: "trace_transactions",
            user_id: user.id,
          },
        ])
        .select()
        .single();

      data = result.data;
      error = result.error;
    } catch (insertError: any) {
      // If bookmark_type constraint fails, try without it
      if (
        insertError.message?.includes("bookmark_type") ||
        insertError.message?.includes("check constraint")
      ) {
        console.warn(
          "bookmark_type constraint failed, inserting without bookmark_type"
        );
        const fallbackResult = await supabase
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

        data = fallbackResult.data;
        error = fallbackResult.error;

        if (!error && data) {
          // Add the bookmark_type to the returned data for consistency
          data.bookmark_type = "trace_transactions";
        }
      } else {
        throw insertError;
      }
    }

    if (error) {
      if (error.code === "23505") {
        throw new Error("A bookmark with this title already exists");
      }
      throw new Error(
        `Failed to create trace transaction bookmark: ${error.message}`
      );
    }

    return data;
  }

  static async updateBookmark(
    id: string,
    updates: UpdateTraceTransactionBookmarkRequest
  ): Promise<TraceTransactionBookmark> {
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
      .eq("bookmark_type", "trace_transactions")
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to update trace transaction bookmark: ${error.message}`
      );
    }

    return data;
  }

  static async deleteBookmark(id: string): Promise<void> {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("bookmark_type", "trace_transactions");

    if (error) {
      throw new Error(
        `Failed to delete trace transaction bookmark: ${error.message}`
      );
    }
  }

  static async getBookmarkByTxHash(
    txHash: string,
    network: string
  ): Promise<TraceTransactionBookmark | null> {
    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // First try with bookmark_type column
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .eq("bookmark_type", "trace_transactions");

    if (error) {
      throw new Error(
        `Failed to fetch trace transaction bookmark: ${error.message}`
      );
    }

    // Filter on client side to find matching tx_hash and network
    const bookmark = data?.find(
      (b) =>
        b.query_config?.tx_hash === txHash &&
        b.query_config?.network === network
    );

    return bookmark || null;
  }
}
