import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { Badge, Button, Input } from "@/components/global";
import { OpcodeAnalyticsLoader } from "@/components/global/Loader";
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
  Loader2,
  Network,
  Search,
  Settings,
} from "lucide-react";
import { Dropdown } from "@/components/global/Dropdown";
import {
  type TransactionAnalysis,
  TransactionTracer,
} from "@/lib/transactionTracer";
import { type StructLogAnalysis, StructLogTracer } from "@/lib/structLogTracer";
import { blockchainService } from "@/lib/blockchainService";
import { formatGas, RPC_CONFIG, shortenAddress } from "@/lib/config";
import Statusbar from "../components/status/Statusbar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  StructLogAnalytics,
  TransactionTracerAnalytics,
  UnifiedGasAnalytics,
} from "@/components/debugtrace";
import { BookmarkManager } from "@/components/debugtrace/BookmarkManager";
import { VirtualizedChart } from "@/components/debugtrace/VirtualizedChart";
import { InternalCallTree } from "@/components/debugtrace/charts/InternalCallTree";
import ProgressiveLoader from "@/components/debugtrace/ProgressiveLoader";
import useProgressiveLoading from "@/hooks/debugtrace/useProgressiveLoading";
import {
  RetryMechanism,
  useRetryMechanism,
} from "@/components/debugtrace/RetryMechanism";

interface TraceState {
  loading: boolean;
  error: string | null;
  callTrace: TransactionAnalysis | null;
  structLog: StructLogAnalysis | null;
  txHash: string;
  provider: ethers.JsonRpcProvider | null;
}

