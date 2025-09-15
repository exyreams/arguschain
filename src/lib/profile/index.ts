// Profile library barrel exports

// Types
export * from "./types";

// Core utilities
export {
  getUserDisplayData,
  getUserInitials,
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatFileSize,
  validateProfileData,
  isValidEmail,
  validatePassword,
  formatSessionId,
  calculateUsagePercentage,
  getAuthProviderName,
  debounce,
  createRetryFunction,
  sanitizeInput,
  hasUnsavedChanges,
  handleNetworkError,
  validateFileUpload,
  createOptimisticUpdate,
  validateOAuthProvider,
  validateExportRequest,
  RateLimiter,
  createRateLimitedFunction,
} from "./utils";

// Avatar service
export { avatarService, AvatarService } from "./avatarService";

// Profile service
export { profileService, ProfileService } from "./profileService";

// OAuth service
export { oauthService, OAuthService } from "./oauthService";
