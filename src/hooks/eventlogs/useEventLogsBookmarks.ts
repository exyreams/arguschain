import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth";
import { toastConfig } from "@/lib/toast-config";
import {
  EventLogsBookmarksService,
  type EventLogsBookmark,
  type CreateEventLogsBookmarkRequest,
  type UpdateEventLogsBookmarkRequest,
} from "@/lib/eventlogs/bookmarks";

export const eventLogsBookmarkKeys = {
  all: ["event-logs-bookmarks"] as const,
  lists: () => [...eventLogsBookmarkKeys.all, "list"] as const,
  list: (filters: string) =>
    [...eventLogsBookmarkKeys.lists(), { filters }] as const,
  details: () => [...eventLogsBookmarkKeys.all, "detail"] as const,
  detail: (id: string) => [...eventLogsBookmarkKeys.details(), id] as const,
  byQuery: (
    contractAddress: string,
    fromBlock: string,
    toBlock: string,
    network: string
  ) =>
    [
      ...eventLogsBookmarkKeys.all,
      "query",
      contractAddress,
      fromBlock,
      toBlock,
      network,
    ] as const,
};

export function useEventLogsBookmarks() {
  const { session } = useSession();

  return useQuery({
    queryKey: eventLogsBookmarkKeys.lists(),
    queryFn: EventLogsBookmarksService.getBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useEventLogsBookmarkByQuery(
  contractAddress: string,
  fromBlock: string,
  toBlock: string,
  network: string
) {
  return useQuery({
    queryKey: eventLogsBookmarkKeys.byQuery(
      contractAddress,
      fromBlock,
      toBlock,
      network
    ),
    queryFn: () =>
      EventLogsBookmarksService.getBookmarkByQuery(
        contractAddress,
        fromBlock,
        toBlock,
        network
      ),
    enabled: !!contractAddress && !!fromBlock && !!toBlock && !!network,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEventLogsBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: EventLogsBookmarksService.createBookmark,
    onSuccess: (data) => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: eventLogsBookmarkKeys.lists(),
      });

      // Add the new bookmark to the cache
      if (
        data.query_config?.contract_address &&
        data.query_config?.from_block &&
        data.query_config?.to_block &&
        data.query_config?.network
      ) {
        queryClient.setQueryData(
          eventLogsBookmarkKeys.byQuery(
            data.query_config.contract_address,
            data.query_config.from_block,
            data.query_config.to_block,
            data.query_config.network
          ),
          data
        );
      }

      toastConfig.bookmark.saved(data.title);
    },
    onError: (error: Error) => {
      toastConfig.error("Failed to save bookmark", error.message);
    },
  });
}

export function useUpdateEventLogsBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateEventLogsBookmarkRequest;
    }) => EventLogsBookmarksService.updateBookmark(id, updates),
    onSuccess: (data) => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: eventLogsBookmarkKeys.lists(),
      });

      // Update the specific bookmark in cache
      if (
        data.query_config?.contract_address &&
        data.query_config?.from_block &&
        data.query_config?.to_block &&
        data.query_config?.network
      ) {
        queryClient.setQueryData(
          eventLogsBookmarkKeys.byQuery(
            data.query_config.contract_address,
            data.query_config.from_block,
            data.query_config.to_block,
            data.query_config.network
          ),
          data
        );
      }

      toastConfig.bookmark.updated(data.title);
    },
    onError: (error: Error) => {
      toastConfig.error("Failed to update bookmark", error.message);
    },
  });
}

export function useDeleteEventLogsBookmark() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: EventLogsBookmarksService.deleteBookmark,
    onSuccess: () => {
      // Invalidate and refetch bookmarks list
      queryClient.invalidateQueries({
        queryKey: eventLogsBookmarkKeys.lists(),
      });

      toastConfig.bookmark.deleted();
    },
    onError: (error: Error) => {
      toastConfig.error("Failed to delete bookmark", error.message);
    },
  });
}
