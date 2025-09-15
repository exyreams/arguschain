import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Square,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

interface ProgressTrackerProps {
  isActive: boolean;
  progress: ProgressData;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  className?: string;
  persistenceKey?: string;
  showCostTracking?: boolean;
  showDetailedBreakdown?: boolean;
}

interface ProgressData {
  id: string;
  type: "transaction" | "block" | "batch";
  status:
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  currentStep: number;
  totalSteps: number;
  percentage: number;
  message: string;
  startTime: number;
  estimatedEndTime?: number;
  elapsedTime: number;
  remainingTime?: number;
  currentOperation?: string;
  subProgress?: {
    current: number;
    total: number;
    message: string;
  };
  costTracking?: {
    estimatedTotal: number;
    accumulated: number;
    currency: "USD" | "ETH";
    breakdown: Array<{
      operation: string;
      cost: number;
      timestamp: number;
    }>;
  };
  performance?: {
    rpcCalls: number;
    dataProcessed: number;
    cacheHits: number;
    cacheMisses: number;
    averageResponseTime: number;
  };
  errors?: Array<{
    timestamp: number;
    message: string;
    severity: "low" | "medium" | "high";
    recovered: boolean;
  }>;
}

interface ProgressHistory {
  [key: string]: {
    data: ProgressData;
    timestamp: number;
    completed: boolean;
  };
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  isActive,
  progress,
  onCancel,
  onPause,
  onResume,
  onRetry,
  className,
  persistenceKey = "replay-progress",
  showCostTracking = true,
  showDetailedBreakdown = false,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [progressHistory, setProgressHistory] = useState<ProgressHistory>({});

  if (!progress) {
    return null;
  }

  useEffect(() => {
    if (persistenceKey) {
      try {
        const saved = localStorage.getItem(`${persistenceKey}-history`);
        if (saved) {
          setProgressHistory(JSON.parse(saved));
        }
      } catch (error) {
        console.warn("Failed to load progress history:", error);
      }
    }
  }, [persistenceKey]);

  useEffect(() => {
    if (persistenceKey && isActive) {
      try {
        const updatedHistory = {
          ...progressHistory,
          [progress.id]: {
            data: progress,
            timestamp: Date.now(),
            completed:
              progress.status === "completed" || progress.status === "failed",
          },
        };

        setProgressHistory(updatedHistory);
        localStorage.setItem(
          `${persistenceKey}-history`,
          JSON.stringify(updatedHistory),
        );

        localStorage.setItem(
          `${persistenceKey}-current`,
          JSON.stringify(progress),
        );
      } catch (error) {
        console.warn("Failed to save progress:", error);
      }
    }
  }, [progress, persistenceKey, isActive, progressHistory]);

  const metrics = useMemo(() => {
    const throughput =
      progress.performance?.dataProcessed && progress.elapsedTime > 0
        ? progress.performance.dataProcessed / (progress.elapsedTime / 1000)
        : 0;

    const efficiency =
      progress.performance?.cacheHits !== undefined &&
      progress.performance?.cacheMisses !== undefined
        ? (progress.performance.cacheHits /
            Math.max(
              progress.performance.cacheHits + progress.performance.cacheMisses,
              1,
            )) *
          100
        : 0;

    const costPerStep = progress.costTracking?.accumulated
      ? progress.costTracking.accumulated / Math.max(progress.currentStep, 1)
      : 0;

    const projectedTotalCost = costPerStep * progress.totalSteps;

    return {
      throughput,
      efficiency,
      costPerStep,
      projectedTotalCost,
    };
  }, [progress]);

  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  const getStatusDisplay = useCallback((status: ProgressData["status"]) => {
    switch (status) {
      case "pending":
        return { color: "text-gray-500", bg: "bg-gray-100", icon: Clock };
      case "running":
        return { color: "text-blue-500", bg: "bg-blue-100", icon: Play };
      case "paused":
        return { color: "text-yellow-500", bg: "bg-yellow-100", icon: Pause };
      case "completed":
        return {
          color: "text-green-500",
          bg: "bg-green-100",
          icon: CheckCircle,
        };
      case "failed":
        return { color: "text-red-500", bg: "bg-red-100", icon: AlertTriangle };
      case "cancelled":
        return { color: "text-gray-500", bg: "bg-gray-100", icon: X };
      default:
        return { color: "text-gray-500", bg: "bg-gray-100", icon: Clock };
    }
  }, []);

