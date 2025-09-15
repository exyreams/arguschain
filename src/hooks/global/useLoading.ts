import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================================
// LOADING PROGRESS HOOKS
// ============================================================================

interface LoadingStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "active" | "completed" | "error";
  progress: number;
}

interface UseLoadingProgressProps {
  isLoading: boolean;
  steps?: LoadingStep[];
}

export const useLoadingProgress = ({
  isLoading,
  steps: customSteps,
}: UseLoadingProgressProps) => {
  const defaultSteps: LoadingStep[] = [
    {
      id: "validate",
      label: "Validate Query",
      description: "Checking query format and network connectivity",
      status: "pending",
      progress: 0,
    },
    {
      id: "fetch",
      label: "Fetch Event Logs",
      description: "Retrieving event logs from blockchain",
      status: "pending",
      progress: 0,
    },
    {
      id: "parse",
      label: "Parse Transfers",
      description: "Processing and parsing transfer data",
      status: "pending",
      progress: 0,
    },
    {
      id: "analyze",
      label: "Process Analytics",
      description: "Computing statistics and network analysis",
      status: "pending",
      progress: 0,
    },
    {
      id: "finalize",
      label: "Finalize Results",
      description: "Preparing data for visualization",
      status: "pending",
      progress: 0,
    },
  ];

  const [steps, setSteps] = useState<LoadingStep[]>(
    customSteps || defaultSteps
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      // Reset all steps when not loading
      setSteps((prev) =>
        prev.map((step) => ({ ...step, status: "pending", progress: 0 }))
      );
      setCurrentStepIndex(0);
      setOverallProgress(0);
      return;
    }

    // Simulate progressive loading
    const interval = setInterval(
      () => {
        setSteps((prevSteps) => {
          const newSteps = [...prevSteps];
          const currentStep = newSteps[currentStepIndex];

          if (currentStep && currentStep.status !== "completed") {
            // Update current step progress
            if (currentStep.status === "pending") {
              currentStep.status = "active";
            }

            currentStep.progress = Math.min(
              currentStep.progress + Math.random() * 15 + 5,
              100
            );

            // If current step is completed, move to next
            if (currentStep.progress >= 100) {
              currentStep.status = "completed";
              currentStep.progress = 100;

              if (currentStepIndex < newSteps.length - 1) {
                setCurrentStepIndex((prev) => prev + 1);
              }
            }
          }

          return newSteps;
        });
      },
      300 + Math.random() * 200
    ); // Random interval for more realistic feel

    return () => clearInterval(interval);
  }, [isLoading, currentStepIndex]);

  // Calculate overall progress
  useEffect(() => {
    const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0);
    const overall = Math.round(totalProgress / steps.length);
    setOverallProgress(overall);
  }, [steps]);

  const completedSteps = steps.filter(
    (step) => step.status === "completed"
  ).length;
  const activeStep = steps.find((step) => step.status === "active");

  return {
    steps,
    overallProgress,
    completedSteps,
    totalSteps: steps.length,
    activeStep,
    isComplete: completedSteps === steps.length,
  };
};

// ============================================================================
// PROGRESSIVE LOADING HOOKS
// ============================================================================

interface ProgressiveLoadingOptions {
  batchSize?: number;
  delay?: number;
  threshold?: number;
  enableVirtualization?: boolean;
}

interface ProgressiveLoadingState<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadedCount: number;
  totalCount: number;
  progress: number;
  error: string | null;
}

interface ProgressiveLoadingActions {
  loadMore: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
}

/**
 * useProgressiveLoading - Hook for progressive loading of large datasets
 *
 * This hook provides:
 * - Batch loading with configurable batch sizes
 * - Progress tracking and loading states
 * - Error handling and recovery
 * - Memory management for large datasets
 * - Virtualization support for performance
 */
