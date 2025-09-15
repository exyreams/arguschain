import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/global";
import { AlertCircle, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingState {
  isLoading: boolean;
  progress?: number;
  stage?: string;
  message?: string;
  error?: string;
  estimatedTime?: number;
  startTime?: number;
}

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: "text" | "rectangular" | "circular" | "rounded";
  animation?: "pulse" | "wave" | "none";
  lines?: number;
}

interface LoadingStateManagerProps {
  states: Record<string, LoadingState>;
  onRetry?: (stateKey: string) => void;
  onCancel?: (stateKey: string) => void;
  className?: string;
  showProgress?: boolean;
  showEstimatedTime?: boolean;
  compact?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width = "100%",
  height = "1rem",
  variant = "rectangular",
  animation = "pulse",
  lines = 1,
}) => {
  const baseClasses = cn(
    "bg-muted",
    animation === "pulse" && "animate-pulse",
    animation === "wave" && "animate-pulse",
    variant === "circular" && "rounded-full",
    variant === "rounded" && "rounded-md",
    variant === "text" && "rounded-sm",
    className,
  );

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={baseClasses}
            style={{
              width: index === lines - 1 ? "75%" : width,
              height,
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClasses} style={{ width, height }} />;
};

export const TransactionSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <Card className={cn("p-4", className)}>
    <div className="flex items-start space-x-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <Skeleton width="60%" height="1.25rem" />
          <Skeleton width="4rem" height="1.5rem" variant="rounded" />
        </div>
        <Skeleton lines={2} height="0.875rem" />
        <div className="flex items-center space-x-4">
          <Skeleton width="5rem" height="0.75rem" />
          <Skeleton width="6rem" height="0.75rem" />
          <Skeleton width="4rem" height="0.75rem" />
        </div>
      </div>
    </div>
  </Card>
);

export const ChartSkeleton: React.FC<{
  className?: string;
  height?: number;
}> = ({ className, height = 300 }) => (
  <Card className={cn("p-4", className)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="8rem" height="1.5rem" />
        <div className="flex space-x-2">
          <Skeleton width="3rem" height="2rem" variant="rounded" />
          <Skeleton width="3rem" height="2rem" variant="rounded" />
        </div>
      </div>
      <Skeleton width="100%" height={height} variant="rounded" />
      <div className="flex justify-between">
        <Skeleton width="4rem" height="0.75rem" />
        <Skeleton width="6rem" height="0.75rem" />
      </div>
    </div>
  </Card>
);

export const TableSkeleton: React.FC<{
  className?: string;
  rows?: number;
  columns?: number;
}> = ({ className, rows = 5, columns = 4 }) => (
  <Card className={cn("overflow-hidden", className)}>
    <div className="flex border-b bg-muted/50 p-4">
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="flex-1 px-2">
          <Skeleton width="80%" height="1rem" />
        </div>
      ))}
    </div>

    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 px-2">
              <Skeleton
                width={colIndex === 0 ? "90%" : "70%"}
                height="0.875rem"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  </Card>
);

export const SecurityFlagsSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <Card className={cn("p-4", className)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="8rem" height="1.5rem" />
        <Skeleton width="3rem" height="1.5rem" variant="rounded" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-start space-x-3 p-3 border rounded-lg"
        >
          <Skeleton variant="circular" width={24} height={24} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton width="60%" height="1rem" />
              <Skeleton width="3rem" height="1.25rem" variant="rounded" />
            </div>
            <Skeleton lines={2} height="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export const TokenFlowSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <Card className={cn("p-4", className)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="10rem" height="1.5rem" />
        <div className="flex space-x-2">
          <Skeleton width="4rem" height="2rem" variant="rounded" />
          <Skeleton width="4rem" height="2rem" variant="rounded" />
        </div>
      </div>

      <div className="relative h-64 border rounded-lg bg-muted/20">
        <div className="absolute inset-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="circular"
              width={32}
              height={32}
              className="absolute"
              style={{
                left: `${20 + (index % 3) * 30}%`,
                top: `${20 + Math.floor(index / 3) * 40}%`,
              }}
            />
          ))}

          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`line-${index}`}
              width="20%"
              height={2}
              className="absolute"
              style={{
                left: `${25 + index * 15}%`,
                top: `${30 + index * 10}%`,
                transform: `rotate(${index * 30}deg)`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <Skeleton width="6rem" height="0.75rem" />
        <Skeleton width="8rem" height="0.75rem" />
      </div>
    </div>
  </Card>
);

const ProgressIndicator: React.FC<{
  progress: number;
  stage: string;
  message?: string;
  estimatedTime?: number;
  startTime?: number;
}> = ({ progress, stage, message, estimatedTime, startTime }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const remainingTime =
    estimatedTime && startTime
      ? Math.max(0, estimatedTime - elapsedTime)
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{stage}</span>
        <span>{progress.toFixed(0)}%</span>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {(elapsedTime > 0 || remainingTime !== null) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {elapsedTime > 0 && (
            <span>Elapsed: {Math.floor(elapsedTime / 1000)}s</span>
          )}
          {remainingTime !== null && (
            <span>Remaining: ~{Math.floor(remainingTime / 1000)}s</span>
          )}
        </div>
      )}
    </div>
  );
};

