import { useState } from "react";

// Define LoadingStep interface
interface LoadingStep {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "loading" | "completed" | "error";
  progress?: number;
  error?: string;
  duration?: number;
}

// Define TopParticipant interface if not available
interface TopParticipant {
  address: string;
  total_value: string;
  transactions: number;
  percentage_of_volume: number;
}

interface ProgressiveLoadingOptions {
  batchSize?: number;
  threshold?: number;
  enableVirtualization?: boolean;
}

export default function useProgressiveLoading(
  initialStepsOrParticipants: Omit<LoadingStep, "status">[] | TopParticipant[],
  options?: ProgressiveLoadingOptions,
  initialSteps?: Omit<LoadingStep, "status">[]
) {
  // Determine if this is the simple case (just steps) or complex case (participants + options + steps)
  const isSimpleCase = !options && !initialSteps;

  let stepsToUse: Omit<LoadingStep, "status">[];

  if (isSimpleCase) {
    // Simple case: just initial steps
    stepsToUse = initialStepsOrParticipants as Omit<LoadingStep, "status">[];
  } else {
    // Complex case: participants, options, and steps
    stepsToUse = initialSteps || [];
  }

  const [steps, setSteps] = useState<LoadingStep[]>(
    stepsToUse.map((step) => ({ ...step, status: "pending" as const }))
  );

  const updateStep = (stepId: string, updates: Partial<LoadingStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    );
  };

  const startStep = (stepId: string) => {
    updateStep(stepId, { status: "loading", progress: 0 });
  };

  const updateProgress = (stepId: string, progress: number) => {
    updateStep(stepId, { progress });
  };

  const completeStep = (stepId: string, duration?: number) => {
    updateStep(stepId, { status: "completed", progress: 100, duration });
  };

  const errorStep = (stepId: string, error: string) => {
    updateStep(stepId, { status: "error", error });
  };

  const resetSteps = () => {
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: "pending" as const,
        progress: undefined,
        error: undefined,
        duration: undefined,
      }))
    );
  };

  return {
    steps,
    updateStep,
    startStep,
    updateProgress,
    completeStep,
    errorStep,
    resetSteps,
  };
}
