import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";
import {
  TransactionSimulationBookmarksService,
  TransactionReplayBookmarksService,
  type TransactionSimulationBookmark,
  type TransactionReplayBookmark,
  type CreateTransactionSimulationBookmarkRequest,
  type CreateTransactionReplayBookmarkRequest,
  type UpdateTransactionSimulationBookmarkRequest,
} from "@/lib/transactionsimulation/bookmarks";

export const transactionSimulationBookmarkKeys = {
  all: ["transaction-simulation-bookmarks"] as const,
  lists: () => [...transactionSimulationBookmarkKeys.all, "list"] as const,
  list: (filters: string) =>
    [...transactionSimulationBookmarkKeys.lists(), { filters }] as const,
  details: () => [...transactionSimulationBookmarkKeys.all, "detail"] as const,
  detail: (id: string) =>
    [...transactionSimulationBookmarkKeys.details(), id] as const,
  byQuery: (
    network: string,
    fromAddress: string,
    simulationType: string,
    functionName?: string
  ) =>
    [
      ...transactionSimulationBookmarkKeys.all,
      "query",
      network,
      fromAddress,
      simulationType,
      functionName,
    ] as const,
};

export const transactionReplayBookmarkKeys = {
  all: ["transaction-replay-bookmarks"] as const,
  lists: () => [...transactionReplayBookmarkKeys.all, "list"] as const,
};

// Simulation Bookmarks Hooks
export function useTransactionSimulationBookmarks() {
  const { session } = useSession();

  return useQuery({
    queryKey: transactionSimulationBookmarkKeys.lists(),
    queryFn: TransactionSimulationBookmarksService.getBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateTransactionSimulationBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTransactionSimulationBookmarkRequest) =>
      TransactionSimulationBookmarksService.createBookmark(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionSimulationBookmarkKeys.all,
      });
      toast.success("Simulation bookmarked successfully!");
    },
    onError: (error) => {
      console.error("Failed to create simulation bookmark:", error);
      toast.error("Failed to save bookmark");
    },
  });
}

export function useUpdateTransactionSimulationBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTransactionSimulationBookmarkRequest;
    }) => TransactionSimulationBookmarksService.updateBookmark(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionSimulationBookmarkKeys.all,
      });
      toast.success("Bookmark updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update simulation bookmark:", error);
      toast.error("Failed to update bookmark");
    },
  });
}

export function useDeleteTransactionSimulationBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      TransactionSimulationBookmarksService.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionSimulationBookmarkKeys.all,
      });
      toast.success("Bookmark deleted successfully!");
    },
    onError: (error) => {
      console.error("Failed to delete simulation bookmark:", error);
      toast.error("Failed to delete bookmark");
    },
  });
}

export function useTransactionSimulationBookmarkByQuery(
  network: string,
  fromAddress: string,
  simulationType: string,
  functionName?: string
) {
  const { session } = useSession();

  return useQuery({
    queryKey: transactionSimulationBookmarkKeys.byQuery(
      network,
      fromAddress,
      simulationType,
      functionName
    ),
    queryFn: () =>
      TransactionSimulationBookmarksService.getBookmarkByQuery(
        network,
        fromAddress,
        simulationType,
        functionName
      ),
    enabled: !!session?.user && !!network && !!fromAddress && !!simulationType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Replay Bookmarks Hooks
export function useTransactionReplayBookmarks() {
  const { session } = useSession();

  return useQuery({
    queryKey: transactionReplayBookmarkKeys.lists(),
    queryFn: TransactionReplayBookmarksService.getBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateTransactionReplayBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTransactionReplayBookmarkRequest) =>
      TransactionReplayBookmarksService.createBookmark(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionReplayBookmarkKeys.all,
      });
      toast.success("Replay bookmarked successfully!");
    },
    onError: (error) => {
      console.error("Failed to create replay bookmark:", error);
      toast.error("Failed to save bookmark");
    },
  });
}

export function useDeleteTransactionReplayBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      TransactionReplayBookmarksService.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionReplayBookmarkKeys.all,
      });
      toast.success("Bookmark deleted successfully!");
    },
    onError: (error) => {
      console.error("Failed to delete replay bookmark:", error);
      toast.error("Failed to delete bookmark");
    },
  });
}
