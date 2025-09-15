import { useMemo } from "react";
import { TransactionTracerAnalyticsProps } from "@/lib/debugtrace/types";
import { CallTraceProcessor, DataValidator } from "@/lib/debugtrace";
import {
  AlertCircle,
  ArrowRightLeft,
  BarChart3,
  GitBranch,
  Network,
} from "lucide-react";
import { ChartContainer } from "./ChartContainer";

import { ContractInteractionNetwork } from "@/components/debugtrace/charts";
import {
  CallHierarchyTree,
  GasAttributionChart,
  ValueTransferFlow,
} from "./charts";

export function TransactionTracerAnalytics({
  callTrace,
  loading,
  className = "",
}: TransactionTracerAnalyticsProps) {
  const { processedData, validation, error, summary } = useMemo(() => {
    if (!callTrace) {
      return {
        processedData: null,
        validation: null,
        error: "No CallTrace data available",
        summary: null,
      };
    }

    const validation = DataValidator.validateCallTraceData(callTrace);

    if (!validation.isValid) {
      return {
        processedData: null,
        validation,
        error: `Data validation failed: ${validation.errors.join(", ")}`,
        summary: null,
      };
    }

    try {
      const processedData = CallTraceProcessor.processAll(callTrace);
      const summary = CallTraceProcessor.getInteractionSummary(callTrace);
      return { processedData, validation, error: null, summary };
    } catch (err) {
      return {
        processedData: null,
        validation,
        error: `Processing failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        summary: null,
      };
    }
  }, [callTrace]);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Network className="h-5 w-5 text-[#00bfff] animate-pulse" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Contract Interaction Analytics
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

  if (error || !processedData || !summary) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Contract Interaction Analytics Error
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

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Contract Interaction Analytics
            </h3>
          </div>
          <div className="text-sm text-[#8b9dc3]">
            {summary.totalContracts} contracts • {summary.totalCalls} calls
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {summary.totalContracts}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Contracts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {summary.totalCalls}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Total Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#10b981]">
              {summary.successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {summary.totalValueTransferred.toFixed(4)} ETH
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Value Transferred</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Contract Network"
          data={{
            nodes: processedData.contractInteractions,
            edges: processedData.networkEdges,
          }}
        >
          <ContractInteractionNetwork
            nodes={processedData.contractInteractions}
            edges={processedData.networkEdges}
            height={350}
          />
        </ChartContainer>

        <ChartContainer
          title="Gas Attribution"
          data={processedData.gasAttribution}
        >
          <GasAttributionChart
            data={processedData.gasAttribution}
            height={350}
          />
        </ChartContainer>
      </div>

      <ChartContainer
        title={`Call Hierarchy (${processedData.callHierarchy.length} root calls)`}
        data={processedData.callHierarchy}
      >
        <CallHierarchyTree data={processedData.callHierarchy} height={400} />
      </ChartContainer>

      {processedData.valueTransfers.length > 0 && (
        <ChartContainer
          title={`Value Transfers (${processedData.valueTransfers.length} transfers)`}
          data={processedData.valueTransfers}
        >
          <ValueTransferFlow data={processedData.valueTransfers} height={300} />
        </ChartContainer>
      )}

      {processedData.callSuccessRates.length > 1 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Contract Success Rates
            </h4>
          </div>
          <div className="space-y-3">
            {processedData.callSuccessRates.map((contract, index) => {
              const displayName =
                contract.contractName === "Unknown Contract"
                  ? contract.contractAddress || contract.contractName
                  : contract.contractName;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-[#8b9dc3]">
                      {displayName}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {contract.totalCalls} calls
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-[rgba(0,191,255,0.2)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          contract.successRate >= 90
                            ? "bg-[#10b981]"
                            : contract.successRate >= 70
                              ? "bg-[#f59e0b]"
                              : "bg-[#ef4444]"
                        }`}
                        style={{ width: `${contract.successRate}%` }}
                      />
                    </div>
                    <div className="text-sm font-medium text-[#00bfff] w-12 text-right">
                      {contract.successRate.toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {validation?.warnings && validation.warnings.length > 0 && (
        <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Data Quality Warnings</span>
          </div>
          <ul className="text-yellow-300 text-sm">
            {validation.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
