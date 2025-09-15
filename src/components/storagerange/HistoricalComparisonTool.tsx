import React, { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
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
  BarChart3,
  GitCompare,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  useBlockNumberRange,
  useMultipleHistoricalStorage,
} from "@/hooks/storagerange";

interface HistoricalComparisonToolProps {
  contractAddress: string;
  slot: string;
  className?: string;
}

interface ComparisonPeriod {
  id: string;
  name: string;
  startBlock: number;
  endBlock: number;
  color: string;
}

interface ComparisonData {
  blockOffset: number;
  period1Value: number;
  period2Value: number;
  difference: number;
  percentChange: number;
}

interface PeriodStatistics {
  period: string;
  minValue: number;
  maxValue: number;
  averageValue: number;
  volatility: number;
  totalChanges: number;
  trend: string;
  trendStrength: number;
}

export const HistoricalComparisonTool: React.FC<
  HistoricalComparisonToolProps
> = ({ contractAddress, slot, className = "" }) => {
  const [periods, setPeriods] = useState<ComparisonPeriod[]>([
    {
      id: "period1",
      name: "Period 1",
      startBlock: 18500000,
      endBlock: 18600000,
      color: "#00bfff",
    },
    {
      id: "period2",
      name: "Period 2",
      startBlock: 18600000,
      endBlock: 18700000,
      color: "#10b981",
    },
  ]);

  const [blockInterval, setBlockInterval] = useState(1000);
  const [comparisonType, setComparisonType] = useState<
    "overlay" | "difference" | "normalized"
  >("overlay");

  const period1Blocks = useBlockNumberRange(
    periods[0].startBlock,
    periods[0].endBlock,
    blockInterval
  );
  const period2Blocks = useBlockNumberRange(
    periods[1].startBlock,
    periods[1].endBlock,
    blockInterval
  );

  const {
    data: historicalDataArray,
    isLoading,
    isError,
  } = useMultipleHistoricalStorage([
    {
      contractAddress,
      slot,
      blockNumbers: period1Blocks,
      includeTimestamps: true,
      formatValues: true,
    },
    {
      contractAddress,
      slot,
      blockNumbers: period2Blocks,
      includeTimestamps: true,
      formatValues: true,
    },
  ]);

  const [period1Data, period2Data] = historicalDataArray;

  const comparisonData = useMemo((): ComparisonData[] => {
    if (!period1Data?.dataPoints || !period2Data?.dataPoints) return [];

    const minLength = Math.min(
      period1Data.dataPoints.length,
      period2Data.dataPoints.length
    );
    const data: ComparisonData[] = [];

    for (let i = 0; i < minLength; i++) {
      const p1Value = period1Data.dataPoints[i].valueInt / 1e6;
      const p2Value = period2Data.dataPoints[i].valueInt / 1e6;
      const difference = p2Value - p1Value;
      const percentChange = p1Value !== 0 ? (difference / p1Value) * 100 : 0;

      data.push({
        blockOffset: i,
        period1Value: p1Value,
        period2Value: p2Value,
        difference,
        percentChange,
      });
    }

    return data;
  }, [period1Data, period2Data]);

  const periodStatistics = useMemo((): PeriodStatistics[] => {
    const stats: PeriodStatistics[] = [];

    [period1Data, period2Data].forEach((data, index) => {
      if (!data) return;

      stats.push({
        period: periods[index].name,
        minValue: data.statistics.minValue / 1e6,
        maxValue: data.statistics.maxValue / 1e6,
        averageValue: data.statistics.averageValue / 1e6,
        volatility: data.statistics.volatility / 1e6,
        totalChanges: data.statistics.totalChanges,
        trend: data.statistics.trend,
        trendStrength: data.statistics.trendStrength,
      });
    });

    return stats;
  }, [period1Data, period2Data, periods]);

  const overlayChartData = useMemo(() => {
    if (!period1Data?.dataPoints || !period2Data?.dataPoints) return [];

    const maxLength = Math.max(
      period1Data.dataPoints.length,
      period2Data.dataPoints.length
    );
    const data = [];

    for (let i = 0; i < maxLength; i++) {
      const p1Point = period1Data.dataPoints[i];
      const p2Point = period2Data.dataPoints[i];

      data.push({
        index: i,
        [periods[0].name]: p1Point ? p1Point.valueInt / 1e6 : null,
        [periods[1].name]: p2Point ? p2Point.valueInt / 1e6 : null,
        p1Block: p1Point?.blockNumber,
        p2Block: p2Point?.blockNumber,
      });
    }

    return data;
  }, [period1Data, period2Data, periods]);

  const normalizedChartData = useMemo(() => {
    if (!period1Data?.dataPoints || !period2Data?.dataPoints) return [];

    const p1Values = period1Data.dataPoints.map((p) => p.valueInt);
    const p2Values = period2Data.dataPoints.map((p) => p.valueInt);

    const p1Min = Math.min(...p1Values);
    const p1Max = Math.max(...p1Values);
    const p2Min = Math.min(...p2Values);
    const p2Max = Math.max(...p2Values);

    const maxLength = Math.max(p1Values.length, p2Values.length);
    const data = [];

    for (let i = 0; i < maxLength; i++) {
      const p1Value = p1Values[i];
      const p2Value = p2Values[i];

      const p1Normalized =
        p1Value !== undefined
          ? ((p1Value - p1Min) / (p1Max - p1Min)) * 100
          : null;
      const p2Normalized =
        p2Value !== undefined
          ? ((p2Value - p2Min) / (p2Max - p2Min)) * 100
          : null;

      data.push({
        index: i,
        [periods[0].name]: p1Normalized,
        [periods[1].name]: p2Normalized,
      });
    }

    return data;
  }, [period1Data, period2Data, periods]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">Index {label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-[#8b9dc3]"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${entry.value?.toFixed(2) || "N/A"}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const updatePeriod = (
    periodId: string,
    field: keyof ComparisonPeriod,
    value: any
  ) => {
    setPeriods((prev) =>
      prev.map((p) => (p.id === periodId ? { ...p, [field]: value } : p))
    );
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

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00bfff] mx-auto mb-3"></div>
          <p className="text-[#8b9dc3]">Loading comparison data...</p>
        </div>
      );
    }

    if (isError || !period1Data || !period2Data) {
      return (
        <div className="text-center py-8 text-[#8b9dc3]">
          No comparison data available
        </div>
      );
    }

    const chartHeight = 400;

    switch (comparisonType) {
      case "difference":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={comparisonData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis dataKey="blockOffset" stroke="#8b9dc3" fontSize={12} />
              <YAxis stroke="#8b9dc3" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="difference" fill="#00bfff" name="Difference" />
              <Line
                type="monotone"
                dataKey="percentChange"
                stroke="#10b981"
                strokeWidth={2}
                name="% Change"
                yAxisId="right"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "normalized":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={normalizedChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis dataKey="index" stroke="#8b9dc3" fontSize={12} />
              <YAxis stroke="#8b9dc3" fontSize={12} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={periods[0].name}
                stroke={periods[0].color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={periods[1].name}
                stroke={periods[1].color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={overlayChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis dataKey="index" stroke="#8b9dc3" fontSize={12} />
              <YAxis stroke="#8b9dc3" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={periods[0].name}
                stroke={periods[0].color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={periods[1].name}
                stroke={periods[1].color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Historical Period Comparison
          </h3>
        </div>

        <div className="space-y-4">
          {periods.map((period, index) => (
            <div
              key={period.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
            >
              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                  Period Name
                </label>
                <Input
                  value={period.name}
                  onChange={(e) =>
                    updatePeriod(period.id, "name", e.target.value)
                  }
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                  Start Block
                </label>
                <Input
                  type="number"
                  value={period.startBlock}
                  onChange={(e) =>
                    updatePeriod(
                      period.id,
                      "startBlock",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                  End Block
                </label>
                <Input
                  type="number"
                  value={period.endBlock}
                  onChange={(e) =>
                    updatePeriod(
                      period.id,
                      "endBlock",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border border-[rgba(0,191,255,0.3)]"
                    style={{ backgroundColor: period.color }}
                  />
                  <span className="text-[#8b9dc3] text-sm">{period.color}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                Block Interval
              </label>
              <Input
                type="number"
                value={blockInterval}
                onChange={(e) =>
                  setBlockInterval(parseInt(e.target.value) || 1000)
                }
                min="1"
                max="10000"
                className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                Comparison Type
              </label>
              <select
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value as any)}
                className="w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded-md px-3 py-2 text-sm focus:border-[#00bfff] focus:outline-none"
              >
                <option value="overlay">Overlay</option>
                <option value="difference">Difference</option>
                <option value="normalized">Normalized (0-100)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Period Comparison Chart
          </h4>
          <div className="flex items-center gap-2">
            {periods.map((period) => (
              <Badge
                key={period.id}
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                style={{ borderColor: period.color, color: period.color }}
              >
                {period.name}
              </Badge>
            ))}
          </div>
        </div>

        {renderChart()}
      </Card>

      {periodStatistics.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Statistical Comparison
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(0,191,255,0.1)]">
                  <th className="text-left py-2 text-[#8b9dc3]">Metric</th>
                  {periodStatistics.map((stat) => (
                    <th
                      key={stat.period}
                      className="text-left py-2 text-[#8b9dc3]"
                    >
                      {stat.period}
                    </th>
                  ))}
                  <th className="text-left py-2 text-[#8b9dc3]">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[rgba(0,191,255,0.05)]">
                  <td className="py-2 text-[#8b9dc3]">Average Value</td>
                  {periodStatistics.map((stat) => (
                    <td key={stat.period} className="py-2 text-[#00bfff]">
                      {stat.averageValue.toFixed(2)}
                    </td>
                  ))}
                  <td className="py-2 text-[#00bfff]">
                    {periodStatistics.length > 1 && (
                      <span
                        className={
                          periodStatistics[1].averageValue >
                          periodStatistics[0].averageValue
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {(
                          periodStatistics[1].averageValue -
                          periodStatistics[0].averageValue
                        ).toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-[rgba(0,191,255,0.05)]">
                  <td className="py-2 text-[#8b9dc3]">Volatility</td>
                  {periodStatistics.map((stat) => (
                    <td key={stat.period} className="py-2 text-[#00bfff]">
                      {stat.volatility.toFixed(2)}
                    </td>
                  ))}
                  <td className="py-2 text-[#00bfff]">
                    {periodStatistics.length > 1 && (
                      <span
                        className={
                          periodStatistics[1].volatility >
                          periodStatistics[0].volatility
                            ? "text-red-400"
                            : "text-green-400"
                        }
                      >
                        {(
                          periodStatistics[1].volatility -
                          periodStatistics[0].volatility
                        ).toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-[rgba(0,191,255,0.05)]">
                  <td className="py-2 text-[#8b9dc3]">Total Changes</td>
                  {periodStatistics.map((stat) => (
                    <td key={stat.period} className="py-2 text-[#00bfff]">
                      {stat.totalChanges}
                    </td>
                  ))}
                  <td className="py-2 text-[#00bfff]">
                    {periodStatistics.length > 1 && (
                      <span>
                        {periodStatistics[1].totalChanges -
                          periodStatistics[0].totalChanges}
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-[#8b9dc3]">Trend</td>
                  {periodStatistics.map((stat) => (
                    <td key={stat.period} className="py-2">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(stat.trend)}
                        <span className="text-[#00bfff]">{stat.trend}</span>
                        <span className="text-[#8b9dc3] text-xs">
                          ({(stat.trendStrength * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                  ))}
                  <td className="py-2 text-[#8b9dc3]">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
