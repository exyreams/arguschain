import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth";
import {
  StorageAnalysisBookmarksService,
  type StorageAnalysisBookmark,
  type CreateStorageAnalysisBookmarkRequest,
  type UpdateStorageAnalysisBookmarkRequest,
} from "@/lib/storagerange/bookmarks";

// Query Keys
export const storageAnalysisBookmarkKeys = {
  all: ["storage-analysis-bookmarks"] as const,
  lists: () => [...storageAnalysisBookmarkKeys.all, "list"] as const,
  list: (filters: string) =>
    [...storageAnalysisBookmarkKeys.lists(), { filters }] as const,
  details: () => [...storageAnalysisBookmarkKeys.all, "detail"] as const,
  detail: (id: string) =>
    [...storageAnalysisBookmarkKeys.details(), id] as const,
  byQuery: (
    contractAddress: string,
    blockNumber: string,
    network: string,
    analysisDepth: string
  ) =>
    [
      ...storageAnalysisBookmarkKeys.all,
      "by-query",
      { contractAddress, blockNumber, network, analysisDepth },
    ] as const,
};

// Hooks
export const useStorageAnalysisBookmarks = () => {
  const { session } = useSession();

  return useQuery({
    queryKey: storageAnalysisBookmarkKeys.lists(),
    queryFn: StorageAnalysisBookmarksService.getBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useCreateStorageAnalysisBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateStorageAnalysisBookmarkRequest) =>
      StorageAnalysisBookmarksService.createBookmark(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storageAnalysisBookmarkKeys.lists(),
      });
      toast.success("Storage analysis bookmarked!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save bookmark: ${error.message}`);
    },
  });
};

export const useUpdateStorageAnalysisBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateStorageAnalysisBookmarkRequest;
    }) => StorageAnalysisBookmarksService.updateBookmark(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storageAnalysisBookmarkKeys.lists(),
      });
      toast.success("Bookmark updated!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bookmark: ${error.message}`);
    },
  });
};

export const useDeleteStorageAnalysisBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      StorageAnalysisBookmarksService.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storageAnalysisBookmarkKeys.lists(),
      });
      toast.success("Bookmark deleted!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete bookmark: ${error.message}`);
    },
  });
};

export const useStorageAnalysisBookmarkByQuery = (
  contractAddress: string,
  blockNumber: string,
  network: string,
  analysisDepth: string
) => {
  return useQuery({
    queryKey: storageAnalysisBookmarkKeys.byQuery(
      contractAddress,
      blockNumber,
      network,
      analysisDepth
    ),
    queryFn: () =>
      StorageAnalysisBookmarksService.getBookmarkByQuery(
        contractAddress,
        blockNumber,
        network,
        analysisDepth
      ),
    enabled: !!(contractAddress && blockNumber && network && analysisDepth),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
