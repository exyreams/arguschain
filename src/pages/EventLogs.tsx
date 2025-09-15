import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Loader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/global";
import { useAuth, useSession } from "@/lib/auth";
import { toast } from "@/hooks/global/useToast";
import { useAnonymousLimits } from "@/hooks/auth";
import InContextSignUp from "@/components/auth/InContextSignUp";
import { AuthPrompt } from "@/components/auth";

// Core components - loaded immediately
import {
  QueryControls,
  StatisticsPanel,
  ErrorMessage,
  useEnhancedErrorHandling,
} from "@/components/eventlogs";
import { AdvancedAnalytics } from "@/components/eventlogs/AdvancedAnalytics";

import { useLogsAnalysis } from "@/hooks/eventlogs";
import ProgressiveLoader from "@/components/debugtrace/ProgressiveLoader";
import useProgressiveLoading from "@/hooks/debugtrace/useProgressiveLoading";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Statusbar from "@/components/status/Statusbar";
import type { LogsQueryConfig } from "@/lib/eventlogs";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle,
  Network,
  Users,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";

// Lazy loaded components - loaded only when needed
const ParticipantTables = lazy(() =>
  import("@/components/eventlogs/ParticipantTables").then((module) => ({
    default: module.ParticipantTables,
  }))
);

const VirtualizedParticipantTable = lazy(() =>
  import("@/components/eventlogs/VirtualizedParticipantTable").then(
    (module) => ({
      default: module.VirtualizedParticipantTable,
    })
  )
);

const MultiChartDashboard = lazy(() =>
  import("@/components/eventlogs/charts/MultiChartDashboard").then(
    (module) => ({
      default: module.MultiChartDashboard,
    })
  )
);

const ExportButton = lazy(() =>
  import("@/components/eventlogs/ExportButton").then((module) => ({
    default: module.ExportButton,
  }))
);

// PatternRecognition removed - functionality moved to AdvancedAnalytics

// Error boundaries - lazy loaded
const AnalyticsErrorBoundary = lazy(() =>
  import("@/components/eventlogs/ErrorBoundary").then((module) => ({
    default: module.AnalyticsErrorBoundary,
  }))
);

const ChartErrorBoundary = lazy(() =>
  import("@/components/eventlogs/ErrorBoundary").then((module) => ({
    default: module.ChartErrorBoundary,
  }))
);

const GracefulDegradation = lazy(() =>
  import("@/components/eventlogs/ErrorBoundary").then((module) => ({
    default: module.GracefulDegradation,
  }))
);

const TableErrorBoundary = lazy(() =>
  import("@/components/eventlogs/ErrorBoundary").then((module) => ({
    default: module.TableErrorBoundary,
  }))
);

// Component loading fallback
const ComponentLoader = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center gap-3">
      <Loader className="h-5 w-5" />
      <span className="text-sm text-[#8b9dc3]">Loading {name}...</span>
    </div>
  </div>
);

// Preload critical components when user starts interacting
const preloadCriticalComponents = () => {
  // Preload most commonly used components
  import("@/components/eventlogs/charts/MultiChartDashboard");
  import("@/components/eventlogs/ParticipantTables");
  import("@/components/eventlogs/StatisticsPanel");
  import("@/components/eventlogs/ErrorBoundary");
};

// Preload heavy analytics components when data is available
const preloadAnalyticsComponents = () => {
  // PatternRecognition functionality moved to AdvancedAnalytics
};

interface LogsAnalyzerProps {
  className?: string;
}

interface TabConfig {
  id: string;
  label: string;
  description: string;
  component: React.ComponentType<any>;
  badge?: string | number;
  disabled?: boolean;
}

