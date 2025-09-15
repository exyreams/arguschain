import { useQuery } from "@tanstack/react-query";
import {
  AdvancedAnalyticsEngine,
  AdvancedAnalyticsResult,
  DebugBlockService,
  ProcessedDebugBlockData,
} from "@/lib/debugblock";

interface UseAdvancedDebugBlockAnalyticsOptions {
  enabled?: boolean;
  includeHistoricalContext?: boolean;
  historicalData?: {
    averageGasUsage: number;
    averageTransactionCount: number;
    averagePyusdActivity: number;
  };
}

interface AdvancedDebugBlockAnalyticsResult {
  blockData: ProcessedDebugBlockData;
  analytics: AdvancedAnalyticsResult;
  executiveSummary: {
    title: string;
    summary: string;
    highlights: string[];
    actionItems: string[];
  };
  pyusdAnalysis: {
    transferNetwork: ReturnType<
      typeof DebugBlockService.generatePyusdAnalysis
    >["transferNetwork"];
    functionPatterns: ReturnType<
      typeof DebugBlockService.generatePyusdAnalysis
    >["functionPatterns"];
    volumeFlows: ReturnType<
      typeof DebugBlockService.generatePyusdAnalysis
    >["volumeFlows"];
    internalAnalysis: ReturnType<
      typeof DebugBlockService.generatePyusdAnalysis
    >["internalAnalysis"];
    activitySummary: ReturnType<
      typeof DebugBlockService.generatePyusdAnalysis
    >["activitySummary"];
  };
  processingTime: number;
}

