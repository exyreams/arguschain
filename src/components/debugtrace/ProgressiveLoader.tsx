import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { LoadingStep, ProgressiveLoaderProps } from "@/lib/debugtrace";

export default function ProgressiveLoader({
  steps,
  onStepComplete,
  onAllComplete,
  className = "",
}: ProgressiveLoaderProps) {
  const [currentSteps, setCurrentSteps] = useState<LoadingStep[]>(steps);

  useEffect(() => {
    setCurrentSteps(steps);
  }, [steps]);

  useEffect(() => {
    const allCompleted = currentSteps.every(
      (step) => step.status === "completed" || step.status === "error",
    );

    if (allCompleted && onAllComplete) {
      onAllComplete();
    }
  }, [currentSteps, onAllComplete]);

  useEffect(() => {
    currentSteps.forEach((step) => {
      if (step.status === "completed" && onStepComplete) {
        onStepComplete(step.id);
      }
    });
  }, [currentSteps, onStepComplete]);

  const getStepIcon = (step: LoadingStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-[#10b981]" />;
      case "loading":
        return <Loader2 className="h-4 w-4 text-[#00bfff] animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "pending":
      default:
        return <Clock className="h-4 w-4 text-[#8b9dc3]" />;
    }
  };

  const getStepColor = (step: LoadingStep) => {
    switch (step.status) {
      case "completed":
        return "text-[#10b981] border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)]";
      case "loading":
        return "text-[#00bfff] border-[rgba(0,191,255,0.3)] bg-[rgba(0,191,255,0.1)]";
      case "error":
        return "text-red-400 border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)]";
      case "pending":
      default:
        return "text-[#8b9dc3] border-[rgba(139,157,195,0.3)] bg-[rgba(139,157,195,0.1)]";
    }
  };

  const completedSteps = currentSteps.filter(
    (step) => step.status === "completed",
  ).length;
  const totalSteps = currentSteps.length;
  const overallProgress = (completedSteps / totalSteps) * 100;

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#00bfff]">
          Processing Analytics
        </h3>
        <div className="text-sm text-[#8b9dc3]">
          {completedSteps}/{totalSteps} completed
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-[#8b9dc3] mb-2">
          <span>Overall Progress</span>
          <span>{overallProgress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#00bfff] to-[#10b981] h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-3">
        {currentSteps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ${getStepColor(step)}`}
          >
            <div className="flex-shrink-0">{getStepIcon(step)}</div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">{step.name}</h4>
                {step.duration && step.status === "completed" && (
                  <span className="text-xs text-[#8b9dc3]">
                    {step.duration}ms
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8b9dc3] mt-1">{step.description}</p>

              {step.status === "loading" && step.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-1">
                    <div
                      className="bg-[#00bfff] h-1 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {step.status === "error" && step.error && (
                <p className="text-xs text-red-400 mt-1">{step.error}</p>
              )}
            </div>

            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] flex items-center justify-center">
              <span className="text-xs text-[#8b9dc3]">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[rgba(0,191,255,0.1)]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-[#10b981]">
              {currentSteps.filter((s) => s.status === "completed").length}
            </div>
            <div className="text-xs text-[#8b9dc3]">Completed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-[#00bfff]">
              {currentSteps.filter((s) => s.status === "loading").length}
            </div>
            <div className="text-xs text-[#8b9dc3]">Processing</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-400">
              {currentSteps.filter((s) => s.status === "error").length}
            </div>
            <div className="text-xs text-[#8b9dc3]">Errors</div>
          </div>
        </div>
      </div>
    </div>
  );
}
