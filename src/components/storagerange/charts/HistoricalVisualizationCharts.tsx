import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import { Activity, BarChart3, Clock, Target, TrendingUp } from "lucide-react";
import type { HistoricalAnalysis } from "@/lib/storagerange/historicalStorageTracker";

interface HistoricalVisualizationChartsProps {
  historicalData: HistoricalAnalysis;
  showTrendLine?: boolean;
  showEvents?: boolean;
  showVolatility?: boolean;
  className?: string;
}

interface TimeSeriesDataPoint {
  blockNumber: number;
  timestamp: number;
  value: number;
  formattedValue: string;
  datetime: string;
  change?: number;
  volatility?: number;
  trend?: number;
  hasEvent?: boolean;
  eventType?: string;
}

interface TrendAnalysisData {
  period: string;
  actualValue: number;
  trendValue: number;
  deviation: number;
  volatility: number;
}

interface EventTimelineData {
  blockNumber: number;
  timestamp: number;
  eventType: "increase" | "decrease" | "set" | "clear";
  magnitude: number;
  description: string;
  impact: "low" | "medium" | "high" | "critical";
}

export const HistoricalVisualizationCharts: React.FC<
  HistoricalVisualizationChartsProps
> = ({
  historicalData,
  showTrendLine = true,
  showEvents = true,
  showVolatility = false,
  className = "",
}) => {
  const timeSeriesData = useMemo((): TimeSeriesDataPoint[] => {
    if (!historicalData.dataPoints) return [];

    return historicalData.dataPoints.map((point, index) => {
      const previousPoint =
        index > 0 ? historicalData.dataPoints[index - 1] : null;
      const change = previousPoint
        ? point.valueInt - previousPoint.valueInt
        : 0;

      const hasEvent = historicalData.changeEvents.some(
        (event) => event.blockNumber === point.blockNumber,
      );
      const event = historicalData.changeEvents.find(
        (event) => event.blockNumber === point.blockNumber,
      );

      const windowSize = Math.min(5, index + 1);
      const windowStart = Math.max(0, index - windowSize + 1);
      const windowData = historicalData.dataPoints.slice(
        windowStart,
        index + 1,
      );
      const trend =
        windowData.reduce((sum, p) => sum + p.valueInt, 0) / windowData.length;

      let volatility = 0;
      if (windowData.length > 1) {
        const mean = trend;
        const variance =
          windowData.reduce(
            (sum, p) => sum + Math.pow(p.valueInt - mean, 2),
            0,
          ) / windowData.length;
        volatility = Math.sqrt(variance);
      }

      return {
        blockNumber: point.blockNumber,
        timestamp: point.timestamp,
        value: point.valueInt / 1e6,
        formattedValue: point.formattedValue,
        datetime: point.datetime.toLocaleString(),
        change: change / 1e6,
        volatility: volatility / 1e6,
        trend: trend / 1e6,
        hasEvent,
        eventType: event?.changeType,
      };
    });
  }, [historicalData]);

  const trendAnalysisData = useMemo((): TrendAnalysisData[] => {
    if (timeSeriesData.length < 10) return [];

    const chunkSize = Math.max(1, Math.floor(timeSeriesData.length / 10));
    const chunks: TrendAnalysisData[] = [];

    for (let i = 0; i < timeSeriesData.length; i += chunkSize) {
      const chunk = timeSeriesData.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;

      const actualValue =
        chunk.reduce((sum, point) => sum + point.value, 0) / chunk.length;
      const trendValue =
        chunk.reduce((sum, point) => sum + (point.trend || point.value), 0) /
        chunk.length;
      const deviation = Math.abs(actualValue - trendValue);
      const volatility =
        chunk.reduce((sum, point) => sum + (point.volatility || 0), 0) /
        chunk.length;

      chunks.push({
        period: `${chunk[0].blockNumber}-${chunk[chunk.length - 1].blockNumber}`,
        actualValue,
        trendValue,
        deviation,
        volatility,
      });
    }

    return chunks;
  }, [timeSeriesData]);

  const eventTimelineData = useMemo((): (EventTimelineData & {
    fill: string;
  })[] => {
    return historicalData.changeEvents.map((event) => {
      let impact: EventTimelineData["impact"] = "low";

      if (event.magnitude > 1000000) impact = "critical";
      else if (event.magnitude > 100000) impact = "high";
      else if (event.magnitude > 10000) impact = "medium";

      return {
        blockNumber: event.blockNumber,
        timestamp: event.timestamp,
        eventType: event.changeType,
        magnitude: event.magnitude / 1e6,
        description: event.description,
        impact,
        fill: getImpactColor(impact),
      };
    });
  }, [historicalData.changeEvents]);

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
          {data.hasEvent && (
            <p className="text-yellow-400 text-sm">
              Event: {data.eventType?.toUpperCase()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "increase":
        return "#10b981";
      case "decrease":
        return "#ef4444";
      case "set":
        return "#3b82f6";
      case "clear":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical":
        return "#ef4444";
      case "high":
        return "#f97316";
      case "medium":
        return "#eab308";
      default:
        return "#3b82f6";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Time Series Analysis
          </h4>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {timeSeriesData.length} Points
          </Badge>
        </div>

        {timeSeriesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={timeSeriesData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="blockNumber"
                stroke="#8b9dc3"
                fontSize={12}
                type="number"
                scale="linear"
                domain={["dataMin", "dataMax"]}
              />
              <YAxis stroke="#8b9dc3" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="value"
                stroke="#00bfff"
                strokeWidth={2}
                dot={{ fill: "#00bfff", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 6, stroke: "#00bfff", strokeWidth: 2 }}
              />

              {showTrendLine && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}

              {showVolatility && (
                <Area
                  type="monotone"
                  dataKey="volatility"
                  stroke="rgba(239,68,68,0.3)"
                  fill="rgba(239,68,68,0.1)"
                />
              )}

              {showEvents &&
                timeSeriesData
                  .filter((d) => d.hasEvent)
                  .map((point, index) => (
                    <ReferenceLine
                      key={index}
                      x={point.blockNumber}
                      stroke={getEventColor(point.eventType || "unknown")}
                      strokeDasharray="2 2"
                    />
                  ))}

              <Brush dataKey="blockNumber" height={30} stroke="#00bfff" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-[#8b9dc3]">
            No time series data available
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Trend Analysis
            </h4>
          </div>
          {trendAnalysisData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trendAnalysisData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis dataKey="period" stroke="#8b9dc3" fontSize={10} />
                <YAxis stroke="#8b9dc3" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="actualValue" fill="#00bfff" name="Actual" />
                <Line
                  type="monotone"
                  dataKey="trendValue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Trend"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-[#8b9dc3]">
              Insufficient data for trend analysis
            </div>
          )}
        </Card>

        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Volatility Analysis
            </h4>
          </div>
          {trendAnalysisData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendAnalysisData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis dataKey="period" stroke="#8b9dc3" fontSize={10} />
                <YAxis stroke="#8b9dc3" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="volatility"
                  stroke="#f59e0b"
                  fill="rgba(245,158,11,0.2)"
                  name="Volatility"
                />
                <Area
                  type="monotone"
                  dataKey="deviation"
                  stroke="#ef4444"
                  fill="rgba(239,68,68,0.1)"
                  name="Deviation"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-[#8b9dc3]">
              No volatility data available
            </div>
          )}
        </Card>
      </div>

      {eventTimelineData.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Event Timeline
            </h4>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {eventTimelineData.length} Event
              {eventTimelineData.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={eventTimelineData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="blockNumber"
                stroke="#8b9dc3"
                fontSize={12}
                type="number"
                domain={["dataMin", "dataMax"]}
              />
              <YAxis
                dataKey="magnitude"
                stroke="#8b9dc3"
                fontSize={12}
                name="Magnitude"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
                        <p className="text-[#00bfff] font-medium">
                          Block {data.blockNumber}
                        </p>
                        <p className="text-[#8b9dc3]">
                          Type: {data.eventType.toUpperCase()}
                        </p>
                        <p className="text-[#8b9dc3]">
                          Magnitude: {data.magnitude.toFixed(2)}
                        </p>
                        <p className="text-[#8b9dc3]">
                          Impact: {data.impact.toUpperCase()}
                        </p>
                        <p className="text-[#8b9dc3] text-sm">
                          {data.description}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                dataKey="magnitude"
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const color = getImpactColor(payload.impact);
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={color}
                      stroke={color}
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Historical Statistics
          </h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-sm text-[#8b9dc3] mb-1">Trend Strength</div>
            <div className="text-2xl font-bold text-[#00bfff]">
              {(historicalData.statistics.trendStrength * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-[#6b7280]">
              {historicalData.statistics.trend.toUpperCase()}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-sm text-[#8b9dc3] mb-1">Volatility</div>
            <div className="text-2xl font-bold text-[#00bfff]">
              {(historicalData.statistics.volatility / 1e6).toFixed(2)}
            </div>
            <div className="text-xs text-[#6b7280]">Standard deviation</div>
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-sm text-[#8b9dc3] mb-1">Change Frequency</div>
            <div className="text-2xl font-bold text-[#00bfff]">
              {(historicalData.statistics.changeFrequency * 1000).toFixed(1)}
            </div>
            <div className="text-xs text-[#6b7280]">
              Changes per 1000 blocks
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-sm text-[#8b9dc3] mb-1">Value Range</div>
            <div className="text-2xl font-bold text-[#00bfff]">
              {(
                (historicalData.statistics.maxValue -
                  historicalData.statistics.minValue) /
                1e6
              ).toFixed(2)}
            </div>
            <div className="text-xs text-[#6b7280]">Max - Min</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