export default function DebugTrace() {
  const { txHash: urlTxHash } = useParams<{ txHash: string }>();
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<TraceState>({
    loading: false,
    error: null,
    callTrace: null,
    structLog: null,
    txHash: urlTxHash || "",
    provider: null,
  });

  const [inputTxHash, setInputTxHash] = useState(urlTxHash || "");
  const [selectedNetwork, setSelectedNetwork] = useState<"mainnet" | "sepolia">(
    "mainnet"
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedTraceMethod, setSelectedTraceMethod] = useState<
    "both" | "callTracer" | "structLog"
  >("both");
  const [selectedAnalysisDepth, setSelectedAnalysisDepth] = useState<
    "full" | "summary" | "custom"
  >("full");
  const [analyticsTabLoading, setAnalyticsTabLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [currentAnalyticsTab, setCurrentAnalyticsTab] =
    useState("unified-analytics");

  const validateTransactionHash = (hash: string): string | null => {
    if (!hash || hash.trim() === "") {
      return "Please enter a transaction hash";
    }

    if (!hash.startsWith("0x")) {
      return "Transaction hash must start with 0x";
    }

    if (hash.length !== 66) {
      return "Transaction hash must be 66 characters long (0x + 64 hex characters)";
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      return "Invalid transaction hash format";
    }

    return null;
  };

  const handleInputChange = (value: string) => {
    setInputTxHash(value);

    if (validationError) {
      setValidationError(null);
    }
  };
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [rpcUrl, setRpcUrl] = useState("");

  const {
    steps,
    startStep,
    updateProgress,
    completeStep,
    errorStep,
    resetSteps,
  } = useProgressiveLoading([
    {
      id: "validate",
      name: "Validate Transaction",
      description: "Checking transaction hash format and network connectivity",
    },
    {
      id: "fetch-basic",
      name: "Fetch Transaction",
      description: "Retrieving basic transaction information",
    },
    {
      id: "trace-calls",
      name: "Trace Contract Calls",
      description: "Analyzing contract interactions and call hierarchy",
    },
    {
      id: "trace-opcodes",
      name: "Trace Opcodes",
      description: "Processing opcode-level execution details",
    },
    {
      id: "process-trace",
      name: "Process Analytics",
      description: "Computing gas analysis and optimization suggestions",
    },
  ]);

  const {
    error: retryError,
    executeWithRetry,
    clearError,
  } = useRetryMechanism(
    async () => {
      traceTransactionMutation.mutate(state.txHash);
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
    }
  );

  const queryClient = useQueryClient();

  const {
    data: provider,
    isLoading: isConnecting,
    error: connectionError,
    refetch: reconnect,
  } = useQuery({
    queryKey: ["blockchain-connection", selectedNetwork],
    queryFn: async () => {
      await blockchainService.connect(selectedNetwork);
      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Failed to get provider after connection");
      }
      return provider;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      provider: provider || null,
      error: connectionError
        ? "Failed to connect to blockchain network"
        : prev.error,
    }));
  }, [provider, connectionError]);

  const {
    data: traceData,
    isLoading: isTracing,
    error: traceError,
    refetch: refetchTrace,
  } = useQuery({
    queryKey: [
      "transaction-trace",
      urlTxHash,
      selectedNetwork,
      selectedTraceMethod,
    ],
    queryFn: async () => {
      if (!urlTxHash) return null;

      const error = validateTransactionHash(urlTxHash);
      if (error) {
        throw new Error(error);
      }

      return await executeTransactionTrace(urlTxHash);
    },
    enabled: !!urlTxHash && !!provider && !isConnecting,
    retry: 2,
    retryDelay: 3000,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (traceData) {
      setState((prev) => ({
        ...prev,
        callTrace: traceData.callTrace,
        structLog: traceData.structLog,
        loading: false,
        error: null,
        txHash: urlTxHash || prev.txHash,
      }));
    } else if (traceError) {
      setValidationError(traceError.message);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: traceError.message,
        callTrace: null,
        structLog: null,
      }));
    }
  }, [traceData, traceError, urlTxHash]);

  const traceTransactionMutation = useMutation({
    mutationFn: async (txHash: string) => {
      const error = validateTransactionHash(txHash);
      if (error) {
        throw new Error(error);
      }
      return await executeTransactionTrace(txHash);
    },
    onMutate: (txHash: string) => {
      resetSteps();
      clearError();
      setValidationError(null);

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        txHash,
        callTrace: null,
        structLog: null,
      }));
    },
    onSuccess: (data, txHash) => {
      setState((prev) => ({
        ...prev,
        loading: false,
        callTrace: data.callTrace,
        structLog: data.structLog,
        error:
          !data.callTrace && !data.structLog
            ? "Failed to trace transaction"
            : null,
      }));

      queryClient.setQueryData(
        ["transaction-trace", txHash, selectedNetwork, selectedTraceMethod],
        data
      );
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Unknown error occurred";
      errorStep("process-trace", errorMessage);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      setValidationError(errorMessage);
    },
    retry: 2,
    retryDelay: 3000,
  });

  const executeTransactionTrace = async (txHash: string) => {
    resetSteps();
    clearError();

    startStep("validate");
    if (!txHash || !txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      errorStep("validate", "Invalid transaction hash format");
      setState((prev) => ({
        ...prev,
        error: "Invalid transaction hash format",
      }));
      return;
    }
    completeStep("validate", 100);

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      txHash,
      callTrace: null,
      structLog: null,
    }));

    try {
      startStep("fetch-basic");
      await blockchainService.connect(selectedNetwork);

      if (!blockchainService.isConnected()) {
        throw new Error("Failed to connect to blockchain network");
      }

      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Provider not available");
      }

      setState((prev) => ({ ...prev, provider }));
      completeStep("fetch-basic", 200);

      let callTrace: TransactionAnalysis | null = null;
      let structLog: StructLogAnalysis | null = null;

      const shouldRunCallTrace =
        selectedTraceMethod === "both" || selectedTraceMethod === "callTracer";
      const shouldRunStructLog =
        selectedTraceMethod === "both" || selectedTraceMethod === "structLog";

      const tracePromises: Promise<
        | { type: "callTrace"; result: unknown; tracer: TransactionTracer }
        | { type: "structLog"; result: unknown; tracer: StructLogTracer }
      >[] = [];

      if (shouldRunCallTrace) {
        startStep("trace-calls");
        updateProgress("trace-calls", 25);

        const tracer = new TransactionTracer(provider);
        tracePromises.push(
          blockchainService
            .traceTransactionCallTracer(txHash)
            .then((result) => {
              updateProgress("trace-calls", 75);
              return { type: "callTrace" as const, result, tracer };
            })
        );
      }

      if (shouldRunStructLog) {
        startStep("trace-opcodes");
        updateProgress("trace-opcodes", 25);

        const structTracer = new StructLogTracer(provider);
        tracePromises.push(
          blockchainService.traceTransactionStructLog(txHash).then((result) => {
            updateProgress("trace-opcodes", 75);
            return { type: "structLog" as const, result, tracer: structTracer };
          })
        );
      }

      const traceResults = await Promise.allSettled(tracePromises);

      for (const result of traceResults) {
        if (result.status === "fulfilled") {
          const { type, result: traceResult, tracer } = result.value;

          try {
            if (
              type === "callTrace" &&
              traceResult &&
              tracer instanceof TransactionTracer
            ) {
              callTrace = tracer.parseCallTrace(traceResult, txHash);
              completeStep("trace-calls", 1500);
            } else if (
              type === "structLog" &&
              traceResult &&
              typeof traceResult === "object" &&
              traceResult !== null &&
              "structLogs" in traceResult &&
              Array.isArray((traceResult as any).structLogs) &&
              tracer instanceof StructLogTracer
            ) {
              structLog = tracer.parseStructLog(
                (traceResult as any).structLogs,
                txHash
              );
              completeStep("trace-opcodes", 2000);
            }
          } catch (error) {
            console.error(`Error parsing ${type}:`, error);
            if (type === "callTrace") {
              errorStep("trace-calls", "Failed to parse call trace data");
            } else {
              errorStep("trace-opcodes", "Failed to parse opcode data");
            }
          }
        } else {
          console.error("Trace failed:", result.reason);
          if (shouldRunCallTrace) {
            errorStep("trace-calls", "Failed to fetch call trace data");
          }
          if (shouldRunStructLog) {
            errorStep("trace-opcodes", "Failed to fetch opcode data");
          }
        }
      }

      startStep("process-trace");
      updateProgress("process-trace", 50);

      await new Promise((resolve) => setTimeout(resolve, 500));
      completeStep("process-trace", 500);

      return { callTrace, structLog };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      errorStep("process-trace", errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleSearch = () => {
    const trimmedHash = inputTxHash.trim();
    const error = validateTransactionHash(trimmedHash);

    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);

    window.history.pushState({}, "", `/debug-trace/${trimmedHash}`);
    traceTransactionMutation.mutate(trimmedHash);
  };

  // Performance thresholds for showing loading states
  const PERFORMANCE_THRESHOLDS = {
    OPCODE_COUNT: 5000,
    TOTAL_STEPS: 50000,
    TOP_OPCODES: 500,
  };

  const handleAnalyticsTabChange = (tabValue: string) => {
    console.log("Tab changed to:", tabValue); // Debug log
    setCurrentAnalyticsTab(tabValue);

    // Show loading for opcode analytics tab when switching to it
    if (tabValue === "opcode-analytics" && state.structLog) {
      console.log("Setting opcode analytics loading to true"); // Debug log
      setAnalyticsTabLoading((prev) => ({ ...prev, [tabValue]: true }));

      // Use requestAnimationFrame to ensure smooth UI transition
      requestAnimationFrame(() => {
        setTimeout(() => {
          console.log("Setting opcode analytics loading to false"); // Debug log
          setAnalyticsTabLoading((prev) => ({ ...prev, [tabValue]: false }));
        }, 1200); // Show loader for 1.2 seconds to simulate processing
      });
    }
  };

  // Memoize heavy computations for opcode analytics
  const opcodeAnalyticsData = useMemo(() => {
    if (!state.structLog) return null;

    // Pre-process data for better performance
    const isLargeDataset =
      state.structLog.summary.total_steps > PERFORMANCE_THRESHOLDS.TOTAL_STEPS;

    return {
      structLog: state.structLog,
      isLargeDataset,
      shouldVirtualize:
        state.structLog.top_opcodes.length > PERFORMANCE_THRESHOLDS.TOP_OPCODES,
    };
  }, [state.structLog]);

  const renderCallTraceTree = (
    calls: TransactionAnalysis["call_data"],
    parentId?: string,
    depth = 0
  ) => {
    const childCalls = calls.filter((call) => call.parent_id === parentId);

    return childCalls.map((call) => (
      <div key={call.id} className="mb-2">
        <div
          className="flex items-center gap-2 p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={call.error ? "destructive" : "outline"}
                className={
                  call.error
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                }
              >
                {call.type}
              </Badge>
              <span className="text-sm font-mono text-[#8b9dc3]">
                {shortenAddress(call.from)} → {shortenAddress(call.to)}
              </span>
              {call.error && (
                <Badge className="text-xs bg-red-500/20 border-red-500/50 text-red-400">
                  ERROR: {call.error}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-[#6b7280]">
              <span>Value: {call.value_eth.toFixed(6)} ETH</span>
              <span>Gas: {formatGas(call.gasUsed)}</span>
              <span>Contract: {call.contract}</span>
              {call.input_preview && <span>Input: {call.input_preview}</span>}
            </div>
          </div>
        </div>
        {renderCallTraceTree(calls, call.id, depth + 1)}
      </div>
    ));
  };

  const renderVirtualizedCallTrace = (
    calls: TransactionAnalysis["call_data"]
  ) => {
    // Flatten the tree structure for virtualization
    const flattenCalls = (
      calls: TransactionAnalysis["call_data"],
      parentId?: string,
      depth = 0
    ): Array<TransactionAnalysis["call_data"][0] & { depth: number }> => {
      const childCalls = calls.filter((call) => call.parent_id === parentId);
      const result: Array<
        TransactionAnalysis["call_data"][0] & { depth: number }
      > = [];

      childCalls.forEach((call) => {
        result.push({ ...call, depth });
        result.push(...flattenCalls(calls, call.id, depth + 1));
      });

      return result;
    };

    const flatCalls = flattenCalls(calls);

    return (
      <VirtualizedChart
        data={flatCalls}
        renderChart={(data) => (
          <div className="space-y-2">
            {data.map((call) => (
              <div key={call.id} className="mb-2">
                <div
                  className="flex items-center gap-2 p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
                  style={{ marginLeft: `${call.depth * 20}px` }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={call.error ? "destructive" : "outline"}
                        className={
                          call.error
                            ? "bg-red-500/20 border-red-500/50 text-red-400"
                            : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                        }
                      >
                        {call.type}
                      </Badge>
                      <span className="text-sm font-mono text-[#8b9dc3]">
                        {shortenAddress(call.from)} → {shortenAddress(call.to)}
                      </span>
                      {call.error && (
                        <Badge className="text-xs bg-red-500/20 border-red-500/50 text-red-400">
                          ERROR: {call.error}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                      <span>Value: {call.value_eth.toFixed(6)} ETH</span>
                      <span>Gas: {formatGas(call.gasUsed)}</span>
                      <span>Contract: {call.contract}</span>
                      {call.input_preview && (
                        <span>Input: {call.input_preview}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        itemHeight={100}
        containerHeight={384}
        threshold={100}
        className="w-full"
      />
    );
  };

  const convertCallTraceToDagreNodes = (
    calls: TransactionAnalysis["call_data"]
  ) => {
    const buildTree = (
      calls: TransactionAnalysis["call_data"],
      parentId?: string,
      depth = 0
    ): any[] => {
      const childCalls = calls.filter((call) => call.parent_id === parentId);

      return childCalls.map((call) => ({
        id: call.id,
        name: call.contract || "Unknown Contract",
        contractAddress: call.to,
        contractName: call.contract || "Unknown Contract",
        functionName: call.type || "Unknown Function",
        gasUsed: call.gasUsed,
        value: call.value_eth,
        success: !call.error,
        depth: depth,
        type: call.type,
        error: call.error,
        children: buildTree(calls, call.id, depth + 1),
      }));
    };

    return buildTree(calls);
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
                Transaction Deep Dive
              </h1>
              <p className="text-[#8b9dc3] text-lg">
                Comprehensive transaction analysis using advanced debugging
                capabilities
              </p>
            </div>

            <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                  Transaction Analytics
                </h2>
                <div className="flex items-center gap-3">
                  <BookmarkManager
                    txHash={state.txHash}
                    network={selectedNetwork}
                    analysisConfig={{
                      trace_method: selectedTraceMethod,
                      analysis_depth: selectedAnalysisDepth,
                      rpc_url: rpcUrl,
                    }}
                    analysisResults={
                      state.callTrace || state.structLog
                        ? {
                            gas_used:
                              state.callTrace?.summary?.total_gas_used ||
                              state.structLog?.summary?.total_gas_used,
                            call_count: state.callTrace?.summary?.total_calls,
                            opcode_count: state.structLog?.summary?.total_steps,
                            success_rate:
                              state.callTrace?.summary?.success_rate,
                          }
                        : undefined
                    }
                    onLoadBookmark={(bookmark) => {
                      setInputTxHash(bookmark.query_config.tx_hash);
                      setSelectedNetwork(
                        bookmark.query_config.network as "mainnet" | "sepolia"
                      );
                      setSelectedTraceMethod(
                        bookmark.query_config.trace_method
                      );
                      setSelectedAnalysisDepth(
                        bookmark.query_config.analysis_depth
                      );
                      // Note: rpc_url is not stored in bookmarks for security reasons
                      // Users will need to re-enter custom RPC URLs if needed
                      window.history.pushState(
                        {},
                        "",
                        `/debug-trace/${bookmark.query_config.tx_hash}`
                      );
                      traceTransactionMutation.mutate(
                        bookmark.query_config.tx_hash
                      );
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
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff] focus:bg-[rgba(0,191,255,0.1)] focus:border-[#00bfff] focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:ring-opacity-50"
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
                        placeholder="Enter transaction hash (0x...)"
                        value={inputTxHash}
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
                    </div>
                    <Button
                      onClick={handleSearch}
                      disabled={traceTransactionMutation.isPending || isTracing}
                      className="flex items-center gap-2 bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                    >
                      {traceTransactionMutation.isPending || isTracing ? (
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
                          selectedNetwork === "mainnet" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setSelectedNetwork("mainnet");
                          if (!rpcUrl) {
                            setRpcUrl("");
                          }
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
                          if (!rpcUrl) {
                            setRpcUrl("");
                          }
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
                    title="Trace Method"
                    value={selectedTraceMethod}
                    onValueChange={(value) =>
                      setSelectedTraceMethod(
                        value as "both" | "callTracer" | "structLog"
                      )
                    }
                    placeholder="Both (callTracer + structLog)"
                    options={[
                      { value: "both", label: "Both (callTracer + structLog)" },
                      { value: "callTracer", label: "callTracer Only" },
                      { value: "structLog", label: "structLog Only" },
                    ]}
                  />

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
                </div>
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
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400/80"
                      >
                        Retry Connection
                      </Button>
                    </div>
                  </div>
                )}
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
                          placeholder="Enter custom RPC endpoint (optional)"
                          value={rpcUrl}
                          onChange={(e) => setRpcUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Timeout (seconds)
                        </label>
                        <Input
                          placeholder="30"
                          defaultValue="30"
                          type="number"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(traceTransactionMutation.isPending || isTracing) && (
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

            {!traceTransactionMutation.isPending &&
              !isTracing &&
              !state.callTrace &&
              !state.structLog && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Gas Analytics
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Gas usage charts will appear here after transaction
                        analysis
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Network className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Call Flow
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Network className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Interactive call flow diagram will be displayed here
                      </p>
                    </div>
                  </div>

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
                        Performance metrics and optimization suggestions
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {(state.error || traceTransactionMutation.error) && (
              <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {state.error || traceTransactionMutation.error?.message}
                  </span>
                </div>
              </div>
            )}

            {(state.callTrace || state.structLog) && (
              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative">
                <Tabs defaultValue="analytics" className="w-full relative">
                  <TabsList className="grid w-full grid-cols-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
                    <TabsTrigger
                      value="analytics"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Analytics
                    </TabsTrigger>
                    <TabsTrigger
                      value="call-trace"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Call Trace (callTracer)
                    </TabsTrigger>
                    <TabsTrigger
                      value="struct-log"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Opcode Analysis (structLog)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="call-trace" className="space-y-6 mt-6">
                    {state.callTrace ? (
                      <>
                        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                            Transaction Statistics
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-[#00bfff]">
                                {state.callTrace.transaction_stats.total_calls}
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Total Calls
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-[#00bfff]">
                                {
                                  state.callTrace.transaction_stats
                                    .max_call_depth
                                }
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Max Depth
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-[#00bfff]">
                                {formatGas(
                                  state.callTrace.transaction_stats.total_gas
                                )}
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Total Gas
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-red-400">
                                {state.callTrace.transaction_stats.errors}
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Errors
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                            Internal Call Tree
                            {state.callTrace.call_data.length > 0 && (
                              <span className="text-xs text-[#6b7280] ml-2">
                                (
                                {state.callTrace.call_data.length.toLocaleString()}{" "}
                                execution steps analyzed)
                              </span>
                            )}
                          </h3>
                          <InternalCallTree
                            data={state.callTrace.call_data}
                            height={600}
                            className="w-full"
                          />
                        </div>

                        {state.callTrace.logs_data.length > 0 && (
                          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                              Events & Logs
                              {state.callTrace.logs_data.length > 50 && (
                                <span className="text-xs text-[#6b7280] ml-2">
                                  (
                                  {state.callTrace.logs_data.length.toLocaleString()}{" "}
                                  events analyzed)
                                </span>
                              )}
                            </h3>
                            {state.callTrace.logs_data.length > 50 ? (
                              <VirtualizedChart
                                data={state.callTrace.logs_data}
                                renderChart={(data) => (
                                  <div className="space-y-3">
                                    {data.map((log, index) => (
                                      <div
                                        key={index}
                                        className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge
                                            variant="outline"
                                            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                                          >
                                            {log.event_name}
                                          </Badge>
                                          <span className="text-sm font-mono text-[#8b9dc3]">
                                            {shortenAddress(log.address)}
                                          </span>
                                          <span className="text-xs text-[#6b7280]">
                                            {log.contract}
                                          </span>
                                        </div>
                                        <div className="text-sm text-[#8b9dc3]">
                                          {log.details}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                itemHeight={80}
                                containerHeight={256}
                                threshold={50}
                                className="w-full"
                              />
                            ) : (
                              <div className="space-y-3 max-h-64 custom-scrollbar overflow-y-auto">
                                {state.callTrace.logs_data.map((log, index) => (
                                  <div
                                    key={index}
                                    className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge
                                        variant="outline"
                                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                                      >
                                        {log.event_name}
                                      </Badge>
                                      <span className="text-sm font-mono text-[#8b9dc3]">
                                        {shortenAddress(log.address)}
                                      </span>
                                      <span className="text-xs text-[#6b7280]">
                                        {log.contract}
                                      </span>
                                    </div>
                                    <div className="text-sm text-[#8b9dc3]">
                                      {log.details}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Call trace data not available. This might be due to
                            RPC limitations or the transaction not being found.
                          </span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="struct-log" className="space-y-6 mt-6">
                    {state.structLog ? (
                      <>
                        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                            Opcode Execution Summary
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-[#00bfff]">
                                {state.structLog.summary.total_steps.toLocaleString()}
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Total Steps
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-[#00bfff]">
                                {formatGas(
                                  state.structLog.summary.total_gas_cost
                                )}
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Gas Cost
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-[#00bfff]">
                                {state.structLog.summary.max_depth}
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Max Depth
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-[#00bfff]">
                                {state.structLog.summary.max_stack_depth}
                              </div>
                              <div className="text-sm text-[#8b9dc3] mt-1">
                                Max Stack
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                            Top Opcodes by Gas Usage
                            {state.structLog.top_opcodes.length > 50 && (
                              <span className="text-xs text-[#6b7280] ml-2">
                                (
                                {state.structLog.top_opcodes.length.toLocaleString()}{" "}
                                opcodes analyzed)
                              </span>
                            )}
                          </h3>
                          {state.structLog.top_opcodes.length > 50 ? (
                            <VirtualizedChart
                              data={state.structLog.top_opcodes}
                              renderChart={(data) => (
                                <div className="space-y-3">
                                  {data.map((opcode, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Badge
                                          variant="outline"
                                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                                        >
                                          {opcode.opcode}
                                        </Badge>
                                        <span className="text-sm text-[#8b9dc3]">
                                          Count: {opcode.count}
                                        </span>
                                      </div>
                                      <span className="text-sm font-mono text-[#00bfff]">
                                        {formatGas(opcode.gas_used)} gas
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              itemHeight={60}
                              containerHeight={256}
                              threshold={50}
                              className="w-full"
                            />
                          ) : (
                            <div className="space-y-3 max-h-64 custom-scrollbar overflow-y-auto">
                              {state.structLog.top_opcodes
                                .slice(0, 10)
                                .map((opcode, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Badge
                                        variant="outline"
                                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                                      >
                                        {opcode.opcode}
                                      </Badge>
                                      <span className="text-sm text-[#8b9dc3]">
                                        Count: {opcode.count}
                                      </span>
                                    </div>
                                    <span className="text-sm font-mono text-[#00bfff]">
                                      {formatGas(opcode.gas_used)} gas
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                            Gas Usage by Category
                          </h3>
                          <div className="space-y-3">
                            {state.structLog.opcode_categories.map(
                              (category, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)] transition-colors"
                                >
                                  <span className="capitalize font-medium text-[#8b9dc3]">
                                    {category.category}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-[#6b7280]">
                                      {category.percentage.toFixed(1)}%
                                    </span>
                                    <span className="text-sm font-mono text-[#00bfff]">
                                      {formatGas(category.gas_used)} gas
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Struct log data not available. This requires a
                            debug-enabled RPC endpoint.
                          </span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-6 mt-6">
                    <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
                      <Tabs
                        value={currentAnalyticsTab}
                        onValueChange={handleAnalyticsTabChange}
                      >
                        <TabsList className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)]">
                          <TabsTrigger
                            value="unified-analytics"
                            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                          >
                            Unified Analytics
                          </TabsTrigger>
                          <TabsTrigger
                            value="opcode-analytics"
                            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                          >
                            Opcode Analytics
                          </TabsTrigger>
                          <TabsTrigger
                            value="contract-analytics"
                            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                          >
                            Contract Analytics
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="unified-analytics" className="mt-4">
                          <UnifiedGasAnalytics
                            structLog={state.structLog}
                            callTrace={state.callTrace}
                            loading={state.loading}
                          />
                        </TabsContent>

                        <TabsContent value="opcode-analytics" className="mt-4">
                          {analyticsTabLoading["opcode-analytics"] ? (
                            <OpcodeAnalyticsLoader />
                          ) : opcodeAnalyticsData ? (
                            <>
                              {opcodeAnalyticsData.isLargeDataset && (
                                <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-3 mb-4">
                                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>
                                      Large dataset detected (
                                      {opcodeAnalyticsData.structLog.summary.total_steps.toLocaleString()}{" "}
                                      steps). Performance optimizations are
                                      active.
                                    </span>
                                  </div>
                                </div>
                              )}

                              <StructLogAnalytics
                                structLog={opcodeAnalyticsData.structLog}
                                loading={state.loading}
                              />
                            </>
                          ) : (
                            <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
                              <div className="flex items-center gap-2 text-yellow-400">
                                <AlertCircle className="h-4 w-4" />
                                <span>
                                  Opcode Analytics require StructLog data.
                                  Please ensure debug_traceTransaction with
                                  structLog tracer is available.
                                </span>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent
                          value="contract-analytics"
                          className="mt-4"
                        >
                          {state.callTrace ? (
                            <TransactionTracerAnalytics
                              callTrace={state.callTrace}
                              loading={state.loading}
                            />
                          ) : (
                            <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
                              <div className="flex items-center gap-2 text-yellow-400">
                                <AlertCircle className="h-4 w-4" />
                                <span>
                                  Contract Analytics require CallTrace data.
                                  Please ensure debug_traceTransaction with
                                  callTracer is available.
                                </span>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
