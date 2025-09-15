import React, { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
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
  Calendar,
  DollarSign,
  Minus,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  useRecentBlocks,
  useSupplyHistory,
} from "@/hooks/storagerange/useHistoricalStorage";
import { BookmarkManager, ExportButton } from "@/components/storagerange";

interface PYUSDSupplyHistoryAnalyzerProps {
  contractAddress: string;
  className?: string;
}

interface SupplyEvent {
  blockNumber: number;
  timestamp: number;
  eventType: "mint" | "burn" | "transfer" | "unknown";
  amount: number;
  previousSupply: number;
  newSupply: number;
  growthRate: number;
  isAnomaly: boolean;
  description: string;
}

interface SupplyMetrics {
  totalMinted: number;
  totalBurned: number;
  netChange: number;
  averageGrowthRate: number;
  maxSupply: number;
  minSupply: number;
  volatility: number;
  anomalyCount: number;
}

interface SupplyTrendData {
  blockNumber: number;
  timestamp: number;
  supply: number;
  formattedSupply: string;
  growthRate: number;
  movingAverage: number;
  upperBound: number;
  lowerBound: number;
  isAnomaly: boolean;
  eventType?: string;
}

export const PYUSDSupplyHistoryAnalyzer: React.FC<
  PYUSDSupplyHistoryAnalyzerProps