export const LoadingStateManager: React.FC<LoadingStateManagerProps> = ({
  states,
  onRetry,
  onCancel,
  className,
  showProgress = true,
  showEstimatedTime = true,
  compact = false,
}) => {
  const activeStates = useMemo(() => {
    return Object.entries(states).filter(
      ([_, state]) => state.isLoading || state.error,
    );
  }, [states]);

  const overallProgress = useMemo(() => {
    const loadingStates = Object.values(states).filter(
      (state) => state.isLoading,
    );
    if (loadingStates.length === 0) return 100;

    const totalProgress = loadingStates.reduce(
      (sum, state) => sum + (state.progress || 0),
      0,
    );

    return totalProgress / loadingStates.length;
  }, [states]);

  if (activeStates.length === 0) return null;

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2 text-sm", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          Loading {activeStates.length} operation
          {activeStates.length !== 1 ? "s" : ""}...
        </span>
        {showProgress && (
          <Badge variant="outline" className="text-xs">
            {overallProgress.toFixed(0)}%
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading Operations</span>
        </h3>
        <Badge variant="outline">{activeStates.length} active</Badge>
      </div>

      {showProgress && overallProgress < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span>{overallProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activeStates.map(([key, state]) => (
          <div
            key={key}
            className={cn(
              "p-3 border rounded-lg",
              state.error && "border-red-200 bg-red-50 dark:bg-red-950",
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  {state.error ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  {state.stage && (
                    <Badge variant="outline" className="text-xs">
                      {state.stage}
                    </Badge>
                  )}
                </div>

                {state.error ? (
                  <p className="text-sm text-red-600 mb-2">{state.error}</p>
                ) : (
                  <>
                    {state.message && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {state.message}
                      </p>
                    )}

                    {showProgress && state.progress !== undefined && (
                      <ProgressIndicator
                        progress={state.progress}
                        stage={state.stage || "Processing"}
                        message={state.message}
                        estimatedTime={state.estimatedTime}
                        startTime={state.startTime}
                      />
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {state.error && onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRetry(key)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}

                {onCancel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export function useLoadingStates() {
  const [states, setStates] = useState<Record<string, LoadingState>>({});

  const setLoadingState = useCallback(
    (key: string, state: Partial<LoadingState>) => {
      setStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...state,
          startTime:
            state.isLoading && !prev[key]?.startTime
              ? Date.now()
              : prev[key]?.startTime,
        },
      }));
    },
    [],
  );

  const startLoading = useCallback(
    (
      key: string,
      options: {
        stage?: string;
        message?: string;
        estimatedTime?: number;
      } = {},
    ) => {
      setLoadingState(key, {
        isLoading: true,
        progress: 0,
        error: undefined,
        ...options,
      });
    },
    [setLoadingState],
  );

  const updateProgress = useCallback(
    (
      key: string,
      progress: number,
      options: {
        stage?: string;
        message?: string;
      } = {},
    ) => {
      setLoadingState(key, {
        progress: Math.min(100, Math.max(0, progress)),
        ...options,
      });
    },
    [setLoadingState],
  );

  const finishLoading = useCallback(
    (key: string) => {
      setLoadingState(key, {
        isLoading: false,
        progress: 100,
        error: undefined,
      });

      setTimeout(() => {
        setStates((prev) => {
          const { [key]: removed, ...rest } = prev;
          return rest;
        });
      }, 1000);
    },
    [setLoadingState],
  );

  const setError = useCallback(
    (key: string, error: string) => {
      setLoadingState(key, {
        isLoading: false,
        error,
      });
    },
    [setLoadingState],
  );

  const clearState = useCallback((key: string) => {
    setStates((prev) => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllStates = useCallback(() => {
    setStates({});
  }, []);

  return {
    states,
    startLoading,
    updateProgress,
    finishLoading,
    setError,
    clearState,
    clearAllStates,
    hasActiveLoading: Object.values(states).some((state) => state.isLoading),
    hasErrors: Object.values(states).some((state) => state.error),
  };
}

export function withLoadingState<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    loadingComponent?: React.ComponentType<any>;
    errorComponent?: React.ComponentType<{
      error: string;
      onRetry?: () => void;
    }>;
    loadingProps?: any;
  } = {},
) {
  const {
    loadingComponent: LoadingComponent = Skeleton,
    errorComponent: ErrorComponent,
    loadingProps = {},
  } = options;

  return React.forwardRef<
    any,
    P & {
      isLoading?: boolean;
      error?: string;
      onRetry?: () => void;
    }
  >((props, ref) => {
    const { isLoading, error, onRetry, ...componentProps } = props;

    if (error && ErrorComponent) {
      return <ErrorComponent error={error} onRetry={onRetry} />;
    }

    if (isLoading) {
      return <LoadingComponent {...loadingProps} />;
    }

    return <Component {...(componentProps as P)} ref={ref} />;
  });
}

export default LoadingStateManager;
