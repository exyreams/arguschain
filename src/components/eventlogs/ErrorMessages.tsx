import React from "react";
import {
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lightbulb,
  Zap,
} from "lucide-react";
import { Button } from "@/components/global/Button";
import { Alert } from "@/components/global/Alert";

interface ErrorMessageProps {
  error: Error;
  context?: "query" | "network" | "parsing" | "rendering" | "general";
  onRetry?: () => void;
  onReset?: () => void;
  className?: string;
}

interface ErrorSuggestion {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  link?: {
    label: string;
    url: string;
  };
}

const getErrorSuggestions = (
  error: Error,
  context?: string
): ErrorSuggestion[] => {
  const message = error.message.toLowerCase();
  const suggestions: ErrorSuggestion[] = [];

  // Network-related errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    suggestions.push({
      title: "Check Network Connection",
      description: "Verify your internet connection is stable and try again.",
      action: {
        label: "Retry Request",
        onClick: () => window.location.reload(),
      },
    });

    suggestions.push({
      title: "Try Different Network",
      description:
        "Switch between Mainnet and Sepolia to see if the issue persists.",
    });

    suggestions.push({
      title: "RPC Endpoint Issues",
      description:
        "The RPC endpoint might be experiencing high load. Try again in a few minutes.",
    });
  }

  // Contract-related errors
  if (message.includes("contract") || message.includes("address")) {
    suggestions.push({
      title: "Verify Contract Address",
      description:
        "Ensure the contract address is correct and exists on the selected network.",
      link: {
        label: "Check on Etherscan",
        url: "https://etherscan.io",
      },
    });

    suggestions.push({
      title: "Check Contract Type",
      description:
        "Make sure the contract emits Transfer events (ERC-20, ERC-721, etc.).",
    });
  }

  // Block range errors
  if (message.includes("block") || message.includes("range")) {
    suggestions.push({
      title: "Reduce Block Range",
      description:
        "Try analyzing a smaller block range (< 10,000 blocks) to avoid timeouts.",
    });

    suggestions.push({
      title: "Use Recent Blocks",
      description:
        "Start with recent blocks which are more likely to be cached and faster to query.",
    });

    suggestions.push({
      title: "Check Block Numbers",
      description:
        "Verify that your block range is valid and the blocks exist on the network.",
    });
  }

  // Rate limiting errors
  if (
    message.includes("rate") ||
    message.includes("limit") ||
    message.includes("429")
  ) {
    suggestions.push({
      title: "Rate Limit Exceeded",
      description:
        "You've hit the RPC rate limit. Wait a moment before trying again.",
    });

    suggestions.push({
      title: "Use Smaller Queries",
      description:
        "Break your analysis into smaller chunks to stay within rate limits.",
    });
  }

  // Data parsing errors
  if (
    message.includes("parse") ||
    message.includes("json") ||
    message.includes("format")
  ) {
    suggestions.push({
      title: "Data Format Issue",
      description:
        "The response data format is unexpected. This might be a temporary issue.",
      action: {
        label: "Clear Cache",
        onClick: () => {
          localStorage.clear();
          window.location.reload();
        },
      },
    });
  }

  // Memory/performance errors
  if (
    message.includes("memory") ||
    message.includes("performance") ||
    message.includes("timeout")
  ) {
    suggestions.push({
      title: "Reduce Dataset Size",
      description:
        "Try analyzing fewer blocks or use filters to reduce the amount of data.",
    });

    suggestions.push({
      title: "Clear Browser Cache",
      description:
        "Clear your browser cache and close other tabs to free up memory.",
      action: {
        label: "Clear Cache",
        onClick: () => {
          localStorage.clear();
          sessionStorage.clear();
        },
      },
    });
  }

  // Generic fallback suggestions
  if (suggestions.length === 0) {
    suggestions.push({
      title: "Refresh the Page",
      description: "A simple page refresh often resolves temporary issues.",
      action: {
        label: "Refresh",
        onClick: () => window.location.reload(),
      },
    });

    suggestions.push({
      title: "Try Again Later",
      description:
        "The issue might be temporary. Try your analysis again in a few minutes.",
    });

    suggestions.push({
      title: "Contact Support",
      description:
        "If the problem persists, reach out to our support team for assistance.",
      link: {
        label: "Get Help",
        url: "#help",
      },
    });
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  context = "general",
  onRetry,
  onReset,
  className = "",
}) => {
  const suggestions = getErrorSuggestions(error, context);

  return (
    <div className={`space-y-4 ${className}`}>
      <Alert className="border-red-500/50 bg-red-500/10">
        <AlertCircle className="h-4 w-4" />
        <div className="flex-1">
          <h4 className="font-medium text-red-400 mb-1">
            {context === "query" && "Query Error"}
            {context === "network" && "Network Error"}
            {context === "parsing" && "Data Processing Error"}
            {context === "rendering" && "Rendering Error"}
            {context === "general" && "Error"}
          </h4>
          <p className="text-sm text-red-300">{error.message}</p>

          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Alert>

      {suggestions.length > 0 && (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-[#00bfff]" />
            <h4 className="font-medium text-[#00bfff]">Suggested Solutions</h4>
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-[rgba(0,191,255,0.05)] rounded-lg"
              >
                <div className="w-5 h-5 bg-[rgba(0,191,255,0.2)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#00bfff]">
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1">
                  <h5 className="font-medium text-[#8b9dc3] mb-1">
                    {suggestion.title}
                  </h5>
                  <p className="text-sm text-[#6b7280] mb-2">
                    {suggestion.description}
                  </p>

                  <div className="flex gap-2">
                    {suggestion.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={suggestion.action.onClick}
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {suggestion.action.label}
                      </Button>
                    )}

                    {suggestion.link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(suggestion.link!.url, "_blank")
                        }
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {suggestion.link.label}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for enhanced error handling
export const useEnhancedErrorHandling = () => {
  const [errors, setErrors] = React.useState<
    Array<{
      id: string;
      error: Error;
      context?: string;
      timestamp: Date;
    }>
  >([]);

  const addError = React.useCallback((error: Error, context?: string) => {
    const errorEntry = {
      id: Math.random().toString(36).substr(2, 9),
      error,
      context,
      timestamp: new Date(),
    };

    setErrors((prev) => [...prev, errorEntry]);

    // Auto-remove errors after 30 seconds
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e.id !== errorEntry.id));
    }, 30000);
  }, []);

  const removeError = React.useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
  };
};

// Error boundary with enhanced error messages
interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  context?: string;
  fallback?: React.ReactNode;
}

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class EnhancedErrorBoundary extends React.Component<
  EnhancedErrorBoundaryProps,
  EnhancedErrorBoundaryState
> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EnhancedErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Enhanced Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorMessage
          error={this.state.error}
          context={this.props.context as any}
          onRetry={() => this.setState({ hasError: false, error: null })}
          onReset={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
