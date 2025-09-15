import { useCallback, useEffect, useState } from "react";
import {
  type CategoryMetrics,
  PerformanceMonitorService,
  type PerformanceRecord,
  type PerformanceStats,
  type SessionData,
  type TimeRange,
} from "@/lib/tracetransaction/performanceMonitor";

interface PerformanceMonitorState {
  stats: PerformanceStats;
  sessionData: SessionData;
  history: PerformanceRecord[];
  categoryMetrics: CategoryMetrics;
  isLoading: boolean;
  error: string | null;
}

export function usePerformanceMonitor() {
  const [state, setState] = useState<PerformanceMonitorState>({
    stats: {
      totalAnalyses: 0,
      averageAnalysisTime: 0,
      medianAnalysisTime: 0,
      fastestAnalysis: 0,
      slowestAnalysis: 0,
      successRate: 100,
      errorRate: 0,
      memoryUsage: {
        current: 0,
        average: 0,
        peak: 0,
      },
      performanceTrend: "stable",
      recommendations: [],
    },
    sessionData: {
      startTime: Date.now(),
      analysisCount: 0,
      totalAnalysisTime: 0,
      averageAnalysisTime: 0,
      memoryUsage: [],
      errors: [],
    },
    history: [],
    categoryMetrics: {},
    isLoading: false,
    error: null,
  });

  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  useEffect(() => {
    PerformanceMonitorService.initialize();
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const stats = PerformanceMonitorService.getPerformanceStats();
      const sessionData = PerformanceMonitorService.getSessionData();
      const history =
        PerformanceMonitorService.getPerformanceHistory(timeRange);
      const categoryMetrics = PerformanceMonitorService.getMetricsByCategory();

      setState({
        stats,
        sessionData,
        history,
        categoryMetrics,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load performance data",
      }));
    }
  }, [timeRange]);

  const recordAnalysis = useCallback(
    (record: Omit<PerformanceRecord, "id" | "timestamp">) => {
      try {
        PerformanceMonitorService.recordAnalysis(record);
        loadData();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to record analysis",
        }));
      }
    },
    [loadData]
  );

  const recordError = useCallback(
    (error: {
      type: string;
      message: string;
      stack?: string;
      transactionHash?: string;
    }) => {
      try {
        PerformanceMonitorService.recordError(error);
        loadData();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to record error",
        }));
      }
    },
    [loadData]
  );

  const clearPerformanceData = useCallback(() => {
    try {
      PerformanceMonitorService.clearPerformanceData();
      loadData();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to clear performance data",
      }));
    }
  }, [loadData]);

  const exportPerformanceData = useCallback((format: "json" | "csv") => {
    try {
      const data = PerformanceMonitorService.exportPerformanceData(format);

      const blob = new Blob([data], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance_data_${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to export performance data",
      }));
      return null;
    }
  }, []);

  const changeTimeRange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const startMeasurement = useCallback((name: string) => {
    if ("performance" in window && "mark" in performance) {
      performance.mark(`${name}-start`);
    }
    return Date.now();
  }, []);

  const endMeasurement = useCallback(
    (
      name: string,
      startTime: number,
      transactionHash: string,
      category: PerformanceRecord["category"]
    ) => {
      const endTime = Date.now();
      const analysisTime = endTime - startTime;

      if (
        "performance" in window &&
        "mark" in performance &&
        "measure" in performance
      ) {
        try {
          performance.mark(`${name}-end`);
          performance.measure(name, `${name}-start`, `${name}-end`);
        } catch (error) {
          console.warn("Performance measurement failed:", error);
        }
      }

      recordAnalysis({
        transactionHash,
        category,
        analysisTime,
        success: true,
      });

      return analysisTime;
    },
    [recordAnalysis]
  );

  const recordFailedAnalysis = useCallback(
    (
      transactionHash: string,
      category: PerformanceRecord["category"],
      analysisTime: number,
      errorMessage: string
    ) => {
      recordAnalysis({
        transactionHash,
        category,
        analysisTime,
        success: false,
        errorMessage,
      });
    },
    [recordAnalysis]
  );

  return {
    stats: state.stats,
    sessionData: state.sessionData,
    history: state.history,
    categoryMetrics: state.categoryMetrics,
    timeRange,
    isLoading: state.isLoading,
    error: state.error,

    recordAnalysis,
    recordError,
    clearPerformanceData,
    exportPerformanceData,
    changeTimeRange,
    loadData,
    clearError,

    startMeasurement,
    endMeasurement,
    recordFailedAnalysis,
  };
}
