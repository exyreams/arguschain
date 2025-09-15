import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button, Card } from "@/components/global";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ReplayErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ReplayErrorBoundary caught an error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-[rgba(220,38,38,0.1)] border-[rgba(220,38,38,0.3)]">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-400 mb-2">
                  Visualization Error
                </h3>
                <p className="text-[#8b9dc3] mb-4">
                  There was an error rendering the chart visualization. This
                  might be due to incomplete data or a temporary issue.
                </p>
                {this.state.error && (
                  <details className="mb-4">
                    <summary className="text-sm text-[#6b7280] cursor-pointer hover:text-[#8b9dc3]">
                      Technical Details
                    </summary>
                    <pre className="text-xs text-[#6b7280] mt-2 p-2 bg-[rgba(0,0,0,0.2)] rounded overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <span className="text-sm text-[#6b7280]">
                    or refresh the page to retry the analysis
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
