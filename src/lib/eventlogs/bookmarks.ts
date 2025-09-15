import { supabase } from "@/lib/auth";
import {
  sanitizeQueryConfig,
  validateQueryConfigSecurity,
} from "@/lib/security/sanitize";

export interface EventLogsBookmark {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  query_config: {
    contract_address: string;
    from_block: string;
    to_block: string;
    network: string;
    analysis_depth?: "basic" | "full" | "advanced";
    include_timestamps?: boolean;
    max_results?: number;
  };
  // analysis_results not stored in database - only query_config is persisted
  bookmark_type: "eventlogs";
  created_at: string;
  updated_at: string;
}

export interface CreateEventLogsBookmarkRequest {
  title: string;
  description?: string;
  query_config: {
    contract_address: string;
    from_block: string;
    to_block: string;
    network: string;
    analysis_depth?: "basic" | "full" | "advanced";
    include_timestamps?: boolean;
    max_results?: number;
  };
  // analysis_results not stored in database - only query_config is persisted
}

export interface UpdateEventLogsBookmarkRequest {
  title?: string;
  description?: string;
  query_config?: Partial<EventLogsBookmark["query_config"]>;
}

export class EventLogsBookmarksService {
  static async getBookmarks(): Promise<EventLogsBookmark[]> {
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
        .eq("bookmark_type", "eventlogs")
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
          `Failed to fetch eventlogs bookmarks: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.warn("Error fetching bookmarks, trying fallback:", error);
      return await this.getBookmarksFallback();
    }
  }

  private static async getBookmarksFallback(): Promise<EventLogsBookmark[]> {
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

    // Filter client-side for event logs bookmarks (look for contract_address in query_config)
    const eventLogsBookmarks = (data || []).filter(
      (bookmark) =>
        bookmark.query_config?.contract_address &&
        bookmark.query_config?.from_block &&
        bookmark.query_config?.to_block &&
        bookmark.query_config?.network &&
        !bookmark.query_config?.tx_hash // Exclude debugtrace bookmarks
    );

    return eventLogsBookmarks.map((bookmark) => ({
      ...bookmark,
      bookmark_type: "eventlogs" as const,
    }));
  }

  static async createBookmark(
    bookmark: CreateEventLogsBookmarkRequest
  ): Promise<EventLogsBookmark> {
    try {
      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User must be authenticated to create bookmarks");
      }

      // SECURITY: Sanitize query config before storing
      const sanitizedQueryConfig = sanitizeQueryConfig(bookmark.query_config);
      validateQueryConfigSecurity(sanitizedQueryConfig);

      // Try with bookmark_type column first
      const { data, error } = await supabase
        .from("bookmarks")
        .insert([
          {
            title: bookmark.title,
            description: bookmark.description,
            query_config: sanitizedQueryConfig,
            bookmark_type: "eventlogs",
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        // If bookmark_type column doesn't exist, fall back to basic insert
        if (error.code === "42703" || error.message.includes("bookmark_type")) {
          console.warn("bookmark_type column not found, creating without it");
          return await this.createBookmarkFallback(bookmark);
        }

        if (error.code === "23505") {
          throw new Error("A bookmark with this title already exists");
        }
        throw new Error(
          `Failed to create eventlogs bookmark: ${error.message}`
        );
      }

      return data;
    } catch (error: any) {
      if (error.message?.includes("bookmark_type")) {
        return await this.createBookmarkFallback(bookmark);
      }
      throw error;
    }
  }

  private static async createBookmarkFallback(
    bookmark: CreateEventLogsBookmarkRequest
  ): Promise<EventLogsBookmark> {
    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to create bookmarks");
    }

    // SECURITY: Sanitize query config before storing
    const sanitizedQueryConfig = sanitizeQueryConfig(bookmark.query_config);
    validateQueryConfigSecurity(sanitizedQueryConfig);

    const { data, error } = await supabase
      .from("bookmarks")
      .insert([
        {
          title: bookmark.title,
          description: bookmark.description,
          query_config: sanitizedQueryConfig,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A bookmark with this title already exists");
      }
      throw new Error(`Failed to create event logs bookmark: ${error.message}`);
    }

    return {
      ...data,
      bookmark_type: "eventlogs" as const,
    };
  }

  static async updateBookmark(
    id: string,
    updates: UpdateEventLogsBookmarkRequest
  ): Promise<EventLogsBookmark> {
    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to update bookmarks");
    }

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
        .eq("user_id", user.id)
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
      .eq("user_id", user.id)
      .eq("bookmark_type", "eventlogs")
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update event logs bookmark: ${error.message}`);
    }

    return data;
  }

  static async deleteBookmark(id: string): Promise<void> {
    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to delete bookmarks");
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("bookmark_type", "eventlogs");

    if (error) {
      throw new Error(`Failed to delete event logs bookmark: ${error.message}`);
    }
  }

  static async getBookmarkByQuery(
    contractAddress: string,
    fromBlock: string,
    toBlock: string,
    network: string
  ): Promise<EventLogsBookmark | null> {
    // Get current user ID
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
      .eq("bookmark_type", "eventlogs");

    if (error) {
      throw new Error(`Failed to fetch event logs bookmark: ${error.message}`);
    }

    // Filter on client side to avoid complex Supabase query issues
    const bookmark = data?.find(
      (b) =>
        b.query_config?.contract_address === contractAddress &&
        b.query_config?.from_block === fromBlock &&
        b.query_config?.to_block === toBlock &&
        b.query_config?.network === network
    );

    return bookmark
      ? { ...bookmark, bookmark_type: "eventlogs" as const }
      : null;
  }
}
