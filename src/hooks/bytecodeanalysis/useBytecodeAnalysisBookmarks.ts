import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth";
import {
  BytecodeAnalysisBookmarksService,
  type BytecodeAnalysisBookmark,
  type CreateBytecodeAnalysisBookmarkRequest,
  type UpdateBytecodeAnalysisBookmarkRequest,
} from "@/lib/bytecode/bookmarks";

// Query Keys
export const bytecodeAnalysisBookmarkKeys = {
  all: ["bytecode-analysis-bookmarks"] as const,
  lists: () => [...bytecodeAnalysisBookmarkKeys.all, "list"] as const,
  list: (filters: string) =>
    [...bytecodeAnalysisBookmarkKeys.lists(), { filters }] as const,
  details: () => [...bytecodeAnalysisBookmarkKeys.all, "detail"] as const,
  detail: (id: string) =>
    [...bytecodeAnalysisBookmarkKeys.details(), id] as const,
  byQuery: (contractAddress: string, network: string, analysisType: string) =>
    [
      ...bytecodeAnalysisBookmarkKeys.all,
      "by-query",
      { contractAddress, network, analysisType },
    ] as const,
};

// Hooks
export const useBytecodeAnalysisBookmarks = () => {
  const { session } = useSession();

  return useQuery({
    queryKey: bytecodeAnalysisBookmarkKeys.lists(),
    queryFn: BytecodeAnalysisBookmarksService.getBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useCreateBytecodeAnalysisBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateBytecodeAnalysisBookmarkRequest) =>
      BytecodeAnalysisBookmarksService.createBookmark(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: bytecodeAnalysisBookmarkKeys.lists(),
      });
      toast.success("Bytecode analysis bookmarked!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save bookmark: ${error.message}`);
    },
  });
};

export const useUpdateBytecodeAnalysisBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateBytecodeAnalysisBookmarkRequest;
    }) => BytecodeAnalysisBookmarksService.updateBookmark(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: bytecodeAnalysisBookmarkKeys.lists(),
      });
      toast.success("Bookmark updated!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bookmark: ${error.message}`);
    },
  });
};

export const useDeleteBytecodeAnalysisBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      BytecodeAnalysisBookmarksService.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: bytecodeAnalysisBookmarkKeys.lists(),
      });
      toast.success("Bookmark deleted!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete bookmark: ${error.message}`);
    },
  });
};

export const useBytecodeAnalysisBookmarkByQuery = (
  contractAddress: string,
  network: string,
  analysisType: string
) => {
  return useQuery({
    queryKey: bytecodeAnalysisBookmarkKeys.byQuery(
      contractAddress,
      network,
      analysisType
    ),
    queryFn: () =>
      BytecodeAnalysisBookmarksService.getBookmarkByQuery(
        contractAddress,
        network,
        analysisType
      ),
    enabled: !!(contractAddress && network && analysisType),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
