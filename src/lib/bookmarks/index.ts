import { supabase } from "@/lib/auth";

export interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  query_config: {
    contract_address: string;
    from_block: string;
    to_block: string;
    network: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateBookmarkRequest {
  title: string;
  description?: string;
  query_config: {
    contract_address: string;
    from_block: string;
    to_block: string;
    network: string;
  };
}

export class BookmarkService {
  static async createBookmark(
    bookmark: CreateBookmarkRequest
  ): Promise<Bookmark> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Authentication required to save bookmarks");
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        title: bookmark.title,
        description: bookmark.description,
        query_config: bookmark.query_config,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create bookmark: ${error.message}`);
    }

    return data;
  }

  static async getUserBookmarks(): Promise<Bookmark[]> {
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

    return data || [];
  }

  static async deleteBookmark(bookmarkId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Authentication required");
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(`Failed to delete bookmark: ${error.message}`);
    }
  }

  static async updateBookmark(
    bookmarkId: string,
    updates: Partial<CreateBookmarkRequest>
  ): Promise<Bookmark> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookmarkId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update bookmark: ${error.message}`);
    }

    return data;
  }
}

export default BookmarkService;
