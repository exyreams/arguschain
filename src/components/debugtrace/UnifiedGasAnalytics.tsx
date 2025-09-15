import { useMemo, useRef } from "react";
import { UnifiedGasAnalyticsProps } from "@/lib/debugtrace/types";
import { UnifiedGasProcessor } from "@/lib/debugtrace/unifiedGasProcessor";
import { DataValidator } from "@/lib/debugtrace";
import { AlertCircle, BarChart3, TrendingUp } from "lucide-react";
import { ExportButton } from "./ExportButton";
import { ChartContainer } from "./ChartContainer";

import {
  CostAnalysisChart,
  GasBreakdownChart,
  OptimizationPanel,
} from "./charts";
import { EfficiencyMetricsCards } from "@/components/debugtrace/charts";

export function UnifiedGasAnalytics({
  structLog,
  callTrace,
  loading,
  className = "",
}: UnifiedGasAnalyticsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { processedData, validation, error } = useMemo(() => {
    if (!structLog && !callTrace) {
      return {
        processedData: null,
        validation: null,
        error:
          "No data available for unified analysis. Both StructLog and CallTrace data are missing.",
      };
    }

    const structLogValidation = structLog
      ? DataValidator.validateStructLogData(structLog)
      : null;
    const callTraceValidation = callTrace
      ? DataValidator.validateCallTraceData(callTrace)
      : null;

    const hasValidData =
      structLogValidation?.isValid ||
      false ||
      callTraceValidation?.isValid ||
      false;

    if (!hasValidData) {
      const errors = [
        ...(structLogValidation?.errors || []),
        ...(callTraceValidation?.errors || []),
      ];
      return {
        processedData: null,
        validation: { isValid: false, errors, warnings: [] },
        error: `Data validation failed: ${errors.join(", ")}`,
      };
    }

    try {
      const processedData = UnifiedGasProcessor.processAll(
        structLog,
        callTrace
      );
      const warnings = [
        ...(structLogValidation?.warnings || []),
        ...(callTraceValidation?.warnings || []),
      ];

      return {
        processedData,
        validation: { isValid: true, errors: [], warnings },
        error: null,
      };
    } catch (err) {
      return {
        processedData: null,
        validation: null,
        error: `Processing failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  }, [structLog, callTrace]);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Unified Gas Analytics
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4"
              >
                <div className="animate-pulse">
                  <div className="h-4 bg-[rgba(0,191,255,0.2)] rounded mb-2"></div>
                  <div className="h-32 bg-[rgba(0,191,255,0.1)] rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !processedData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Unified Gas Analytics Error
            </h3>
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

  const hasStructLog = !!structLog;
  const hasCallTrace = !!callTrace;
  const dataSourceText =
    hasStructLog && hasCallTrace
      ? "StructLog + CallTrace"
      : hasStructLog
        ? "StructLog Only"
        : "CallTrace Only";

  return (
    <div className={`space-y-6 ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Unified Gas Analytics
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-[#8b9dc3]">
            Data Sources: {dataSourceText}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            hasStructLog
              ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10b981]"
              : "bg-[rgba(107,114,128,0.1)] border border-[rgba(107,114,128,0.3)] text-[#6b7280]"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              hasStructLog ? "bg-[#10b981]" : "bg-[#6b7280]"
            }`}
          ></div>
          Opcode-Level Data
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            hasCallTrace
              ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10b981]"
              : "bg-[rgba(107,114,128,0.1)] border border-[rgba(107,114,128,0.3)] text-[#6b7280]"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              hasCallTrace ? "bg-[#10b981]" : "bg-[#6b7280]"
            }`}
          ></div>
          Contract-Level Data
        </div>
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

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Efficiency Metrics
            </h4>
          </div>
          <ExportButton
            data={processedData.efficiencyMetrics}
            filename="efficiency-metrics"
          />
        </div>
        <EfficiencyMetricsCards metrics={processedData.efficiencyMetrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Gas Breakdown" data={processedData.gasBreakdown}>
          <GasBreakdownChart data={processedData.gasBreakdown} height={600} />
        </ChartContainer>

        <ChartContainer title="Cost Analysis" data={processedData.costAnalysis}>
          <CostAnalysisChart data={processedData.costAnalysis} height={300} />
        </ChartContainer>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Optimization Suggestions
            </h4>
          </div>
        </div>
        <OptimizationPanel
          suggestions={processedData.optimizationSuggestions}
        />
      </div>
    </div>
  );
}
