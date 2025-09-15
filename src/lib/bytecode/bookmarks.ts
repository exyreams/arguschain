import { supabase } from "@/lib/auth";
import {
  sanitizeQueryConfig,
  validateQueryConfigSecurity,
} from "@/lib/security/sanitize";

export interface BytecodeAnalysisBookmark {
  analysisType: string;
  transactionHash: boolean;
  network: "mainnet" | "sepolia" | "holesky";
  contractAddresses: any;
  contractNames: any;
  id: string;
  user_id: string;
  title: string;
  description?: string;
  bookmark_type: "bytecode_analysis";
  query_config: {
    contractAddresses: string[];
    contractNames: string[];
    network: string;
    analysisType: "contracts" | "transaction";
    transactionHash?: string;
    blockTag?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateBytecodeAnalysisBookmarkRequest {
  title: string;
  description?: string;
  query_config: {
    contractAddresses: string[];
    contractNames: string[];
    network: string;
    analysisType: "contracts" | "transaction";
    transactionHash?: string;
    blockTag?: string;
  };
}

export interface UpdateBytecodeAnalysisBookmarkRequest {
  title?: string;
  description?: string;
  query_config?: Partial<BytecodeAnalysisBookmark["query_config"]>;
}

// API Service
export class BytecodeAnalysisBookmarksService {
  static async getBookmarks(): Promise<BytecodeAnalysisBookmark[]> {
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
        .eq("bookmark_type", "bytecode_analysis")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42703" || error.message.includes("bookmark_type")) {
          console.warn(
            "bookmark_type column not found, falling back to client-side filtering"
          );
          return await this.getBookmarksFallback();
        }
        throw new Error(
          `Failed to fetch bytecode analysis bookmarks: ${error.message}`
        );
      }

      return data || [];
    } catch (error) {
      console.warn(
        "Error fetching bytecode analysis bookmarks, trying fallback:",
        error
      );
      return await this.getBookmarksFallback();
    }
  }

  private static async getBookmarksFallback(): Promise<
    BytecodeAnalysisBookmark[]
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

    // Client-side filtering for bytecode analysis bookmarks
    return (data || []).filter(
      (bookmark: any) =>
        bookmark.query_config?.contractAddresses &&
        bookmark.query_config?.network &&
        bookmark.query_config?.analysisType
    ) as BytecodeAnalysisBookmark[];
  }

  static async createBookmark(
    request: CreateBytecodeAnalysisBookmarkRequest
  ): Promise<BytecodeAnalysisBookmark> {
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
      bookmark_type: "bytecode_analysis",
      query_config: sanitizedQueryConfig,
    };

    const { data, error } = await supabase
      .from("bookmarks")
      .insert(bookmarkData)
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to create bytecode analysis bookmark: ${error.message}`
      );
    }

    return data;
  }

  static async updateBookmark(
    id: string,
    updates: UpdateBytecodeAnalysisBookmarkRequest
  ): Promise<BytecodeAnalysisBookmark> {
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
        `Failed to update bytecode analysis bookmark: ${error.message}`
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
        `Failed to delete bytecode analysis bookmark: ${error.message}`
      );
    }
  }

  static async getBookmarkByQuery(
    contractAddress: string,
    network: string,
    analysisType: string
  ): Promise<BytecodeAnalysisBookmark | null> {
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
      .eq("bookmark_type", "bytecode_analysis")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to find bytecode analysis bookmark: ${error.message}`
      );
    }

    // Find bookmark that matches the query parameters
    const matchingBookmark = (data || []).find((bookmark: any) => {
      const config = bookmark.query_config;
      return (
        config?.network === network &&
        config?.analysisType === analysisType &&
        config?.contractAddresses?.includes(contractAddress)
      );
    });

    return matchingBookmark || null;
  }
}
