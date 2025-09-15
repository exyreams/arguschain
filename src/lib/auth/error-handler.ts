import { useCallback, useState } from "react";
import type { AuthError } from "./types";

export enum SupabaseErrorCode {
  INVALID_CREDENTIALS = "invalid_credentials",
  EMAIL_NOT_CONFIRMED = "email_not_confirmed",
  SIGNUP_DISABLED = "signup_disabled",
  EMAIL_ALREADY_EXISTS = "email_address_already_exists",
  WEAK_PASSWORD = "weak_password",
  INVALID_EMAIL = "invalid_email",
  TOO_MANY_REQUESTS = "too_many_requests",
  NETWORK_ERROR = "network_error",
  OAUTH_ERROR = "oauth_error",
  TOKEN_EXPIRED = "token_expired",
  USER_NOT_FOUND = "user_not_found",
  INVALID_TOKEN = "invalid_token",
  PASSWORD_TOO_SHORT = "password_too_short",
  UNKNOWN_ERROR = "unknown_error",
}

const ERROR_MESSAGES: Record<string, string> = {
  [SupabaseErrorCode.INVALID_CREDENTIALS]:
    "Invalid email or password. Please check your credentials and try again.",
  [SupabaseErrorCode.EMAIL_NOT_CONFIRMED]:
    "Please verify your email address before signing in. Check your inbox for a verification link.",
  [SupabaseErrorCode.SIGNUP_DISABLED]:
    "New user registration is currently disabled. Please contact support.",
  [SupabaseErrorCode.EMAIL_ALREADY_EXISTS]:
    "An account with this email address already exists. Try signing in instead.",
  [SupabaseErrorCode.WEAK_PASSWORD]:
    "Password is too weak. Please choose a stronger password with at least 8 characters.",
  [SupabaseErrorCode.INVALID_EMAIL]: "Please enter a valid email address.",
  [SupabaseErrorCode.TOO_MANY_REQUESTS]:
    "Too many requests. Please wait a moment before trying again.",
  [SupabaseErrorCode.NETWORK_ERROR]:
    "Network error. Please check your connection and try again.",
  [SupabaseErrorCode.OAUTH_ERROR]:
    "Authentication failed. Please try again or use a different sign-in method.",
  [SupabaseErrorCode.TOKEN_EXPIRED]:
    "Your session has expired. Please sign in again.",
  [SupabaseErrorCode.USER_NOT_FOUND]:
    "No account found with this email address.",
  [SupabaseErrorCode.INVALID_TOKEN]:
    "Invalid or expired verification token. Please request a new one.",
  [SupabaseErrorCode.PASSWORD_TOO_SHORT]:
    "Password must be at least 8 characters long.",
  [SupabaseErrorCode.UNKNOWN_ERROR]:
    "An unexpected error occurred. Please try again.",
};

export function mapSupabaseError(error: any): AuthError {
  if (!error) {
    return { message: ERROR_MESSAGES[SupabaseErrorCode.UNKNOWN_ERROR] };
  }

  const message = error.message?.toLowerCase() || "";

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.INVALID_CREDENTIALS],
      code: SupabaseErrorCode.INVALID_CREDENTIALS,
    };
  }

  if (
    message.includes("email not confirmed") ||
    message.includes("email address not confirmed")
  ) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.EMAIL_NOT_CONFIRMED],
      code: SupabaseErrorCode.EMAIL_NOT_CONFIRMED,
    };
  }

  if (
    message.includes("user already registered") ||
    message.includes("email address already exists")
  ) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.EMAIL_ALREADY_EXISTS],
      code: SupabaseErrorCode.EMAIL_ALREADY_EXISTS,
    };
  }

  if (
    message.includes("password is too weak") ||
    message.includes("weak password")
  ) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.WEAK_PASSWORD],
      code: SupabaseErrorCode.WEAK_PASSWORD,
    };
  }

  if (message.includes("invalid email") || message.includes("email format")) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.INVALID_EMAIL],
      code: SupabaseErrorCode.INVALID_EMAIL,
    };
  }

  if (message.includes("too many requests") || message.includes("rate limit")) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.TOO_MANY_REQUESTS],
      code: SupabaseErrorCode.TOO_MANY_REQUESTS,
    };
  }

  if (message.includes("network") || message.includes("fetch")) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.NETWORK_ERROR],
      code: SupabaseErrorCode.NETWORK_ERROR,
    };
  }

  if (message.includes("oauth") || message.includes("provider")) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.OAUTH_ERROR],
      code: SupabaseErrorCode.OAUTH_ERROR,
    };
  }

  if (
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("expired")
  ) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.TOKEN_EXPIRED],
      code: SupabaseErrorCode.TOKEN_EXPIRED,
    };
  }

  if (message.includes("user not found") || message.includes("no user")) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.USER_NOT_FOUND],
      code: SupabaseErrorCode.USER_NOT_FOUND,
    };
  }

  if (message.includes("password") && message.includes("short")) {
    return {
      message: ERROR_MESSAGES[SupabaseErrorCode.PASSWORD_TOO_SHORT],
      code: SupabaseErrorCode.PASSWORD_TOO_SHORT,
    };
  }

  return {
    message: error.message || ERROR_MESSAGES[SupabaseErrorCode.UNKNOWN_ERROR],
    code: SupabaseErrorCode.UNKNOWN_ERROR,
    status: error.status,
  };
}

