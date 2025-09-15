import React, { useMemo } from "react";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import { Loader } from "@/components/global/Loader";
import { Alert } from "@/components/global/Alert";
import {
  BytecodeMetricsCards,
  ComplexityDistributionChart,
  ContractSizeChart,
  FunctionDistributionChart,
  ProxyRelationshipDiagram,
  SecurityFeaturesChart,
  SimilarityHeatmap,
  StandardsComplianceChart,
} from "./charts";
import { BytecodeMetrics } from "./charts/BytecodeMetrics";
import { ExportButton } from "./ExportButton";
import { processAllBytecodeData } from "./processors/bytecodeDataProcessor";
import type { BytecodeAnalysisProps } from "@/lib/bytecode/types";
import type { ContractComparison } from "@/lib/bytecode";
import { cn } from "@/lib/utils";

interface BytecodeAnalyticsProps extends BytecodeAnalysisProps {
  comparison: ContractComparison;
  error?: string | null;
  txHash?: string;
  analysisType?: "contracts" | "transaction";
}

export const BytecodeAnalytics: React.FC<BytecodeAnalyticsProps> = ({
  comparison,
  loading = false,
  error = null,
  addresses = [],
  network = "mainnet",
  txHash,
  analysisType = "contracts",
  className,
}) => {
  const processedData = useMemo(() => {
    if (!comparison || loading) return null;
    return processAllBytecodeData(comparison);
  }, [comparison, loading]);

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader />
            <p className="text-[#8b9dc3]">Analyzing contract bytecode...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert variant="destructive">
          <div className="space-y-2">
            <h4 className="font-semibold">Analysis Error</h4>
            <p>{error}</p>
          </div>
        </Alert>
      </div>
    );
  }

  if (!comparison || !processedData) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert>
          <div className="space-y-2">
            <h4 className="font-semibold">No Data Available</h4>
            <p>No bytecode analysis data to display.</p>
          </div>
        </Alert>
      </div>
    );
  }

  const { contracts, similarities } = comparison;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex justify-end">
        <ExportButton
          comparison={comparison}
          contractAddresses={addresses}
          network={network}
          txHash={txHash}
          analysisType={analysisType}
        />
      </div>

      <BytecodeMetricsCards metrics={processedData.metrics} />

      {contracts.length <= 3 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-[#00bfff]">
            Individual Contract Analysis
          </h3>
          {contracts.map((contract) => (
            <div key={contract.address}>
              <h4 className="text-lg font-medium text-[#8b9dc3] mb-4">
                {contract.contractName}
              </h4>
              <BytecodeMetrics analysis={contract} />
            </div>
          ))}
        </div>
      )}

      <Card title="Contract Size Analysis">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {contracts.map((contract) => (
              <Badge
                key={contract.address}
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              >
                {contract.contractName}: {(contract.size / 1024).toFixed(1)}KB
              </Badge>
            ))}
          </div>
          <ContractSizeChart data={processedData.contractSizes} />
        </div>
      </Card>

      <Card title="Function Category Distribution">
        <FunctionDistributionChart data={processedData.functionDistribution} />
      </Card>

      {processedData.standardsCompliance.length > 0 && (
        <Card title="ERC Standards Compliance">
          <StandardsComplianceChart data={processedData.standardsCompliance} />
        </Card>
      )}

      {similarities.length > 0 && (
        <Card title="Contract Similarity Analysis">
          <div className="space-y-4">
            <div className="text-sm text-[#8b9dc3]">
              Similarity based on shared function signatures
            </div>
            <SimilarityHeatmap data={processedData.similarityMatrix} />
          </div>
        </Card>
      )}

      {processedData.securityFeatures.length > 0 && (
        <Card title="Security Features Analysis">
          <SecurityFeaturesChart data={processedData.securityFeatures} />
        </Card>
      )}

      <Card title="Contract Complexity Distribution">
        <ComplexityDistributionChart
          data={processedData.complexityDistribution}
        />
      </Card>

      {processedData.proxyRelationships.length > 0 && (
        <Card title="Proxy-Implementation Relationships">
          <ProxyRelationshipDiagram data={processedData.proxyRelationships} />
        </Card>
      )}

      <Card title="Detailed Contract Analysis">
        <div className="space-y-6">
          {contracts.map((contract) => (
            <div
              key={contract.address}
              className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-[#00bfff]">
                    {contract.contractName}
                  </h4>
                  <Badge
                    variant={
                      contract.complexity.level === "High"
                        ? "destructive"
                        : contract.complexity.level === "Medium"
                          ? "default"
                          : "outline"
                    }
                    className={
                      contract.complexity.level === "High"
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : contract.complexity.level === "Medium"
                          ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    }
                  >
                    {contract.complexity.level} Complexity
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[#8b9dc3]">Size:</span>
                    <span className="ml-2 text-[#00bfff] font-mono">
                      {(contract.size / 1024).toFixed(1)}KB
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8b9dc3]">Functions:</span>
                    <span className="ml-2 text-[#00bfff] font-mono">
                      {contract.functions.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8b9dc3]">Standards:</span>
                    <span className="ml-2 text-[#00bfff]">
                      {contract.standards.length > 0
                        ? contract.standards.join(", ")
                        : "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8b9dc3]">Proxy:</span>
                    <span className="ml-2 text-[#00bfff]">
                      {contract.proxy.isProxy ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                {contract.patterns.length > 0 && (
                  <div>
                    <span className="text-[#8b9dc3] text-sm">Patterns:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contract.patterns.map((pattern, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                        >
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {contract.functions.length > 0 && (
                  <div>
                    <span className="text-[#8b9dc3] text-sm">
                      Detected Functions:
                    </span>
                    <div className="mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {contract.functions.slice(0, 20).map((func, index) => (
                          <div
                            key={index}
                            className="text-xs font-mono text-[#8b9dc3] flex items-center gap-2"
                          >
                            <Badge
                              variant="outline"
                              className="text-xs border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                            >
                              {func.category}
                            </Badge>
                            <span className="truncate">{func.name}</span>
                          </div>
                        ))}
                        {contract.functions.length > 20 && (
                          <div className="text-xs text-[#8b9dc3] italic">
                            ... and {contract.functions.length - 20} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
