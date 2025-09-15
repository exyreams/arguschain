import { User } from "./auth";

/**
 * Check if a user is anonymous
 */
export const isAnonymousUser = (user: User | null): boolean => {
  if (!user) return false;
  return user.is_anonymous === true || !user.email;
};

/**
 * Get display name for user (handles anonymous users)
 */
export const getUserDisplayName = (
  user: User | null,
  options?: {
    showId?: boolean;
    format?: "short" | "long";
  }
): string => {
  if (!user) return "Guest";

  if (isAnonymousUser(user)) {
    const format = options?.format || "short";
    const showId = options?.showId || false;

    if (format === "long") {
      return showId
        ? `Anonymous User (${user.id.slice(0, 8)}...)`
        : "Anonymous User";
    }

    return showId ? `Guest (${user.id.slice(0, 8)}...)` : "Guest";
  }

  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "User"
  );
};

/**
 * Get user identifier for tables/lists (more detailed than display name)
 */
export const getUserIdentifier = (user: User | null): string => {
  if (!user) return "No User";

  if (isAnonymousUser(user)) {
    return `Anonymous (${user.id.slice(0, 8)}...)`;
  }

  return (
    user.email || user.user_metadata?.name || `User (${user.id.slice(0, 8)}...)`
  );
};

/**
 * Get auth mode for user
 */
export const getUserAuthMode = (
  user: User | null
): "anonymous" | "email" | "oauth" | "unknown" => {
  if (!user) return "unknown";

  if (isAnonymousUser(user)) return "anonymous";

  // Check if user signed in via OAuth
  if (user.app_metadata?.provider && user.app_metadata.provider !== "email") {
    return "oauth";
  }

  return "email";
};

/**
 * Check if user should see upgrade prompts
 */
export const shouldShowUpgradePrompt = (user: User | null): boolean => {
  return isAnonymousUser(user);
};

/**
 * Get upgrade prompt message based on context
 */
export const getUpgradePromptMessage = (
  context: "save" | "export" | "history" | "settings"
): string => {
  const messages = {
    save: "Create an account to save your analysis results and access them later.",
    export:
      "Sign up to export your analysis data and share results with your team.",
    history:
      "Create an account to view your analysis history and track your work over time.",
    settings:
      "Sign up to customize your preferences and save your workspace settings.",
  };

  return messages[context];
};

/**
 * Anonymous user limitations
 */
export const ANONYMOUS_LIMITATIONS = {
  maxAnalysisHistory: 5,
  maxSavedQueries: 3,
  canExport: false,
  canSaveSettings: false,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
} as const;
