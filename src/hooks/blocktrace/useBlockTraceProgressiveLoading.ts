import { useState, useCallback } from "react";
import { LoadingStep } from "@/lib/debugtrace";

interface UseBlockTraceProgressiveLoadingOptions {
  onStepComplete?: (stepId: string) => void;
  onAllComplete?: () => void;
  onError?: (stepId: string, error: string) => void;
}

export function useBlockTraceProgressiveLoading(
  initialSteps: Omit<LoadingStep, "status" | "progress">[],
  options: UseBlockTraceProgressiveLoadingOptions = {}
) {
  const [steps, setSteps] = useState<LoadingStep[]>(
    initialSteps.map((step) => ({
      ...step,
      status: "pending" as const,
      progress: 0,
    }))
  );

  const updateStep = useCallback(
    (
      stepId: string,
      updates: Partial<
        Pick<LoadingStep, "status" | "progress" | "error" | "duration">
      >
    ) => {
      setSteps((prevSteps) =>
        prevSteps.map((step) => {
          if (step.id === stepId) {
            const updatedStep = { ...step, ...updates };

            // Trigger callbacks
            if (updates.status === "completed" && options.onStepComplete) {
              options.onStepComplete(stepId);
            }

            if (
              updates.status === "error" &&
              options.onError &&
              updates.error
            ) {
              options.onError(stepId, updates.error);
            }

            return updatedStep;
          }
          return step;
        })
      );
    },
    [options]
  );

  const startStep = useCallback(
    (stepId: string) => {
      updateStep(stepId, { status: "loading", progress: 0 });
    },
    [updateStep]
  );

  const updateProgress = useCallback(
    (stepId: string, progress: number) => {
      updateStep(stepId, { progress: Math.min(100, Math.max(0, progress)) });
    },
    [updateStep]
  );

  const completeStep = useCallback(
    (stepId: string, duration?: number) => {
      updateStep(stepId, {
        status: "completed",
        progress: 100,
        duration,
      });
    },
    [updateStep]
  );

  const errorStep = useCallback(
    (stepId: string, error: string) => {
      updateStep(stepId, { status: "error", error });
    },
    [updateStep]
  );

  const resetSteps = useCallback(() => {
    setSteps(
      initialSteps.map((step) => ({
        ...step,
        status: "pending" as const,
        progress: 0,
        error: undefined,
        duration: undefined,
      }))
    );
  }, [initialSteps]);

  const resetStep = useCallback(
    (stepId: string) => {
      updateStep(stepId, {
        status: "pending",
        progress: 0,
        error: undefined,
        duration: undefined,
      });
    },
    [updateStep]
  );

  // Check if all steps are completed
  const allCompleted = steps.every(
    (step) => step.status === "completed" || step.status === "error"
  );

  // Trigger onAllComplete when all steps are done
  if (allCompleted && options.onAllComplete) {
    setTimeout(() => options.onAllComplete!(), 0);
  }

  // Get current step (first non-completed step)
  const currentStep = steps.find(
    (step) => step.status === "loading" || step.status === "pending"
  );

  // Get overall progress
  const completedSteps = steps.filter(
    (step) => step.status === "completed"
  ).length;
  const overallProgress = (completedSteps / steps.length) * 100;

  // Get step statistics
  const stepStats = {
    total: steps.length,
    completed: steps.filter((step) => step.status === "completed").length,
    loading: steps.filter((step) => step.status === "loading").length,
    error: steps.filter((step) => step.status === "error").length,
    pending: steps.filter((step) => step.status === "pending").length,
  };

  return {
    steps,
    currentStep,
    overallProgress,
    stepStats,
    allCompleted,

    // Actions
    startStep,
    updateProgress,
    completeStep,
    errorStep,
    resetSteps,
    resetStep,
    updateStep,
  };
}

// Default steps for block trace analysis
export const DEFAULT_BLOCK_TRACE_STEPS: Omit<
  LoadingStep,
  "status" | "progress"
>[] = [
  {
    id: "validate",
    name: "Validate Block Identifier",
    description: "Checking block identifier format and network connectivity",
  },
  {
    id: "fetch-basic",
    name: "Fetch Block Information",
    description: "Retrieving basic block data and metadata",
  },
  {
    id: "trace-block",
    name: "Trace Block Transactions",
    description:
      "Analyzing all transactions in the block using debug_traceBlock",
  },
  {
    id: "process-pyusd",
    name: "Process PYUSD Interactions",
    description: "Identifying and analyzing PYUSD-related transactions",
  },
  {
    id: "process-analytics",
    name: "Generate Analytics",
    description:
      "Computing gas analysis, performance metrics, and optimization suggestions",
  },
];

// Hook with default steps
export function useDefaultBlockTraceProgressiveLoading(
  options: UseBlockTraceProgressiveLoadingOptions = {}
) {
  return useBlockTraceProgressiveLoading(DEFAULT_BLOCK_TRACE_STEPS, options);
}