  const handleExportProgress = useCallback(() => {
    const exportData = {
      current: progress,
      history: progressHistory,
      metrics,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress-${progress.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [progress, progressHistory, metrics]);

  const statusDisplay = getStatusDisplay(progress.status);
  const StatusIcon = statusDisplay.icon;

  if (!isActive && !showHistory) {
    return null;
  }

  return (
    <div className={cn("bg-card rounded-lg border shadow-lg", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-lg", statusDisplay.bg)}>
            <StatusIcon className={cn("h-4 w-4", statusDisplay.color)} />
          </div>
          <div>
            <h3 className="font-semibold">
              {progress.type === "transaction"
                ? "Transaction Analysis"
                : progress.type === "block"
                  ? "Block Analysis"
                  : "Batch Analysis"}
            </h3>
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="capitalize">
            {progress.status}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                Progress: {progress.currentStep} / {progress.totalSteps}
              </span>
              <span className="font-medium">
                {progress.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className={cn(
                  "h-3 rounded-full transition-all duration-300",
                  progress.status === "completed"
                    ? "bg-green-500"
                    : progress.status === "failed"
                      ? "bg-red-500"
                      : progress.status === "cancelled"
                        ? "bg-gray-500"
                        : "bg-primary",
                )}
                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
              />
            </div>

            {progress.subProgress && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progress.subProgress.message}</span>
                  <span>
                    {progress.subProgress.current} /{" "}
                    {progress.subProgress.total}
                  </span>
                </div>
                <div className="w-full bg-secondary/50 rounded-full h-1">
                  <div
                    className="h-1 rounded-full bg-primary/70 transition-all duration-300"
                    style={{
                      width: `${(progress.subProgress.current / progress.subProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Elapsed</span>
              </div>
              <p className="text-lg font-bold">
                {formatDuration(progress.elapsedTime)}
              </p>
            </div>

            {progress.remainingTime && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Remaining</span>
                </div>
                <p className="text-lg font-bold">
                  {formatDuration(progress.remainingTime)}
                </p>
              </div>
            )}

            {showCostTracking && progress.costTracking && (
              <>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Cost</span>
                  </div>
                  <p className="text-lg font-bold">
                    {progress.costTracking.currency === "USD" ? "$" : "Ξ"}
                    {progress.costTracking.accumulated.toFixed(4)}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Projected</span>
                  </div>
                  <p className="text-lg font-bold">
                    {progress.costTracking.currency === "USD" ? "$" : "Ξ"}
                    {metrics.projectedTotalCost.toFixed(4)}
                  </p>
                </div>
              </>
            )}
          </div>

          {progress.performance && showDetailedBreakdown && (
            <div className="bg-background rounded-lg p-3">
              <h4 className="font-medium mb-2 flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Performance Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">RPC Calls</p>
                  <p className="font-medium">
                    {progress.performance.rpcCalls || 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data Processed</p>
                  <p className="font-medium">
                    {(progress.performance.dataProcessed || 0).toFixed(1)} MB
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cache Efficiency</p>
                  <p className="font-medium">
                    {metrics.efficiency.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Throughput</p>
                  <p className="font-medium">
                    {metrics.throughput.toFixed(1)} MB/s
                  </p>
                </div>
              </div>
            </div>
          )}

          {progress.currentOperation && (
            <div className="bg-background rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin">
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Current Operation:</span>
                <span className="text-sm text-muted-foreground">
                  {progress.currentOperation}
                </span>
              </div>
            </div>
          )}

          {progress.errors && progress.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Errors ({progress.errors.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {progress.errors.slice(-3).map((error, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded text-sm",
                      error.severity === "high"
                        ? "bg-red-50 text-red-700"
                        : error.severity === "medium"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-yellow-50 text-yellow-700",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{error.message || "Unknown error"}</span>
                      {error.recovered && (
                        <Badge variant="outline" className="text-xs">
                          Recovered
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(
                        error.timestamp || Date.now(),
                      ).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCostTracking &&
            progress.costTracking &&
            progress.costTracking.breakdown &&
            progress.costTracking.breakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  Cost Breakdown
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {progress.costTracking.breakdown
                    .slice(-5)
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {item.operation}
                        </span>
                        <span className="font-medium">
                          {progress.costTracking?.currency === "USD"
                            ? "$"
                            : "Ξ"}
                          {item.cost.toFixed(4)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              {progress.status === "running" && onPause && (
                <Button variant="outline" size="sm" onClick={onPause}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}

              {progress.status === "paused" && onResume && (
                <Button variant="outline" size="sm" onClick={onResume}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}

              {(progress.status === "running" ||
                progress.status === "paused") &&
                onCancel && (
                  <Button variant="destructive" size="sm" onClick={onCancel}>
                    <Square className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}

              {(progress.status === "failed" ||
                progress.status === "cancelled") &&
                onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <Clock className="h-4 w-4 mr-2" />
                History
              </Button>

              <Button variant="ghost" size="sm" onClick={handleExportProgress}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {showHistory && Object.keys(progressHistory).length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Recent Progress History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(progressHistory)
                  .sort(([, a], [, b]) => b.timestamp - a.timestamp)
                  .slice(0, 10)
                  .map(([id, entry]) => {
                    const historyStatusDisplay = getStatusDisplay(
                      entry.data.status,
                    );
                    const HistoryIcon = historyStatusDisplay.icon;

                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-2 bg-background rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <HistoryIcon
                            className={cn(
                              "h-3 w-3",
                              historyStatusDisplay.color,
                            )}
                          />
                          <span className="text-sm font-medium">
                            {entry.data.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.data.percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
