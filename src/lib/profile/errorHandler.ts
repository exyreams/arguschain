import React from "react";
import type { ProfileError } from "./types";

// Error types
export enum ErrorType {
  NETWORK = "network",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  PERMISSION = "permission",
  RATE_LIMIT = "rate_limit",
  SERVER = "server",
  CLIENT = "client",
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Enhanced error interface
export interface EnhancedProfileError extends ProfileError {
  severity: ErrorSeverity;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

// Error handler class
export class ProfileErrorHandler {
  private errors: EnhancedProfileError[] = [];
  private maxErrors = 50;
  private onError?: (error: EnhancedProfileError) => void;

  constructor(onError?: (error: EnhancedProfileError) => void) {
    this.onError = onError;
  }

  // Handle different types of errors
  handleError(error: any, context?: Record<string, any>): EnhancedProfileError {
    const enhancedError = this.enhanceError(error, context);
    this.addError(enhancedError);

    if (this.onError) {
      this.onError(enhancedError);
    }

    return enhancedError;
  }

  // Enhance error with additional metadata
  private enhanceError(
    error: any,
    context?: Record<string, any>
  ): EnhancedProfileError {
    let profileError: ProfileError;
    let severity = ErrorSeverity.MEDIUM;

    if (error instanceof Error) {
      profileError = this.mapErrorToProfileError(error);
    } else if (typeof error === "string") {
      profileError = {
        type: "client",
        message: error,
        recoverable: true,
      };
    } else if (
      error &&
      typeof error === "object" &&
      error.type &&
      error.message
    ) {
      profileError = error as ProfileError;
    } else {
      profileError = {
        type: "client",
        message: "An unknown error occurred",
        recoverable: true,
      };
    }

    // Determine severity based on error type
    severity = this.determineSeverity(profileError);

    return {
      ...profileError,
      severity,
      timestamp: new Date().toISOString(),
      context,
      stack: error instanceof Error ? error.stack : undefined,
    };
  }

  // Map JavaScript errors to profile errors
  private mapErrorToProfileError(error: Error): ProfileError {
    // Network errors
    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      return {
        type: "network",
        message:
          "Network connection failed. Please check your internet connection.",
        recoverable: true,
        retryAction: () => window.location.reload(),
      };
    }

    // Validation errors
    if (
      error.name === "ValidationError" ||
      error.message.includes("validation")
    ) {
      return {
        type: "validation",
        message: error.message,
        recoverable: true,
      };
    }

    // Authentication errors
    if (
      error.message.includes("401") ||
      error.message.includes("unauthorized")
    ) {
      return {
        type: "authentication",
        message: "Authentication failed. Please sign in again.",
        recoverable: true,
        retryAction: () => (window.location.href = "/auth/signin"),
      };
    }

    // Permission errors
    if (error.message.includes("403") || error.message.includes("forbidden")) {
      return {
        type: "permission",
        message: "You don't have permission to perform this action.",
        recoverable: false,
      };
    }

    // Rate limit errors
    if (error.message.includes("rate limit") || error.message.includes("429")) {
      return {
        type: "rate_limit",
        message: "Too many requests. Please wait a moment and try again.",
        recoverable: true,
      };
    }

    // Server errors
    if (error.message.includes("500") || error.message.includes("server")) {
      return {
        type: "server",
        message: "Server error occurred. Please try again later.",
        recoverable: true,
        retryAction: () => window.location.reload(),
      };
    }

    // Default client error
    return {
      type: "client",
      message: error.message || "An unexpected error occurred",
      recoverable: true,
    };
  }

