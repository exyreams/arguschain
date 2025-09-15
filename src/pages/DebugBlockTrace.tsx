import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Badge, Button, Input } from "@/components/global";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/Tabs";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Blocks,
  Flame,
  Loader2,
  Network,
  Search,
  Settings,
} from "lucide-react";
import { Dropdown } from "@/components/global/Dropdown";
import { formatGas, RPC_CONFIG, shortenAddress } from "@/lib/config";
import Statusbar from "../components/status/Statusbar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { BookmarkManager } from "@/components/debugblock/BookmarkManager";
import { VirtualizedTransactionTable } from "@/components/blocktrace/VirtualizedTransactionTable";
import { ExportButton } from "@/components/debugblock/ExportButton";
import { ProtectedRoute } from "@/components/auth";

import { ProgressiveLoader } from "@/components/blocktrace/ProgressiveLoader";
import { useDefaultBlockTraceProgressiveLoading } from "@/hooks/blocktrace/useBlockTraceProgressiveLoading";
import { useBlockTraceData } from "@/hooks/blocktrace/useBlockTraceData";

import {
  RetryMechanism,
  useRetryMechanism,
} from "@/components/debugtrace/RetryMechanism";
import {
  BlockPerformanceChart,
  BlockSummaryCards,
  BlockTransactionChart,
  FunctionCategoryAnalytics,
  GasDistributionChart,
  InternalCallsChart,
  PyusdFunctionChart,
  PyusdVolumeChart,
  TransferNetworkChart,
} from "@/components/debugblock";

import { error } from "console";

