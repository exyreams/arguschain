import React, { useEffect, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import { Alert } from "@/components/global/Alert";
import { Loader } from "@/components/global/Loader";
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Layers,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useContractComparison } from "@/hooks/bytecode";
import { BytecodeMetrics } from "./charts/BytecodeMetrics";
import { ContractArchitectureDiagram } from "@/components/bytecode/charts";
import { ExportButton } from "./ExportButton";

const PYUSD_CONTRACTS = {
  proxy: {
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    name: "PYUSD Proxy",
    description: "Main PYUSD token contract (Transparent Proxy)",
  },
  implementation: {
    address: "0x43506849D7C04F9138D1A2050bbF3A0c054402dd",
    name: "PYUSD Implementation",
    description: "PYUSD token implementation contract",
  },
  supplyController: {
    address: "0x5A4B5D3d312d21C17e7B58d4A4b59d9c7F3C5E8F",
    name: "PYUSD Supply Controller",
    description: "Controls PYUSD token supply and minting",
  },
};

interface PYUSDAnalysisTabProps {
  network?: string;
  className?: string;
}

type AnalysisMode = "overview" | "comparison" | "architecture";

export const PYUSDAnalysisTab: React.FC<PYUSDAnalysisTabProps> = ({
  network = "mainnet",
  className,
}) => {
  const [selectedContracts, setSelectedContracts] = useState<string[]>([
    PYUSD_CONTRACTS.proxy.address,
    PYUSD_CONTRACTS.implementation.address,
  ]);

  const analysisModes: AnalysisMode[] = [
    "overview",
    "comparison",
    "architecture",
  ];

  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("overview");

  const contractInputs = selectedContracts.map((address) => {
    const contract = Object.values(PYUSD_CONTRACTS).find(
      (c) => c.address === address,
    );
    return {
      address,
      name: contract?.name || `Contract ${address.slice(0, 6)}...`,
    };
  });

  const {
    comparison,
    similarities,
    relationships,
    insights,
    isLoading,
    isError,
    error,
  } = useContractComparison(contractInputs, {
    network,
    enabled: selectedContracts.length > 0,
  });

  useEffect(() => {
    if (network === "mainnet") {
      setSelectedContracts([
        PYUSD_CONTRACTS.proxy.address,
        PYUSD_CONTRACTS.implementation.address,
        PYUSD_CONTRACTS.supplyController.address,
      ]);
    }
  }, [network]);

  const handleContractToggle = (address: string) => {
    setSelectedContracts((prev) =>
      prev.includes(address)
        ? prev.filter((a) => a !== address)
        : [...prev, address],
    );
  };

  const getPYUSDInsights = () => {
    if (!comparison) return null;

    const proxyContract = comparison.contracts.find(
      (c) => c.address === PYUSD_CONTRACTS.proxy.address,
    );
    const implContract = comparison.contracts.find(
      (c) => c.address === PYUSD_CONTRACTS.implementation.address,
    );
    const supplyContract = comparison.contracts.find(
      (c) => c.address === PYUSD_CONTRACTS.supplyController.address,
    );

    const proxyImplSimilarity = similarities.find(
      (s) =>
        (s.contractA === PYUSD_CONTRACTS.proxy.address &&
          s.contractB === PYUSD_CONTRACTS.implementation.address) ||
        (s.contractB === PYUSD_CONTRACTS.proxy.address &&
          s.contractA === PYUSD_CONTRACTS.implementation.address),
    );

    return {
      proxyContract,
      implContract,
      supplyContract,
      proxyImplSimilarity,
      totalSize: comparison.contracts.reduce((sum, c) => sum + c.size, 0),
      avgComplexity:
        comparison.contracts.reduce((sum, c) => sum + c.complexity.score, 0) /
        comparison.contracts.length,
      hasUpgradeability: proxyContract?.proxy.isProxy || false,
      securityFeatures: comparison.contracts.flatMap(
        (c) => c.security.features || [],
      ),
    };
  };

  const pyusdInsights = getPYUSDInsights();

  if (network !== "mainnet") {
    return (
      <Card className={`p-6 ${className}`}>
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-semibold">Network Not Supported</h4>
            <p className="text-sm mt-1">
              PYUSD analysis is only available on Ethereum Mainnet. Please
              switch to Mainnet to analyze PYUSD contracts.
            </p>
          </div>
        </Alert>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#00bfff]">
                PYUSD Analysis
              </h2>
              <p className="text-[#8b9dc3]">
                PayPal USD stablecoin contract analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 border-green-500/50 text-green-400">
              Mainnet
            </Badge>
            <Badge className="bg-blue-500/20 border-blue-500/50 text-blue-400">
              ERC20
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#00bfff]">
            PYUSD Contracts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PYUSD_CONTRACTS).map(([key, contract]) => (
              <div
                key={key}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedContracts.includes(contract.address)
                    ? "border-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    : "border-[rgba(139,157,195,0.3)] bg-[rgba(25,28,40,0.6)] hover:border-[rgba(0,191,255,0.5)]"
                }`}
                onClick={() => handleContractToggle(contract.address)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-[#00bfff]">
                    {contract.name}
                  </h4>
                  {selectedContracts.includes(contract.address) ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <div className="w-5 h-5 border border-[#8b9dc3] rounded-full" />
                  )}
                </div>
                <p className="text-sm text-[#8b9dc3] mb-2">
                  {contract.description}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#8b9dc3] font-mono">
                    {contract.address.slice(0, 6)}...
                    {contract.address.slice(-4)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-[#8b9dc3]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm text-[#8b9dc3]">Analysis Mode:</span>
          {analysisModes.map((mode) => (
            <Button
              key={mode}
              variant={analysisMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => setAnalysisMode(mode)}
              className={
                analysisMode === mode ? "bg-[#00bfff] text-[#0f1419]" : ""
              }
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </Card>

      {isLoading && (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <Loader className="mr-3" />
            <span className="text-[#8b9dc3]">Analyzing PYUSD contracts...</span>
          </div>
        </Card>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-semibold">Analysis Failed</h4>
            <p className="text-sm mt-1">
              {error?.message ||
                "Failed to analyze PYUSD contracts. Please try again."}
            </p>
          </div>
        </Alert>
      )}

      {comparison && pyusdInsights && (
        <>
          {analysisMode === "overview" && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-[#00bfff] mb-4">
                  PYUSD Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-[#00bfff]" />
                      <span className="text-sm text-[#8b9dc3]">Total Size</span>
                    </div>
                    <div className="text-xl font-bold text-[#00bfff]">
                      {(pyusdInsights.totalSize / 1024).toFixed(1)}KB
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-[#00bfff]" />
                      <span className="text-sm text-[#8b9dc3]">
                        Avg Complexity
                      </span>
                    </div>
                    <div className="text-xl font-bold text-[#00bfff]">
                      {Math.round(pyusdInsights.avgComplexity)}/100
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-[#00bfff]" />
                      <span className="text-sm text-[#8b9dc3]">
                        Security Features
                      </span>
                    </div>
                    <div className="text-xl font-bold text-[#00bfff]">
                      {pyusdInsights.securityFeatures.length}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-[#00bfff]" />
                      <span className="text-sm text-[#8b9dc3]">
                        Upgradeable
                      </span>
                    </div>
                    <div className="text-xl font-bold text-[#00bfff]">
                      {pyusdInsights.hasUpgradeability ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                {pyusdInsights.proxyImplSimilarity && (
                  <div className="mt-6 p-4 rounded-lg border border-[rgba(0,191,255,0.2)] bg-[rgba(0,191,255,0.05)]">
                    <h4 className="font-semibold text-[#00bfff] mb-2">
                      Proxy-Implementation Relationship
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[#8b9dc3]">Similarity:</span>
                        <span className="ml-2 text-[#00bfff] font-mono">
                          {pyusdInsights.proxyImplSimilarity.similarity.toFixed(
                            1,
                          )}
                          %
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8b9dc3]">
                          Shared Functions:
                        </span>
                        <span className="ml-2 text-[#00bfff] font-mono">
                          {pyusdInsights.proxyImplSimilarity.sharedFunctions}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8b9dc3]">Relationship:</span>
                        <span className="ml-2 text-green-400">
                          Proxy Pattern
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <div className="space-y-4">
                {comparison.contracts.map((contract) => (
                  <div key={contract.address}>
                    <h3 className="text-lg font-semibold text-[#00bfff] mb-3">
                      {contract.contractName}
                    </h3>
                    <BytecodeMetrics analysis={contract} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisMode === "comparison" && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-[#00bfff] mb-4">
                  Contract Comparison
                </h3>

                {insights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                      <div className="text-sm text-[#8b9dc3]">
                        Avg Similarity
                      </div>
                      <div className="text-xl font-bold text-[#00bfff]">
                        {insights.avgSimilarity}%
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                      <div className="text-sm text-[#8b9dc3]">
                        Max Similarity
                      </div>
                      <div className="text-xl font-bold text-[#00bfff]">
                        {insights.maxSimilarity}%
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                      <div className="text-sm text-[#8b9dc3]">
                        Relationships
                      </div>
                      <div className="text-xl font-bold text-[#00bfff]">
                        {insights.totalRelationships}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                      <div className="text-sm text-[#8b9dc3]">Standards</div>
                      <div className="text-xl font-bold text-[#00bfff]">
                        {insights.standardsCount}
                      </div>
                    </div>
                  </div>
                )}

                {similarities.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-[#00bfff]">
                      Contract Similarities
                    </h4>
                    {similarities.map((sim, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-[#00bfff]">
                              {
                                contractInputs.find(
                                  (c) => c.address === sim.contractA,
                                )?.name
                              }
                            </span>
                            <span className="text-[#8b9dc3] mx-2">↔</span>
                            <span className="text-[#00bfff]">
                              {
                                contractInputs.find(
                                  (c) => c.address === sim.contractB,
                                )?.name
                              }
                            </span>
                          </div>
                          <Badge className="bg-[rgba(0,191,255,0.2)] border-[rgba(0,191,255,0.5)] text-[#00bfff]">
                            {sim.similarity.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-[#8b9dc3]">
                          Shared: {sim.sharedFunctions} functions
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {analysisMode === "architecture" && (
            <div className="space-y-6">
              <ContractArchitectureDiagram comparison={comparison} />

              {relationships.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-xl font-semibold text-[#00bfff] mb-4">
                    Contract Relationships
                  </h3>
                  <div className="space-y-3">
                    {relationships.map((rel, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-400">
                            {rel.type}
                          </Badge>
                          <span className="text-xs text-[#8b9dc3]">
                            Confidence: {(rel.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-sm text-[#8b9dc3]">
                          {rel.contracts.map((addr, idx) => (
                            <span key={addr}>
                              {contractInputs.find((c) => c.address === addr)
                                ?.name || addr}
                              {idx < rel.contracts.length - 1 && " → "}
                            </span>
                          ))}
                        </div>
                        {rel.description && (
                          <p className="text-xs text-[#8b9dc3] mt-2">
                            {rel.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <ExportButton
              comparison={comparison}
              className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419]"
            />
          </div>
        </>
      )}
    </div>
  );
};