function LogsAnalyzerContent({ className = "" }: LogsAnalyzerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "analytics"
  );
  const [queryParams, setQueryParams] = useState<LogsQueryConfig>({
    contract_address: searchParams.get("contract") || "",
    from_block: searchParams.get("fromBlock") || "",
    to_block: searchParams.get("toBlock") || "",
    network: (searchParams.get("network") as any) || "mainnet",
  });

  // Animation and UI state
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // Auth
  const { session, loading: authLoading } = useSession();

  // Anonymous user limitations
  const {
    isAnonymous,
    limitStatus,
    canMakeQuery,
    incrementQuery,
    upgradeSession,
    showLimitWarning,
    showUpgradeBenefits,
  } = useAnonymousLimits();

  const isAuthenticated = !!session?.user && !isAnonymous;

  const hasUrlParams = Boolean(
    searchParams.get("fromBlock") &&
      searchParams.get("toBlock") &&
      searchParams.get("contract")
  );

  const [hasInitiatedQuery, setHasInitiatedQuery] = useState(hasUrlParams);

  const shouldEnableQuery = Boolean(
    queryParams.from_block &&
      queryParams.to_block &&
      queryParams.contract_address &&
      hasInitiatedQuery
  );

  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useLogsAnalysis(queryParams, shouldEnableQuery);

  const results = logsData;

  // Optimized toast notifications - reduced frequency and improved UX
  useEffect(() => {
    if (error && hasInitiatedQuery) {
      toast.error("Analysis Failed", {
        description:
          error.message || "Please check your query parameters and try again.",
        duration: 6000,
      });
    }
  }, [error, hasInitiatedQuery]);

  useEffect(() => {
    if (results && !isLoading && hasInitiatedQuery) {
      const transferCount = results.transfers?.length || 0;
      if (transferCount > 0) {
        toast.success("Analysis Complete", {
          description: `Found ${transferCount} transfers`,
          duration: 3000,
        });
      }
    }
  }, [results, isLoading, hasInitiatedQuery]);

  // Bookmark functionality
  const handleLoadBookmark = (bookmark: any) => {
    setQueryParams(bookmark.query_config);
    setHasInitiatedQuery(true);
  };

  const { addError } = useEnhancedErrorHandling();

  // Progressive loading setup
  const initialSteps = [
    {
      id: "validate",
      name: "Validate Query",
      description: "Checking query format and network connectivity",
    },
    {
      id: "fetch",
      name: "Fetch Event Logs",
      description: "Retrieving event logs from blockchain",
    },
    {
      id: "parse",
      name: "Parse Transfers",
      description: "Processing and parsing transfer data",
    },
    {
      id: "analyze",
      name: "Process Analytics",
      description: "Computing statistics and network analysis",
    },
    {
      id: "finalize",
      name: "Finalize Results",
      description: "Preparing data for visualization",
    },
  ];

  const {
    steps: loadingSteps,
    startStep,
    updateProgress,
    completeStep,
    errorStep,
    resetSteps,
  } = useProgressiveLoading(initialSteps);

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", activeTab);
    setSearchParams(newParams, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (queryParams.contract_address)
      newParams.set("contract", queryParams.contract_address);
    if (queryParams.from_block)
      newParams.set("fromBlock", queryParams.from_block.toString());
    if (queryParams.to_block)
      newParams.set("toBlock", queryParams.to_block.toString());
    if (queryParams.network) newParams.set("network", queryParams.network);
    newParams.set("tab", activeTab);
    setSearchParams(newParams, { replace: true });
  }, [queryParams, activeTab, setSearchParams]);

  // Safe progressive loading simulation
  useEffect(() => {
    if (!isLoading) {
      resetSteps();
      return;
    }

    // Sequential step processing without infinite loops
    const stepIds = ["validate", "fetch", "parse", "analyze", "finalize"];
    let currentIndex = 0;
    let timeouts: NodeJS.Timeout[] = [];

    const processStep = (stepId: string, index: number) => {
      // Start the step
      startStep(stepId);

      // Simulate progress updates
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress < 100) {
          updateProgress(stepId, Math.min(progress, 95));
        } else {
          clearInterval(progressInterval);
          // Complete the step
          completeStep(stepId, Math.floor(Math.random() * 500 + 200));

          // Move to next step
          if (index < stepIds.length - 1) {
            const nextTimeout = setTimeout(() => {
              processStep(stepIds[index + 1], index + 1);
            }, 300);
            timeouts.push(nextTimeout);
          }
        }
      }, 400);

      timeouts.push(progressInterval as any);
    };

    // Start first step after a delay
    const initialTimeout = setTimeout(() => {
      processStep(stepIds[0], 0);
    }, 500);
    timeouts.push(initialTimeout);

    // Cleanup function
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [isLoading]);

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: "analytics",
        label: "Analytics",
        description:
          "Complete analytics dashboard with metrics, charts, and insights",
        component: ({ transfers, results }: any) => (
          <Suspense fallback={<ComponentLoader name="Analytics Dashboard" />}>
            <AnalyticsErrorBoundary>
              <div className="space-y-6">
                {/* Overview Metrics Section */}
                <div>
                  <Suspense fallback={<ComponentLoader name="Statistics" />}>
                    <GracefulDegradation
                      condition={!!results}
                      errorMessage="Statistics data is not available"
                      fallback={
                        <div className="bg-[rgba(25,28,40,0.8)] border border-yellow-500/30 rounded-lg p-6 text-center">
                          <AlertCircle className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                          <div className="text-sm text-[#8b9dc3]">
                            No statistics available. Please run an analysis
                            first.
                          </div>
                        </div>
                      }
                    >
                      <StatisticsPanel results={results} />
                    </GracefulDegradation>
                  </Suspense>
                </div>

                {/* Analysis Complete Summary */}
                {transfers.length > 0 && (
                  <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Analysis Complete
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-[#00bfff]">
                          {transfers.length.toLocaleString()}
                        </div>
                        <div className="text-sm text-[#8b9dc3]">
                          Transfers Analyzed
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#00bfff]">
                          {results.statistics.blocks_analyzed}
                        </div>
                        <div className="text-sm text-[#8b9dc3]">
                          Blocks Scanned
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#00bfff]">
                          {results.statistics.unique_senders +
                            results.statistics.unique_receivers}
                        </div>
                        <div className="text-sm text-[#8b9dc3]">
                          Unique Addresses
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#00bfff]">
                          {results.network_analysis.hub_addresses.length}
                        </div>
                        <div className="text-sm text-[#8b9dc3]">
                          Hub Addresses
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Analytics Section */}
                <div>
                  <Suspense
                    fallback={<ComponentLoader name="Advanced Analytics" />}
                  >
                    <AnalyticsErrorBoundary>
                      <GracefulDegradation
                        condition={transfers?.length > 0 && !!results}
                        errorMessage="No data available for advanced analytics"
                        fallback={
                          <div className="bg-[rgba(25,28,40,0.8)] border border-yellow-500/30 rounded-lg p-6 text-center">
                            <Brain className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                              No Analytics Data
                            </h3>
                            <p className="text-sm text-[#8b9dc3]">
                              Advanced analytics will appear here after
                              analyzing transfer data
                            </p>
                          </div>
                        }
                      >
                        <AdvancedAnalytics
                          transfers={transfers}
                          results={results}
                        />
                      </GracefulDegradation>
                    </AnalyticsErrorBoundary>
                  </Suspense>
                </div>

                {/* Advanced Analytics Section */}
                <Suspense
                  fallback={<ComponentLoader name="Advanced Analytics" />}
                >
                  <GracefulDegradation
                    condition={!!results?.statistics}
                    errorMessage="Advanced analytics data is not available"
                    fallback={
                      <div className="bg-[rgba(25,28,40,0.8)] border border-yellow-500/30 rounded-lg p-6 text-center">
                        <Brain className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                          No Advanced Analytics Data
                        </h3>
                        <p className="text-sm text-[#8b9dc3]">
                          Advanced analytics will appear here after processing
                          transfer data
                        </p>
                      </div>
                    }
                  >
                    <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-semibold text-[#00bfff]">
                          Advanced Analytics
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-[#8b9dc3] mb-3">
                            Network Metrics
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6b7280]">
                                Network Density
                              </span>
                              <span className="text-sm text-[#00bfff]">
                                {(
                                  (results.statistics.total_transfers /
                                    ((results.statistics.unique_senders +
                                      results.statistics.unique_receivers) *
                                      (results.statistics.unique_senders +
                                        results.statistics.unique_receivers -
                                        1))) *
                                  100
                                ).toFixed(3)}
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6b7280]">
                                Hub Ratio
                              </span>
                              <span className="text-sm text-[#00bfff]">
                                {(
                                  (results.network_analysis.hub_addresses
                                    .length /
                                    (results.statistics.unique_senders +
                                      results.statistics.unique_receivers)) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6b7280]">
                                Bidirectional Addresses
                              </span>
                              <span className="text-sm text-[#00bfff]">
                                {
                                  results.network_analysis
                                    .bidirectional_addresses
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-[#8b9dc3] mb-3">
                            Volume Analysis
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6b7280]">
                                Coefficient of Variation
                              </span>
                              <span className="text-sm text-[#00bfff]">
                                {(
                                  (Math.sqrt(
                                    results.statistics.max_transfer -
                                      results.statistics.min_transfer
                                  ) /
                                    results.statistics.avg_transfer) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6b7280]">
                                Volume Skewness
                              </span>
                              <span className="text-sm text-[#00bfff]">
                                {(
                                  (results.statistics.avg_transfer -
                                    results.statistics.median_transfer) /
                                  results.statistics.median_transfer
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6b7280]">
                                Range Ratio
                              </span>
                              <span className="text-sm text-[#00bfff]">
                                {results.statistics.min_transfer > 0
                                  ? (
                                      results.statistics.max_transfer /
                                      results.statistics.min_transfer
                                    ).toFixed(0)
                                  : "∞"}
                                :1
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GracefulDegradation>
                </Suspense>
              </div>
            </AnalyticsErrorBoundary>
          </Suspense>
        ),
        badge: results ? "✓" : undefined,
      },
      {
        id: "participants",
        label: "Participants",
        description: "Advanced participant analysis with behavioral insights",
        component: ({ transfers, results }: any) => {
          const shouldUseVirtualization =
            results?.transfers?.length > 100 || false;

          return (
            <Suspense fallback={<ComponentLoader name="Participant Tables" />}>
              <TableErrorBoundary>
                <div>
                  <Suspense
                    fallback={<ComponentLoader name="Table Components" />}
                  >
                    <GracefulDegradation
                      condition={
                        results?.top_senders?.length > 0 ||
                        results?.top_receivers?.length > 0
                      }
                      errorMessage="No participant data available"
                      fallback={
                        <div className="bg-[rgba(25,28,40,0.8)] border border-yellow-500/30 rounded-lg p-6 text-center">
                          <Users className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                            No Participant Data
                          </h3>
                          <p className="text-sm text-[#8b9dc3]">
                            Participant tables will appear here after analyzing
                            transfers
                          </p>
                        </div>
                      }
                    >
                      {shouldUseVirtualization ? (
                        <div className="space-y-6">
                          <VirtualizedParticipantTable
                            participants={results.top_senders}
                            title="Top Senders"
                            type="senders"
                            virtualizationThreshold={100}
                          />
                          <VirtualizedParticipantTable
                            participants={results.top_receivers}
                            title="Top Receivers"
                            type="receivers"
                            virtualizationThreshold={100}
                          />
                        </div>
                      ) : (
                        <ParticipantTables
                          topSenders={results.top_senders}
                          topReceivers={results.top_receivers}
                          transfers={transfers}
                        />
                      )}
                    </GracefulDegradation>
                  </Suspense>
                </div>
              </TableErrorBoundary>
            </Suspense>
          );
        },
        badge: results
          ? results.top_senders.length + results.top_receivers.length
          : undefined,
        disabled: !results,
      },

      {
        id: "charts",
        label: "Charts",
        description: "Interactive charts and visualizations",
        component: ({ transfers, results }: any) => (
          <Suspense fallback={<ComponentLoader name="Charts Dashboard" />}>
            <ChartErrorBoundary>
              <GracefulDegradation
                condition={transfers?.length > 0}
                errorMessage="No transfer data available for chart visualization"
                fallback={
                  <div className="bg-[rgba(25,28,40,0.8)] border border-yellow-500/30 rounded-lg p-6 text-center">
                    <BarChart3 className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                      No Chart Data
                    </h3>
                    <p className="text-sm text-[#8b9dc3]">
                      Charts will appear here after analyzing transfer data
                    </p>
                  </div>
                }
              >
                <MultiChartDashboard transfers={transfers} results={results} />
              </GracefulDegradation>
            </ChartErrorBoundary>
          </Suspense>
        ),
        badge: results ? "📊" : undefined,
        disabled: !results,
      },
    ],
    [logsData, results]
  );

  const handleQuery = async (params: LogsQueryConfig) => {
    // Check if anonymous user can make query
    if (isAnonymous && !canMakeQuery) {
      showLimitWarning(() => setShowSignUpModal(true));
      return;
    }

    setQueryParams(params);
    setHasInitiatedQuery(true);

    // Increment query count for anonymous users
    if (isAnonymous) {
      try {
        await incrementQuery.mutateAsync({
          queryType: "eventlogs",
          queryParams: params,
        });

        // Show warning if approaching limit
        showLimitWarning();
      } catch (error) {
        console.error("Failed to increment query count:", error);
      }
    }

    // Preload critical components when user starts analysis
    preloadCriticalComponents();
  };

  // Preload analytics components when results are available
  useEffect(() => {
    if (results && results.raw_logs?.length > 0) {
      preloadAnalyticsComponents();
    }
  }, [results]);

  // Preload components on user interaction (hover over tabs)
  const handleTabHover = (tabId: string) => {
    switch (tabId) {
      case "charts":
        import("@/components/eventlogs/charts/MultiChartDashboard");
        break;
      // patterns tab removed
      case "participants":
        import("@/components/eventlogs/ParticipantTables");
        import("@/components/eventlogs/VirtualizedParticipantTable");
        break;
      case "export":
        import("@/components/eventlogs/ExportButton");
        break;
    }
  };

  return (
    <div className={`min-h-screen bg-[#0f1419] flex flex-col ${className}`}>
      <header className="fixed top-0 left-0 w-full z-50 border-b border-[rgba(0,191,255,0.2)] bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-[120px] pb-16">
        {/* Page Header */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-[#00bfff] mb-4">
              Event Logs Analyzer
            </h1>
            <p className="text-lg text-[#8b9dc3] max-w-2xl mx-auto">
              Analyze and debug blockchain event logs with unparalleled depth
              and clarity.
            </p>
          </div>
        </div>

        {/* Query Configuration */}
        <div className="max-w-7xl mx-auto px-4 mb-8">
          {/* Query Limit Warning for Anonymous Users */}
          {isAnonymous && limitStatus?.isExceeded && (
            <div className="mb-4 p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-semibold text-red-400">
                  Query Limit Reached
                </h3>
              </div>
              <p className="text-[#8b9dc3] mb-3">
                You've used all {limitStatus.limit} of your free queries. Sign
                in to continue analyzing event logs with unlimited access.
              </p>
              <Button
                onClick={() => setShowSignUpModal(true)}
                className="bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
              >
                Sign In for Unlimited Access
              </Button>
            </div>
          )}

          <QueryControls
            onAnalyze={handleQuery}
            loading={isLoading}
            networks={[
              { value: "mainnet", label: "Ethereum Mainnet" },
              { value: "sepolia", label: "Sepolia Testnet" },
            ]}
            currentNetwork={queryParams.network}
            onNetworkChange={(network) =>
              setQueryParams((prev) => ({ ...prev, network }))
            }
            queryParams={queryParams}
            analysisResults={
              results
                ? {
                    total_transfers: results.statistics.total_transfers,
                    total_volume: results.statistics.total_volume,
                    unique_senders: results.statistics.unique_senders,
                    unique_receivers: results.statistics.unique_receivers,
                  }
                : undefined
            }
            onLoadBookmark={handleLoadBookmark}
            onSignUpClick={() => setShowSignUpModal(true)}
          />

          {isAnonymous && (
            <div className="mt-4 p-4 bg-gradient-to-r from-[rgba(255,193,7,0.05)] to-[rgba(0,191,255,0.05)] border border-[rgba(255,193,7,0.2)] rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[rgba(255,193,7,0.1)] rounded-full">
                  <Lock className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="text-yellow-400 font-semibold mb-2">
                    Free Trial - Limited Access
                  </div>
                  <div className="text-[#8b9dc3] space-y-1 mb-3">
                    <div>
                      ✓ {limitStatus?.limit || 5} free blockchain analyses per
                      session
                    </div>
                    <div>✗ Cannot save bookmarks or query history</div>
                    <div>✗ Limited export options</div>
                    <div>✗ No access to advanced analytics features</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-yellow-400 font-medium">
                        {limitStatus
                          ? `${limitStatus.remainingQueries} analyses remaining`
                          : "Loading..."}
                      </span>
                      <div className="w-32 h-2 bg-[rgba(255,193,7,0.2)] rounded-full mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-[#00bfff] rounded-full transition-all duration-300"
                          style={{
                            width: limitStatus
                              ? `${(limitStatus.remainingQueries / limitStatus.limit) * 100}%`
                              : "100%",
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          showUpgradeBenefits(() => setShowSignUpModal(true))
                        }
                        variant="outline"
                        size="sm"
                        className="border-[rgba(255,193,7,0.3)] text-yellow-400 hover:bg-[rgba(255,193,7,0.1)]"
                      >
                        See Benefits
                      </Button>
                      <Button
                        onClick={() => setShowSignUpModal(true)}
                        size="sm"
                        className="bg-gradient-to-r from-[#00bfff] to-[#0099cc] text-[#0f1419] hover:from-[#0099cc] hover:to-[#007acc] font-medium"
                      >
                        Sign In for Full Access
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="max-w-7xl mx-auto px-4 mb-8">
            <ProgressiveLoader
              steps={loadingSteps}
              onStepComplete={(stepId) => {
                console.log(`Step completed: ${stepId}`);
              }}
              onAllComplete={() => {
                console.log("All steps completed");
              }}
            />
          </div>
        )}

        {error && (
          <div className="max-w-7xl mx-auto px-4 mb-8">
            <ErrorMessage
              error={error}
              context="query"
              onRetry={() => refetch()}
              onReset={() => {
                setQueryParams({
                  contract_address: "",
                  from_block: "",
                  to_block: "",
                  network: "mainnet",
                });
              }}
            />
          </div>
        )}

        {/* Analysis Results */}
        {!isLoading && logsData && results && (
          <div className="max-w-7xl mx-auto px-4">
            {/* Results Summary */}
            <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg mb-6">
              <div className="p-6 border-b border-[rgba(0,191,255,0.1)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <div>
                      <h3 className="text-xl font-semibold text-[#00bfff]">
                        Analysis Complete
                      </h3>
                      <p className="text-sm text-[#8b9dc3] mt-1">
                        Found {results?.raw_logs?.length || 0} events across{" "}
                        {results?.statistics?.blocks_analyzed || 0} blocks
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="analytics" className="w-full p-6">
                <TabsList className="grid w-full grid-cols-3 bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)]">
                  <TabsTrigger
                    value="analytics"
                    onMouseEnter={() => handleTabHover("analytics")}
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="participants"
                    onMouseEnter={() => handleTabHover("participants")}
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Participants
                  </TabsTrigger>
                  <TabsTrigger
                    value="charts"
                    onMouseEnter={() => handleTabHover("charts")}
                    className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                  >
                    Charts
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="space-y-6 mt-6">
                  {(() => {
                    const tab = tabs.find((tab) => tab.id === "analytics");
                    if (!tab) return null;
                    const Component = tab.component;
                    return (
                      <Component
                        transfers={results?.raw_logs || []}
                        results={results}
                      />
                    );
                  })()}
                </TabsContent>

                <TabsContent value="participants" className="space-y-6 mt-6">
                  {(() => {
                    const tab = tabs.find((tab) => tab.id === "participants");
                    if (!tab) return null;
                    const Component = tab.component;
                    return (
                      <Component
                        transfers={results?.raw_logs || []}
                        results={results}
                      />
                    );
                  })()}
                </TabsContent>

                <TabsContent value="charts" className="space-y-6 mt-6">
                  {(() => {
                    const tab = tabs.find((tab) => tab.id === "charts");
                    if (!tab) return null;
                    const Component = tab.component;
                    return (
                      <Component
                        transfers={results?.raw_logs || []}
                        results={results}
                      />
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* Empty State - Getting Started */}
        {!hasInitiatedQuery && !isLoading && !logsData && (
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Transfer Analytics
                  </h3>
                </div>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-[#00bfff]" />
                  </div>
                  <p className="text-[#8b9dc3] text-sm">
                    Volume charts and transfer statistics will appear here after
                    logs analysis
                  </p>
                </div>
              </div>

              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Network Flow
                  </h3>
                </div>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                    <Network className="h-8 w-8 text-[#00bfff]" />
                  </div>
                  <p className="text-[#8b9dc3] text-sm">
                    Interactive flow diagrams will be displayed here
                  </p>
                </div>
              </div>

              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Participants
                  </h3>
                </div>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                    <Activity className="h-8 w-8 text-[#00bfff]" />
                  </div>
                  <p className="text-[#8b9dc3] text-sm">
                    Top senders and receivers analysis with export options
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Results State - After Query */}
        {hasInitiatedQuery && !isLoading && !logsData && (
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-8 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 mx-auto mb-6 bg-[rgba(255,193,7,0.1)] rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-yellow-400" />
                </div>

                <h3 className="text-2xl font-semibold text-yellow-400 mb-4">
                  No Results Found
                </h3>

                <p className="text-[#8b9dc3] mb-8 leading-relaxed">
                  No event logs were found for the specified parameters. Try
                  adjusting your search criteria or check if the contract
                  address and block range are correct.
                </p>

                <Button
                  onClick={() => setHasInitiatedQuery(false)}
                  className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419]"
                >
                  Try Different Parameters
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* In-Context Sign Up Modal */}
      <InContextSignUp
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onSuccess={() => {
          setShowSignUpModal(false);
          // Refresh the page state after successful sign up
          window.location.reload();
        }}
        context={{
          page: "EventLogs",
          action: "bookmark_or_unlimited_access",
          remainingQueries: limitStatus?.remainingQueries,
        }}
      />
    </div>
  );
}

export function EventLogs({ className = "" }: LogsAnalyzerProps) {
  return <LogsAnalyzerContent className={className} />;
}
