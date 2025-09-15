import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";

interface RetryMechanismProps {
  onRetry: () => Promise<void>;
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  error?: string;
  className?: string;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  nextRetryIn: number;
  lastError?: string;
}

export function RetryMechanism({
  onRetry,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 10000,
  backoffMultiplier = 2,
  error,
  className = "",
}: RetryMechanismProps) {
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    nextRetryIn: 0,
    lastError: error,
  });

  useEffect(() => {
    if (error && error !== retryState.lastError) {
      setRetryState((prev) => ({ ...prev, lastError: error }));
    }
  }, [error, retryState.lastError]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (retryState.nextRetryIn > 0) {
      interval = setInterval(() => {
        setRetryState((prev) => {
          const newTime = prev.nextRetryIn - 1000;
          if (newTime <= 0) {
            handleAutoRetry();
            return { ...prev, nextRetryIn: 0 };
          }
          return { ...prev, nextRetryIn: newTime };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [retryState.nextRetryIn]);

  const calculateDelay = (retryCount: number): number => {
    const delay = initialDelay * Math.pow(backoffMultiplier, retryCount);
    return Math.min(delay, maxDelay);
  };

  const handleManualRetry = useCallback(async () => {
    if (retryState.isRetrying || retryState.retryCount >= maxRetries) {
      return;
    }

    setRetryState((prev) => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
      nextRetryIn: 0,
    }));

    try {
      await onRetry();

      setRetryState({
        isRetrying: false,
        retryCount: 0,
        nextRetryIn: 0,
        lastError: undefined,
      });
    } catch (error) {
      const newRetryCount = retryState.retryCount + 1;
      const newError = error instanceof Error ? error.message : "Retry failed";

      if (newRetryCount < maxRetries) {
        const delay = calculateDelay(newRetryCount);
        setRetryState((prev) => ({
          ...prev,
          isRetrying: false,
          nextRetryIn: delay,
          lastError: newError,
        }));
      } else {
        setRetryState((prev) => ({
          ...prev,
          isRetrying: false,
          lastError: `Max retries (${maxRetries}) reached. ${newError}`,
        }));
      }
    }
  }, [retryState, maxRetries, onRetry]);

  const handleAutoRetry = useCallback(async () => {
    if (retryState.retryCount >= maxRetries) {
      return;
    }

    setRetryState((prev) => ({ ...prev, isRetrying: true }));

    try {
      await onRetry();

      setRetryState({
        isRetrying: false,
        retryCount: 0,
        nextRetryIn: 0,
        lastError: undefined,
      });
    } catch (error) {
      const newRetryCount = retryState.retryCount + 1;
      const newError =
        error instanceof Error ? error.message : "Auto-retry failed";

      if (newRetryCount < maxRetries) {
        const delay = calculateDelay(newRetryCount);
        setRetryState((prev) => ({
          ...prev,
          isRetrying: false,
          retryCount: newRetryCount,
          nextRetryIn: delay,
          lastError: newError,
        }));
      } else {
        setRetryState((prev) => ({
          ...prev,
          isRetrying: false,
          retryCount: newRetryCount,
          lastError: `Max retries (${maxRetries}) reached. ${newError}`,
        }));
      }
    }
  }, [retryState.retryCount, maxRetries, onRetry]);

  const resetRetries = () => {
    setRetryState({
      isRetrying: false,
      retryCount: 0,
      nextRetryIn: 0,
      lastError: undefined,
    });
  };

  if (!retryState.lastError && !error) {
    return null;
  }

  const canRetry = retryState.retryCount < maxRetries;
  const isWaitingForRetry = retryState.nextRetryIn > 0;

  return (
    <div
      className={`bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <h4 className="text-lg font-semibold text-red-400">
          Processing Failed
        </h4>
      </div>

      <p className="text-red-300 text-sm mb-4">
        {retryState.lastError || error}
      </p>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[#8b9dc3]">
          Retry attempts: {retryState.retryCount}/{maxRetries}
        </div>

        {isWaitingForRetry && (
          <div className="flex items-center gap-2 text-sm text-[#f59e0b]">
            <Clock className="h-4 w-4" />
            <span>
              Next retry in {Math.ceil(retryState.nextRetryIn / 1000)}s
            </span>
          </div>
        )}
      </div>

      {isWaitingForRetry && (
        <div className="mb-4">
          <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-2">
            <div
              className="bg-[#f59e0b] h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${100 - (retryState.nextRetryIn / calculateDelay(retryState.retryCount)) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {canRetry && (
          <button
            onClick={handleManualRetry}
            disabled={retryState.isRetrying || isWaitingForRetry}
            className="flex items-center gap-2 px-4 py-2 bg-[rgba(239,68,68,0.2)] border border-[rgba(239,68,68,0.4)] rounded-lg text-red-400 hover:bg-[rgba(239,68,68,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 ${retryState.isRetrying ? "animate-spin" : ""}`}
            />
            <span className="text-sm font-medium">
              {retryState.isRetrying ? "Retrying..." : "Retry Now"}
            </span>
          </button>
        )}

        <button
          onClick={resetRetries}
          className="px-4 py-2 bg-[rgba(107,114,128,0.2)] border border-[rgba(107,114,128,0.4)] rounded-lg text-[#8b9dc3] hover:bg-[rgba(107,114,128,0.3)] transition-colors"
        >
          <span className="text-sm font-medium">Dismiss</span>
        </button>
      </div>

      {!canRetry && (
        <div className="mt-4 p-3 bg-[rgba(107,114,128,0.1)] border border-[rgba(107,114,128,0.3)] rounded-lg">
          <p className="text-sm text-[#8b9dc3]">
            Maximum retry attempts reached. Please check your network connection
            and try refreshing the page.
          </p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[rgba(239,68,68,0.2)]">
        <details className="text-xs text-[#6b7280]">
          <summary className="cursor-pointer hover:text-[#8b9dc3] transition-colors">
            Retry Strategy Details
          </summary>
          <div className="mt-2 space-y-1">
            <p>• Initial delay: {initialDelay}ms</p>
            <p>• Backoff multiplier: {backoffMultiplier}x</p>
            <p>• Maximum delay: {maxDelay}ms</p>
            <p>• Maximum retries: {maxRetries}</p>
          </div>
        </details>
      </div>
    </div>
  );
}

export function useRetryMechanism(
  retryFunction: () => Promise<void>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {},
) {
  const [error, setError] = useState<string | undefined>();
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = useCallback(async () => {
    setError(undefined);
    setIsRetrying(true);

    try {
      await retryFunction();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setIsRetrying(false);
    }
  }, [retryFunction]);

  const clearError = () => {
    setError(undefined);
  };

  return {
    error,
    isRetrying,
    executeWithRetry,
    clearError,
  };
}
