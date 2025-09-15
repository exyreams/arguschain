import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, Card, Input } from "@/components/global";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  DollarSign,
  Info,
  Loader2,
  Network,
  Search,
  Settings,
  Shield,
  Zap,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Statusbar from "@/components/status/Statusbar";
import {
  BookmarkManager,
  ExportButton,
  ProgressTracker,
  ReplayErrorBoundary,
  ReplayTransactionAnalytics,
  StateChangesExplorer,
  StateChangesTable,
  TokenFlowVisualizer,
} from "@/components/replaytransactions";
import {
  useReplayAnalysisState,
  useReplayBlockWithProgress,
  useReplayCostEstimation,
  useReplayTransaction,
  useReplayTransactionMutation,
} from "@/hooks/replaytransactions";
import { type ReplayTracer } from "@/lib/replaytransactions";

export default function ReplayTransactions() {
  const { txHash: urlTxHash } = useParams<{ txHash: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inputTxHash, setInputTxHash] = useState(urlTxHash || "");
  const [inputBlockId, setInputBlockId] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"transaction" | "block">(
    "transaction"
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showCostWarning, setShowCostWarning] = useState(false);

  const {
    selectedTracers,
    setSelectedTracers,
    selectedNetwork,
    setSelectedNetwork,
    analysisHistory,
    addToHistory,
    toggleTracer,
    resetTracers,
  } = useReplayAnalysisState();

  const { estimateTransactionCost, estimateBlockCost, checkCostWarning } =
    useReplayCostEstimation();

  const {
    data: replayData,
    isLoading: isLoadingReplay,
    isError: isReplayError,
    error: replayError,
    refetch: refetchReplay,
  } = useReplayTransaction(
    analysisMode === "transaction" ? inputTxHash : null,
    {
      enabled: false,
      tracers: selectedTracers,
      network: selectedNetwork,
    }
  );

  const replayTransactionMutation = useReplayTransactionMutation({
    tracers: selectedTracers,
    network: selectedNetwork,
    onSuccess: (data) => {
      addToHistory({
        txHash: inputTxHash,
        type: "transaction",
      });
      setValidationError(null);
    },
    onError: (error) => {
      setValidationError(error.message);
    },
  });

  const {
    analyzeBlock,
    cancelAnalysis,
    progress: blockProgress,
    isAnalyzing: isAnalyzingBlock,
    data: blockData,
    error: blockError,
    canCancel,
  } = useReplayBlockWithProgress();

  const validateTransactionHash = (hash: string): string | null => {
    if (!hash || hash.trim() === "") {
      return "Please enter a transaction hash";
    }

    if (!hash.startsWith("0x")) {
      return "Transaction hash must start with 0x";
    }

    if (hash.length !== 66) {
      return "Transaction hash must be 66 characters long";
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      return "Invalid transaction hash format";
    }

    return null;
  };

  const validateBlockIdentifier = (blockId: string): string | null => {
    if (!blockId || blockId.trim() === "") {
      return "Please enter a block number or hash";
    }

    if (blockId.startsWith("0x")) {
      if (blockId.length === 66 && /^0x[a-fA-F0-9]{64}$/.test(blockId)) {
        return null;
      }

      if (/^0x[a-fA-F0-9]+$/.test(blockId)) {
        return null;
      }
      return "Invalid block hash or hex number format";
    }

    if (/^\d+$/.test(blockId)) {
      const blockNum = parseInt(blockId, 10);
      if (blockNum < 0) {
        return "Block number must be positive";
      }
      if (blockNum > 20000000) {
        return "Block number seems too high";
      }
      return null;
    }

    return "Invalid block identifier format";
  };

  const handleInputChange = (value: string) => {
    if (analysisMode === "transaction") {
      setInputTxHash(value);
    } else {
      setInputBlockId(value);
    }

    if (validationError) {
      setValidationError(null);
    }
  };

  const handleAnalyze = () => {
    let error: string | null = null;

    if (analysisMode === "transaction") {
      error = validateTransactionHash(inputTxHash.trim());
      if (!error) {
        const cost = checkCostWarning("transaction", selectedTracers);
        if (cost.isExpensive) {
          setShowCostWarning(true);
          return;
        }
        replayTransactionMutation.mutate(inputTxHash.trim());
      }
    } else {
      error = validateBlockIdentifier(inputBlockId.trim());
      if (!error) {
        const cost = checkCostWarning("block", selectedTracers, 50);
        setShowCostWarning(true);
        return;
      }
    }

    if (error) {
      setValidationError(error);
    }
  };

  const handleConfirmExpensiveOperation = () => {
    setShowCostWarning(false);
    if (analysisMode === "transaction") {
      replayTransactionMutation.mutate(inputTxHash.trim());
    } else {
      const blockId = inputBlockId.trim();
      analyzeBlock(blockId);
      addToHistory({
        blockId,
        type: "block",
      });
    }
  };

  const handleTracerToggle = (tracer: ReplayTracer) => {
    toggleTracer(tracer);

    const newTracers = selectedTracers.includes(tracer)
      ? selectedTracers.filter((t) => t !== tracer)
      : [...selectedTracers, tracer];

    if (newTracers.length > 0) {
      checkCostWarning(analysisMode, newTracers);
    }
  };

  useEffect(() => {
    if (
      urlTxHash &&
      !replayData &&
      !isLoadingReplay &&
      !replayTransactionMutation.isPending
    ) {
      const error = validateTransactionHash(urlTxHash);
      if (!error) {
        setInputTxHash(urlTxHash);
        replayTransactionMutation.mutate(urlTxHash);
      }
    }
  }, [urlTxHash, replayData, isLoadingReplay, replayTransactionMutation]);

  const isLoading = isLoadingReplay || replayTransactionMutation.isPending;
  const currentData = replayTransactionMutation.data || replayData;
  const currentError = replayTransactionMutation.error || replayError;

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
      <header className="fixed top-0 left-0 w-full z-10 border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-40 pb-16 px-6">
        <div className="container mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-[#00bfff] tracking-wide">
              Replay Transaction Analysis
            </h1>
            <p className="text-[#8b9dc3] text-lg">
              Deep transaction analysis using trace_replayTransaction and
              trace_replayBlockTransactions
            </p>
          </div>

          <Card className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border-[rgba(0,191,255,0.2)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                  Replay Analysis Configuration
                </h2>
                <div className="flex items-center gap-3">
                  <BookmarkManager
                    queryParams={{
                      identifier:
                        analysisMode === "transaction"
                          ? inputTxHash
                          : inputBlockId,
                      analysisMode,
                      network: selectedNetwork,
                      tracers: selectedTracers,
                    }}
                    analysisResults={
                      currentData
                        ? {
                            gasUsed:
                              currentData.performanceMetrics?.costAnalysis
                                ?.totalGasUsed,
                            tokenTransfers:
                              currentData.tokenAnalysis?.tokenTransfers?.length,
                            securityFlags: currentData.securityFlags?.length,
                            executionTime:
                              currentData.performanceMetrics?.executionTime,
                          }
                        : blockData
                          ? {
                              gasUsed: blockData.totalGasUsed,
                              tokenTransfers: blockData.totalTokenTransfers,
                              securityFlags:
                                blockData.blockSecurityFlags?.length,
                            }
                          : undefined
                    }
                    onLoadBookmark={(bookmark) => {
                      if (bookmark.queryConfig.analysisMode === "transaction") {
                        setInputTxHash(bookmark.queryConfig.identifier);
                        setAnalysisMode("transaction");
                      } else {
                        setInputBlockId(bookmark.queryConfig.identifier);
                        setAnalysisMode("block");
                      }
                      setSelectedNetwork(
                        bookmark.queryConfig.network as "mainnet" | "sepolia"
                      );
                      setSelectedTracers(
                        bookmark.queryConfig.tracers as ReplayTracer[]
                      );
                    }}
                    onSignUpClick={() => {
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
                <div className="space-y-2">
                  <label className="text-sm text-[#8b9dc3] font-medium">
                    Analysis Mode
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        analysisMode === "transaction" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setAnalysisMode("transaction")}
                      className={
                        analysisMode === "transaction"
                          ? "bg-[#00bfff] text-[#0f1419]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }
                    >
                      Single Transaction
                    </Button>
                    <Button
                      variant={analysisMode === "block" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAnalysisMode("block")}
                      className={
                        analysisMode === "block"
                          ? "bg-[#00bfff] text-[#0f1419]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }
                    >
                      Block Analysis
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-[#8b9dc3] font-medium">
                    {analysisMode === "transaction"
                      ? "Transaction Hash"
                      : "Block Number/Hash"}
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder={
                          analysisMode === "transaction"
                            ? "Enter transaction hash (0x...)"
                            : "Enter block number or hash"
                        }
                        value={
                          analysisMode === "transaction"
                            ? inputTxHash
                            : inputBlockId
                        }
                        onChange={(e) => handleInputChange(e.target.value)}
                        className={`w-full font-mono ${
                          validationError
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAnalyze();
                          }
                        }}
                      />
                      {validationError && (
                        <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{validationError}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Analyze
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-[#8b9dc3] font-medium">
                    Analysis Tracers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(["trace", "stateDiff", "vmTrace"] as ReplayTracer[]).map(
                      (tracer) => {
                        const isSelected = selectedTracers.includes(tracer);
                        const descriptions = {
                          trace: "Call hierarchy and contract interactions",
                          stateDiff: "State changes and storage modifications",
                          vmTrace: "VM-level execution with opcode analysis",
                        };

                        return (
                          <div key={tracer} className="flex items-center gap-2">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTracerToggle(tracer)}
                              className={
                                isSelected
                                  ? "bg-[#00bfff] text-[#0f1419]"
                                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                              }
                            >
                              {tracer}
                            </Button>
                            <div className="text-xs text-[#6b7280] max-w-[200px]">
                              {descriptions[tracer]}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetTracers}
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] text-xs"
                    >
                      Reset to Default
                    </Button>
                    <span className="text-xs text-[#6b7280]">
                      Selected: {selectedTracers.length}/3 tracers
                    </span>
                  </div>
                </div>

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
                      onClick={() => setSelectedNetwork("mainnet")}
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
                      onClick={() => setSelectedNetwork("sepolia")}
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
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Timeout (seconds)
                        </label>
                        <Input
                          placeholder="120"
                          defaultValue="120"
                          type="number"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {showCostWarning && (
            <Card className="bg-[rgba(255,193,7,0.1)] border-[rgba(255,193,7,0.3)]">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-[#fbbf24] mt-1" />
                  <div className="flex-1">
                    <h3 className="text-md font-semibold text-[#fbbf24] mb-2">
                      High-Cost Operation Warning
                    </h3>
                    <p className="text-sm text-[#8b9dc3] mb-4">
                      The <code>replayTransaction</code> method is extremely
                      resource-intensive. Running it may take 60–120 seconds and
                      consume over 100× the cost of a normal trace. Use this
                      operation only when strictly necessary.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleConfirmExpensiveOperation}
                        className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f1419] font-medium"
                      >
                        Proceed Anyway
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCostWarning(false)}
                        className="border-[rgba(255,193,7,0.3)] text-[#fbbf24] hover:bg-[rgba(255,193,7,0.1)]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {analysisHistory.length > 0 && (
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                  Recent Analysis
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisHistory.slice(0, 5).map((item, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (item.txHash) {
                          setInputTxHash(item.txHash);
                          setAnalysisMode("transaction");
                        }
                      }}
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] font-mono text-xs"
                    >
                      {item.txHash
                        ? `${item.txHash.slice(0, 8)}...`
                        : `Block ${item.blockId}`}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {(currentError || blockError) && (
            <Card className="bg-[rgba(220,38,38,0.1)] border-[rgba(220,38,38,0.3)]">
              <div className="p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{currentError?.message || blockError?.message}</span>
                </div>
              </div>
            </Card>
          )}

          {blockProgress && (
            <ProgressTracker
              isActive={isAnalyzingBlock}
              progress={{
                id: `block-analysis-${Date.now()}`,
                type: "block" as const,
                status: isAnalyzingBlock ? "running" : "completed",
                currentStep: blockProgress.completed,
                totalSteps: blockProgress.total,
                percentage: Math.round(
                  (blockProgress.completed / blockProgress.total) * 100
                ),
                message: blockProgress.message,
                startTime: Date.now(),
                elapsedTime: 0, // Since we're using current time as startTime, elapsed is 0
                estimatedEndTime:
                  analysisMode === "block"
                    ? Date.now() + 10 * 60 * 1000 // Estimate 10 minutes for block analysis
                    : undefined,
              }}
              onCancel={canCancel ? cancelAnalysis : undefined}
              showCostTracking={true}
              showDetailedBreakdown={true}
            />
          )}

          {isLoading && (
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#00bfff] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
                  Analyzing Transaction
                </h3>
                <p className="text-[#8b9dc3] mb-4">
                  This may take 60-120 seconds due to the computational
                  complexity of replay methods...
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-[#6b7280]">
                  <Clock className="h-4 w-4" />
                  <span>Estimated time: 1-2 minutes</span>
                </div>
              </div>
            </Card>
          )}

          {(currentData || blockData) && !isLoading && !isAnalyzingBlock && (
            <div className="space-y-6">
              <ReplayErrorBoundary>
                {analysisMode === "transaction" && currentData ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-[#00bfff]">
                        Transaction Analysis Results
                      </h3>
                      <ExportButton
                        data={currentData}
                        analysisType="transaction"
                        network={selectedNetwork}
                        identifier={inputTxHash}
                        filename={`replay-transaction-${inputTxHash.slice(0, 8)}`}
                      />
                    </div>
                    <ReplayTransactionAnalytics
                      replayData={currentData}
                      loading={isLoading}
                    />

                    <div className="space-y-6">
                      {currentData.stateDiffAnalysis && (
                        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
                          <div className="p-6">
                            <h3 className="text-xl font-semibold text-[#00bfff] mb-4 flex items-center gap-2">
                              <Database className="h-5 w-5" />
                              State Changes Analysis
                            </h3>
                            <StateChangesTable
                              processedData={currentData}
                              onStateChangeSelect={(change) => {
                                console.log("Selected state change:", change);
                              }}
                            />
                          </div>
                        </Card>
                      )}

                      {currentData.tokenAnalysis &&
                        currentData.tokenAnalysis.hasTokenInteraction && (
                          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
                            <div className="p-6">
                              <h3 className="text-xl font-semibold text-[#00bfff] mb-4 flex items-center gap-2">
                                <Network className="h-5 w-5" />
                                Token Flow Visualization
                              </h3>
                              <TokenFlowVisualizer
                                processedData={currentData}
                                onTransferSelect={(transfer) => {
                                  console.log("Selected transfer:", transfer);
                                }}
                              />
                            </div>
                          </Card>
                        )}

                      {currentData.securityFlags &&
                        currentData.securityFlags.length > 0 && (
                          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
                            <div className="p-6">
                              <h3 className="text-xl font-semibold text-[#00bfff] mb-4 flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Security Analysis
                              </h3>
                              <div className="space-y-3">
                                {currentData.securityFlags.map(
                                  (flag, index) => (
                                    <div
                                      key={index}
                                      className={`p-4 rounded-lg border ${
                                        flag.level === "critical"
                                          ? "bg-red-500/10 border-red-500/30"
                                          : flag.level === "warning"
                                            ? "bg-yellow-500/10 border-yellow-500/30"
                                            : "bg-blue-500/10 border-blue-500/30"
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <AlertTriangle
                                          className={`h-5 w-5 mt-0.5 ${
                                            flag.level === "critical"
                                              ? "text-red-400"
                                              : flag.level === "warning"
                                                ? "text-yellow-400"
                                                : "text-blue-400"
                                          }`}
                                        />
                                        <div>
                                          <div className="font-medium text-white mb-1">
                                            {flag.description}
                                          </div>
                                          <div className="text-sm text-gray-300">
                                            Type: {flag.type} | Level:{" "}
                                            {flag.level}
                                          </div>
                                          {flag.details && (
                                            <div className="text-xs text-gray-400 mt-2">
                                              {JSON.stringify(flag.details)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </Card>
                        )}

                      {currentData.performanceMetrics && (
                        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
                          <div className="p-6">
                            <h3 className="text-xl font-semibold text-[#00bfff] mb-4 flex items-center gap-2">
                              <BarChart3 className="h-5 w-5" />
                              Performance Analysis
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="bg-[rgba(0,191,255,0.1)] rounded-lg p-4">
                                <div className="text-2xl font-bold text-[#00bfff] mb-1">
                                  {currentData.performanceMetrics.gasEfficiency}
                                  %
                                </div>
                                <div className="text-sm text-[#8b9dc3]">
                                  Gas Efficiency
                                </div>
                              </div>
                              <div className="bg-[rgba(0,191,255,0.1)] rounded-lg p-4">
                                <div className="text-2xl font-bold text-[#00bfff] mb-1">
                                  {currentData.performanceMetrics.costAnalysis.totalGasUsed.toLocaleString()}
                                </div>
                                <div className="text-sm text-[#8b9dc3]">
                                  Total Gas Used
                                </div>
                              </div>
                              <div className="bg-[rgba(0,191,255,0.1)] rounded-lg p-4">
                                <div className="text-2xl font-bold text-[#00bfff] mb-1">
                                  {
                                    currentData.performanceMetrics
                                      .optimizationSuggestions.length
                                  }
                                </div>
                                <div className="text-sm text-[#8b9dc3]">
                                  Optimization Tips
                                </div>
                              </div>
                            </div>

                            {currentData.performanceMetrics
                              .optimizationSuggestions.length > 0 && (
                              <div>
                                <h4 className="text-lg font-semibold text-[#00bfff] mb-3">
                                  Optimization Suggestions
                                </h4>
                                <div className="space-y-3">
                                  {currentData.performanceMetrics.optimizationSuggestions.map(
                                    (suggestion, index) => (
                                      <div
                                        key={index}
                                        className="p-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.2)] rounded-lg"
                                      >
                                        <div className="flex items-start gap-3">
                                          <Info className="h-5 w-5 text-[#00bfff] mt-0.5" />
                                          <div>
                                            <div className="font-medium text-white mb-1">
                                              {suggestion.title}
                                            </div>
                                            <div className="text-sm text-[#8b9dc3] mb-2">
                                              {suggestion.description}
                                            </div>
                                            <div className="text-sm text-[#00bfff]">
                                              {suggestion.recommendation}
                                            </div>
                                            {suggestion.potentialSavings && (
                                              <div className="text-xs text-green-400 mt-1">
                                                Potential savings:{" "}
                                                {suggestion.potentialSavings.gas.toLocaleString()}{" "}
                                                gas (
                                                {
                                                  suggestion.potentialSavings
                                                    .percentage
                                                }
                                                %)
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                  </>
                ) : analysisMode === "block" && blockData ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-[#00bfff]">
                        Block Analysis Results
                      </h3>
                      <ExportButton
                        data={blockData}
                        analysisType="block"
                        network={selectedNetwork}
                        identifier={inputBlockId}
                        filename={`replay-block-${inputBlockId}`}
                      />
                    </div>
                    <div className="text-center py-12">
                      <div className="text-[#00bfff] text-lg font-semibold mb-2">
                        Block Analysis Complete
                      </div>
                      <div className="text-[#8b9dc3]">
                        Block analysis visualization coming soon...
                      </div>
                      <pre className="text-xs text-left mt-4 p-4 bg-[rgba(0,0,0,0.2)] rounded overflow-auto max-h-64">
                        {JSON.stringify(blockData, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </ReplayErrorBoundary>
            </div>
          )}

          {!currentData &&
            !blockData &&
            !isLoading &&
            !isAnalyzingBlock &&
            !currentError &&
            !blockError && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Network className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Call Trace Analysis
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Network className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Detailed contract interaction hierarchy and call flow
                        analysis
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        State Diff Analysis
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Activity className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Complete state changes including balances, storage, and
                        code modifications
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        VM Trace Analysis
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Opcode-level execution analysis with gas usage and
                        performance metrics
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
