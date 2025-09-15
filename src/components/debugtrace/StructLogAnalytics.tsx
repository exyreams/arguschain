import { Suspense, useState, useEffect } from "react";
import { StructLogAnalyticsProps } from "@/lib/debugtrace/types";
import { DataValidator, StructLogProcessor } from "@/lib/debugtrace";
import { Activity, AlertCircle } from "lucide-react";
import { ChartContainer } from "./ChartContainer";

import {
  ExecutionTimelineChart,
  OpcodeDistributionChart,
  PerformanceMetricsCards,
  VirtualizedExecutionSteps,
} from "@/components/debugtrace/charts";
import { MemoryUsageChart } from "./charts";

const ChartSkeleton = () => (
  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden">
    <div className="flex items-center justify-between p-4 border-b border-[rgba(0,191,255,0.1)]">
      <div className="h-5 bg-[rgba(0,191,255,0.2)] rounded w-32 animate-pulse"></div>
      <div className="flex gap-1">
        <div className="h-6 w-6 bg-[rgba(0,191,255,0.1)] rounded animate-pulse"></div>
        <div className="h-6 w-6 bg-[rgba(0,191,255,0.1)] rounded animate-pulse"></div>
      </div>
    </div>
    <div className="p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-[rgba(0,191,255,0.2)] rounded w-3/4"></div>
        <div className="h-32 bg-[rgba(0,191,255,0.1)] rounded"></div>
        <div className="grid grid-cols-4 gap-4">
          <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded"></div>
          <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded"></div>
          <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded"></div>
          <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

export function StructLogAnalytics({
  structLog,
  loading,
  className = "",
}: StructLogAnalyticsProps) {
  const [processedData, setProcessedData] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!structLog) {
      setProcessedData(null);
      setValidation(null);
      setError("No StructLog data available");
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Use requestAnimationFrame to prevent blocking the UI
    const processData = () => {
      requestAnimationFrame(() => {
        try {
          const validationResult =
            DataValidator.validateStructLogData(structLog);
          setValidation(validationResult);

          if (!validationResult.isValid) {
            setError(
              `Data validation failed: ${validationResult.errors.join(", ")}`
            );
            setIsProcessing(false);
            return;
          }

          // Process in chunks to prevent UI blocking
          requestAnimationFrame(() => {
            try {
              const processed = StructLogProcessor.processAll(structLog);
              setProcessedData(processed);
              setError(null);
            } catch (err) {
              setError(
                `Processing failed: ${err instanceof Error ? err.message : "Unknown error"}`
              );
            } finally {
              setIsProcessing(false);
            }
          });
        } catch (err) {
          setError(
            `Validation failed: ${err instanceof Error ? err.message : "Unknown error"}`
          );
          setIsProcessing(false);
        }
      });
    };

    processData();
  }, [structLog]);

  if (loading || isProcessing) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin"></div>
            <h3 className="text-lg font-semibold text-[#00bfff]">
              {isProcessing
                ? "Processing Opcode Data..."
                : "Loading Opcode Analytics..."}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4"
              >
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-[rgba(0,191,255,0.2)] rounded w-3/4"></div>
                  <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded w-1/2"></div>
                  <div className="h-3 bg-[rgba(0,191,255,0.1)] rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>

        <ChartSkeleton />
      </div>
    );
  }

  if (error || !processedData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">StructLog Analytics Error</h3>
          </div>
          <p className="text-red-300 mt-2">{error}</p>
          {validation?.warnings && validation.warnings.length > 0 && (
            <div className="mt-4">
              <p className="text-yellow-400 text-sm font-medium">Warnings:</p>
              <ul className="text-yellow-300 text-sm mt-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Opcode Analytics
            </h3>
          </div>
          <div className="text-sm text-[#8b9dc3]">
            {structLog.summary.total_steps.toLocaleString()} execution steps
            analyzed
          </div>
        </div>

        <PerformanceMetricsCards
          metrics={processedData.performanceMetrics}
          className="mb-6"
        />
      </div>

      {validation?.warnings && validation.warnings.length > 0 && (
        <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Data Quality Warnings</span>
          </div>
          <ul className="text-yellow-300 text-sm">
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <ChartContainer
            title="Opcode Distribution"
            data={processedData.opcodeDistribution}
          >
            <OpcodeDistributionChart
              data={processedData.opcodeDistribution}
              height={300}
            />
          </ChartContainer>
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <ChartContainer title="Memory Usage" data={processedData.memoryUsage}>
            <MemoryUsageChart data={processedData.memoryUsage} height={300} />
          </ChartContainer>
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        {processedData.executionTimeline.length > 1000 ? (
          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <VirtualizedExecutionSteps
              data={processedData.executionTimeline}
              height={500}
            />
          </div>
        ) : (
          <ChartContainer
            title={`Execution Timeline (${processedData.executionTimeline.length} steps)`}
            data={processedData.executionTimeline}
          >
            <ExecutionTimelineChart
              data={processedData.executionTimeline}
              height={400}
            />
          </ChartContainer>
        )}
      </Suspense>
    </div>
  );
}
