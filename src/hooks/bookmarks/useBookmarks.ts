import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookmarkService,
  type Bookmark,
  type CreateBookmarkRequest,
} from "@/lib/bookmarks";
import { useSession } from "@/lib/auth";
import { toastConfig } from "@/lib/toast-config";

export const useBookmarks = () => {
  const { session } = useSession();

  return useQuery({
    queryKey: ["bookmarks", session?.user?.id],
    queryFn: BookmarkService.getUserBookmarks,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateBookmark = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: BookmarkService.createBookmark,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["bookmarks", session?.user?.id],
      });
      toastConfig.bookmark.saved(data.title);
    },
    onError: (error: Error) => {
      toastConfig.error("Failed to save bookmark", error.message);
    },
  });
};

export const useDeleteBookmark = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: BookmarkService.deleteBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bookmarks", session?.user?.id],
      });
      toastConfig.bookmark.deleted();
    },
    onError: (error: Error) => {
      toastConfig.error("Failed to delete bookmark", error.message);
    },
  });
};

export const useUpdateBookmark = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateBookmarkRequest>;
    }) => BookmarkService.updateBookmark(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["bookmarks", session?.user?.id],
      });
      toastConfig.bookmark.updated(data.title);
    },
    onError: (error: Error) => {
      toastConfig.error("Failed to update bookmark", error.message);
    },
  });
};
