import React, { useMemo } from "react";
import { Badge, Card } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Coins,
  Network,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { ProcessedReplayData } from "@/lib/replaytransactions";
import { ReplayErrorBoundary } from "./ErrorBoundary";

import { TokenFlowDiagram } from "./charts/TokenFlowDiagram";
import { StateChangesHeatmap } from "./charts/StateChangesHeatmap";
import { ExecutionTimeline } from "./charts/ExecutionTimeline";
import { GasBreakdownChart } from "./charts/GasBreakdownChart";
import { SecurityAnalysisPanel } from "./charts/SecurityAnalysisPanel";
import { PerformanceMetricsCards } from "./charts/PerformanceMetricsCards";
import { OptimizationSuggestions } from "./charts/OptimizationSuggestions";

interface ReplayTransactionAnalyticsProps {
  replayData: ProcessedReplayData;
  loading: boolean;
  className?: string;
}

export const ReplayTransactionAnalytics: React.FC<
  ReplayTransactionAnalyticsProps
> = ({ replayData, loading, className = "" }) => {
  const summaryMetrics = useMemo(() => {
    if (!replayData) return null;

    return {
      totalGasUsed: replayData.performanceMetrics.costAnalysis.totalGasUsed,
      gasEfficiency: replayData.performanceMetrics.gasEfficiency,
      securityFlags: replayData.securityFlags.length,
      tokenInteractions: replayData.tokenAnalysis?.hasTokenInteraction || false,
      stateChanges: replayData.stateDiffAnalysis?.totalChanges || 0,
      contractCalls: replayData.traceAnalysis?.totalCalls || 0,
      vmSteps: replayData.vmTraceAnalysis?.totalSteps || 0,
    };
  }, [replayData]);

  const hasTraceData = replayData?.traceAnalysis;
  const hasStateDiffData = replayData?.stateDiffAnalysis;
  const hasVmTraceData = replayData?.vmTraceAnalysis;

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-[rgba(0,191,255,0.1)] rounded mb-2"></div>
              <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!replayData || !summaryMetrics) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Activity className="h-16 w-16 text-[rgba(0,191,255,0.3)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
          No Analysis Data Available
        </h3>
        <div className="text-[#8b9dc3] mb-4">
          The transaction analysis didn't return any data.
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 max-w-md mx-auto">
          <h4 className="text-sm font-medium text-[#00bfff] mb-2">
            Possible reasons:
          </h4>
          <ul className="text-sm text-[#8b9dc3] space-y-1 text-left">
            <li>• Transaction hash is invalid or not found</li>
            <li>• Network connection issues</li>
            <li>• RPC endpoint doesn't support replay methods</li>
            <li>• Transaction is too old or not yet confirmed</li>
          </ul>
        </div>
      </div>
    );
  }

  if (
    !replayData.performanceMetrics ||
    !replayData.performanceMetrics.gasBreakdown
  ) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <AlertTriangle className="h-16 w-16 text-[rgba(251,191,36,0.6)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#fbbf24] mb-2">
          Incomplete Analysis Data
        </h3>
        <div className="text-[#8b9dc3] mb-4">
          The replay analysis returned partial data. Some visualizations may not
          be available.
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(251,191,36,0.2)] rounded-lg p-4 max-w-md mx-auto">
          <h4 className="text-sm font-medium text-[#fbbf24] mb-2">Try:</h4>
          <ul className="text-sm text-[#8b9dc3] space-y-1 text-left">
            <li>• Re-running the analysis with different tracers</li>
            <li>
              • Checking if the transaction is complex enough for analysis
            </li>
            <li>• Using a different RPC endpoint</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#8b9dc3] mb-1">Total Gas Used</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {summaryMetrics.totalGasUsed.toLocaleString()}
              </div>
            </div>
            <Zap className="h-8 w-8 text-[#00bfff] opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#8b9dc3] mb-1">Gas Efficiency</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {summaryMetrics.gasEfficiency.toFixed(1)}%
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-[#00bfff] opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#8b9dc3] mb-1">State Changes</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {summaryMetrics.stateChanges.toLocaleString()}
              </div>
            </div>
            <Activity className="h-8 w-8 text-[#00bfff] opacity-60" />
          </div>
        </Card>

        <Card className="p-4 bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#8b9dc3] mb-1">Security Flags</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {summaryMetrics.securityFlags}
              </div>
            </div>
            <Shield
              className={`h-8 w-8 opacity-60 ${
                summaryMetrics.securityFlags > 0
                  ? "text-[#fbbf24]"
                  : "text-[#4ade80]"
              }`}
            />
          </div>
        </Card>
      </div>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Analysis Coverage
          </h3>
          <div className="flex items-center gap-2">
            {replayData.tracersUsed.map((tracer) => (
              <Badge
                key={tracer}
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              >
                {tracer}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Network
              className={`h-5 w-5 ${hasTraceData ? "text-[#4ade80]" : "text-[#6b7280]"}`}
            />
            <div>
              <div className="text-sm font-medium text-[#8b9dc3]">
                Call Trace
              </div>
              <div className="text-xs text-[#6b7280]">
                {hasTraceData
                  ? `${summaryMetrics.contractCalls} calls`
                  : "Not available"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity
              className={`h-5 w-5 ${hasStateDiffData ? "text-[#4ade80]" : "text-[#6b7280]"}`}
            />
            <div>
              <div className="text-sm font-medium text-[#8b9dc3]">
                State Diff
              </div>
              <div className="text-xs text-[#6b7280]">
                {hasStateDiffData
                  ? `${summaryMetrics.stateChanges} changes`
                  : "Not available"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <BarChart3
              className={`h-5 w-5 ${hasVmTraceData ? "text-[#4ade80]" : "text-[#6b7280]"}`}
            />
            <div>
              <div className="text-sm font-medium text-[#8b9dc3]">VM Trace</div>
              <div className="text-xs text-[#6b7280]">
                {hasVmTraceData
                  ? `${summaryMetrics.vmSteps} steps`
                  : "Not available"}
              </div>
            </div>
          </div>
        </div>
      </Card>
      <PerformanceMetricsCards
        performanceMetrics={replayData.performanceMetrics}
        className="mb-6"
      />

      {replayData.securityFlags.length > 0 && (
        <SecurityAnalysisPanel
          securityFlags={replayData.securityFlags}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {replayData.tokenAnalysis?.hasTokenInteraction && (
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-[#00bfff]">
                  Token Flow Analysis
                </h3>
              </div>
              <ReplayErrorBoundary>
                <TokenFlowDiagram
                  tokenAnalysis={replayData.tokenAnalysis}
                  traceAnalysis={replayData.traceAnalysis}
                />
              </ReplayErrorBoundary>
            </div>
          </Card>
        )}

        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-[#00bfff]">
                Gas Usage Breakdown
              </h3>
            </div>
            <ReplayErrorBoundary>
              <GasBreakdownChart
                gasBreakdown={replayData.performanceMetrics.gasBreakdown}
                totalGas={summaryMetrics.totalGasUsed}
              />
            </ReplayErrorBoundary>
          </div>
        </Card>
      </div>

      {hasStateDiffData && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-[#00bfff]" />
              <h3 className="text-lg font-semibold text-[#00bfff]">
                State Changes Analysis
              </h3>
            </div>
            <ReplayErrorBoundary>
              <StateChangesHeatmap
                stateDiffAnalysis={replayData.stateDiffAnalysis}
              />
            </ReplayErrorBoundary>
          </div>
        </Card>
      )}

      {hasVmTraceData && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#00bfff]" />
              <h3 className="text-lg font-semibold text-[#00bfff]">
                VM Execution Timeline
              </h3>
            </div>
            <ReplayErrorBoundary>
              <ExecutionTimeline vmTraceAnalysis={replayData.vmTraceAnalysis} />
            </ReplayErrorBoundary>
          </div>
        </Card>
      )}

      <OptimizationSuggestions
        suggestions={replayData.performanceMetrics.optimizationSuggestions}
        className="mb-6"
      />

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
            Transaction Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Transaction Hash:</span>
                <span className="text-[#00bfff] font-mono text-sm">
                  {replayData.transactionHash.slice(0, 10)}...
                  {replayData.transactionHash.slice(-8)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Network:</span>
                <span className="text-[#00bfff] capitalize">
                  {replayData.network}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Analysis Time:</span>
                <span className="text-[#00bfff]">
                  {new Date(replayData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Tracers Used:</span>
                <span className="text-[#00bfff]">
                  {replayData.tracersUsed.length}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Token Interactions:</span>
                <span
                  className={`${summaryMetrics.tokenInteractions ? "text-[#4ade80]" : "text-[#6b7280]"}`}
                >
                  {summaryMetrics.tokenInteractions ? "Yes" : "No"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Unique Tokens:</span>
                <span className="text-[#00bfff]">
                  {replayData.tokenAnalysis?.uniqueAddresses.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
