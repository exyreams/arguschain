import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Alert } from "@/components/global/Alert";
import {
  AlertTriangle,
  Bug,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  showDetails: boolean;
  isRetrying: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  enableRetry?: boolean;
  showErrorDetails?: boolean;
  context?: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
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

    this.props.onError?.(error, errorInfo);

    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    try {
      const existingErrors = JSON.parse(
        localStorage.getItem("error-reports") || "[]",
      );
      existingErrors.push(errorReport);

      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }

      localStorage.setItem("error-reports", JSON.stringify(existingErrors));
    } catch (e) {
      console.warn("Failed to store error report:", e);
    }
  };

  private handleRetry = async () => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);

    this.retryTimeout = setTimeout(() => {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, delay);
  };

  private toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  private getErrorMessage = (error: Error): string => {
    if (error.message.includes("ChunkLoadError")) {
      return "Failed to load application resources. Please refresh the page.";
    }

    if (error.message.includes("Network Error")) {
      return "Network connection error. Please check your internet connection and try again.";
    }

    if (error.message.includes("RPC")) {
      return "Blockchain connection error. The network may be temporarily unavailable.";
    }

    if (error.message.includes("timeout")) {
      return "Request timed out. The operation took too long to complete.";
    }

    if (error.message.includes("storage")) {
      return "Storage analysis error. There may be an issue with the contract data.";
    }

    return "An unexpected error occurred. Please try again.";
  };

  private getRecoveryActions = (
    error: Error,
  ): Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }> => {
    const actions = [];

    if (
      this.props.enableRetry !== false &&
      this.state.retryCount < (this.props.maxRetries || 3)
    ) {
      actions.push({
        label: this.state.isRetrying ? "Retrying..." : "Try Again",
        action: this.handleRetry,
        primary: true,
      });
    }

    if (
      error.message.includes("ChunkLoadError") ||
      error.message.includes("Network Error")
    ) {
      actions.push({
        label: "Refresh Page",
        action: () => window.location.reload(),
      });
    }

    if (error.message.includes("navigation")) {
      actions.push({
        label: "Go Back",
        action: () => window.history.back(),
      });
    }

    return actions;
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.getErrorMessage(this.state.error);
      const recoveryActions = this.getRecoveryActions(this.state.error);
      const context = this.props.context || "Application";

      return (
        <Card className="bg-[rgba(25,28,40,0.8)] border-red-500/20 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                {context} Error
              </h3>

              <p className="text-[#8b9dc3] mb-4">{errorMessage}</p>

              {recoveryActions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {recoveryActions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.primary ? "default" : "outline"}
                      size="sm"
                      onClick={action.action}
                      disabled={this.state.isRetrying}
                      className={
                        action.primary
                          ? "bg-[#00bfff] text-white hover:bg-[#0099cc]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }
                    >
                      {action.primary && this.state.isRetrying && (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {this.state.retryCount > 0 && (
                <Alert variant="warning" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <div>
                    Retry attempt {this.state.retryCount} of{" "}
                    {this.props.maxRetries || 3}
                  </div>
                </Alert>
              )}

              {this.props.showErrorDetails !== false && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.toggleDetails}
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] mb-3"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    {this.state.showDetails ? "Hide" : "Show"} Technical Details
                    {this.state.showDetails ? (
                      <ChevronUp className="h-4 w-4 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2" />
                    )}
                  </Button>

                  {this.state.showDetails && (
                    <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-[#00bfff] mb-1">
                            Error Message
                          </h4>
                          <code className="text-xs text-red-400 bg-[rgba(0,0,0,0.3)] p-2 rounded block overflow-x-auto">
                            {this.state.error.message}
                          </code>
                        </div>

                        {this.state.error.stack && (
                          <div>
                            <h4 className="text-sm font-medium text-[#00bfff] mb-1">
                              Stack Trace
                            </h4>
                            <code className="text-xs text-[#8b9dc3] bg-[rgba(0,0,0,0.3)] p-2 rounded block overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {this.state.error.stack}
                            </code>
                          </div>
                        )}

                        {this.state.errorInfo?.componentStack && (
                          <div>
                            <h4 className="text-sm font-medium text-[#00bfff] mb-1">
                              Component Stack
                            </h4>
                            <code className="text-xs text-[#8b9dc3] bg-[rgba(0,0,0,0.3)] p-2 rounded block overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {this.state.errorInfo.componentStack}
                            </code>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-medium text-[#00bfff] mb-1">
                            Context Information
                          </h4>
                          <div className="text-xs text-[#8b9dc3] space-y-1">
                            <div>
                              Context: {this.props.context || "Unknown"}
                            </div>
                            <div>Timestamp: {new Date().toISOString()}</div>
                            <div>User Agent: {navigator.userAgent}</div>
                            <div>URL: {window.location.href}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 p-3 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg">
                <p className="text-xs text-[#8b9dc3]">
                  If this error persists, please try refreshing the page or
                  contact support. Technical details have been logged for
                  debugging purposes.
                </p>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    console.error("Error caught by useErrorHandler:", error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    throw error;
  }

  return { handleError, clearError };
}
