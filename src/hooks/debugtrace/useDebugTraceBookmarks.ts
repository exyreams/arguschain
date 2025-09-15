import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/global/notifications";
import {
  DebugTraceBookmarksService,
  type UpdateDebugTraceBookmarkRequest,
} from "@/lib/debugtrace/bookmarks";

export const debugTraceBookmarkKeys = {
  all: ["debug-trace-bookmarks"] as const,
  lists: () => [...debugTraceBookmarkKeys.all, "list"] as const,
  list: (filters: string) =>
    [...debugTraceBookmarkKeys.lists(), { filters }] as const,
  details: () => [...debugTraceBookmarkKeys.all, "detail"] as const,
  detail: (id: string) => [...debugTraceBookmarkKeys.details(), id] as const,
  byTxHash: (txHash: string, network: string) =>
    [...debugTraceBookmarkKeys.all, "tx", txHash, network] as const,
};

export function useDebugTraceBookmarks() {
  return useQuery({
    queryKey: debugTraceBookmarkKeys.lists(),
    queryFn: DebugTraceBookmarksService.getBookmarks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useDebugTraceBookmarkByTxHash(txHash: string, network: string) {
  return useQuery({
    queryKey: debugTraceBookmarkKeys.byTxHash(txHash, network),
    queryFn: () =>
      DebugTraceBookmarksService.getBookmarkByTxHash(txHash, network),
    enabled: !!txHash && !!network,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDebugTraceBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DebugTraceBookmarksService.createBookmark,
    onSuccess: (data) => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: debugTraceBookmarkKeys.lists(),
      });

      // Add the new bookmark to the cache
      if (data.query_config?.tx_hash && data.query_config?.network) {
        queryClient.setQueryData(
          debugTraceBookmarkKeys.byTxHash(
            data.query_config.tx_hash,
            data.query_config.network,
          ),
          data,
        );
      }

      toast.success("Bookmark Saved", {
        description: `Analysis for ${data.query_config?.tx_hash?.slice(0, 10) || "transaction"}... has been bookmarked`,
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to Save Bookmark", {
        description: error.message,
        duration: 5000,
      });
    },
  });
}

export function useUpdateDebugTraceBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateDebugTraceBookmarkRequest;
    }) => DebugTraceBookmarksService.updateBookmark(id, updates),
    onSuccess: (data) => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: debugTraceBookmarkKeys.lists(),
      });

      // Update the specific bookmark in cache
      if (data.query_config?.tx_hash && data.query_config?.network) {
        queryClient.setQueryData(
          debugTraceBookmarkKeys.byTxHash(
            data.query_config.tx_hash,
            data.query_config.network,
          ),
          data,
        );
      }

      toast.success("Bookmark Updated", {
        description: "Your bookmark has been updated successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to Update Bookmark", {
        description: error.message,
        duration: 5000,
      });
    },
  });
}

export function useDeleteDebugTraceBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DebugTraceBookmarksService.deleteBookmark,
    onSuccess: () => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: debugTraceBookmarkKeys.lists(),
      });

      toast.success("Bookmark Deleted", {
        description: "Your bookmark has been removed",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to Delete Bookmark", {
        description: error.message,
        duration: 5000,
      });
    },
  });
}
