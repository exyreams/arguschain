import { toast } from "@/components/global/notifications";

// Enhanced toast configuration for better UX
export const toastConfig = {
  // Bookmark-specific toasts with consistent styling and duration
  bookmark: {
    saved: (title: string) =>
      toast.success("Bookmark Saved", {
        description: `"${title}" added to bookmarks`,
        duration: 3000,
      }),

    updated: (title: string) =>
      toast.success("Updated", {
        description: `"${title}" has been updated`,
        duration: 2500,
      }),

    deleted: () =>
      toast.success("Deleted", {
        description: "Bookmark removed successfully",
        duration: 2000,
      }),

    loaded: (title: string) =>
      toast.info("Loaded", {
        description: `Applied: ${title}`,
        duration: 2000,
      }),

    duplicate: () =>
      toast.error("Already Exists", {
        description: "This query is already saved in your bookmarks",
        duration: 3500,
      }),

    invalidQuery: () =>
      toast.error("Incomplete Query", {
        description: "Please fill all required fields before saving",
        duration: 3500,
      }),

    authRequired: () =>
      toast.error("Sign In Required", {
        description: "Please sign in to save bookmarks",
        duration: 3000,
      }),
  },

  // General error handling
  error: (title: string, description?: string) =>
    toast.error(title, {
      description,
      duration: 4000,
    }),

  // Success messages
  success: (title: string, description?: string) =>
    toast.success(title, {
      description,
      duration: 3000,
    }),

  // Info messages
  info: (title: string, description?: string) =>
    toast.info(title, {
      description,
      duration: 2000,
    }),
};

export default toastConfig;
