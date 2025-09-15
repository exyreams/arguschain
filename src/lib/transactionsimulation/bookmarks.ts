import { supabase } from "@/lib/auth";
import {
  sanitizeQueryConfig,
  validateQueryConfigSecurity,
} from "@/lib/security/sanitize";

export interface TransactionSimulationBookmark {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  bookmark_type: "transactions_simulation";
  query_config: {
    network: string;
    fromAddress: string;
    simulationType: "single" | "batch" | "comparison";
    functionName?: string;
    parameters?: any;
    variants?: any[];
    operations?: any[];
    // Analysis results can be stored here since analysis_results column doesn't exist
    lastAnalysisResults?: {
      gasUsed?: number;
      gasPrice?: number;
      success?: boolean;
      totalOperations?: number;
      successRate?: number;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface TransactionReplayBookmark {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  bookmark_type: "transactions_replay";
  query_config: {
    txHash: string;
    network: string;
    // Analysis results can be stored here since analysis_results column doesn't exist
    lastAnalysisResults?: {
      totalSteps?: number;
      totalGasUsed?: number;
      hasErrors?: boolean;
      errorCount?: number;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionSimulationBookmarkRequest {
  title: string;
  description?: string;
  query_config: {
    network: string;
    fromAddress: string;
    simulationType: "single" | "batch" | "comparison";
    functionName?: string;
    parameters?: any;
    variants?: any[];
    operations?: any[];
    lastAnalysisResults?: {
      gasUsed?: number;
      gasPrice?: number;
      success?: boolean;
      totalOperations?: number;
      successRate?: number;
    };
  };
}

export interface CreateTransactionReplayBookmarkRequest {
  title: string;
  description?: string;
  query_config: {
    txHash: string;
    network: string;
    lastAnalysisResults?: {
      totalSteps?: number;
      totalGasUsed?: number;
      hasErrors?: boolean;
      errorCount?: number;
    };
  };
}

export interface UpdateTransactionSimulationBookmarkRequest {
  title?: string;
  description?: string;
  query_config?: Partial<TransactionSimulationBookmark["query_config"]>;
}

export class TransactionSimulationBookmarksService {
  static async getBookmarks(): Promise<TransactionSimulationBookmark[]> {
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
        .eq("bookmark_type", "transactions_simulation")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42703" || error.message.includes("bookmark_type")) {
          console.warn(
            "bookmark_type column not found, falling back to client-side filtering"
          );
          return await this.getBookmarksFallback();
        }
        throw new Error(
          `Failed to fetch simulation bookmarks: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.warn(
        "Error fetching simulation bookmarks, trying fallback:",
        error
      );
      return await this.getBookmarksFallback();
    }
  }

  private static async getBookmarksFallback(): Promise<
    TransactionSimulationBookmark[]
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

    // Client-side filtering for simulation bookmarks
    return (data || []).filter(
      (bookmark: any) =>
        bookmark.query_config?.simulationType ||
        bookmark.query_config?.fromAddress
    ) as TransactionSimulationBookmark[];
  }

  static async createBookmark(
    request: CreateTransactionSimulationBookmarkRequest
  ): Promise<TransactionSimulationBookmark> {
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
      bookmark_type: "transactions_simulation",
      query_config: sanitizedQueryConfig,
      // Remove analysis_results since it's not in the database schema
    };

    const { data, error } = await supabase
      .from("bookmarks")
      .insert(bookmarkData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create simulation bookmark: ${error.message}`);
    }

    return data;
  }

  static async updateBookmark(
    id: string,
    updates: UpdateTransactionSimulationBookmarkRequest
  ): Promise<TransactionSimulationBookmark> {
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
      throw new Error(`Failed to update simulation bookmark: ${error.message}`);
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
      throw new Error(`Failed to delete simulation bookmark: ${error.message}`);
    }
  }

  static async getBookmarkByQuery(
    network: string,
    fromAddress: string,
    simulationType: string,
    functionName?: string
  ): Promise<TransactionSimulationBookmark | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const queryFilter = {
      network,
      fromAddress,
      simulationType,
      ...(functionName && { functionName }),
    };

    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .eq("bookmark_type", "transactions_simulation")
      .contains("query_config", queryFilter)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find simulation bookmark: ${error.message}`);
    }

    return data;
  }
}

export class TransactionReplayBookmarksService {
  static async getBookmarks(): Promise<TransactionReplayBookmark[]> {
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
        .eq("bookmark_type", "transactions_replay")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42703" || error.message.includes("bookmark_type")) {
          console.warn(
            "bookmark_type column not found, falling back to client-side filtering"
          );
          return await this.getBookmarksFallback();
        }
        throw new Error(`Failed to fetch replay bookmarks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.warn("Error fetching replay bookmarks, trying fallback:", error);
      return await this.getBookmarksFallback();
    }
  }

  private static async getBookmarksFallback(): Promise<
    TransactionReplayBookmark[]
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

    // Client-side filtering for replay bookmarks
    return (data || []).filter(
      (bookmark: any) => bookmark.query_config?.txHash
    ) as TransactionReplayBookmark[];
  }

  static async createBookmark(
    request: CreateTransactionReplayBookmarkRequest
  ): Promise<TransactionReplayBookmark> {
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
      bookmark_type: "transactions_replay",
      query_config: sanitizedQueryConfig,
      // Remove analysis_results since it's not in the database schema
    };

    const { data, error } = await supabase
      .from("bookmarks")
      .insert(bookmarkData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create replay bookmark: ${error.message}`);
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
      throw new Error(`Failed to delete replay bookmark: ${error.message}`);
    }
  }
}