export default function DebugBlockTrace() {
  const { blockId: urlBlockId } = useParams<{ blockId: string }>();
  const [searchParams] = useSearchParams();

  const [inputBlockId, setInputBlockId] = useState(urlBlockId || "");
  const [selectedNetwork, setSelectedNetwork] = useState<"mainnet" | "sepolia">(
    (searchParams.get("network") as "mainnet" | "sepolia") || "mainnet"
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedAnalysisDepth, setSelectedAnalysisDepth] = useState<
    "full" | "summary" | "custom"
  >("full");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [rpcUrl, setRpcUrl] = useState(
    searchParams.get("rpc") || RPC_CONFIG.mainnet.rpcUrl
  );

  // Progressive loading hook
  const {
    steps,
    startStep,
    updateProgress,
    completeStep,
    errorStep,
    resetSteps,
    allCompleted,
  } = useDefaultBlockTraceProgressiveLoading({
    onStepComplete: (stepId) => {
      console.log(`Step completed: ${stepId}`);
    },
    onAllComplete: () => {
      console.log("All steps completed");
    },
    onError: (stepId, error) => {
      console.error(`Step ${stepId} failed:`, error);
    },
  });

  // Block trace data hook
  const {
    data,
    blockInfo,
    isLoading,
    isTracing,
    isConnecting,
    error,
    connectionError,
    traceBlock,
    traceBlockAsync,
    refetch: reconnect,
  } = useBlockTraceData({
    blockIdentifier: urlBlockId,
    network: selectedNetwork,
    analysisType: selectedAnalysisDepth,
    enabled: !!urlBlockId,
  });

  const handleInputChange = (value: string) => {
    setInputBlockId(value);
    if (validationError) {
      setValidationError(null);
    }
  };

  // Retry mechanism for failed requests
  const {
    error: retryError,
    executeWithRetry,
    clearError,
  } = useRetryMechanism(
    async () => {
      if (inputBlockId.trim()) {
        await executeBlockTrace(inputBlockId.trim());
      }
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
    }
  );

  // Execute block trace with progressive loading
  const executeBlockTrace = async (blockId: string) => {
    resetSteps();
    clearError();
    setValidationError(null);

    try {
      // Step 1: Validate
      startStep("validate");
      await new Promise((resolve) => setTimeout(resolve, 100));
      completeStep("validate", 100);

      // Step 2: Fetch basic info
      startStep("fetch-basic");
      updateProgress("fetch-basic", 50);
      await new Promise((resolve) => setTimeout(resolve, 200));
      completeStep("fetch-basic", 200);

      // Step 3: Trace block
      startStep("trace-block");
      updateProgress("trace-block", 25);

      // Execute the actual trace
      await traceBlockAsync(blockId);

      updateProgress("trace-block", 75);
      completeStep("trace-block", 1500);

      // Step 4: Process PYUSD
      startStep("process-pyusd");
      updateProgress("process-pyusd", 50);
      await new Promise((resolve) => setTimeout(resolve, 300));
      completeStep("process-pyusd", 300);

      // Step 5: Generate analytics
      startStep("process-analytics");
      updateProgress("process-analytics", 50);
      await new Promise((resolve) => setTimeout(resolve, 200));
      completeStep("process-analytics", 200);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      errorStep("process-analytics", errorMessage);
      setValidationError(errorMessage);
      throw error;
    }
  };

  const handleSearch = async () => {
    const trimmedBlockId = inputBlockId.trim();

    if (!trimmedBlockId) {
      setValidationError("Please enter a block identifier");
      return;
    }

    setValidationError(null);

    // Update URL
    window.history.pushState(
      {},
      "",
      `/debug-block-trace/${trimmedBlockId}?network=${selectedNetwork}`
    );

    // Execute trace with progressive loading
    try {
      await executeBlockTrace(trimmedBlockId);
    } catch (error) {
      console.error("Block trace failed:", error);
    }
  };

  // Handle error display
  useEffect(() => {
    if (error) {
      setValidationError(error.message);
    }
  }, [error]);

  const renderBlockSummary = () => {
    if (!data || !blockInfo) return null;

    const { summary } = data;

    return (
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
          Block Analysis Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff]">
              {summary.total_transactions}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">
              Total Transactions
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff]">
              {summary.pyusd_interactions_count}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">
              PYUSD Interactions
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff]">
              {formatGas(summary.total_gas_used)}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Total Gas Used</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">
              {summary.failed_traces_count}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Failed Traces</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionTable = () => {
    if (!data) return null;

    const { transactions } = data;

    return (
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
          Transaction Details
        </h3>
        <div className="space-y-2 max-h-96 custom-scrollbar overflow-y-auto">
          {transactions.slice(0, 20).map((tx) => (
            <div
              key={tx.tx_index}
              className="flex items-center gap-2 p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={tx.failed ? "destructive" : "outline"}
                    className={
                      tx.failed
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    }
                  >
                    #{tx.tx_index}
                  </Badge>
                  <span className="text-sm font-mono text-[#8b9dc3]">
                    {shortenAddress(tx.from)} → {shortenAddress(tx.to)}
                  </span>
                  {tx.pyusd_interaction && (
                    <Badge className="text-xs bg-green-500/20 border-green-500/50 text-green-400">
                      PYUSD: {tx.pyusd_function || "Interaction"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                  <span>Value: {tx.value_eth}</span>
                  <span>Gas: {formatGas(tx.gas_used)}</span>
                  {tx.transfer_value > 0 && (
                    <span>PYUSD: {(tx.transfer_value / 1e6).toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {transactions.length > 20 && (
            <div className="text-center py-4 text-[#8b9dc3]">
              Showing 20 of {transactions.length} transactions
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
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
                  Debug Block Trace
                </h1>
                <p className="text-[#8b9dc3] text-lg">
                  Comprehensive block analysis using debug_traceBlockByNumber
                  and debug_traceBlockByHash
                </p>
              </div>

              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                    <Blocks className="h-5 w-5" />
                    Block Analytics
                  </h2>
                  <div className="flex items-center gap-3">
                    <BookmarkManager
                      onLoadBookmark={(blockId, analysisType) => {
                        setInputBlockId(blockId);
                        executeBlockTrace(blockId);
                      }}
                    />
                    {data && (
                      <ExportButton
                        data={data}
                        blockIdentifier={urlBlockId || inputBlockId}
                        analysisType="full"
                        filename="debug-block-analysis"
                        network={selectedNetwork}
                      />
                    )}
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
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Enter block number (e.g., 21000000) or block hash (64 chars)"
                          value={inputBlockId}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className={`w-full font-mono ${
                            validationError
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSearch();
                            }
                          }}
                        />
                        {validationError && (
                          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{validationError}</span>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-[#8b9dc3]">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[#00bfff]">✓</span>
                            <span>
                              Block numbers: 21000000, latest, earliest
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[#00bfff]">✓</span>
                            <span>Block hashes: 0x1234... (64 characters)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-red-400">✗</span>
                            <span>
                              Transaction hashes and contract addresses are not
                              supported
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleSearch}
                        disabled={isLoading || isTracing}
                        className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                      >
                        {isLoading || isTracing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        Analyze
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm text-[#8b9dc3] font-medium">
                        Network
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            selectedNetwork === "mainnet"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setSelectedNetwork("mainnet");
                            setRpcUrl(RPC_CONFIG.mainnet.rpcUrl);
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
                            selectedNetwork === "sepolia"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setSelectedNetwork("sepolia");
                            setRpcUrl(RPC_CONFIG.sepolia.rpcUrl);
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

                    <Dropdown
                      title="Analysis Depth"
                      value={selectedAnalysisDepth}
                      onValueChange={(value) =>
                        setSelectedAnalysisDepth(
                          value as "full" | "summary" | "custom"
                        )
                      }
                      placeholder="Full Analysis"
                      options={[
                        { value: "full", label: "Full Analysis" },
                        { value: "summary", label: "Summary Only" },
                        { value: "custom", label: "Custom" },
                      ]}
                    />

                    <div className="space-y-2">
                      <label className="text-sm text-[#8b9dc3] font-medium">
                        Quick Examples
                      </label>
                      <div className="flex gap-2">
                        {[
                          { label: "Latest", value: "latest" },
                          { label: "18500000", value: "18500000" },
                        ].map((example) => (
                          <Button
                            key={example.value}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setInputBlockId(example.value);
                              executeBlockTrace(example.value);
                            }}
                            disabled={isLoading || isTracing}
                            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] text-xs"
                          >
                            {example.label}
                          </Button>
                        ))}
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
                            Timeout (seconds)
                          </label>
                          <Input
                            placeholder="300"
                            defaultValue="300"
                            type="number"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(isLoading || isTracing) && (
                <ProgressiveLoader
                  steps={steps}
                  onStepComplete={(stepId) => {
                    console.log(`Step completed: ${stepId}`);
                  }}
                  onAllComplete={() => {
                    console.log("All steps completed");
                  }}
                />
              )}

              {retryError && (
                <RetryMechanism
                  onRetry={executeWithRetry}
                  error={retryError}
                  maxRetries={3}
                  initialDelay={2000}
                />
              )}

              {!isLoading && !isTracing && !data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Performance
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Activity className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Block performance metrics and grading
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        PYUSD Functions
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Function category distribution analysis
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Flame className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Gas Analysis
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Flame className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Gas usage patterns and optimization
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Network className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Transfer Network
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Network className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        PYUSD transfer flow visualization
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isConnecting && (
                <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting to {selectedNetwork} network...</span>
                  </div>
                </div>
              )}

              {connectionError && (
                <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span>Failed to connect to blockchain network</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reconnect()}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      Retry Connection
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error.message}</span>
                  </div>
                </div>
              )}

              {data && blockInfo && (
                <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
                      <TabsTrigger
                        value="summary"
                        className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                      >
                        Block Summary
                      </TabsTrigger>
                      <TabsTrigger
                        value="transactions"
                        className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                      >
                        Transactions
                      </TabsTrigger>
                      <TabsTrigger
                        value="analytics"
                        className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                      >
                        Analytics
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="space-y-6 mt-6">
                      <BlockSummaryCards
                        summary={data.summary}
                        className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                      />
                      {renderBlockSummary()}
                    </TabsContent>

                    <TabsContent
                      value="transactions"
                      className="space-y-6 mt-6"
                    >
                      {data && data.transactions && (
                        <VirtualizedTransactionTable
                          transactions={data.transactions.map((tx) => ({
                            hash: tx.tx_hash,
                            from: tx.from,
                            to: tx.to,
                            value: tx.value_eth,
                            gasUsed: tx.gas_used,
                            status: tx.failed ? "failed" : "success",
                            type: tx.pyusd_interaction
                              ? "PYUSD Transaction"
                              : "Contract Call",
                            transactionIndex: tx.tx_index,
                            category: tx.pyusd_function_category,
                          }))}
                          transactionFilter={transactionFilter}
                          setTransactionFilter={setTransactionFilter}
                          height={600}
                          className="w-full"
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6 mt-6">
                      <BlockPerformanceChart
                        summary={data.summary}
                        transactions={data.transactions}
                        className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                      />

                      {data.functionCategoryData.length > 0 && (
                        <PyusdFunctionChart
                          data={data.functionCategoryData}
                          className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                        />
                      )}

                      <GasDistributionChart
                        data={data.gasDistribution}
                        className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                      />

                      <BlockTransactionChart
                        transactions={data.transactions}
                        className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                      />

                      {data.pyusdTransfers.length > 0 && (
                        <TransferNetworkChart
                          transfers={data.pyusdTransfers}
                          className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                        />
                      )}

                      {data.pyusdTransfers.length > 0 && (
                        <PyusdVolumeChart
                          transfers={data.pyusdTransfers}
                          className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                        />
                      )}

                      {data.internalTransactions.length > 0 && (
                        <InternalCallsChart
                          internalTransactions={data.internalTransactions}
                          className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                        />
                      )}

                      {data.functionCategories &&
                        Object.values(data.functionCategories).some(
                          (count) => count > 0
                        ) && (
                          <FunctionCategoryAnalytics
                            functionCategories={data.functionCategories}
                            transactions={data.transactions}
                            className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                          />
                        )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
