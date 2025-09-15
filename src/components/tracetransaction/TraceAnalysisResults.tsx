import React, { useRef } from "react";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Download,
  Eye,
  GitCompare,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatGas, shortenAddress } from "@/lib/config";
import {
  CallHierarchyTree,
  ContractInteractionNetwork,
  TokenFlowGraph,
  ExportButton,
} from "./";
import type {
  ExportFormat,
  TraceAnalysisResults,
} from "@/lib/tracetransaction/types";

interface TraceAnalysisResultsProps {
  results: TraceAnalysisResults;
  onExport?: (format: ExportFormat) => void;
  onReplay?: () => void;
  className?: string;
}

export function TraceAnalysisResults({
  results,
  onExport,
  onReplay,
  className = "",
}: TraceAnalysisResultsProps) {
  const navigate = useNavigate();
  const contractNetworkRef = useRef<HTMLDivElement>(null);
  const callHierarchyRef = useRef<HTMLDivElement>(null);
  const tokenFlowRef = useRef<HTMLDivElement>(null);
  const handleExport = (format: ExportFormat) => {
    if (onExport) {
      onExport(format);
    } else {
      const dataStr = JSON.stringify(results, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `trace-analysis-${results.transactionHash.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
            Analysis Results
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/comparative-analysis?tx1=${results.transactionHash}`)
              }
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Compare
            </Button>
            {onReplay && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReplay}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Replay
              </Button>
            )}
            <ExportButton
              data={results}
              txHash={results.transactionHash}
              analysisType="trace_transaction"
              filename={`trace-analysis-${results.transactionHash.slice(0, 10)}`}
            />
          </div>
        </div>

        <div className="text-sm text-[#8b9dc3] mb-4">
          Transaction:{" "}
          <span className="font-mono text-[#00bfff]">
            {results.transactionHash}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {results.summary.totalActions}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Actions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {formatGas(results.summary.totalGasUsed)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Gas Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {results.summary.pyusdInteractions}
            </div>
            <div className="text-sm text-[#8b9dc3]">PYUSD Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {Math.round(results.summary.complexityScore)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Complexity</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#00bfff] mb-4 flex items-center gap-2">
            Pattern Analysis
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-[#8b9dc3]">Detected Pattern:</span>
              <div className="text-[#00bfff] font-medium">
                {results.patternAnalysis.description}
              </div>
            </div>
            <div>
              <span className="text-sm text-[#8b9dc3]">Confidence:</span>
              <div className="text-[#00bfff] font-medium">
                {Math.round(results.patternAnalysis.confidence * 100)}%
              </div>
            </div>
            <div>
              <span className="text-sm text-[#8b9dc3]">Risk Level:</span>
              <Badge
                variant={
                  results.patternAnalysis.riskLevel === "low"
                    ? "outline"
                    : results.patternAnalysis.riskLevel === "medium"
                      ? "default"
                      : "destructive"
                }
                className={
                  results.patternAnalysis.riskLevel === "low"
                    ? "text-green-400 border-green-400"
                    : results.patternAnalysis.riskLevel === "medium"
                      ? "text-yellow-400 border-yellow-400 bg-yellow-800"
                      : "text-red-300 border-red-400 bg-red-800"
                }
              >
                {results.patternAnalysis.riskLevel.toUpperCase()}
              </Badge>
            </div>
            {results.mevAnalysis.mevDetected && (
              <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded p-3">
                <div className="text-yellow-400 font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  MEV Activity Detected
                </div>
                <div className="text-sm text-[#8b9dc3] mt-1">
                  {results.mevAnalysis.description}
                </div>
                <div className="text-xs text-[#8b9dc3] mt-1">
                  Confidence: {Math.round(results.mevAnalysis.confidence * 100)}
                  %
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#00bfff] mb-4 flex items-center gap-2">
            Security Assessment
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-[#8b9dc3]">Overall Risk:</span>
              <Badge
                variant={
                  results.securityAssessment.overallRisk === "low"
                    ? "outline"
                    : results.securityAssessment.overallRisk === "medium"
                      ? "default"
                      : results.securityAssessment.overallRisk === "high"
                        ? "destructive"
                        : "destructive"
                }
                className={`ml-2 ${
                  results.securityAssessment.overallRisk === "low"
                    ? "text-green-400 border-green-400"
                    : results.securityAssessment.overallRisk === "medium"
                      ? "text-yellow-400 border-yellow-400 bg-yellow-800"
                      : "text-red-300 border-red-400 bg-red-800"
                }`}
              >
                {results.securityAssessment.overallRisk.toUpperCase()}
              </Badge>
            </div>

            {results.securityAssessment.concerns.length > 0 ? (
              <div>
                <span className="text-sm text-[#8b9dc3]">
                  Security Concerns:
                </span>
                <div className="mt-2 space-y-2">
                  {results.securityAssessment.concerns
                    .slice(0, 3)
                    .map((concern, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertCircle
                          className={`h-4 w-4 mt-0.5 ${
                            concern.level === "critical"
                              ? "text-red-400"
                              : concern.level === "high"
                                ? "text-orange-400"
                                : concern.level === "medium"
                                  ? "text-yellow-400"
                                  : "text-blue-400"
                          }`}
                        />
                        <div>
                          <div className="text-sm font-medium text-[#00bfff]">
                            {concern.level.toUpperCase()} Risk
                          </div>
                          <div className="text-xs text-[#8b9dc3]">
                            {concern.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  {results.securityAssessment.concerns.length > 3 && (
                    <div className="text-xs text-[#8b9dc3]">
                      +{results.securityAssessment.concerns.length - 3} more
                      concerns
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-green-400 text-sm">
                No security concerns detected
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#00bfff] mb-4 flex items-center gap-2">
          Gas Analysis
        </h3>

        {/* Main Gas Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {results.gasAnalysis.efficiencyMetrics
            .slice(0, 3)
            .map((metric, index) => (
              <div
                key={index}
                className="bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)] p-4 text-center"
              >
                <div className="text-2xl font-bold text-[#00bfff]">
                  {typeof metric.value === "number"
                    ? metric.value.toLocaleString()
                    : metric.value}
                  {metric.unit && (
                    <span className="text-sm text-[#8b9dc3] ml-1">
                      {metric.unit}
                    </span>
                  )}
                </div>
                <div className="text-sm text-[#8b9dc3]">{metric.name}</div>
                <div className="text-xs text-[#8b9dc3]">
                  {metric.description}
                </div>
                {metric.score && (
                  <div className="mt-1">
                    <div
                      className={`text-xs font-medium ${
                        metric.score >= 80
                          ? "text-green-400"
                          : metric.score >= 60
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      Score: {metric.score}/100
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>

        {results.gasAnalysis.optimizationSuggestions.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-[#00bfff] mb-3">
              Optimization Suggestions
            </h4>
            <div className="space-y-2">
              {results.gasAnalysis.optimizationSuggestions
                .slice(0, 3)
                .map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          suggestion.severity === "high"
                            ? "bg-red-400"
                            : suggestion.severity === "medium"
                              ? "bg-yellow-400"
                              : "bg-blue-400"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium text-[#00bfff]">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-[#8b9dc3] mt-1">
                          {suggestion.description}
                        </div>
                        <div className="text-xs text-[#8b9dc3] mt-1">
                          {suggestion.recommendation}
                        </div>
                        {suggestion.potentialSavings && (
                          <div className="text-xs text-green-400 mt-1">
                            Potential savings:{" "}
                            {suggestion.potentialSavings.gas.toLocaleString()}{" "}
                            gas (
                            {suggestion.potentialSavings.percentage.toFixed(1)}
                            %)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
          Interactive Visualizations
        </h3>

        {results.contractInteractions.length > 0 && (
          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Contract Interaction Network
              </h4>
              <ExportButton
                data={results.contractInteractions}
                chartRef={contractNetworkRef}
                txHash={results.transactionHash}
                filename={`contract-network-${results.transactionHash.slice(0, 10)}`}
              />
            </div>
            <div ref={contractNetworkRef}>
              <ContractInteractionNetwork
                interactions={results.contractInteractions}
                height={600}
                className="mb-4"
              />
            </div>
          </div>
        )}

        {results.processedActions.length > 0 && (
          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Call Hierarchy & Gas Usage
              </h4>
              <ExportButton
                data={results.processedActions}
                chartRef={callHierarchyRef}
                txHash={results.transactionHash}
                filename={`call-hierarchy-${results.transactionHash.slice(0, 10)}`}
              />
            </div>
            <div ref={callHierarchyRef}>
              <CallHierarchyTree
                traces={results.processedActions}
                height={600}
                className="mb-4"
              />
            </div>
          </div>
        )}

        {results.tokenFlows.length > 0 && (
          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-[#00bfff]">
                PYUSD Token Flow Visualization
              </h4>
              <ExportButton
                data={results.tokenFlows}
                chartRef={tokenFlowRef}
                txHash={results.transactionHash}
                filename={`token-flow-${results.transactionHash.slice(0, 10)}`}
              />
            </div>
            <div ref={tokenFlowRef}>
              <TokenFlowGraph
                transfers={results.tokenFlows.map((flow) => ({
                  from: flow.from,
                  to: flow.to,
                  amount: flow.amount,
                  value: flow.value,
                  trace_addr: flow.traceAddress,
                }))}
                className="mb-4"
              />
            </div>
          </div>
        )}
      </div>

      {results.tokenFlows.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
            PYUSD Token Flows
          </h3>
          <div className="space-y-2">
            {results.tokenFlows.slice(0, 5).map((flow, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[rgba(0,191,255,0.05)] rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8b9dc3]">From:</span>
                  <span className="font-mono text-[#00bfff]">
                    {shortenAddress(flow.from)}
                  </span>
                  <span className="text-[#8b9dc3]">→</span>
                  <span className="font-mono text-[#00bfff]">
                    {shortenAddress(flow.to)}
                  </span>
                </div>
                <div className="text-sm font-medium text-[#00bfff]">
                  {flow.formattedAmount}
                </div>
              </div>
            ))}
            {results.tokenFlows.length > 5 && (
              <div className="text-xs text-[#8b9dc3] text-center">
                +{results.tokenFlows.length - 5} more transfers
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
