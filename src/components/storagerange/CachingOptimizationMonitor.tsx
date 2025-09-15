import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import {
  Activity,
  Clock,
  Database,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cachingSystem } from "@/lib/storagerange/cachingOptimizationSystem";

interface CachingOptimizationMonitorProps {
  className?: string;
}

export const CachingOptimizationMonitor: React.FC<
  CachingOptimizationMonitorProps
> = ({ className = "" }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const updateMetrics = useCallback(async () => {
    try {
      const performanceMetrics = cachingSystem.getPerformanceMetrics();
      const status = cachingSystem.getSystemStatus();

      setMetrics(performanceMetrics);
      setSystemStatus(status);
    } catch (error) {
      console.error("Failed to update metrics:", error);
    }
  }, []);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(updateMetrics, refreshInterval);
    updateMetrics();

    return () => clearInterval(interval);
  }, [isMonitoring, refreshInterval, updateMetrics]);

  const handleClearCache = useCallback(() => {
    cachingSystem.invalidateCache(".*");
    updateMetrics();
  }, [updateMetrics]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1) + "%";
  };

  const getStatusColor = (
    value: number,
    thresholds: { good: number; warning: number },
  ) => {
    if (value >= thresholds.good)
      return "text-green-400 border-green-500/50 bg-green-500/10";
    if (value >= thresholds.warning)
      return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
    return "text-red-400 border-red-500/50 bg-red-500/10";
  };

  if (!metrics || !systemStatus) {
    return (
      <Card
        className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00bfff] mr-3"></div>
          <span className="text-[#8b9dc3]">Loading performance metrics...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Performance Monitor
          </h3>
          <Badge
            variant="outline"
            className={
              isMonitoring
                ? "border-green-500/50 text-green-400 bg-green-500/10"
                : "border-gray-500/50 text-gray-400 bg-gray-500/10"
            }
          >
            {isMonitoring ? "Live" : "Paused"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {isMonitoring ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={updateMetrics}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-[#00bfff]" />
            <span className="text-sm text-[#8b9dc3]">Cache Hit Rate</span>
          </div>
          <div className="text-2xl font-bold text-[#00bfff] mb-1">
            {formatPercentage(metrics.cacheHitRate)}
          </div>
          <Badge
            variant="outline"
            className={getStatusColor(metrics.cacheHitRate, {
              good: 0.8,
              warning: 0.6,
            })}
          >
            {metrics.cacheHitRate >= 0.8
              ? "Excellent"
              : metrics.cacheHitRate >= 0.6
                ? "Good"
                : "Poor"}
          </Badge>
        </div>

        <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-[#00bfff]" />
            <span className="text-sm text-[#8b9dc3]">Avg Response</span>
          </div>
          <div className="text-2xl font-bold text-[#00bfff] mb-1">
            {metrics.averageResponseTime.toFixed(0)}ms
          </div>
          <Badge
            variant="outline"
            className={getStatusColor(1000 - metrics.averageResponseTime, {
              good: 800,
              warning: 500,
            })}
          >
            {metrics.averageResponseTime < 200
              ? "Fast"
              : metrics.averageResponseTime < 500
                ? "Good"
                : "Slow"}
          </Badge>
        </div>

        <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#00bfff]" />
            <span className="text-sm text-[#8b9dc3]">Requests/sec</span>
          </div>
          <div className="text-2xl font-bold text-[#00bfff] mb-1">
            {metrics.requestsPerSecond.toFixed(1)}
          </div>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            Active
          </Badge>
        </div>

        <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-[#00bfff]" />
            <span className="text-sm text-[#8b9dc3]">Memory Usage</span>
          </div>
          <div className="text-2xl font-bold text-[#00bfff] mb-1">
            {formatBytes(metrics.memoryUsage * 1024 * 1024)}
          </div>
          <Badge
            variant="outline"
            className={getStatusColor(100 - metrics.memoryUsage / 100, {
              good: 70,
              warning: 50,
            })}
          >
            {metrics.memoryUsage < 50
              ? "Low"
              : metrics.memoryUsage < 100
                ? "Medium"
                : "High"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-[#00bfff]">Cache Statistics</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Cache
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">L1 Cache Size</span>
              <span className="text-[#00bfff] font-mono">
                {systemStatus.cache.l1Size} items
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">L2 Cache Size</span>
              <span className="text-[#00bfff] font-mono">
                {systemStatus.cache.l2Size} items
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Disk Cache Size</span>
              <span className="text-[#00bfff] font-mono">
                {systemStatus.cache.diskSize} items
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Compression Ratio</span>
              <span className="text-[#00bfff] font-mono">
                {formatPercentage(systemStatus.cache.compressionRatio)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Cache Hits</span>
              <span className="text-green-400 font-mono">
                {systemStatus.cache.hits}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Cache Misses</span>
              <span className="text-red-400 font-mono">
                {systemStatus.cache.misses}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
          <h4 className="font-medium text-[#00bfff] mb-4">
            Background Processing
          </h4>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Queue Length</span>
              <span className="text-[#00bfff] font-mono">
                {systemStatus.backgroundProcessor.queueLength}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Active Workers</span>
              <span className="text-[#00bfff] font-mono">
                {systemStatus.backgroundProcessor.activeWorkers} /{" "}
                {systemStatus.backgroundProcessor.maxWorkers}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Processing Status</span>
              <Badge
                variant="outline"
                className={
                  systemStatus.backgroundProcessor.isProcessing
                    ? "border-green-500/50 text-green-400 bg-green-500/10"
                    : "border-gray-500/50 text-gray-400 bg-gray-500/10"
                }
              >
                {systemStatus.backgroundProcessor.isProcessing
                  ? "Active"
                  : "Idle"}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8b9dc3]">Error Rate</span>
              <span
                className={`font-mono ${
                  metrics.errorRate < 0.01
                    ? "text-green-400"
                    : metrics.errorRate < 0.05
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {formatPercentage(metrics.errorRate)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-[#00bfff]" />
          <h4 className="font-medium text-[#00bfff]">Monitor Configuration</h4>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#8b9dc3]">Refresh Interval:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded px-2 py-1 text-sm"
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>

          <div className="text-sm text-[#8b9dc3]">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </Card>
    </Card>
  );
};