export function handleAuthError(error: unknown): AuthError {
  if (error && typeof error === "object" && "message" in error) {
    return mapSupabaseError(error);
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: ERROR_MESSAGES[SupabaseErrorCode.UNKNOWN_ERROR],
    code: SupabaseErrorCode.UNKNOWN_ERROR,
  };
}

export function useAuthError() {
  const [error, setError] = useState<AuthError | null>(null);

  const handleError = useCallback((err: unknown) => {
    const authError = handleAuthError(err);
    setError(authError);

    setTimeout(() => setError(null), 10000);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
}

export const validation = {
  email: (email: string): { isValid: boolean; message?: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      return { isValid: false, message: "Email is required" };
    }

    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Please enter a valid email address" };
    }

    if (email.length > 254) {
      return { isValid: false, message: "Email address is too long" };
    }

    return { isValid: true };
  },

  password: (
    password: string
  ): {
    isValid: boolean;
    message?: string;
    strength?: "weak" | "medium" | "strong";
  } => {
    if (!password) {
      return { isValid: false, message: "Password is required" };
    }

    if (password.length < 8) {
      return {
        isValid: false,
        message: "Password must be at least 8 characters long",
        strength: "weak",
      };
    }

    if (password.length > 128) {
      return {
        isValid: false,
        message: "Password is too long (max 128 characters)",
      };
    }

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const strengthScore = [
      hasLowerCase,
      hasUpperCase,
      hasNumbers,
      hasSpecialChar,
    ].filter(Boolean).length;

    let strength: "weak" | "medium" | "strong" = "weak";
    if (strengthScore >= 3 && password.length >= 12) {
      strength = "strong";
    } else if (strengthScore >= 2 && password.length >= 8) {
      strength = "medium";
    }

    return { isValid: true, strength };
  },

  name: (name: string): { isValid: boolean; message?: string } => {
    if (!name) {
      return { isValid: false, message: "Name is required" };
    }

    if (name.length < 2) {
      return {
        isValid: false,
        message: "Name must be at least 2 characters long",
      };
    }

    if (name.length > 50) {
      return {
        isValid: false,
        message: "Name is too long (max 50 characters)",
      };
    }

    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
      return {
        isValid: false,
        message:
          "Name can only contain letters, spaces, hyphens, and apostrophes",
      };
    }

    return { isValid: true };
  },

  username: (username: string): { isValid: boolean; message?: string } => {
    if (!username) {
      return { isValid: false, message: "Username is required" };
    }

    if (username.length < 3) {
      return {
        isValid: false,
        message: "Username must be at least 3 characters long",
      };
    }

    if (username.length > 30) {
      return {
        isValid: false,
        message: "Username is too long (max 30 characters)",
      };
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return {
        isValid: false,
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      };
    }

    if (
      username.startsWith("_") ||
      username.startsWith("-") ||
      username.endsWith("_") ||
      username.endsWith("-")
    ) {
      return {
        isValid: false,
        message: "Username cannot start or end with underscore or hyphen",
      };
    }

    return { isValid: true };
  },

  confirmPassword: (
    password: string,
    confirmPassword: string
  ): { isValid: boolean; message?: string } => {
    if (!confirmPassword) {
      return { isValid: false, message: "Please confirm your password" };
    }

    if (password !== confirmPassword) {
      return { isValid: false, message: "Passwords do not match" };
    }

    return { isValid: true };
  },
};

export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt) {
      return true;
    }

    if (now > attempt.resetTime) {
      this.attempts.delete(key);
      return true;
    }

    return attempt.count < this.maxAttempts;
  }

  recordAttempt(key: string): void {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
    } else {
      attempt.count++;
    }
  }

  getRemainingAttempts(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt || Date.now() > attempt.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - attempt.count);
  }

  getTimeUntilReset(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt) {
      return 0;
    }
    return Math.max(0, attempt.resetTime - Date.now());
  }
}

export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

export function getProgressiveDelay(attemptCount: number): number {
  const delays = [0, 1000, 2000, 4000, 8000];
  return delays[Math.min(attemptCount, delays.length - 1)];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
