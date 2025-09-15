import React, { useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import { Alert, AlertDescription } from "@/components/global/Alert";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  HardDrive,
  Minus,
  RefreshCw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { usePerformanceMonitor } from "@/hooks/tracetransaction";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeRange } from "@/lib/tracetransaction/performanceMonitor";

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = "",
}) => {
  const {
    stats,
    sessionData,
    history,
    categoryMetrics,
    timeRange,
    isLoading,
    error,
    clearPerformanceData,
    exportPerformanceData,
    changeTimeRange,
    loadData,
    clearError,
  } = usePerformanceMonitor();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const performanceChartData = history
    .slice(0, 50)
    .reverse()
    .map((record, index) => ({
      index,
      time: record.analysisTime,
      timestamp: new Date(record.timestamp).toLocaleTimeString(),
      success: record.success,
      category: record.category,
    }));

  const memoryChartData = sessionData.memoryUsage
    .slice(-20)
    .map((reading, index) => ({
      index,
      memory: Math.round(reading.usedJSHeapSize / (1024 * 1024)),
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
    }));

  const categoryChartData = Object.entries(categoryMetrics).map(
    ([category, metrics]) => ({
      category: category
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase()),
      averageTime: Math.round(metrics.averageTime),
      count: metrics.count,
      successRate: Math.round(metrics.successRate),
    })
  );

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case "degrading":
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "text-green-400";
      case "degrading":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const formatMemory = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const COLORS = [
    "#00bfff",
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#feca57",
  ];

  if (isLoading) {
    return (
      <Card title="Performance Dashboard" className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-[#00bfff]">
            <Activity className="h-5 w-5 animate-spin" />
            <span>Loading performance data...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card title="Performance Monitoring Dashboard" className="p-6">
        <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
          <BarChart3 className="h-5 w-5" />
          <span className="font-semibold">System Performance Analytics</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Time Range:</span>
            {(["1h", "24h", "7d", "30d"] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => changeTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPerformanceData("json")}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearPerformanceData}
              className="flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear Data
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Dismiss
            </Button>
          </Alert>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#00bfff]" />
              <span className="text-sm font-medium text-gray-300">
                Total Analyses
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalAnalyses}
          </div>
          <div className="text-xs text-gray-400">
            Session: {sessionData.analysisCount}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#00bfff]" />
              <span className="text-sm font-medium text-gray-300">
                Avg Analysis Time
              </span>
            </div>
            {getTrendIcon(stats.performanceTrend)}
          </div>
          <div className="text-2xl font-bold text-white">
            {formatTime(stats.averageAnalysisTime)}
          </div>
          <div className={`text-xs ${getTrendColor(stats.performanceTrend)}`}>
            {stats.performanceTrend}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#00bfff]" />
              <span className="text-sm font-medium text-gray-300">
                Success Rate
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">
            {stats.errorRate.toFixed(1)}% errors
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-[#00bfff]" />
              <span className="text-sm font-medium text-gray-300">
                Memory Usage
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatMemory(stats.memoryUsage.current)}
          </div>
          <div className="text-xs text-gray-400">
            Peak: {formatMemory(stats.memoryUsage.peak)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Analysis Time Trend" className="p-6">
          <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">
              Analysis Performance Over Time
            </span>
          </div>

          {performanceChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="timestamp" stroke="#666" fontSize={12} />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(value) => `${value}ms`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid rgba(0,191,255,0.3)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [
                      `${value}ms`,
                      "Analysis Time",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="time"
                    stroke="#00bfff"
                    strokeWidth={2}
                    dot={{ fill: "#00bfff", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No performance data available
            </div>
          )}
        </Card>

        <Card title="Memory Usage" className="p-6">
          <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
            <HardDrive className="h-5 w-5" />
            <span className="font-semibold">Memory Consumption</span>
          </div>

          {memoryChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="timestamp" stroke="#666" fontSize={12} />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(value) => `${value}MB`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid rgba(0,191,255,0.3)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [
                      `${value}MB`,
                      "Memory Usage",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#4ecdc4"
                    strokeWidth={2}
                    dot={{ fill: "#4ecdc4", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No memory data available
            </div>
          )}
        </Card>
      </div>

      {categoryChartData.length > 0 && (
        <Card title="Performance by Category" className="p-6">
          <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
            <Target className="h-5 w-5" />
            <span className="font-semibold">Analysis Category Breakdown</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="category"
                  stroke="#666"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(0,191,255,0.3)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: number, name: string) => [
                    name === "averageTime" ? `${value}ms` : value,
                    name === "averageTime"
                      ? "Avg Time"
                      : name === "count"
                        ? "Count"
                        : "Success Rate",
                  ]}
                />
                <Bar dataKey="averageTime" fill="#00bfff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {stats.recommendations.length > 0 && (
        <Card title="Performance Recommendations" className="p-6">
          <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
            <Zap className="h-5 w-5" />
            <span className="font-semibold">Optimization Suggestions</span>
          </div>

          <div className="space-y-3">
            {stats.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Current Session" className="p-6">
        <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
          <Activity className="h-5 w-5" />
          <span className="font-semibold">Session Statistics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]">
            <div className="text-sm text-gray-400">Session Duration</div>
            <div className="text-lg font-semibold text-white">
              {Math.round((Date.now() - sessionData.startTime) / (1000 * 60))}{" "}
              minutes
            </div>
          </div>
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]">
            <div className="text-sm text-gray-400">Analyses This Session</div>
            <div className="text-lg font-semibold text-white">
              {sessionData.analysisCount}
            </div>
          </div>
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]">
            <div className="text-sm text-gray-400">Errors This Session</div>
            <div className="text-lg font-semibold text-white">
              {sessionData.errors.length}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