export const useDebugBlockAnalytics = (
  blockIdentifier: string | number | null,
  options: UseAdvancedDebugBlockAnalyticsOptions = {}
) => {
  const {
    enabled = true,
    includeHistoricalContext = false,
    historicalData,
  } = options;

  return useQuery({
    queryKey: [
      "advanced-debug-block-analytics",
      blockIdentifier,
      includeHistoricalContext,
    ],
    queryFn: async (): Promise<AdvancedDebugBlockAnalyticsResult> => {
      if (!blockIdentifier) {
        throw new Error("Block identifier is required");
      }

      console.log(`Starting advanced analytics for block ${blockIdentifier}`);
      const startTime = Date.now();

      const traceResult = await DebugBlockService.traceBlockByNumber(
        blockIdentifier,
        {
          useCache: true,
          includeGasAnalysis: true,
        }
      );

      const pyusdAnalysis = DebugBlockService.generatePyusdAnalysis(
        traceResult.data
      );

      const analytics = AdvancedAnalyticsEngine.generateAdvancedAnalysis(
        traceResult.data,
        includeHistoricalContext && historicalData ? historicalData : undefined
      );

      const executiveSummary = AdvancedAnalyticsEngine.generateExecutiveSummary(
        traceResult.data,
        analytics
      );

      const processingTime = Date.now() - startTime;

      console.log(
        `Advanced analytics completed for block ${blockIdentifier} in ${processingTime}ms`
      );

      return {
        blockData: traceResult.data,
        analytics,
        executiveSummary,
        pyusdAnalysis,
        processingTime,
      };
    },
    enabled: enabled && blockIdentifier !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        error.message.includes("Invalid block identifier")
      ) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useBatchAdvancedAnalytics = (
  blockIdentifiers: (string | number)[],
  options: {
    enabled?: boolean;
    maxConcurrent?: number;
  } = {}
) => {
  const { enabled = true, maxConcurrent = 3 } = options;

  return useQuery({
    queryKey: ["batch-advanced-analytics", blockIdentifiers],
    queryFn: async () => {
      console.log(
        `Starting batch advanced analytics for ${blockIdentifiers.length} blocks`
      );

      const results = await DebugBlockService.batchTraceBlocks(
        blockIdentifiers,
        {
          useCache: true,
          maxConcurrent,
        }
      );

      const analyticsResults = results.map((result) => {
        if (result.data && result.blockInfo) {
          const analytics = AdvancedAnalyticsEngine.generateAdvancedAnalysis(
            result.data
          );
          const executiveSummary =
            AdvancedAnalyticsEngine.generateExecutiveSummary(
              result.data,
              analytics
            );

          return {
            blockIdentifier: result.blockIdentifier,
            blockData: result.data,
            blockInfo: result.blockInfo,
            analytics,
            executiveSummary,
            error: undefined,
          };
        } else {
          return {
            blockIdentifier: result.blockIdentifier,
            blockData: undefined,
            blockInfo: undefined,
            analytics: undefined,
            executiveSummary: undefined,
            error: result.error,
          };
        }
      });

      return analyticsResults;
    },
    enabled: enabled && blockIdentifiers.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export const useHistoricalContext = (
  recentBlockCount: number = 100,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["historical-context", recentBlockCount],
    queryFn: async () => {
      console.log(
        `Fetching historical context from ${recentBlockCount} recent blocks`
      );

      const recentBlocks =
        await DebugBlockService.getRecentBlocks(recentBlockCount);

      const averageGasUsage =
        recentBlocks.reduce((sum, block) => sum + (block.gasUsed || 0), 0) /
        recentBlocks.length;
      const averageTransactionCount =
        recentBlocks.reduce((sum, block) => sum + block.transactionCount, 0) /
        recentBlocks.length;

      const averagePyusdActivity = averageTransactionCount * 0.1;

      return {
        averageGasUsage,
        averageTransactionCount,
        averagePyusdActivity,
        sampleSize: recentBlocks.length,
        dataFreshness: new Date().toISOString(),
      };
    },
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
  });
};

export const useBlockHealthMonitoring = (
  blockIdentifiers: (string | number)[],
  options: {
    enabled?: boolean;
    alertThresholds?: {
      healthScore?: number;
      riskLevel?: "medium" | "high" | "critical";
      failureRate?: number;
    };
  } = {}
) => {
  const {
    enabled = true,
    alertThresholds = {
      healthScore: 70,
      riskLevel: "medium",
      failureRate: 10,
    },
  } = options;

  return useQuery({
    queryKey: ["block-health-monitoring", blockIdentifiers, alertThresholds],
    queryFn: async () => {
      const results = await Promise.all(
        blockIdentifiers.map(async (blockId) => {
          try {
            const traceResult = await DebugBlockService.traceBlockByNumber(
              blockId,
              {
                useCache: true,
                includeGasAnalysis: false,
              }
            );

            const analytics = AdvancedAnalyticsEngine.generateAdvancedAnalysis(
              traceResult.data
            );

            const alerts: Array<{
              type: "health_score" | "risk_level" | "failure_rate";
              severity: "warning" | "critical";
              message: string;
            }> = [];

            if (analytics.blockHealthScore < alertThresholds.healthScore!) {
              alerts.push({
                type: "health_score",
                severity:
                  analytics.blockHealthScore < 50 ? "critical" : "warning",
                message: `Low health score: ${analytics.blockHealthScore}/100`,
              });
            }

            const riskLevels = ["low", "medium", "high", "critical"];
            const currentRiskIndex = riskLevels.indexOf(
              analytics.riskAssessment.level
            );
            const thresholdRiskIndex = riskLevels.indexOf(
              alertThresholds.riskLevel!
            );

            if (currentRiskIndex >= thresholdRiskIndex) {
              alerts.push({
                type: "risk_level",
                severity:
                  analytics.riskAssessment.level === "critical"
                    ? "critical"
                    : "warning",
                message: `Elevated risk level: ${analytics.riskAssessment.level}`,
              });
            }

            if (
              analytics.performanceMetrics.failureRate >
              alertThresholds.failureRate!
            ) {
              alerts.push({
                type: "failure_rate",
                severity:
                  analytics.performanceMetrics.failureRate > 20
                    ? "critical"
                    : "warning",
                message: `High failure rate: ${analytics.performanceMetrics.failureRate.toFixed(1)}%`,
              });
            }

            return {
              blockIdentifier: blockId,
              healthScore: analytics.blockHealthScore,
              riskLevel: analytics.riskAssessment.level,
              failureRate: analytics.performanceMetrics.failureRate,
              alerts,
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            return {
              blockIdentifier: blockId,
              healthScore: 0,
              riskLevel: "critical" as const,
              failureRate: 100,
              alerts: [
                {
                  type: "health_score" as const,
                  severity: "critical" as const,
                  message: `Failed to analyze block: ${error}`,
                },
              ],
              timestamp: new Date().toISOString(),
            };
          }
        })
      );

      return {
        results,
        totalAlerts: results.reduce(
          (sum, result) => sum + result.alerts.length,
          0
        ),
        criticalAlerts: results.reduce(
          (sum, result) =>
            sum +
            result.alerts.filter((alert) => alert.severity === "critical")
              .length,
          0
        ),
        averageHealthScore:
          results.reduce((sum, result) => sum + result.healthScore, 0) /
          results.length,
      };
    },
    enabled: enabled && blockIdentifiers.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
