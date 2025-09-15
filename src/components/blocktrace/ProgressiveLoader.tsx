import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Activity,
  Database,
  BarChart3,
  Zap,
} from "lucide-react";
import { LoadingStep, ProgressiveLoaderProps } from "@/lib/debugtrace";

export function ProgressiveLoader({
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
      (step) => step.status === "completed" || step.status === "error"
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
        return <CheckCircle className="h-5 w-5 text-[#10b981]" />;
      case "loading":
        return <Loader2 className="h-5 w-5 text-[#00bfff] animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "pending":
      default:
        return <Clock className="h-5 w-5 text-[#8b9dc3]" />;
    }
  };

  const getStepFeatureIcon = (stepId: string) => {
    switch (stepId) {
      case "validate":
        return <CheckCircle className="h-4 w-4" />;
      case "fetch-basic":
        return <Database className="h-4 w-4" />;
      case "trace-block":
        return <Activity className="h-4 w-4" />;
      case "process-pyusd":
        return <BarChart3 className="h-4 w-4" />;
      case "process-analytics":
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
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
    (step) => step.status === "completed"
  ).length;
  const totalSteps = currentSteps.length;
  const overallProgress = (completedSteps / totalSteps) * 100;

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Block Analysis in Progress
        </h3>
        <div className="text-sm text-[#8b9dc3] bg-[rgba(15,20,25,0.8)] px-3 py-1 rounded-full">
          {completedSteps}/{totalSteps} completed
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-[#8b9dc3] mb-3">
          <span className="font-medium">Overall Progress</span>
          <span className="font-mono">{overallProgress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#00bfff] via-[#40d4ff] to-[#10b981] h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,191,255,0.5)]"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {currentSteps.map((step, index) => (
          <div
            key={step.id}
            className={`relative flex items-start gap-4 p-4 rounded-lg border transition-all duration-500 ${getStepColor(step)}`}
          >
            {/* Step Icon */}
            <div className="flex-shrink-0 relative">
              <div className="w-10 h-10 rounded-full bg-[rgba(15,20,25,0.8)] border-2 border-current flex items-center justify-center">
                {getStepIcon(step)}
              </div>
              {index < currentSteps.length - 1 && (
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-[rgba(139,157,195,0.3)]" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-[#8b9dc3] opacity-60">
                    {getStepFeatureIcon(step.id)}
                  </div>
                  <h4 className="text-base font-semibold text-white">
                    {step.name}
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  {step.duration && step.status === "completed" && (
                    <span className="text-xs text-[#8b9dc3] bg-[rgba(15,20,25,0.6)] px-2 py-1 rounded font-mono">
                      {step.duration}ms
                    </span>
                  )}
                  <div className="w-6 h-6 rounded-full bg-[rgba(15,20,25,0.8)] border border-current flex items-center justify-center">
                    <span className="text-xs font-bold">{index + 1}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#8b9dc3] mb-3 leading-relaxed">
                {step.description}
              </p>

              {/* Individual Step Progress */}
              {step.status === "loading" && step.progress !== undefined && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[#8b9dc3] mb-1">
                    <span>Step Progress</span>
                    <span className="font-mono">{step.progress}%</span>
                  </div>
                  <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-2">
                    <div
                      className="bg-[#00bfff] h-2 rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(0,191,255,0.4)]"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {step.status === "error" && step.error && (
                <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg p-3">
                  <p className="text-sm text-red-400 font-medium">
                    {step.error}
                  </p>
                </div>
              )}

              {/* Success Indicator */}
              {step.status === "completed" && (
                <div className="flex items-center gap-2 text-xs text-[#10b981]">
                  <CheckCircle className="h-3 w-3" />
                  <span>Completed successfully</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 pt-6 border-t border-[rgba(0,191,255,0.1)]">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#10b981]">
              {currentSteps.filter((s) => s.status === "completed").length}
            </div>
            <div className="text-xs text-[#8b9dc3] uppercase tracking-wide">
              Completed
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#00bfff]">
              {currentSteps.filter((s) => s.status === "loading").length}
            </div>
            <div className="text-xs text-[#8b9dc3] uppercase tracking-wide">
              Processing
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-400">
              {currentSteps.filter((s) => s.status === "error").length}
            </div>
            <div className="text-xs text-[#8b9dc3] uppercase tracking-wide">
              Errors
            </div>
          </div>
        </div>
      </div>

      {/* Estimated Time Remaining */}
      {currentSteps.some((s) => s.status === "loading") && (
        <div className="mt-4 text-center">
          <div className="text-xs text-[#8b9dc3]">
            Estimated time remaining: ~
            {Math.max(1, totalSteps - completedSteps)} minutes
          </div>
        </div>
      )}
    </div>
  );
}
