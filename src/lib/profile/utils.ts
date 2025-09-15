import type { UserProfile, ProfileFormData, ProfileError } from "./types";

export const getUserDisplayData = (user: UserProfile | null) => {
  if (!user) return null;

  const emailPrefix =
    user.email && user.email.includes("@") ? user.email.split("@")[0] : "User";

  return {
    displayName: user.fullName || emailPrefix,
    identifier: user.email || "",
    authMode: user.authMethod?.type === "oauth" ? "oauth" : "email",
    avatar: user.avatar,
    email: user.email || "",
    createdAt: user.createdAt,
    fullName: user.fullName || emailPrefix,
    username: user.username,
    bio: user.bio,
    website: user.website,
  };
};

export const getUserInitials = (user: UserProfile | null): string => {
  if (!user) return "?";

  if (user.fullName && user.fullName.length > 0) {
    const names = user.fullName.split(" ").filter((name) => name.length > 0);
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  if (user.email && user.email.length > 0) {
    return user.email[0].toUpperCase();
  }

  return "?";
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else {
      return formatDate(dateString);
    }
  } catch {
    return "Unknown time";
  }
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const validateProfileData = (data: ProfileFormData): ProfileError[] => {
  const errors: ProfileError[] = [];

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push({
      type: "validation",
      message: "Full name must be at least 2 characters long",
      field: "fullName",
      recoverable: true,
    });
  }

  if (data.fullName && data.fullName.length > 100) {
    errors.push({
      type: "validation",
      message: "Full name must be less than 100 characters",
      field: "fullName",
      recoverable: true,
    });
  }

  if (
    data.username &&
    (data.username.length < 3 || data.username.length > 30)
  ) {
    errors.push({
      type: "validation",
      message: "Username must be between 3 and 30 characters",
      field: "username",
      recoverable: true,
    });
  }

  if (data.username && !/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    errors.push({
      type: "validation",
      message:
        "Username can only contain letters, numbers, underscores, and hyphens",
      field: "username",
      recoverable: true,
    });
  }

  if (data.bio && data.bio.length > 500) {
    errors.push({
      type: "validation",
      message: "Bio must be less than 500 characters",
      field: "bio",
      recoverable: true,
    });
  }

  if (data.website && !/^https?:\/\//.test(data.website)) {
    errors.push({
      type: "validation",
      message: "Website must start with http:// or https://",
      field: "website",
      recoverable: true,
    });
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push({
      type: "validation",
      message: "Please enter a valid email address",
      field: "email",
      recoverable: true,
    });
  }

  return errors;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (
  password: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const formatSessionId = (sessionId: string): string => {
  if (sessionId.length <= 8) return sessionId;
  return `${sessionId.substring(0, 4)}...${sessionId.substring(sessionId.length - 4)}`;
};

export const calculateUsagePercentage = (
  used: number,
  limit: number
): number => {
  if (limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
};

export const getAuthProviderName = (provider: string): string => {
  const providers: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    discord: "Discord",
    email: "Email",
  };

  return providers[provider] || provider;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const createRetryFunction = (
  fn: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
) => {
  return async (): Promise<any> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, "").substring(0, 1000);
};

export const hasUnsavedChanges = (
  original: ProfileFormData,
  current: ProfileFormData
): boolean => {
  return (
    original.fullName !== current.fullName ||
    original.username !== current.username ||
    original.bio !== current.bio ||
    original.website !== current.website ||
    original.email !== current.email
  );
};

export const handleNetworkError = (error: any): ProfileError => {
  if (error.name === "NetworkError" || error.code === "NETWORK_ERROR") {
    return {
      type: "network",
      message:
        "Network connection failed. Please check your internet connection and try again.",
      recoverable: true,
      retryAction: () => window.location.reload(),
    };
  }

  if (error.status === 401) {
    return {
      type: "authentication",
      message: "Your session has expired. Please sign in again.",
      recoverable: true,
      retryAction: () => (window.location.href = "/auth/signin"),
    };
  }

  if (error.status === 403) {
    return {
      type: "permission",
      message: "You don't have permission to perform this action.",
      recoverable: false,
    };
  }

  if (error.status >= 500) {
    return {
      type: "network",
      message: "Server error occurred. Please try again later.",
      recoverable: true,
      retryAction: () => window.location.reload(),
    };
  }

  return {
    type: "network",
    message: error.message || "An unexpected error occurred.",
    recoverable: true,
  };
};

export const validateFileUpload = (file: File): ProfileError[] => {
  const errors: ProfileError[] = [];
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    errors.push({
      type: "validation",
      message: "Please upload a valid image file (JPEG, PNG, GIF, or WebP).",
      field: "avatar",
      recoverable: true,
    });
  }

  if (file.size > maxSize) {
    errors.push({
      type: "validation",
      message: "File size must be less than 5MB.",
      field: "avatar",
      recoverable: true,
    });
  }

  return errors;
};

export const createOptimisticUpdate = <T>(
  updateFn: (data: T) => void,
  revertFn: (data: T) => void,
  asyncFn: (data: T) => Promise<void>
) => {
  return async (data: T) => {
    updateFn(data);

    try {
      await asyncFn(data);
    } catch (error) {
      revertFn(data);
      throw error;
    }
  };
};

export const validateOAuthProvider = (provider: string): boolean => {
  const validProviders = ["google", "github", "discord"];
  return validProviders.includes(provider.toLowerCase());
};

export const validateExportRequest = (
  format: string,
  dataTypes: string[]
): ProfileError[] => {
  const errors: ProfileError[] = [];

  if (!["json", "csv"].includes(format)) {
    errors.push({
      type: "validation",
      message: "Invalid export format. Please select JSON or CSV.",
      recoverable: true,
    });
  }

  if (dataTypes.length === 0) {
    errors.push({
      type: "validation",
      message: "Please select at least one data type to export.",
      recoverable: true,
    });
  }

  const validDataTypes = ["profile", "analysis-history", "usage-data"];
  const invalidTypes = dataTypes.filter(
    (type) => !validDataTypes.includes(type)
  );

  if (invalidTypes.length > 0) {
    errors.push({
      type: "validation",
      message: `Invalid data types selected: ${invalidTypes.join(", ")}`,
      recoverable: true,
    });
  }

  return errors;
};

export class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls: number, windowMs: number) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter((time) => now - time < this.windowMs);
    return this.calls.length < this.maxCalls;
  }

  makeCall(): boolean {
    if (this.canMakeCall()) {
      this.calls.push(Date.now());
      return true;
    }
    return false;
  }

  getTimeUntilReset(): number {
    if (this.calls.length === 0) return 0;
    const oldestCall = Math.min(...this.calls);
    return Math.max(0, this.windowMs - (Date.now() - oldestCall));
  }
}

export const createRateLimitedFunction = <
  T extends (...args: any[]) => Promise<any>,
>(
  fn: T,
  maxCalls: number,
  windowMs: number
): T => {
  const rateLimiter = new RateLimiter(maxCalls, windowMs);

  return (async (...args: Parameters<T>) => {
    if (!rateLimiter.makeCall()) {
      const waitTime = rateLimiter.getTimeUntilReset();
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }

    return await fn(...args);
  }) as T;
};
