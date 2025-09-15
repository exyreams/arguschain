import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Info,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  useHistoricalStorage,
  useRecentBlocks,
} from "@/hooks/storagerange/useHistoricalStorage";
import { HistoricalVisualizationCharts } from "./charts/HistoricalVisualizationCharts";

interface HistoricalStorageAnalyzerProps {
  contractAddress: string;
  initialSlot?: string;
  className?: string;
}

interface ChartDataPoint {
  blockNumber: number;
  timestamp: number;
  value: number;
  formattedValue: string;
  datetime: string;
  change?: number;
}

export const HistoricalStorageAnalyzer: React.FC<
  HistoricalStorageAnalyzerProps
> = ({
  contractAddress,
  initialSlot = "0x0000000000000000000000000000000000000000000000000000000000000002",
  className = "",
}) => {
  const [slot, setSlot] = useState(initialSlot);
  const [blockCount, setBlockCount] = useState(50);
  const [blockInterval, setBlockInterval] = useState(10);
  const [chartType, setChartType] = useState<
    "line" | "area" | "bar" | "scatter"
  >("line");

  const { blockNumbers, isLoading: blocksLoading } = useRecentBlocks(
    blockCount,
    blockInterval
  );

  const {
    data: historicalData,
    isLoading: dataLoading,
    isError,
    error,
    refetch,
  } = useHistoricalStorage(
    {
      contractAddress,
      slot,
      blockNumbers,
      includeTimestamps: true,
      formatValues: true,
    },
    {
      enabled: !!contractAddress && !!slot && blockNumbers.length > 0,
    }
  );

  const isLoading = blocksLoading || dataLoading;

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!historicalData?.dataPoints) return [];

    return historicalData.dataPoints.map((point, index) => {
      const previousPoint =
        index > 0 ? historicalData.dataPoints[index - 1] : null;
      const change = previousPoint
        ? point.valueInt - previousPoint.valueInt
        : 0;

      return {
        blockNumber: point.blockNumber,
        timestamp: point.timestamp,
        value: point.valueInt / 1e6,
        formattedValue: point.formattedValue,
        datetime: point.datetime.toLocaleString(),
        change: change / 1e6,
      };
    });
  }, [historicalData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">Block {label}</p>
          <p className="text-[#8b9dc3]">Value: {data.formattedValue}</p>
          <p className="text-[#8b9dc3]">Time: {data.datetime}</p>
          {data.change !== 0 && (
            <p
              className={`text-sm ${data.change > 0 ? "text-green-400" : "text-red-400"}`}
            >
              Change: {data.change > 0 ? "+" : ""}
              {data.change.toFixed(2)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      case "volatile":
        return <Activity className="h-4 w-4 text-yellow-400" />;
      default:
        return <Target className="h-4 w-4 text-blue-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "border-green-500/50 text-green-400 bg-green-500/10";
      case "decreasing":
        return "border-red-500/50 text-red-400 bg-red-500/10";
      case "volatile":
        return "border-yellow-500/50 text-yellow-400 bg-yellow-500/10";
      default:
        return "border-blue-500/50 text-blue-400 bg-blue-500/10";
    }
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="text-center py-8 text-[#8b9dc3]">
          No historical data available
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
            <XAxis dataKey="blockNumber" stroke="#8b9dc3" fontSize={12} />
            <YAxis stroke="#8b9dc3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00bfff"
              fill="rgba(0,191,255,0.2)"
            />
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
            <XAxis dataKey="blockNumber" stroke="#8b9dc3" fontSize={12} />
            <YAxis stroke="#8b9dc3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#00bfff" />
          </BarChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
            <XAxis dataKey="blockNumber" stroke="#8b9dc3" fontSize={12} />
            <YAxis dataKey="value" stroke="#8b9dc3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter dataKey="value" fill="#00bfff" />
          </ScatterChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
            <XAxis dataKey="blockNumber" stroke="#8b9dc3" fontSize={12} />
            <YAxis stroke="#8b9dc3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#00bfff"
              strokeWidth={2}
              dot={{ fill: "#00bfff", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#00bfff", strokeWidth: 2 }}
            />
          </LineChart>
        );
    }
  };

  if (isError) {
    return (
      <Card
        className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
      >
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            Analysis Error
          </h3>
          <p className="text-[#8b9dc3] text-sm mb-4">
            {error?.message || "Failed to analyze historical storage data"}
          </p>
          <Button
            onClick={() => refetch()}
            className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
          >
            Retry Analysis
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Historical Storage Analysis
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
              Storage Slot
            </label>
            <Input
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              placeholder="0x..."
              className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
              Block Count
            </label>
            <Input
              type="number"
              value={blockCount}
              onChange={(e) => setBlockCount(parseInt(e.target.value) || 50)}
              min="10"
              max="1000"
              className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
              Block Interval
            </label>
            <Input
              type="number"
              value={blockInterval}
              onChange={(e) => setBlockInterval(parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded-md px-3 py-2 text-sm focus:border-[#00bfff] focus:outline-none"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="scatter">Scatter Plot</option>
            </select>
          </div>
        </div>
      </Card>

      {historicalData && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Statistical Analysis
            </h4>
            <Badge
              variant="outline"
              className={getTrendColor(historicalData.statistics.trend)}
            >
              {getTrendIcon(historicalData.statistics.trend)}
              <span className="ml-1">
                {historicalData.statistics.trend.toUpperCase()}
              </span>
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {(historicalData.statistics.minValue / 1e6).toFixed(2)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Min Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {(historicalData.statistics.maxValue / 1e6).toFixed(2)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Max Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {(historicalData.statistics.averageValue / 1e6).toFixed(2)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {historicalData.statistics.totalChanges}
              </div>
              <div className="text-sm text-[#8b9dc3]">Changes</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-[#00bfff] mt-0.5" />
              <div>
                <h5 className="font-medium text-[#00bfff] mb-1">
                  Analysis Summary
                </h5>
                <p className="text-[#8b9dc3] text-sm">
                  {historicalData.interpretation}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Historical Values
          </h4>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {chartData.length} Data Points
            </Badge>
            {historicalData && (
              <Badge
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              >
                {historicalData.category.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00bfff] mx-auto mb-3"></div>
            <p className="text-[#8b9dc3]">Loading historical data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </Card>

      {historicalData && (
        <HistoricalVisualizationCharts
          historicalData={historicalData}
          showTrendLine={true}
          showEvents={true}
          showVolatility={true}
        />
      )}

      {historicalData?.changeEvents &&
        historicalData.changeEvents.length > 0 && (
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-[#00bfff]" />
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Change Events
              </h4>
              <Badge
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              >
                {historicalData.changeEvents.length} Event
                {historicalData.changeEvents.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {historicalData.changeEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                >
                  <div className="mt-0.5">
                    {event.changeType === "increase" && (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    )}
                    {event.changeType === "decrease" && (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                    {event.changeType === "set" && (
                      <Target className="h-4 w-4 text-blue-400" />
                    )}
                    {event.changeType === "clear" && (
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#00bfff] text-sm">
                        Block {event.blockNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          event.changeType === "increase"
                            ? "border-green-500/50 text-green-400 bg-green-500/10"
                            : event.changeType === "decrease"
                              ? "border-red-500/50 text-red-400 bg-red-500/10"
                              : "border-blue-500/50 text-blue-400 bg-blue-500/10"
                        }
                      >
                        {event.changeType.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[#8b9dc3] text-sm mb-1">
                      {event.description}
                    </p>
                    <div className="text-xs text-[#6b7280]">
                      {new Date(event.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
    </div>
  );
};
