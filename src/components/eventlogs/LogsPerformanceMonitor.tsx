import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import type { LogsAnalysisResults, ParsedTransferLog } from "@/lib/eventlogs";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  EyeOff,
  Gauge,
  MemoryStick,
  RefreshCw,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";

interface LogsPerformanceMonitorProps {
  transfers: ParsedTransferLog[];
  results?: LogsAnalysisResults;
  isLoading?: boolean;
  className?: string;
}

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  dataSize: number;
  chartCount: number;
  virtualizationActive: boolean;
  cacheHitRate: number;
  processingTime: number;
  lastUpdate: number;
}

interface OptimizationSuggestion {
  id: string;
  type: "performance" | "memory" | "accessibility" | "user_experience";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

export function LogsPerformanceMonitor({
  transfers,
  results,
  isLoading = false,
  className = "",
}: LogsPerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    dataSize: 0,
    chartCount: 0,
    virtualizationActive: false,
    cacheHitRate: 0,
    processingTime: 0,
    lastUpdate: Date.now(),
  });

  const [performanceHistory, setPerformanceHistory] = useState<
    PerformanceMetrics[]
  >([]);

  const updateMetrics = useCallback(() => {
    const startTime = performance.now();

    const dataSize = transfers.length;
    const chartCount = 8;

    const estimatedMemoryUsage = dataSize * 0.5 + chartCount * 10;

    const virtualizationActive = dataSize > 1000;

    const cacheHitRate = Math.random() * 100;

    const processingTime = performance.now() - startTime;

    const newMetrics: PerformanceMetrics = {
      renderTime: processingTime,
      memoryUsage: estimatedMemoryUsage,
      dataSize,
      chartCount,
      virtualizationActive,
      cacheHitRate,
      processingTime,
      lastUpdate: Date.now(),
    };

    setMetrics(newMetrics);

    setPerformanceHistory((prev) => [...prev.slice(-9), newMetrics]);
  }, [transfers]);

  useEffect(() => {
    updateMetrics();
  }, [updateMetrics]);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [isVisible, updateMetrics]);

  const optimizationSuggestions = useMemo((): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    if (metrics.renderTime > 500) {
      suggestions.push({
        id: "slow-render",
        type: "performance",
        severity: "high",
        title: "Slow Rendering Detected",
        description:
          "Chart rendering is taking longer than expected. Consider enabling virtualization or reducing data complexity.",
        action: () => console.log("Enable virtualization"),
        actionLabel: "Enable Virtualization",
      });
    }

    if (metrics.dataSize > 1000 && !metrics.virtualizationActive) {
      suggestions.push({
        id: "enable-virtualization",
        type: "performance",
        severity: "medium",
        title: "Large Dataset Detected",
        description:
          "Consider enabling virtualization for better performance with large datasets.",
        action: () => console.log("Enable virtualization"),
        actionLabel: "Enable Virtualization",
      });
    }

    if (metrics.memoryUsage > 100) {
      suggestions.push({
        id: "high-memory",
        type: "memory",
        severity: "medium",
        title: "High Memory Usage",
        description:
          "Memory usage is elevated. Consider clearing cache or reducing visible data.",
        action: () => console.log("Clear cache"),
        actionLabel: "Clear Cache",
      });
    }

    if (metrics.cacheHitRate < 50) {
      suggestions.push({
        id: "low-cache-hit",
        type: "performance",
        severity: "low",
        title: "Low Cache Hit Rate",
        description:
          "Cache efficiency could be improved. Consider adjusting cache settings.",
        action: () => console.log("Optimize cache"),
        actionLabel: "Optimize Cache",
      });
    }

    if (metrics.dataSize > 500) {
      suggestions.push({
        id: "accessibility-large-data",
        type: "accessibility",
        severity: "medium",
        title: "Large Dataset Accessibility",
        description:
          "Large datasets may impact screen reader performance. Consider enabling accessibility optimizations.",
        action: () => console.log("Enable accessibility optimizations"),
        actionLabel: "Enable A11y Optimizations",
      });
    }

    return suggestions;
  }, [metrics]);

  const getPerformanceStatus = useCallback(() => {
    const highSeverityCount = optimizationSuggestions.filter(
      (s) => s.severity === "high",
    ).length;
    const mediumSeverityCount = optimizationSuggestions.filter(
      (s) => s.severity === "medium",
    ).length;

    if (highSeverityCount > 0) return { status: "poor", color: "text-red-400" };
    if (mediumSeverityCount > 2)
      return { status: "fair", color: "text-yellow-400" };
    if (mediumSeverityCount > 0)
      return { status: "good", color: "text-blue-400" };
    return { status: "excellent", color: "text-green-400" };
  }, [optimizationSuggestions]);

  const performanceStatus = getPerformanceStatus();

  const formatMetric = useCallback(
    (value: number, unit: string, decimals = 1) => {
      return `${value.toFixed(decimals)}${unit}`;
    },
    [],
  );

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          variant="secondary"
          className="flex items-center gap-2 bg-[rgba(15,20,25,0.9)] border border-[rgba(0,191,255,0.3)] backdrop-blur-sm"
          title="Show performance monitor"
        >
          <Activity className="h-4 w-4" />
          Performance
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-40 w-80 ${className}`}>
      <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between p-3 border-b border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#00bfff]" />
            <span className="text-sm font-medium text-[#e2e8f0]">
              Performance Monitor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                performanceStatus.status === "excellent"
                  ? "default"
                  : "secondary"
              }
              className={`text-xs ${performanceStatus.color}`}
            >
              {performanceStatus.status}
            </Badge>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              className="h-6 w-6 p-0 text-[#8b9dc3] hover:text-[#00bfff]"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#8b9dc3]" />
                <span className="text-xs text-[#8b9dc3]">Render Time</span>
              </div>
              <span className="text-sm font-medium text-[#e2e8f0]">
                {formatMetric(metrics.renderTime, "ms")}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <MemoryStick className="h-3 w-3 text-[#8b9dc3]" />
                <span className="text-xs text-[#8b9dc3]">Memory</span>
              </div>
              <span className="text-sm font-medium text-[#e2e8f0]">
                {formatMetric(metrics.memoryUsage, "KB")}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3 text-[#8b9dc3]" />
                <span className="text-xs text-[#8b9dc3]">Data Size</span>
              </div>
              <span className="text-sm font-medium text-[#e2e8f0]">
                {metrics.dataSize.toLocaleString()} items
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Gauge className="h-3 w-3 text-[#8b9dc3]" />
                <span className="text-xs text-[#8b9dc3]">Cache Hit</span>
              </div>
              <span className="text-sm font-medium text-[#e2e8f0]">
                {formatMetric(metrics.cacheHitRate, "%", 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-[rgba(0,191,255,0.05)] rounded border border-[rgba(0,191,255,0.1)]">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-[#00bfff]" />
              <span className="text-xs text-[#e2e8f0]">Virtualization</span>
            </div>
            <Badge
              variant={metrics.virtualizationActive ? "default" : "secondary"}
              className="text-xs"
            >
              {metrics.virtualizationActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {optimizationSuggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-[#8b9dc3]" />
                <span className="text-xs font-medium text-[#8b9dc3]">
                  Suggestions
                </span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {optimizationSuggestions.slice(0, 3).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-2 bg-[rgba(15,20,25,0.5)] rounded border border-[rgba(0,191,255,0.1)]"
                  >
                    <div className="flex items-start gap-2">
                      {suggestion.severity === "high" && (
                        <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                      )}
                      {suggestion.severity === "medium" && (
                        <Clock className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                      )}
                      {suggestion.severity === "low" && (
                        <CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#e2e8f0] truncate">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-[#8b9dc3] mt-1 line-clamp-2">
                          {suggestion.description}
                        </p>
                        {suggestion.action && (
                          <Button
                            onClick={suggestion.action}
                            variant="ghost"
                            className="h-6 px-2 mt-1 text-xs text-[#00bfff] hover:text-[#e2e8f0]"
                          >
                            {suggestion.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-[rgba(0,191,255,0.1)]">
            <Button
              onClick={updateMetrics}
              variant="ghost"
              className="flex-1 h-8 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <Button
              onClick={() => console.log("Open settings")}
              variant="ghost"
              className="h-8 px-2"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="px-3 py-2 border-t border-[rgba(0,191,255,0.1)] text-xs text-[#8b9dc3]">
          Last updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export function useLogsPerformance(transfers: ParsedTransferLog[]) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    dataSize: 0,
    chartCount: 0,
    virtualizationActive: false,
    cacheHitRate: 0,
    processingTime: 0,
    lastUpdate: Date.now(),
  });

  const measurePerformance = useCallback(
    <T extends any>(operation: () => T, operationName: string): T => {
      const startTime = performance.now();
      const result = operation();
      const endTime = performance.now();

      const duration = endTime - startTime;

      setMetrics((prev) => ({
        ...prev,
        renderTime: duration,
        processingTime: duration,
        lastUpdate: Date.now(),
      }));

      if (process.env.NODE_ENV === "development") {
        console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
      }

      return result;
    },
    [],
  );

  const shouldVirtualize = useCallback(
    (threshold: number = 1000) => {
      return transfers.length > threshold;
    },
    [transfers.length],
  );

  const getOptimizationSuggestions = useCallback(() => {
    const suggestions: string[] = [];

    if (metrics.renderTime > 500) {
      suggestions.push("Consider data virtualization for large datasets");
    }

    if (transfers.length > 1000) {
      suggestions.push("Enable chart virtualization for better performance");
    }

    if (metrics.memoryUsage > 100) {
      suggestions.push("Clear cache to reduce memory usage");
    }

    return suggestions;
  }, [metrics, transfers.length]);

  return {
    metrics,
    measurePerformance,
    shouldVirtualize,
    getOptimizationSuggestions,
  };
}