> = ({ contractAddress, className = "" }) => {
  const [blockCount, setBlockCount] = useState(100);
  const [blockInterval, setBlockInterval] = useState(500);
  const [anomalyThreshold, setAnomalyThreshold] = useState(2.0);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState(true);

  const { blockNumbers, isLoading: blocksLoading } = useRecentBlocks(
    blockCount,
    blockInterval
  );

  const {
    data: supplyHistory,
    isLoading: dataLoading,
    isError,
    error,
    refetch,
  } = useSupplyHistory(contractAddress, blockNumbers, {
    enabled: !!contractAddress && blockNumbers.length > 0,
  });

  const isLoading = blocksLoading || dataLoading;

  const supplyEvents = useMemo((): SupplyEvent[] => {
    if (!supplyHistory?.changeEvents || !supplyHistory?.dataPoints) return [];

    return supplyHistory.changeEvents.map((event, index) => {
      const currentPoint = supplyHistory.dataPoints.find(
        (p) => p.blockNumber === event.blockNumber
      );
      const previousPoint = supplyHistory.dataPoints.find(
        (p) => p.blockNumber < event.blockNumber
      );

      const previousSupply = previousPoint ? previousPoint.valueInt / 1e6 : 0;
      const newSupply = currentPoint ? currentPoint.valueInt / 1e6 : 0;
      const amount = Math.abs(newSupply - previousSupply);

      let eventType: SupplyEvent["eventType"] = "unknown";
      if (event.changeType === "increase") {
        eventType = "mint";
      } else if (event.changeType === "decrease") {
        eventType = "burn";
      } else if (event.changeType === "set" || event.changeType === "clear") {
        eventType = "transfer";
      }

      const growthRate =
        previousSupply > 0
          ? ((newSupply - previousSupply) / previousSupply) * 100
          : 0;

      const allChanges = supplyHistory.changeEvents.map((e) =>
        Math.abs(e.magnitude / 1e6)
      );
      const avgChange =
        allChanges.reduce((sum, val) => sum + val, 0) / allChanges.length;
      const stdDev = Math.sqrt(
        allChanges.reduce((sum, val) => sum + Math.pow(val - avgChange, 2), 0) /
          allChanges.length
      );
      const isAnomaly =
        Math.abs(amount - avgChange) > anomalyThreshold * stdDev;

      return {
        blockNumber: event.blockNumber,
        timestamp: event.timestamp,
        eventType,
        amount,
        previousSupply,
        newSupply,
        growthRate,
        isAnomaly,
        description: event.description,
      };
    });
  }, [supplyHistory, anomalyThreshold]);

  const supplyMetrics = useMemo((): SupplyMetrics => {
    if (!supplyEvents.length || !supplyHistory?.statistics) {
      return {
        totalMinted: 0,
        totalBurned: 0,
        netChange: 0,
        averageGrowthRate: 0,
        maxSupply: 0,
        minSupply: 0,
        volatility: 0,
        anomalyCount: 0,
      };
    }

    const mintEvents = supplyEvents.filter((e) => e.eventType === "mint");
    const burnEvents = supplyEvents.filter((e) => e.eventType === "burn");

    const totalMinted = mintEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalBurned = burnEvents.reduce((sum, e) => sum + e.amount, 0);
    const netChange = totalMinted - totalBurned;

    const growthRates = supplyEvents
      .map((e) => e.growthRate)
      .filter((rate) => !isNaN(rate));
    const averageGrowthRate =
      growthRates.length > 0
        ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
        : 0;

    const anomalyCount = supplyEvents.filter((e) => e.isAnomaly).length;

    return {
      totalMinted,
      totalBurned,
      netChange,
      averageGrowthRate,
      maxSupply: supplyHistory.statistics.maxValue / 1e6,
      minSupply: supplyHistory.statistics.minValue / 1e6,
      volatility: supplyHistory.statistics.volatility / 1e6,
      anomalyCount,
    };
  }, [supplyEvents, supplyHistory]);

  const trendData = useMemo((): SupplyTrendData[] => {
    if (!supplyHistory?.dataPoints) return [];

    const windowSize = Math.min(
      10,
      Math.floor(supplyHistory.dataPoints.length / 5)
    );

    return supplyHistory.dataPoints.map((point, index) => {
      const supply = point.valueInt / 1e6;

      const windowStart = Math.max(0, index - windowSize + 1);
      const windowData = supplyHistory.dataPoints.slice(windowStart, index + 1);
      const movingAverage =
        windowData.reduce((sum, p) => sum + p.valueInt, 0) /
        (windowData.length * 1e6);

      const windowValues = windowData.map((p) => p.valueInt / 1e6);
      const windowStdDev =
        windowValues.length > 1
          ? Math.sqrt(
              windowValues.reduce(
                (sum, val) => sum + Math.pow(val - movingAverage, 2),
                0
              ) / windowValues.length
            )
          : 0;

      const upperBound = movingAverage + anomalyThreshold * windowStdDev;
      const lowerBound = movingAverage - anomalyThreshold * windowStdDev;

      const isAnomaly = supply > upperBound || supply < lowerBound;

      const event = supplyEvents.find(
        (e) => e.blockNumber === point.blockNumber
      );

      const previousPoint =
        index > 0 ? supplyHistory.dataPoints[index - 1] : null;
      const growthRate = previousPoint
        ? ((supply - previousPoint.valueInt / 1e6) /
            (previousPoint.valueInt / 1e6)) *
          100
        : 0;

      return {
        blockNumber: point.blockNumber,
        timestamp: point.timestamp,
        supply,
        formattedSupply: supply.toLocaleString(),
        growthRate,
        movingAverage,
        upperBound,
        lowerBound,
        isAnomaly,
        eventType: event?.eventType,
      };
    });
  }, [supplyHistory, supplyEvents, anomalyThreshold]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">Block {label}</p>
          <p className="text-[#8b9dc3]">Supply: {data.formattedSupply} PYUSD</p>
          <p className="text-[#8b9dc3]">
            Growth Rate: {data.growthRate.toFixed(2)}%
          </p>
          <p className="text-[#8b9dc3]">
            Time: {new Date(data.timestamp * 1000).toLocaleString()}
          </p>
          {data.isAnomaly && (
            <p className="text-red-400 text-sm">⚠️ Anomaly Detected</p>
          )}
          {data.eventType && (
            <p className="text-yellow-400 text-sm">
              Event: {data.eventType.toUpperCase()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "mint":
        return <Plus className="h-4 w-4 text-green-400" />;
      case "burn":
        return <Minus className="h-4 w-4 text-red-400" />;
      case "transfer":
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "mint":
        return "border-green-500/50 text-green-400 bg-green-500/10";
      case "burn":
        return "border-red-500/50 text-red-400 bg-red-500/10";
      case "transfer":
        return "border-blue-500/50 text-blue-400 bg-blue-500/10";
      default:
        return "border-gray-500/50 text-gray-400 bg-gray-500/10";
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
            {error?.message || "Failed to analyze PYUSD supply history"}
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
          <DollarSign className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            PYUSD Supply History Analysis
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
              Block Count
            </label>
            <Input
              type="number"
              value={blockCount}
              onChange={(e) => setBlockCount(parseInt(e.target.value) || 100)}
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
              onChange={(e) =>
                setBlockInterval(parseInt(e.target.value) || 500)
              }
              min="1"
              max="5000"
              className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
              Anomaly Threshold (σ)
            </label>
            <Input
              type="number"
              step="0.1"
              value={anomalyThreshold}
              onChange={(e) =>
                setAnomalyThreshold(parseFloat(e.target.value) || 2.0)
              }
              min="0.5"
              max="5.0"
              className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-[#8b9dc3]">
              Display Options
            </label>
            <div className="flex gap-2">
              <Button
                variant={showAnomalies ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAnomalies(!showAnomalies)}
                className="text-xs"
              >
                Anomalies
              </Button>
              <Button
                variant={showMovingAverage ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMovingAverage(!showMovingAverage)}
                className="text-xs"
              >
                MA
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {supplyHistory && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Supply Metrics
            </h4>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {supplyEvents.length} Events
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                +{supplyMetrics.totalMinted.toLocaleString()}
              </div>
              <div className="text-sm text-[#8b9dc3]">Total Minted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                -{supplyMetrics.totalBurned.toLocaleString()}
              </div>
              <div className="text-sm text-[#8b9dc3]">Total Burned</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${supplyMetrics.netChange >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {supplyMetrics.netChange >= 0 ? "+" : ""}
                {supplyMetrics.netChange.toLocaleString()}
              </div>
              <div className="text-sm text-[#8b9dc3]">Net Change</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {supplyMetrics.averageGrowthRate.toFixed(2)}%
              </div>
              <div className="text-sm text-[#8b9dc3]">Avg Growth Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-xl font-bold text-[#00bfff]">
                {supplyMetrics.maxSupply.toLocaleString()}
              </div>
              <div className="text-sm text-[#8b9dc3]">Max Supply</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[#00bfff]">
                {supplyMetrics.minSupply.toLocaleString()}
              </div>
              <div className="text-sm text-[#8b9dc3]">Min Supply</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[#00bfff]">
                {supplyMetrics.volatility.toFixed(2)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Volatility</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">
                {supplyMetrics.anomalyCount}
              </div>
              <div className="text-sm text-[#8b9dc3]">Anomalies</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Supply Trend Analysis
          </h4>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {trendData.length} Points
            </Badge>
            {supplyHistory && (
              <Badge
                variant="outline"
                className={
                  supplyHistory.statistics.trend === "increasing"
                    ? "border-green-500/50 text-green-400 bg-green-500/10"
                    : supplyHistory.statistics.trend === "decreasing"
                      ? "border-red-500/50 text-red-400 bg-red-500/10"
                      : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                }
              >
                {supplyHistory.statistics.trend.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00bfff] mx-auto mb-3"></div>
            <p className="text-[#8b9dc3]">Loading supply history...</p>
          </div>
        ) : trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={trendData}>
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
                dataKey="supply"
                stroke="#00bfff"
                strokeWidth={2}
                dot={false}
                name="Supply"
              />

              {showMovingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Moving Average"
                />
              )}

              {showAnomalies && (
                <>
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="rgba(239,68,68,0.3)"
                    fill="rgba(239,68,68,0.1)"
                    name="Upper Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="rgba(239,68,68,0.3)"
                    fill="rgba(239,68,68,0.1)"
                    name="Lower Bound"
                  />
                </>
              )}

              {trendData
                .filter((d) => d.eventType)
                .map((point, index) => (
                  <ReferenceLine
                    key={index}
                    x={point.blockNumber}
                    stroke={
                      point.eventType === "mint"
                        ? "#10b981"
                        : point.eventType === "burn"
                          ? "#ef4444"
                          : "#3b82f6"
                    }
                    strokeDasharray="2 2"
                  />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-[#8b9dc3]">
            No supply trend data available
          </div>
        )}
      </Card>

      {supplyEvents.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Supply Events Timeline
            </h4>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {supplyEvents.length} Event{supplyEvents.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {supplyEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="mt-0.5">{getEventIcon(event.eventType)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#00bfff] text-sm">
                      Block {event.blockNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className={getEventColor(event.eventType)}
                    >
                      {event.eventType.toUpperCase()}
                    </Badge>
                    {event.isAnomaly && (
                      <Badge
                        variant="outline"
                        className="border-red-500/50 text-red-400 bg-red-500/10"
                      >
                        ANOMALY
                      </Badge>
                    )}
                  </div>
                  <p className="text-[#8b9dc3] text-sm mb-1">
                    {event.description}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#6b7280]">
                    <div>Amount: {event.amount.toLocaleString()}</div>
                    <div>Growth: {event.growthRate.toFixed(2)}%</div>
                    <div>New Supply: {event.newSupply.toLocaleString()}</div>
                    <div>
                      {new Date(event.timestamp * 1000).toLocaleDateString()}
                    </div>
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
