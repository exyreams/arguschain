import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth";
import type {
  BlockTraceBookmark,
  CreateBlockTraceBookmarkData,
  UpdateBlockTraceBookmarkData,
} from "@/lib/blocktrace/bookmarks";

import {
  BlockTraceBookmarksService,
  BlockTraceBookmarkUtils,
} from "@/lib/blocktrace/bookmarks";

// Query keys
const QUERY_KEYS = {
  all: ["block-trace-bookmarks"] as const,
  byId: (id: string) => ["block-trace-bookmarks", id] as const,
  byBlockId: (blockIdentifier: string, network: string) =>
    ["block-trace-bookmarks", "block", blockIdentifier, network] as const,
};

/**
 * Hook to get all block trace bookmarks
 */
export function useBlockTraceBookmarks() {
  const { session } = useSession();

  return useQuery({
    queryKey: QUERY_KEYS.all,
    queryFn: BlockTraceBookmarksService.getBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get a specific block trace bookmark by ID
 */
export function useBlockTraceBookmark(id: string) {
  const { session } = useSession();

  return useQuery({
    queryKey: QUERY_KEYS.byId(id),
    queryFn: () => BlockTraceBookmarksService.getBookmarkById(id),
    enabled: !!session?.user && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to get a block trace bookmark by block identifier and network
 */
export function useBlockTraceBookmarkByBlockId(
  blockIdentifier: string,
  network: string
) {
  const { session } = useSession();

  return useQuery({
    queryKey: QUERY_KEYS.byBlockId(blockIdentifier, network),
    queryFn: () =>
      BlockTraceBookmarksService.getBookmarkByBlockId(blockIdentifier, network),
    enabled: !!session?.user && !!blockIdentifier && !!network,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to create a new block trace bookmark
 */
export function useCreateBlockTraceBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: (data: CreateBlockTraceBookmarkData) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }
      return BlockTraceBookmarksService.createBookmark(data);
    },
    onSuccess: (newBookmark) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: BlockTraceBookmark[] = []) => [newBookmark, ...old]
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

      toast.success("Block analysis bookmarked successfully!");
    },
    onError: (error) => {
      console.error("Failed to create bookmark:", error);
      toast.error("Failed to save bookmark. Please try again.");
    },
  });
}

/**
 * Hook to update a block trace bookmark
 */
export function useUpdateBlockTraceBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateBlockTraceBookmarkData;
    }) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }
      return BlockTraceBookmarksService.updateBookmark(id, updates);
    },
    onSuccess: (updatedBookmark) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: BlockTraceBookmark[] = []) =>
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
 * Hook to delete a block trace bookmark
 */
export function useDeleteBlockTraceBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: (id: string) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }
      return BlockTraceBookmarksService.deleteBookmark(id);
    },
    onSuccess: (_, deletedId) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: BlockTraceBookmark[] = []) =>
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
 * Hook to bulk delete block trace bookmarks
 */
export function useBulkDeleteBlockTraceBookmarks() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!session?.user) {
        throw new Error("Authentication required");
      }

      await Promise.all(
        ids.map((id) => BlockTraceBookmarksService.deleteBookmark(id))
      );
      return ids;
    },
    onSuccess: (deletedIds) => {
      // Update the cache
      queryClient.setQueryData(
        QUERY_KEYS.all,
        (old: BlockTraceBookmark[] = []) =>
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
 * Hook to export block trace bookmarks
 */
export function useExportBlockTraceBookmarks() {
  const { data: bookmarks } = useBlockTraceBookmarks();

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

      const exportData = BlockTraceBookmarkUtils.exportBookmarks(
        bookmarks,
        format
      );

      const blob = new Blob([exportData], {
        type: format === "json" ? "application/json" : "text/csv",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `block-trace-bookmarks.${format}`;
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
