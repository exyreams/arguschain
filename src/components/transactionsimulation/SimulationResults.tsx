import React, { useMemo, useState } from "react";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import { Alert } from "@/components/global/Alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Code,
  Copy,
  Database,
  Download,
  Shield,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { SimulationUtils } from "@/lib/transactionsimulation";
import { GasEfficiencyRadar } from "./charts";
import ExecutionTraceAnalyzer from "./analysis/ExecutionTraceAnalyzer";
import StateChangeAnalyzer from "./analysis/StateChangeAnalyzer";
import SecurityAnalyzer from "./analysis/SecurityAnalyzer";
import type {
  EnhancedSimulationResult,
  GasEfficiencyMetrics,
  SimulationResult,
} from "@/lib/transactionsimulation/types";

interface EnhancedSimulationResultsProps {
  result: SimulationResult | EnhancedSimulationResult;
  onExport?: (format: "json" | "csv" | "pdf") => void;
  showAdvancedAnalysis?: boolean;
  className?: string;
}

export const SimulationResults: React.FC<EnhancedSimulationResultsProps> = ({
  result,
  onExport,
  showAdvancedAnalysis = true,
  className = "",
}) => {
  const [selectedTab, setSelectedTab] = useState("overview");
  const isEnhanced = "executionTime" in result;
  const enhancedResult = result as EnhancedSimulationResult;

  const efficiencyMetrics = useMemo((): GasEfficiencyMetrics => {
    if (isEnhanced && enhancedResult.efficiencyMetrics) {
      return enhancedResult.efficiencyMetrics;
    }

    const baseScore = result.success ? 80 : 20;
    const gasEfficiency = Math.max(0, 100 - result.gasUsed / 1000);
    const complexityPenalty = result.calls.length * 5;

    const score = Math.max(
      0,
      Math.min(100, baseScore + gasEfficiency - complexityPenalty)
    );

    return {
      score,
      factors: {
        gasUsage: Math.max(0, 100 - result.gasUsed / 1000),
        successRate: result.success ? 100 : result.hypotheticalSuccess ? 50 : 0,
        complexity: result.calls.length * 10,
        optimization: score,
      },
      grade:
        score >= 90
          ? "A"
          : score >= 80
            ? "B"
            : score >= 70
              ? "C"
              : score >= 60
                ? "D"
                : "F",
      recommendations: generateOptimizationSuggestions(result),
    };
  }, [result, isEnhanced, enhancedResult]);

  const handleCopyResult = () => {
    const resultText = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(resultText);
  };

  const getStatusIcon = () => {
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    } else if (result.hypotheticalSuccess) {
      return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getStatusText = () => {
    if (result.success) return "Success";
    if (result.hypotheticalSuccess) return "Hypothetical Success";
    return "Failed";
  };

  const getStatusColor = () => {
    if (result.success) return "text-green-400";
    if (result.hypotheticalSuccess) return "text-yellow-400";
    return "text-red-400";
  };

  const formatParameters = () => {
    if (!result.parameters || result.parameters.length === 0) return "None";

    return result.parameters
      .map((param, index) => {
        if (
          typeof param === "string" &&
          param.startsWith("0x") &&
          param.length === 42
        ) {
          return SimulationUtils.shortenAddress(param);
        }
        if (typeof param === "number" && param > 1000) {
          return SimulationUtils.formatTokenAmount(param);
        }
        return String(param);
      })
      .join(", ");
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <h3 className="text-xl font-semibold text-accent-primary">
            Analysis Results
          </h3>
          <Badge
            variant={
              result.success
                ? "default"
                : result.hypotheticalSuccess
                  ? "outline"
                  : "destructive"
            }
            className={`${
              result.success
                ? "bg-green-500/20 border-green-500/50 text-green-400"
                : result.hypotheticalSuccess
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                  : "bg-red-500/20 border-red-500/50 text-red-400"
            }`}
          >
            {getStatusText()}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyResult}
            className="border-[rgba(0,191,255,0.3)] text-accent-primary hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {onExport && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("json")}
                className="border-[rgba(0,191,255,0.3)] text-accent-primary hover:bg-[rgba(0,191,255,0.1)]"
              >
                <Download className="h-4 w-4 mr-1" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("pdf")}
                className="border-[rgba(0,191,255,0.3)] text-accent-primary hover:bg-[rgba(0,191,255,0.1)]"
              >
                <Download className="h-4 w-4 mr-1" />
                Report
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-[#0f1419] text-text-secondary hover:text-accent-primary"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-[#0f1419] text-text-secondary hover:text-accent-primary"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="execution"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-[#0f1419] text-text-secondary hover:text-accent-primary"
          >
            Execution
          </TabsTrigger>
          <TabsTrigger
            value="state"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-[#0f1419] text-text-secondary hover:text-accent-primary"
          >
            State Changes
          </TabsTrigger>
          <TabsTrigger
            value="gas"
            className="data-[state=active]:bg-accent-primary data-[state=active]:text-[#0f1419] text-text-secondary hover:text-accent-primary"
          >
            Gas Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-6">
            <h4 className="text-lg font-semibold text-accent-primary mb-4">
              Executive Summary
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-[rgba(0,0,0,0.3)] rounded-lg">
                <div className="text-2xl font-bold text-accent-primary">
                  {SimulationUtils.formatGas(result.gasUsed)}
                </div>
                <div className="text-sm text-text-secondary">Gas Used</div>
              </div>
              <div className="text-center p-4 bg-[rgba(0,0,0,0.3)] rounded-lg">
                <div className={`text-2xl font-bold ${getStatusColor()}`}>
                  {result.success
                    ? "✓"
                    : result.hypotheticalSuccess
                      ? "~"
                      : "✗"}
                </div>
                <div className="text-sm text-text-secondary">Status</div>
              </div>
              <div className="text-center p-4 bg-[rgba(0,0,0,0.3)] rounded-lg">
                <div className="text-2xl font-bold text-accent-primary">
                  {efficiencyMetrics.grade}
                </div>
                <div className="text-sm text-text-secondary">
                  Efficiency Grade
                </div>
              </div>
              <div className="text-center p-4 bg-[rgba(0,0,0,0.3)] rounded-lg">
                <div className="text-2xl font-bold text-accent-primary">
                  {result.stateChanges?.length || 0}
                </div>
                <div className="text-sm text-text-secondary">State Changes</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-md font-semibold text-accent-primary mb-3">
                  Transaction Details
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Function:</span>
                    <span className="text-accent-primary font-mono">
                      {result.functionName}()
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Parameters:</span>
                    <span className="text-accent-primary font-mono text-right">
                      {formatParameters()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Category:</span>
                    <span className="text-accent-primary">
                      {result.operationCategory}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Timestamp:</span>
                    <span className="text-accent-primary">
                      {SimulationUtils.getRelativeTime(result.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-md font-semibold text-accent-primary mb-3">
                  Cost Analysis
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Gas Used:</span>
                    <span className="text-accent-primary font-mono">
                      {SimulationUtils.formatGas(result.gasUsed)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Gas Category:</span>
                    <span className="text-accent-primary">
                      {result.gasCategory}
                    </span>
                  </div>
                  {result.gasUsed > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Est. Cost (20 Gwei):
                        </span>
                        <span className="text-accent-primary">
                          {SimulationUtils.formatETH(result.gasUsed * 20e-9)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Est. Cost (USD):
                        </span>
                        <span className="text-accent-primary">
                          {SimulationUtils.formatUSD(
                            result.gasUsed * 20e-9 * 2000
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result.error && (
            <Alert
              variant="destructive"
              className="bg-red-500/10 border-red-500/50 text-red-400"
            >
              <XCircle className="h-4 w-4" />
              <div>
                <div className="font-medium">Transaction Error:</div>
                <div className="mt-1 text-sm">{result.error}</div>
                {result.note && (
                  <div className="mt-2 text-sm text-yellow-400">
                    {result.note}
                  </div>
                )}
              </div>
            </Alert>
          )}

          {result.output && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <h4 className="text-lg font-semibold text-accent-primary mb-3">
                Output
              </h4>
              {result.decodedOutput !== undefined ? (
                <div className="space-y-2">
                  <div className="text-sm text-text-secondary">
                    Decoded Result:
                  </div>
                  <div className="text-accent-primary font-mono text-lg">
                    {typeof result.decodedOutput === "number"
                      ? SimulationUtils.formatTokenAmount(result.decodedOutput)
                      : String(result.decodedOutput)}
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    Raw: <span className="font-mono">{result.output}</span>
                  </div>
                </div>
              ) : (
                <div className="text-accent-primary font-mono text-sm break-all">
                  {result.output}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecurityAnalyzer
            functionName={result.functionName}
            parameters={result.parameters}
            gasUsed={result.gasUsed}
            traceData={isEnhanced ? enhancedResult.traceData : undefined}
            stateChanges={result.stateChanges}
            fromAddress="0x0000000000000000000000000000000000000000"
            contractAddress="0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"
          />
        </TabsContent>

        <TabsContent value="execution" className="mt-6">
          {isEnhanced && enhancedResult.traceData ? (
            <ExecutionTraceAnalyzer
              traceData={enhancedResult.traceData}
              contractAddress="0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"
              functionName={result.functionName}
            />
          ) : (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-8 text-center">
              <Code className="h-16 w-16 text-text-secondary mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-text-secondary mb-2">
                Execution Trace Not Available
              </h4>
              <p className="text-[#6b7280]">
                Detailed execution trace requires debug_traceCall support.
                Enable advanced tracing for comprehensive analysis.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="state" className="mt-6">
          {result.stateChanges && result.stateChanges.length > 0 ? (
            <StateChangeAnalyzer
              stateChanges={result.stateChanges}
              contractAddress="0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"
              functionName={result.functionName}
              fromAddress="0x0000000000000000000000000000000000000000"
            />
          ) : (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-8 text-center">
              <Database className="h-16 w-16 text-text-secondary mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-text-secondary mb-2">
                No State Changes Detected
              </h4>
              <p className="text-[#6b7280]">
                This transaction did not result in any detectable state changes
                or the function is a view function.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gas" className="mt-6">
          <div className="space-y-6">
            <GasEfficiencyRadar metrics={efficiencyMetrics} height={300} />

            {isEnhanced &&
              enhancedResult.optimizationSuggestions &&
              enhancedResult.optimizationSuggestions.length > 0 && (
                <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-accent-primary mb-3">
                    Optimization Recommendations
                  </h4>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    {enhancedResult.optimizationSuggestions.map(
                      (suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-accent-primary mt-0.5 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {isEnhanced && (
              <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
                <h4 className="text-lg font-semibold text-accent-primary mb-3">
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-[rgba(0,0,0,0.3)] rounded-lg">
                    <div className="text-lg font-bold text-accent-primary">
                      {enhancedResult.executionTime.toFixed(2)}ms
                    </div>
                    <div className="text-sm text-text-secondary">
                      Execution Time
                    </div>
                  </div>
                  {enhancedResult.gasBreakdown && (
                    <>
                      <div className="text-center p-3 bg-[rgba(0,0,0,0.3)] rounded-lg">
                        <div className="text-lg font-bold text-accent-primary">
                          {SimulationUtils.formatGas(
                            enhancedResult.gasBreakdown.execution
                          )}
                        </div>
                        <div className="text-sm text-text-secondary">
                          Execution Gas
                        </div>
                      </div>
                      <div className="text-center p-3 bg-[rgba(0,0,0,0.3)] rounded-lg">
                        <div className="text-lg font-bold text-accent-primary">
                          {SimulationUtils.formatGas(
                            enhancedResult.gasBreakdown.storage
                          )}
                        </div>
                        <div className="text-sm text-text-secondary">
                          Storage Gas
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function generateOptimizationSuggestions(result: SimulationResult): string[] {
  const suggestions: string[] = [];

  if (result.gasUsed > 100000) {
    suggestions.push("Consider optimizing gas usage - current usage is high");
  }

  if (!result.success && result.hypotheticalSuccess) {
    suggestions.push("Check balance and allowances before executing");
  }

  if (result.functionName === "approve" && result.parameters[1] === 0) {
    suggestions.push(
      "Consider using increaseAllowance/decreaseAllowance for better security"
    );
  }

  if (result.gasCategory === "High") {
    suggestions.push(
      "This operation uses significant gas - consider batching multiple operations"
    );
  }

  if (result.calls.length > 5) {
    suggestions.push(
      "Complex transaction with many internal calls - verify all interactions"
    );
  }

  return suggestions;
}

export default SimulationResults;
