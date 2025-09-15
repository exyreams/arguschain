import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from "lucide-react";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class LogsErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error("LogsErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-6 m-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-400">
                Component Error
              </h3>
              <p className="text-sm text-[#8b9dc3]">
                {this.props.componentName
                  ? `The ${this.props.componentName} component encountered an error`
                  : "A component has encountered an unexpected error"}
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-red-500/50 text-red-400 bg-red-500/10 ml-auto"
            >
              Error
            </Badge>
          </div>

          {this.state.error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded">
              <div className="text-sm font-medium text-red-400 mb-1">
                Error Message:
              </div>
              <div className="text-sm text-[#8b9dc3] font-mono">
                {this.state.error.message}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {this.state.retryCount < this.maxRetries && (
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({this.maxRetries - this.state.retryCount} left)
              </Button>
            )}

            <Button
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            >
              Reset Component
            </Button>

            {this.props.showDetails && this.state.errorInfo && (
              <details className="ml-auto">
                <summary className="cursor-pointer text-sm text-[#8b9dc3] hover:text-[#00bfff]">
                  <Bug className="h-4 w-4 inline mr-1" />
                  Show Details
                </summary>
                <div className="mt-2 p-3 bg-[rgba(25,28,40,0.6)] rounded text-xs font-mono text-[#6b7280] max-h-40 overflow-auto">
                  <div className="mb-2">
                    <strong>Component Stack:</strong>
                  </div>
                  <pre className="whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>

          <div className="mt-4 p-3 bg-[rgba(25,28,40,0.6)] rounded">
            <div className="text-xs text-[#8b9dc3]">
              <strong>Troubleshooting Tips:</strong>
            </div>
            <ul className="text-xs text-[#6b7280] mt-1 space-y-1">
              <li>• Try refreshing the page</li>
              <li>• Check your network connection</li>
              <li>• Verify the contract address and block range</li>
              <li>• Try a smaller block range if analyzing large datasets</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different component types

export const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <LogsErrorBoundary
    componentName="Chart"
    showDetails={false}
    fallback={
      <div className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">
          Chart Rendering Error
        </h3>
        <p className="text-sm text-[#8b9dc3] mb-4">
          Unable to render the chart with the current data
        </p>
        <div className="text-xs text-[#6b7280]">
          This might be due to insufficient data or data format issues
        </div>
      </div>
    }
  >
    {children}
  </LogsErrorBoundary>
);

export const TableErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <LogsErrorBoundary
    componentName="Table"
    showDetails={false}
    fallback={
      <div className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">
          Table Loading Error
        </h3>
        <p className="text-sm text-[#8b9dc3] mb-4">
          Unable to display the table data
        </p>
        <div className="text-xs text-[#6b7280]">
          The data might be corrupted or in an unexpected format
        </div>
      </div>
    }
  >
    {children}
  </LogsErrorBoundary>
);

export const NetworkErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <LogsErrorBoundary
    componentName="Network Diagram"
    showDetails={false}
    fallback={
      <div className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">
          Network Visualization Error
        </h3>
        <p className="text-sm text-[#8b9dc3] mb-4">
          Unable to render the network diagram
        </p>
        <div className="text-xs text-[#6b7280]">
          This might be due to complex network topology or insufficient data
        </div>
      </div>
    }
  >
    {children}
  </LogsErrorBoundary>
);

export const AnalyticsErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <LogsErrorBoundary
    componentName="Analytics"
    showDetails={false}
    fallback={
      <div className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">
          Analytics Processing Error
        </h3>
        <p className="text-sm text-[#8b9dc3] mb-4">
          Unable to process analytics for the current dataset
        </p>
        <div className="text-xs text-[#6b7280]">
          Try reducing the dataset size or check data quality
        </div>
      </div>
    }
  >
    {children}
  </LogsErrorBoundary>
);

// Hook for graceful error handling in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error("Component error:", error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = React.useCallback(
    <T extends any[], R>(fn: (...args: T) => R) => {
      return (...args: T): R | null => {
        try {
          return fn(...args);
        } catch (error) {
          handleError(error as Error);
          return null;
        }
      };
    },
    [handleError]
  );

  return {
    error,
    handleError,
    clearError,
    withErrorHandling,
  };
};

// Graceful degradation component
interface GracefulDegradationProps {
  children: ReactNode;
  fallback: ReactNode;
  condition: boolean;
  errorMessage?: string;
}

export const GracefulDegradation: React.FC<GracefulDegradationProps> = ({
  children,
  fallback,
  condition,
  errorMessage,
}) => {
  if (!condition) {
    return (
      <div className="bg-[rgba(15,20,25,0.8)] border border-yellow-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-yellow-400">
            Feature Unavailable
          </h3>
        </div>
        {errorMessage && (
          <p className="text-sm text-[#8b9dc3] mb-4">{errorMessage}</p>
        )}
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
};

// Retry wrapper component
interface RetryWrapperProps {
  children: ReactNode;
  maxRetries?: number;
  onRetry?: () => void;
  retryDelay?: number;
}

export const RetryWrapper: React.FC<RetryWrapperProps> = ({
  children,
  maxRetries = 3,
  onRetry,
  retryDelay = 1000,
}) => {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = React.useCallback(async () => {
    if (retryCount < maxRetries) {
      setIsRetrying(true);

      if (onRetry) {
        onRetry();
      }

      // Add delay before retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      setRetryCount((prev) => prev + 1);
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, onRetry, retryDelay]);

  if (isRetrying) {
    return (
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 text-center">
        <RefreshCw className="h-8 w-8 text-[#00bfff] mx-auto mb-3 animate-spin" />
        <div className="text-sm text-[#8b9dc3]">
          Retrying... (Attempt {retryCount + 1}/{maxRetries})
        </div>
      </div>
    );
  }

  return (
    <LogsErrorBoundary
      onError={handleRetry}
      fallback={
        <div className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <div className="text-sm text-[#8b9dc3] mb-4">
            Component failed after {maxRetries} attempts
          </div>
          {retryCount < maxRetries && (
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      }
    >
      {children}
    </LogsErrorBoundary>
  );
};