  // Determine error severity
  private determineSeverity(error: ProfileError): ErrorSeverity {
    switch (error.type) {
      case "authentication":
      case "permission":
        return ErrorSeverity.HIGH;
      case "network":
      case "server":
        return ErrorSeverity.MEDIUM;
      case "validation":
      case "rate_limit":
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  // Add error to collection
  private addError(error: EnhancedProfileError): void {
    this.errors.unshift(error);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
  }

  // Get all errors
  getErrors(): EnhancedProfileError[] {
    return [...this.errors];
  }

  // Get errors by type
  getErrorsByType(type: ErrorType): EnhancedProfileError[] {
    return this.errors.filter((error) => error.type === type);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): EnhancedProfileError[] {
    return this.errors.filter((error) => error.severity === severity);
  }

  // Clear all errors
  clearErrors(): void {
    this.errors = [];
  }

  // Clear errors by type
  clearErrorsByType(type: ErrorType): void {
    this.errors = this.errors.filter((error) => error.type !== type);
  }

  // Get error statistics
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.errors.forEach((error) => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });

    return stats;
  }

  // Check if there are critical errors
  hasCriticalErrors(): boolean {
    return this.errors.some(
      (error) => error.severity === ErrorSeverity.CRITICAL
    );
  }

  // Get the most recent error
  getLatestError(): EnhancedProfileError | null {
    return this.errors[0] || null;
  }
}

// Retry mechanism with exponential backoff
export class RetryHandler {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Check if we should retry this error
        if (!shouldRetry(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          this.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
      }
    }

    throw lastError;
  }
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = "CLOSED";
  }
}

// Error recovery strategies
export const errorRecoveryStrategies = {
  // Network error recovery
  networkError: {
    immediate: () => window.location.reload(),
    delayed: (delay = 5000) =>
      setTimeout(() => window.location.reload(), delay),
    retry: (operation: () => Promise<any>, maxRetries = 3) => {
      const retryHandler = new RetryHandler(maxRetries);
      return retryHandler.execute(
        operation,
        (error) =>
          error.name === "NetworkError" || error.message.includes("fetch")
      );
    },
  },

  // Authentication error recovery
  authError: {
    redirectToLogin: () => (window.location.href = "/auth/signin"),
    refreshToken: async () => {
      // This would typically refresh the auth token
      console.log("Refreshing authentication token...");
    },
  },

  // Validation error recovery
  validationError: {
    highlightFields: (errors: ProfileError[]) => {
      errors.forEach((error) => {
        if (error.field) {
          const element = document.querySelector(`[name="${error.field}"]`);
          if (element) {
            element.classList.add("border-red-500");
          }
        }
      });
    },
    showTooltips: (errors: ProfileError[]) => {
      // Implementation would show validation tooltips
      console.log("Showing validation tooltips:", errors);
    },
  },

  // Permission error recovery
  permissionError: {
    showUpgradePrompt: () => {
      // Show upgrade account prompt
      console.log("Showing account upgrade prompt...");
    },
    contactSupport: () => {
      window.open("mailto:support@arguschain.com", "_blank");
    },
  },
};

// Global error handler instance
export const globalErrorHandler = new ProfileErrorHandler((error) => {
  // Log error to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("Profile Error:", error);
  }

  // In production, you might want to send errors to a logging service
  // logErrorToService(error);
});

// Utility functions
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const enhancedError = globalErrorHandler.handleError(error, context);
    throw enhancedError;
  }
};

export const createErrorBoundary = (
  fallbackComponent: React.ComponentType<{ error: EnhancedProfileError }>
) => {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: EnhancedProfileError | null }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { error: null };
    }

    static getDerivedStateFromError(errorObj: Error): {
      error: EnhancedProfileError;
    } {
      const enhancedError = globalErrorHandler.handleError(errorObj);
      return { error: enhancedError };
    }

    componentDidCatch(errorObj: Error, errorInfo: React.ErrorInfo) {
      globalErrorHandler.handleError(errorObj, { errorInfo });
    }

    render() {
      if (this.state.error) {
        const FallbackComponent = fallbackComponent;
        return React.createElement(FallbackComponent, {
          error: this.state.error,
        });
      }

      return this.props.children;
    }
  };
};
