import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input, Badge } from "@/components/global";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Loader2,
  Network,
  Search,
  Settings,
  Shield,
  GitCompare,
  Eye,
} from "lucide-react";
import { Dropdown } from "@/components/global/Dropdown";
import { ProtectedRoute } from "@/components/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Statusbar from "@/components/status/Statusbar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  useDataPersistence,
  useTraceTransactionAnalysis,
} from "@/hooks/tracetransaction";

import {
  AdvancedFilters,
  AdvancedMevAnalysis,
  FilteredTraceTable,
  TraceAnalysisResults,
  TransactionReplay,
  BookmarkManager,
  ComparativeAnalysis,
} from "@/components/tracetransaction";
import type {
  AnalysisOptions,
  ExportFormat,
  ProcessedTraceAction,
} from "@/lib/tracetransaction/types";
import type { TraceTransactionBookmark } from "@/lib/tracetransaction/bookmarks";

function TraceTransactionContent() {
  const { txHash: urlTxHash } = useParams<{ txHash: string }>();
  const [inputTxHash, setInputTxHash] = useState(urlTxHash || "");
  const [selectedNetwork, setSelectedNetwork] = useState<"mainnet" | "sepolia">(
    "mainnet"
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>({
    includePatternDetection: true,
    includeMevAnalysis: true,
    includeSecurityAnalysis: true,
    includeVisualization: true,
    analysisDepth: "full",
  });

  const [filteredTraces, setFilteredTraces] = useState<ProcessedTraceAction[]>(
    []
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    results,
    isAnalyzing,
    error,
    analyzeTransaction,
    clearError,
    validateTxHash,
  } = useTraceTransactionAnalysis();

  const { saveAnalysis } = useDataPersistence();

  // Generate analysis results summary for bookmarking
  const analysisResultsSummary = results
    ? {
        total_actions: results.summary.totalActions,
        total_gas_used: results.summary.totalGasUsed,
        pyusd_interactions: results.summary.pyusdInteractions,
        pattern_detected: results.patternAnalysis.pattern,
        mev_detected: results.mevAnalysis.mevDetected,
        security_risk: results.securityAssessment.overallRisk,
        complexity_score: results.summary.complexityScore,
      }
    : undefined;

  useEffect(() => {
    if (urlTxHash && !results && !isAnalyzing) {
      const validation = validateTxHash(urlTxHash);
      if (validation.isValid) {
        analyzeTransaction(urlTxHash, analysisOptions);
      } else {
        setValidationError(validation.error || "Invalid transaction hash");
      }
    }
  }, [
    urlTxHash,
    results,
    isAnalyzing,
    analyzeTransaction,
    validateTxHash,
    analysisOptions,
  ]);

  useEffect(() => {
    if (results && !isAnalyzing) {
      try {
        saveAnalysis(results);
      } catch (error) {
        console.error("Failed to save analysis to history:", error);
      }
    }
  }, [results, isAnalyzing, saveAnalysis]);

  const handleInputChange = (value: string) => {
    setInputTxHash(value);
    if (validationError) {
      setValidationError(null);
    }
    if (error) {
      clearError();
    }
  };

  const handleAnalyze = async () => {
    const trimmedHash = inputTxHash.trim();
    const validation = validateTxHash(trimmedHash);

    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid transaction hash");
      return;
    }

    setValidationError(null);

    window.history.pushState({}, "", `/trace-transaction/${trimmedHash}`);

    try {
      await analyzeTransaction(trimmedHash, analysisOptions);
    } catch (err) {
      console.error("Analysis failed:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAnalyze();
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!results) return;

    let dataStr: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      dataStr = JSON.stringify(results, null, 2);
      filename = `trace-analysis-${results.transactionHash.slice(0, 10)}.json`;
      mimeType = "application/json";
    } else if (format === "csv") {
      const csvRows = [
        ["Field", "Value"],
        ["Transaction Hash", results.transactionHash],
        ["Total Actions", results.summary.totalActions.toString()],
        ["Total Gas Used", results.summary.totalGasUsed.toString()],
        ["PYUSD Interactions", results.summary.pyusdInteractions.toString()],
        ["Pattern", results.patternAnalysis.pattern],
        [
          "Pattern Confidence",
          (results.patternAnalysis.confidence * 100).toFixed(2) + "%",
        ],
        ["Security Risk", results.securityAssessment.overallRisk],
        ["MEV Detected", results.mevAnalysis.mevDetected ? "Yes" : "No"],
      ];
      dataStr = csvRows.map((row) => row.join(",")).join("\n");
      filename = `trace-analysis-${results.transactionHash.slice(0, 10)}.csv`;
      mimeType = "text/csv";
    } else {
      return;
    }

    const dataBlob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
      <header className="fixed top-0 left-0 z-20 w-full border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-40 pb-16 px-6">
        <div className="container mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-[#00bfff] tracking-wide">
              Trace Transaction Analyzer
            </h1>
            <p className="text-[#8b9dc3] text-lg">
              Advanced transaction analysis using trace_transaction with pattern
              detection, MEV analysis, and security assessment
            </p>
          </div>

          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                Transaction Analysis
              </h2>
              <div className="flex items-center gap-3">
                <BookmarkManager
                  txHash={inputTxHash}
                  network={selectedNetwork}
                  onLoadBookmark={(bookmark: TraceTransactionBookmark) => {
                    setInputTxHash(bookmark.query_config.tx_hash);
                    setSelectedNetwork(
                      bookmark.query_config.network as "mainnet" | "sepolia"
                    );
                    window.history.pushState(
                      {},
                      "",
                      `/trace-transaction/${bookmark.query_config.tx_hash}`
                    );
                    analyzeTransaction(
                      bookmark.query_config.tx_hash,
                      analysisOptions // Use current analysis options
                    );
                  }}
                  onSignUpClick={() => {
                    window.location.href = "/signin";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
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
                      placeholder="Enter transaction hash (0x...)"
                      value={inputTxHash}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={`w-full font-mono ${
                        validationError
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                    />
                    {validationError && (
                      <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationError}</span>
                      </div>
                    )}
                    {error && (
                      <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error.message}</span>
                        {error.retryAction && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={error.retryAction}
                            className="ml-2 text-xs"
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                  >
                    {isAnalyzing ? (
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

                <Dropdown
                  title="Analysis Depth"
                  value={analysisOptions.analysisDepth}
                  onValueChange={(value) =>
                    setAnalysisOptions((prev) => ({
                      ...prev,
                      analysisDepth: value as "full" | "summary" | "custom",
                    }))
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
                    Features
                  </label>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={
                        analysisOptions.includePatternDetection
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer text-xs ${
                        analysisOptions.includePatternDetection
                          ? "bg-[#00bfff] text-[#0f1419]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }`}
                      onClick={() =>
                        setAnalysisOptions((prev) => ({
                          ...prev,
                          includePatternDetection:
                            !prev.includePatternDetection,
                        }))
                      }
                    >
                      Patterns
                    </Badge>
                    <Badge
                      variant={
                        analysisOptions.includeMevAnalysis
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer text-xs ${
                        analysisOptions.includeMevAnalysis
                          ? "bg-[#00bfff] text-[#0f1419]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }`}
                      onClick={() =>
                        setAnalysisOptions((prev) => ({
                          ...prev,
                          includeMevAnalysis: !prev.includeMevAnalysis,
                        }))
                      }
                    >
                      MEV
                    </Badge>
                    <Badge
                      variant={
                        analysisOptions.includeSecurityAnalysis
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer text-xs ${
                        analysisOptions.includeSecurityAnalysis
                          ? "bg-[#00bfff] text-[#0f1419]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }`}
                      onClick={() =>
                        setAnalysisOptions((prev) => ({
                          ...prev,
                          includeSecurityAnalysis:
                            !prev.includeSecurityAnalysis,
                        }))
                      }
                    >
                      Security
                    </Badge>
                    <Badge
                      variant={
                        analysisOptions.includeVisualization
                          ? "default"
                          : "outline"
                      }
                      className={`cursor-pointer text-xs ${
                        analysisOptions.includeVisualization
                          ? "bg-[#00bfff] text-[#0f1419]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }`}
                      onClick={() =>
                        setAnalysisOptions((prev) => ({
                          ...prev,
                          includeVisualization: !prev.includeVisualization,
                        }))
                      }
                    >
                      Charts
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isAnalyzing && (
            <div className="bg-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.3)] rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#00bfff]" />
                <div>
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Analyzing Transaction
                  </h3>
                  <p className="text-[#8b9dc3]">
                    Processing trace data and generating insights...
                  </p>
                </div>
              </div>
            </div>
          )}

          {!results && !isAnalyzing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Pattern Detection
                  </h3>
                </div>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-[#00bfff]" />
                  </div>
                  <p className="text-[#8b9dc3] text-sm">
                    Identify transaction patterns, MEV activities, and
                    complexity metrics
                  </p>
                </div>
              </div>

              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Security Analysis
                  </h3>
                </div>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                    <Shield className="h-8 w-8 text-[#00bfff]" />
                  </div>
                  <p className="text-[#8b9dc3] text-sm">
                    Detect security risks, high-risk operations, and approval
                    patterns
                  </p>
                </div>
              </div>

              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Visualization
                  </h3>
                </div>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                    <Network className="h-8 w-8 text-[#00bfff]" />
                  </div>
                  <p className="text-[#8b9dc3] text-sm">
                    Interactive charts showing contract interactions and token
                    flows
                  </p>
                </div>
              </div>
            </div>
          )}

          {results && !isAnalyzing && (
            <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <Tabs defaultValue="analytics" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
                  <TabsTrigger
                    value="analytics"
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="compare"
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Compare Transaction
                  </TabsTrigger>
                  <TabsTrigger
                    value="replay"
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Replay Transaction
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="space-y-6 mt-6">
                  <TraceAnalysisResults
                    results={results}
                    onExport={handleExport}
                  />

                  {/* Always visible MEV Analysis */}
                  <AdvancedMevAnalysis traceAnalysis={results} />

                  {results.processedActions.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                          Detailed Trace Analysis
                        </h3>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setShowAdvancedFilters(!showAdvancedFilters)
                          }
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        >
                          {showAdvancedFilters ? "Hide" : "Show"} Advanced
                          Filters
                        </Button>
                      </div>

                      {showAdvancedFilters && (
                        <AdvancedFilters
                          traces={results.processedActions}
                          onFilteredResults={setFilteredTraces}
                        />
                      )}

                      <FilteredTraceTable
                        traces={
                          showAdvancedFilters
                            ? filteredTraces
                            : results.processedActions
                        }
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="compare" className="space-y-6 mt-6">
                  <ComparativeAnalysis
                    primaryTransaction={results}
                    className="w-full"
                  />
                </TabsContent>

                <TabsContent value="replay" className="space-y-6 mt-6">
                  {results.processedActions.length > 0 ? (
                    <TransactionReplay traces={results.processedActions} />
                  ) : (
                    <div className="text-center py-8 text-[#8b9dc3]">
                      <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No trace data available for replay</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function TraceTransaction() {
  return (
    <ProtectedRoute>
      <TraceTransactionContent />
    </ProtectedRoute>
  );
}