export function useProgressiveLoading<T>(
  data: T[],
  options: ProgressiveLoadingOptions = {}
): [ProgressiveLoadingState<T>, ProgressiveLoadingActions] {
  const {
    batchSize = 100,
    delay = 50,
    threshold = 1000,
    enableVirtualization = true,
  } = options;

  const [state, setState] = useState<ProgressiveLoadingState<T>>({
    items: [],
    isLoading: false,
    hasMore: false,
    loadedCount: 0,
    totalCount: 0,
    progress: 0,
    error: null,
  });

  // Determine if progressive loading should be enabled
  const shouldUseProgressiveLoading = useMemo(() => {
    return data.length > threshold;
  }, [data.length, threshold]);

  // Initialize state when data changes
  useEffect(() => {
    if (!shouldUseProgressiveLoading) {
      setState({
        items: data,
        isLoading: false,
        hasMore: false,
        loadedCount: data.length,
        totalCount: data.length,
        progress: 100,
        error: null,
      });
      return;
    }

    // Initialize progressive loading
    const initialBatch = data.slice(0, batchSize);
    setState({
      items: initialBatch,
      isLoading: false,
      hasMore: data.length > batchSize,
      loadedCount: initialBatch.length,
      totalCount: data.length,
      progress: (initialBatch.length / data.length) * 100,
      error: null,
    });
  }, [data, batchSize, shouldUseProgressiveLoading]);

  const loadMore = useCallback(() => {
    if (!shouldUseProgressiveLoading || state.isLoading || !state.hasMore) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Simulate async loading with delay for better UX
    setTimeout(() => {
      setState((prev) => {
        const nextBatchStart = prev.loadedCount;
        const nextBatchEnd = Math.min(nextBatchStart + batchSize, data.length);
        const nextBatch = data.slice(nextBatchStart, nextBatchEnd);
        const newItems = [...prev.items, ...nextBatch];
        const newLoadedCount = newItems.length;
        const hasMore = newLoadedCount < data.length;

        return {
          ...prev,
          items: newItems,
          isLoading: false,
          hasMore,
          loadedCount: newLoadedCount,
          progress: (newLoadedCount / data.length) * 100,
        };
      });
    }, delay);
  }, [
    data,
    batchSize,
    delay,
    shouldUseProgressiveLoading,
    state.isLoading,
    state.hasMore,
  ]);

  const reset = useCallback(() => {
    if (!shouldUseProgressiveLoading) {
      return;
    }

    const initialBatch = data.slice(0, batchSize);
    setState({
      items: initialBatch,
      isLoading: false,
      hasMore: data.length > batchSize,
      loadedCount: initialBatch.length,
      totalCount: data.length,
      progress: (initialBatch.length / data.length) * 100,
      error: null,
    });
  }, [data, batchSize, shouldUseProgressiveLoading]);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, isLoading: false }));
  }, []);

  return [
    state,
    {
      loadMore,
      reset,
      setError,
    },
  ];
}

// ============================================================================
// UTILITY LOADING HOOKS
// ============================================================================

/**
 * useInfiniteScroll - Hook for infinite scroll functionality
 */
export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean,
  isLoading: boolean,
  threshold = 100
) {
  const handleScroll = useCallback(() => {
    if (isLoading || !hasMore) return;

    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      loadMore();
    }
  }, [loadMore, hasMore, isLoading, threshold]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
}

/**
 * useBatchProcessor - Hook for processing large datasets in batches
 */
export function useBatchProcessor<T, R>(
  data: T[],
  processor: (batch: T[]) => R[],
  batchSize = 100,
  delay = 10
) {
  const [results, setResults] = useState<R[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const process = useCallback(async () => {
    if (data.length === 0) {
      setResults([]);
      setProgress(100);
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setProgress(0);

    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    const allResults: R[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = processor(batch);
      allResults.push(...batchResults);

      setResults([...allResults]);
      setProgress(((i + 1) / batches.length) * 100);

      // Add delay between batches to prevent blocking
      if (i < batches.length - 1 && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setIsProcessing(false);
  }, [data, processor, batchSize, delay]);

  useEffect(() => {
    process();
  }, [process]);

  return {
    results,
    isProcessing,
    progress,
    reprocess: process,
  };
}

/**
 * useMemoryManager - Hook for managing memory usage with large datasets
 */
export function useMemoryManager<T>(
  data: T[],
  maxItems = 1000,
  cleanupThreshold = 1500
) {
  const [managedData, setManagedData] = useState<T[]>([]);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    if (data.length <= maxItems) {
      setManagedData(data);
      return;
    }

    // If data exceeds cleanup threshold, perform cleanup
    if (data.length > cleanupThreshold) {
      setIsCleaningUp(true);

      // Keep most recent items
      const recentData = data.slice(-maxItems);

      setTimeout(() => {
        setManagedData(recentData);
        setIsCleaningUp(false);

        // Force garbage collection hint
        if (window.gc) {
          window.gc();
        }
      }, 100);
    } else {
      setManagedData(data);
    }
  }, [data, maxItems, cleanupThreshold]);

  return {
    data: managedData,
    isCleaningUp,
    memoryPressure: data.length > cleanupThreshold,
    originalSize: data.length,
    managedSize: managedData.length,
  };
}

/**
 * useSimpleLoader - Simple loading state hook
 */
export function useSimpleLoader(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError: setLoadingError,
    reset,
  };
}

// Export types
export type {
  LoadingStep,
  UseLoadingProgressProps,
  ProgressiveLoadingOptions,
  ProgressiveLoadingState,
  ProgressiveLoadingActions,
};
