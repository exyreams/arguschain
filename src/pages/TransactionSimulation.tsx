import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Input,
  Badge,
  Alert,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/global";
import {
  AlertCircle,
  BarChart3,
  Bookmark,
  Loader2,
  Network,
  Package,
  Settings,
  Zap,
} from "lucide-react";
import { RPC_CONFIG } from "@/lib/config";
import Statusbar from "@/components/status/Statusbar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import {
  BatchResults,
  BatchSimulation,
  ComparisonView,
  ComparisonInterface,
  SimulationResults,
  SimulationInterface,
  ExportButton,
  BookmarkManager,
} from "@/components/transactionsimulation";
import { simulationCache, SimulationUtils } from "@/lib/transactionsimulation";
import {
  useBatchSimulation,
  useSimulationComparison,
  useTransactionSimulation,
} from "@/hooks/transactionsimulation";

import type {
  BatchOperation,
  SimulationParams,
} from "@/lib/transactionsimulation/types";

export default function TransactionSimulation() {
  const [searchParams] = useSearchParams();

  const [selectedNetwork, setSelectedNetwork] = useState<"mainnet" | "sepolia">(
    "mainnet"
  );
  const [fromAddress, setFromAddress] = useState<string>(
    searchParams.get("from") || "0xf845a0A05Cbd91Ac15C3E59D126DE5dFbC2aAbb7"
  );
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [rpcUrl, setRpcUrl] = useState(searchParams.get("rpc") || "");
  const [activeTab, setActiveTab] = useState("single");

  const simulation = useTransactionSimulation({
    network: selectedNetwork,
    onSuccess: (result) => {
      console.log("Simulation completed:", result);
    },
    onError: (error) => {
      console.error("Simulation failed:", error);
    },
  });

  const batchSimulation = useBatchSimulation({
    network: selectedNetwork,
    onSuccess: (result) => {
      console.log("Batch simulation completed:", result);
    },
    onError: (error) => {
      console.error("Batch simulation failed:", error);
    },
  });

  const comparison = useSimulationComparison({
    network: selectedNetwork,
    onSuccess: (result) => {
      console.log("Comparison completed:", result);
    },
    onError: (error) => {
      console.error("Comparison failed:", error);
    },
  });

  const isLoading =
    simulation.isLoading || batchSimulation.isLoading || comparison.isLoading;
  const hasError =
    simulation.error || batchSimulation.error || comparison.error;

  const handleSimulation = async (params: SimulationParams) => {
    return await simulation.simulate({
      ...params,
      network: selectedNetwork,
      fromAddress: fromAddress,
    });
  };

  const handleComparison = async (
    functionName: string,
    fromAddress: string,
    variants: Array<{ name: string; parameters: any[] }>
  ) => {
    await comparison.compareVariants(functionName, fromAddress, variants);
  };

  const handleBatchSimulation = async (operations: BatchOperation[]) => {
    return await batchSimulation.simulateBatch(fromAddress, operations);
  };

  const handleExportSingle = (format: "json" | "csv") => {
    if (!simulation.result) return;

    const filename = SimulationUtils.createExportFilename(
      `simulation_${simulation.result.functionName}`,
      format
    );

    const data = {
      simulation: simulation.result,
      metadata: {
        timestamp: new Date().toISOString(),
        network: selectedNetwork,
        fromAddress,
      },
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportComparison = (format: "json" | "csv") => {
    if (!comparison.results) return;

    const filename = SimulationUtils.createExportFilename("comparison", format);

    const data = {
      comparison: comparison.results,
      analysis: comparison.analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        network: selectedNetwork,
        fromAddress,
      },
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportBatch = (format: "json" | "csv") => {
    if (!batchSimulation.result) return;

    const filename = SimulationUtils.createExportFilename(
      "batch_simulation",
      format
    );

    const data = {
      batch: batchSimulation.result,
      analysis: batchSimulation.getAnalysis(),
      metadata: {
        timestamp: new Date().toISOString(),
        network: selectedNetwork,
        fromAddress,
      },
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
      <header className="fixed top-0 left-0 w-full z-20 border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-40 pb-16 px-6">
        <div className="container mx-auto space-y-6">
          <div className="flex flex-col gap-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-[#00bfff] tracking-wide">
                Transaction Simulation
              </h1>
              <p className="text-[#8b9dc3] text-lg">
                Simulate and analyze PYUSD transactions without executing them
                on-chain
              </p>
            </div>

            <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                  Query Configuration
                </h2>
                <div className="flex items-center gap-3">
                  <BookmarkManager
                    queryParams={{
                      network: selectedNetwork,
                      fromAddress: fromAddress,
                      simulationType: activeTab as
                        | "single"
                        | "batch"
                        | "comparison",
                    }}
                    analysisResults={
                      activeTab === "single" && simulation.result
                        ? {
                            gasUsed: simulation.result.gasUsed,
                            gasPrice: simulation.result.gasUsed, // Approximate
                            success: simulation.result.success,
                            totalOperations: 1,
                            successRate: simulation.result.success ? 100 : 0,
                          }
                        : activeTab === "comparison" && comparison.results
                          ? {
                              gasUsed: Math.round(
                                comparison.results.reduce(
                                  (sum, r) => sum + r.gasUsed,
                                  0
                                ) / comparison.results.length
                              ),
                              success: comparison.results.some(
                                (r) => r.success
                              ),
                              totalOperations: comparison.results.length,
                              successRate: Math.round(
                                (comparison.results.filter((r) => r.success)
                                  .length /
                                  comparison.results.length) *
                                  100
                              ),
                            }
                          : activeTab === "batch" && batchSimulation.result
                            ? {
                                gasUsed: batchSimulation.result.totalGas,
                                success: batchSimulation.result.batchSuccess,
                                totalOperations:
                                  batchSimulation.result.operations.length,
                                successRate: Math.round(
                                  batchSimulation.result.successRate
                                ),
                              }
                            : undefined
                    }
                    onLoadBookmark={(bookmark) => {
                      // Handle loading a bookmarked simulation
                      console.log("Loading bookmark:", bookmark);
                      // You would implement the logic to restore the simulation state here
                    }}
                    onSignUpClick={() => {
                      // This shouldn't be called since the route is protected
                      // But just in case, redirect to sign in
                      window.location.href = "/signin";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowAdvancedSettings(!showAdvancedSettings)
                    }
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff]"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Network
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant={
                          selectedNetwork === "mainnet" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setSelectedNetwork("mainnet");
                          setRpcUrl("");
                        }}
                        className={
                          selectedNetwork === "mainnet"
                            ? "bg-[#00bfff] text-[#0f1419]"
                            : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        }
                      >
                        <Network className="h-3 w-3 mr-1" />
                        Mainnet
                      </Button>
                      <Button
                        variant={
                          selectedNetwork === "sepolia" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setSelectedNetwork("sepolia");
                          setRpcUrl("");
                        }}
                        className={
                          selectedNetwork === "sepolia"
                            ? "bg-[#00bfff] text-[#0f1419]"
                            : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        }
                      >
                        <Network className="h-3 w-3 mr-1" />
                        Sepolia
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Default From Address
                    </label>
                    <Input
                      placeholder="Sender address (0x...)"
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Cache Status
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      >
                        {simulationCache.getStats().totalSize} cached
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => simulationCache.clearAll()}
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                {showAdvancedSettings && (
                  <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
                    <h3 className="text-sm font-medium text-[#00bfff]">
                      Advanced Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Custom RPC Endpoint
                        </label>
                        <Input
                          placeholder="https://your-rpc-endpoint.com"
                          value={rpcUrl}
                          onChange={(e) => setRpcUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Cache Duration (minutes)
                        </label>
                        <Input placeholder="5" defaultValue="5" type="number" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isLoading && (
              <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing simulation...</span>
                </div>
              </div>
            )}

            {hasError && (
              <Alert
                variant="destructive"
                className="bg-red-500/10 border-red-500/50 text-red-400"
              >
                <AlertCircle className="h-4 w-4" />
                <div>
                  <div className="font-medium">Simulation Error:</div>
                  <div className="mt-1 text-sm">
                    {simulation.error?.message ||
                      batchSimulation.error?.message ||
                      comparison.error?.message}
                  </div>
                </div>
              </Alert>
            )}

            <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <Tabs
                defaultValue="single"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
                  <TabsTrigger
                    value="single"
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Single Simulation
                  </TabsTrigger>
                  <TabsTrigger
                    value="comparison"
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Comparison
                  </TabsTrigger>
                  <TabsTrigger
                    value="batch"
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Batch Simulation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-6 mt-6">
                  <SimulationInterface
                    onSimulate={handleSimulation}
                    loading={simulation.isLoading}
                  />

                  {simulation.result && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-[#00bfff]">
                          Simulation Results
                        </h3>
                        <ExportButton
                          data={simulation.result}
                          analysisType="single"
                          network={selectedNetwork}
                          fromAddress={fromAddress}
                          functionName={simulation.result.functionName}
                          filename={`simulation-${simulation.result.functionName}`}
                        />
                      </div>
                      <SimulationResults
                        result={simulation.result}
                        onExport={handleExportSingle}
                        showAdvancedAnalysis={true}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comparison" className="space-y-6 mt-6">
                  <ComparisonInterface
                    onRunComparison={handleComparison}
                    loading={comparison.isLoading}
                  />

                  {comparison.results && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-[#00bfff]">
                          Comparison Results
                        </h3>
                        <ExportButton
                          data={comparison.results}
                          analysisType="comparison"
                          network={selectedNetwork}
                          fromAddress={fromAddress}
                          functionName="transfer"
                          filename="comparison-transfer"
                        />
                      </div>
                      <ComparisonView
                        results={comparison.results}
                        analysis={comparison.analysis}
                        functionName="transfer"
                        onExport={handleExportComparison}
                        showChart={true}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="batch" className="space-y-6 mt-6">
                  <BatchSimulation
                    onSimulate={handleBatchSimulation}
                    loading={batchSimulation.isLoading}
                  />

                  {batchSimulation.result && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-[#00bfff]">
                          Batch Results
                        </h3>
                        <ExportButton
                          data={batchSimulation.result}
                          analysisType="batch"
                          network={selectedNetwork}
                          fromAddress={fromAddress}
                          filename="batch-simulation"
                        />
                      </div>
                      <BatchResults
                        result={batchSimulation.result}
                        analysis={batchSimulation.getAnalysis()}
                        onExport={handleExportBatch}
                        showChart={true}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {!simulation.result &&
              !comparison.results &&
              !batchSimulation.result &&
              !isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Single Simulation
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Zap className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Simulate individual transactions with detailed gas
                        analysis and state changes
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Comparison
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Compare gas costs and efficiency across different
                        parameter sets
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Batch Operations
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Simulate multiple operations in sequence with
                        comprehensive analysis
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
