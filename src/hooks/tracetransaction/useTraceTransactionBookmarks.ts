import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/global/notifications";
import {
  TraceTransactionBookmarksService,
  type TraceTransactionBookmark,
  type CreateTraceTransactionBookmarkRequest,
  type UpdateTraceTransactionBookmarkRequest,
} from "@/lib/tracetransaction/bookmarks";

export const traceTransactionBookmarkKeys = {
  all: ["trace-transaction-bookmarks"] as const,
  lists: () => [...traceTransactionBookmarkKeys.all, "list"] as const,
  list: (filters: string) =>
    [...traceTransactionBookmarkKeys.lists(), { filters }] as const,
  details: () => [...traceTransactionBookmarkKeys.all, "detail"] as const,
  detail: (id: string) =>
    [...traceTransactionBookmarkKeys.details(), id] as const,
  byTxHash: (txHash: string, network: string) =>
    [...traceTransactionBookmarkKeys.all, "tx", txHash, network] as const,
};

export function useTraceTransactionBookmarks() {
  return useQuery({
    queryKey: traceTransactionBookmarkKeys.lists(),
    queryFn: TraceTransactionBookmarksService.getBookmarks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useTraceTransactionBookmarkByTxHash(
  txHash: string,
  network: string
) {
  return useQuery({
    queryKey: traceTransactionBookmarkKeys.byTxHash(txHash, network),
    queryFn: () =>
      TraceTransactionBookmarksService.getBookmarkByTxHash(txHash, network),
    enabled: !!txHash && !!network,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTraceTransactionBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: TraceTransactionBookmarksService.createBookmark,
    onSuccess: (data) => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: traceTransactionBookmarkKeys.lists(),
      });

      // Add the new bookmark to the cache
      if (data.query_config?.tx_hash && data.query_config?.network) {
        queryClient.setQueryData(
          traceTransactionBookmarkKeys.byTxHash(
            data.query_config.tx_hash,
            data.query_config.network
          ),
          data
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

export function useUpdateTraceTransactionBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTraceTransactionBookmarkRequest;
    }) => TraceTransactionBookmarksService.updateBookmark(id, updates),
    onSuccess: (data) => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: traceTransactionBookmarkKeys.lists(),
      });

      // Update the specific bookmark in cache
      if (data.query_config?.tx_hash && data.query_config?.network) {
        queryClient.setQueryData(
          traceTransactionBookmarkKeys.byTxHash(
            data.query_config.tx_hash,
            data.query_config.network
          ),
          data
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

export function useDeleteTraceTransactionBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: TraceTransactionBookmarksService.deleteBookmark,
    onSuccess: () => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: traceTransactionBookmarkKeys.lists(),
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
