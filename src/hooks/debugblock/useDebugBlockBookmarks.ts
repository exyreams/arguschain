import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth";
import type {
  DebugBlockBookmark,
  CreateDebugBlockBookmarkData,
  UpdateDebugBlockBookmarkData,
} from "@/lib/debugblock/bookmarks";
import {
  DebugBlockBookmarksService,
  DebugBlockBookmarkUtils,
} from "@/lib/debugblock/bookmarks";

// Query keys
const QUERY_KEYS = {
  all: ["debug-block-bookmarks"] as const,
  byId: (id: string) => ["debug-block-bookmarks", id] as const,
  byBlockId: (blockIdentifier: string, network: string) =>
    ["debug-block-bookmarks", "block", blockIdentifier, network] as const,
};

/**
 * Hook to get all debug block bookmarks
 */
export function useDebugBlockBookmarks() {
  const { session } = useSession();

  return useQuery({
    queryKey: QUERY_KEYS.all,
    queryFn: DebugBlockBookmarksService.getBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get a specific debug block bookmark by ID
 */
export function useDebugBlockBookmark(id: string) {
  const { session } = useSession();

  return useQuery({
    queryKey: QUERY_KEYS.byId(id),
    queryFn: () => DebugBlockBookmarksService.getBookmarkById(id),
    enabled: !!session?.user && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to get a debug block bookmark by block identifier and network
 */
export function useDebugBlockBookmarkByBlockId(
  blockIdentifier: string,
  network: string
) {
  const { session } = useSession();

  return useQuery({
    queryKey: QUERY_KEYS.byBlockId(blockIdentifier, network),
    queryFn: () =>
      DebugBlockBookmarksService.getBookmarkByBlockId(blockIdentifier, network),
    enabled: !!session?.user && !!blockIdentifier && !!network,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to create a new debug block bookmark
 */
export function useCreateDebugBlockBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: (data: CreateDebugBlockBookmarkData) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }
      return DebugBlockBookmarksService.createBookmark(data);
    },
    onSuccess: (newBookmark) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: DebugBlockBookmark[] = []) => [newBookmark, ...old]
      );

      // Update specific queries
      queryClient.setQueryData(QUERY_KEYS.byId(newBookmark.id), newBookmark);
      queryClient.setQueryData(
        QUERY_KEYS.byBlockId(
          newBookmark.query_config.blockIdentifier,
          newBookmark.query_config.network
        ),
        newBookmark
      );

      toast.success("Debug block analysis bookmarked successfully!");
    },
    onError: (error) => {
      console.error("Failed to create bookmark:", error);
      toast.error("Failed to save bookmark. Please try again.");
    },
  });
}

/**
 * Hook to update a debug block bookmark
 */
export function useUpdateDebugBlockBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateDebugBlockBookmarkData;
    }) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }
      return DebugBlockBookmarksService.updateBookmark(id, updates);
    },
    onSuccess: (updatedBookmark) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: DebugBlockBookmark[] = []) =>
          old.map((bookmark) =>
            bookmark.id === updatedBookmark.id ? updatedBookmark : bookmark
          )
      );

      // Update specific queries
      queryClient.setQueryData(
        QUERY_KEYS.byId(updatedBookmark.id),
        updatedBookmark
      );
      queryClient.setQueryData(
        QUERY_KEYS.byBlockId(
          updatedBookmark.query_config.blockIdentifier,
          updatedBookmark.query_config.network
        ),
        updatedBookmark
      );

      toast.success("Bookmark updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update bookmark:", error);
      toast.error("Failed to update bookmark. Please try again.");
    },
  });
}

/**
 * Hook to delete a debug block bookmark
 */
export function useDeleteDebugBlockBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: (id: string) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }
      return DebugBlockBookmarksService.deleteBookmark(id);
    },
    onSuccess: (_, deletedId) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: DebugBlockBookmark[] = []) =>
          old.filter((bookmark) => bookmark.id !== deletedId)
      );

      // Remove specific queries
      queryClient.removeQueries({ queryKey: QUERY_KEYS.byId(deletedId) });

      toast.success("Bookmark deleted successfully!");
    },
    onError: (error) => {
      console.error("Failed to delete bookmark:", error);
      toast.error("Failed to delete bookmark. Please try again.");
    },
  });
}

/**
 * Hook to bulk delete debug block bookmarks
 */
export function useBulkDeleteDebugBlockBookmarks() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }

      await Promise.all(
        ids.map((id) => DebugBlockBookmarksService.deleteBookmark(id))
      );
      return ids;
    },
    onSuccess: (deletedIds) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: DebugBlockBookmark[] = []) =>
          old.filter((bookmark) => !deletedIds.includes(bookmark.id))
      );

      // Remove specific queries
      deletedIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: QUERY_KEYS.byId(id) });
      });

      toast.success(`${deletedIds.length} bookmarks deleted successfully!`);
    },
    onError: (error) => {
      console.error("Failed to delete bookmarks:", error);
      toast.error("Failed to delete bookmarks. Please try again.");
    },
  });
}

/**
 * Hook to export debug block bookmarks
 */
export function useExportDebugBlockBookmarks() {
  const { data: bookmarks } = useDebugBlockBookmarks();

  return useMutation({
    mutationFn: async ({
      format,
      filename,
    }: {
      format: "json" | "csv";
      filename?: string;
    }) => {
      if (!bookmarks || bookmarks.length === 0) {
        throw new Error("No bookmarks to export");
      }

      const exportData = DebugBlockBookmarkUtils.exportBookmarks(
        bookmarks,
        format
      );

      const blob = new Blob([exportData], {
        type: format === "json" ? "application/json" : "text/csv",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `debug-block-bookmarks.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { count: bookmarks.length, format };
    },
    onSuccess: ({ count, format }) => {
      toast.success(`Exported ${count} bookmarks as ${format.toUpperCase()}`);
    },
    onError: (error) => {
      console.error("Failed to export bookmarks:", error);
      toast.error("Failed to export bookmarks. Please try again.");
    },
  });
}
