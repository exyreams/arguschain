import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import {
  Activity,
  BarChart3,
  Network,
  PieChart as PieChartIcon,
  Target,
  Users,
} from "lucide-react";

interface TokenEconomicsVisualizerProps {
  tokenData: TokenEconomicsData;
  holderData: HolderAnalysisData;
  className?: string;
}

interface TokenEconomicsData {
  totalSupply: number;
  circulatingSupply: number;
  maxSupply?: number;
  marketCap?: number;
  volume24h?: number;
  priceChange24h?: number;
  holders: number;
  transactions24h?: number;
}

interface HolderAnalysisData {
  totalHolders: number;
  topHolders: HolderInfo[];
  distribution: DistributionBucket[];
  concentrationMetrics: ConcentrationMetrics;
  holderTypes: HolderTypeDistribution;
}

interface HolderInfo {
  address: string;
  balance: number;
  percentage: number;
  type: "whale" | "large" | "medium" | "small" | "dust";
  category: "contract" | "eoa" | "exchange" | "multisig" | "unknown";
  label?: string;
}

interface DistributionBucket {
  range: string;
  minBalance: number;
  maxBalance: number;
  holderCount: number;
  totalBalance: number;
  percentage: number;
  averageBalance: number;
}

interface ConcentrationMetrics {
  giniCoefficient: number;
  herfindahlIndex: number;
  top1Percentage: number;
  top5Percentage: number;
  top10Percentage: number;
  top50Percentage: number;
  top100Percentage: number;
  nakamotoCoefficient: number;
}

interface HolderTypeDistribution {
  contracts: number;
  eoas: number;
  exchanges: number;
  multisigs: number;
  unknown: number;
}

interface UtilityMetrics {
  activeHolders: number;
  dormantHolders: number;
  transferFrequency: number;
  averageHoldingPeriod: number;
  velocityScore: number;
  liquidityScore: number;
}

export const TokenEconomicsVisualizer: React.FC<
  TokenEconomicsVisualizerProps
> = ({ tokenData, holderData, className = "" }) => {
  const economicsMetrics = useMemo(() => {
    const supplyUtilization = tokenData.maxSupply
      ? (tokenData.circulatingSupply / tokenData.maxSupply) * 100
      : 100;

    const holderDensity =
      tokenData.holders / (tokenData.circulatingSupply / 1000);

    const concentrationRisk =
      holderData.concentrationMetrics.giniCoefficient * 100;

    const liquidityRatio =
      tokenData.volume24h && tokenData.marketCap
        ? (tokenData.volume24h / tokenData.marketCap) * 100
        : 0;

    return {
      supplyUtilization,
      holderDensity,
      concentrationRisk,
      liquidityRatio,
      decentralizationScore: Math.max(0, 100 - concentrationRisk),
      healthScore: Math.round(
        (100 - concentrationRisk) * 0.3 +
          Math.min(100, holderDensity * 10) * 0.2 +
          Math.min(100, liquidityRatio) * 0.2 +
          Math.min(100, supplyUtilization) * 0.3,
      ),
    };
  }, [tokenData, holderData]);

  const holderDistributionData = useMemo(() => {
    return holderData.distribution.map((bucket) => ({
      ...bucket,
      name: bucket.range,
      value: bucket.holderCount,
      balance: bucket.totalBalance,
      avgBalance: bucket.averageBalance,
    }));
  }, [holderData.distribution]);

  const concentrationData = useMemo(() => {
    const { concentrationMetrics } = holderData;
    return [
      {
        name: "Top 1",
        percentage: concentrationMetrics.top1Percentage,
        cumulative: concentrationMetrics.top1Percentage,
      },
      {
        name: "Top 5",
        percentage:
          concentrationMetrics.top5Percentage -
          concentrationMetrics.top1Percentage,
        cumulative: concentrationMetrics.top5Percentage,
      },
      {
        name: "Top 10",
        percentage:
          concentrationMetrics.top10Percentage -
          concentrationMetrics.top5Percentage,
        cumulative: concentrationMetrics.top10Percentage,
      },
      {
        name: "Top 50",
        percentage:
          concentrationMetrics.top50Percentage -
          concentrationMetrics.top10Percentage,
        cumulative: concentrationMetrics.top50Percentage,
      },
      {
        name: "Top 100",
        percentage:
          concentrationMetrics.top100Percentage -
          concentrationMetrics.top50Percentage,
        cumulative: concentrationMetrics.top100Percentage,
      },
      {
        name: "Others",
        percentage: 100 - concentrationMetrics.top100Percentage,
        cumulative: 100,
      },
    ];
  }, [holderData.concentrationMetrics]);

  const holderTypeData = useMemo(() => {
    const { holderTypes } = holderData;
    return [
      { name: "EOAs", value: holderTypes.eoas, color: "#00bfff" },
      { name: "Contracts", value: holderTypes.contracts, color: "#10b981" },
      { name: "Exchanges", value: holderTypes.exchanges, color: "#f59e0b" },
      { name: "Multisigs", value: holderTypes.multisigs, color: "#8b5cf6" },
      { name: "Unknown", value: holderTypes.unknown, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [holderData.holderTypes]);

  const whaleAnalysisData = useMemo(() => {
    const whales = holderData.topHolders.filter((h) => h.type === "whale");
    const large = holderData.topHolders.filter((h) => h.type === "large");
    const medium = holderData.topHolders.filter((h) => h.type === "medium");
    const small = holderData.topHolders.filter((h) => h.type === "small");

    return [
      {
        category: "Whales",
        count: whales.length,
        totalBalance: whales.reduce((sum, h) => sum + h.balance, 0),
        avgBalance:
          whales.length > 0
            ? whales.reduce((sum, h) => sum + h.balance, 0) / whales.length
            : 0,
        color: "#ef4444",
      },
      {
        category: "Large",
        count: large.length,
        totalBalance: large.reduce((sum, h) => sum + h.balance, 0),
        avgBalance:
          large.length > 0
            ? large.reduce((sum, h) => sum + h.balance, 0) / large.length
            : 0,
        color: "#f97316",
      },
      {
        category: "Medium",
        count: medium.length,
        totalBalance: medium.reduce((sum, h) => sum + h.balance, 0),
        avgBalance:
          medium.length > 0
            ? medium.reduce((sum, h) => sum + h.balance, 0) / medium.length
            : 0,
        color: "#eab308",
      },
      {
        category: "Small",
        count: small.length,
        totalBalance: small.reduce((sum, h) => sum + h.balance, 0),
        avgBalance:
          small.length > 0
            ? small.reduce((sum, h) => sum + h.balance, 0) / small.length
            : 0,
        color: "#22c55e",
      },
    ];
  }, [holderData.topHolders]);

  const economicsRadarData = useMemo(() => {
    return [
      {
        metric: "Decentralization",
        value: economicsMetrics.decentralizationScore,
      },
      {
        metric: "Liquidity",
        value: Math.min(100, economicsMetrics.liquidityRatio),
      },
      {
        metric: "Distribution",
        value: Math.min(100, economicsMetrics.holderDensity * 10),
      },
      { metric: "Utilization", value: economicsMetrics.supplyUtilization },
      {
        metric: "Activity",
        value: tokenData.transactions24h
          ? Math.min(100, tokenData.transactions24h / 100)
          : 50,
      },
      {
        metric: "Stability",
        value: tokenData.priceChange24h
          ? Math.max(0, 100 - Math.abs(tokenData.priceChange24h))
          : 50,
      },
    ];
  }, [economicsMetrics, tokenData]);

  const treemapData = useMemo(() => {
    return holderData.topHolders.slice(0, 20).map((holder, index) => ({
      name: holder.label || `Holder ${index + 1}`,
      size: holder.balance,
      percentage: holder.percentage,
      type: holder.category,
      color:
        holder.category === "exchange"
          ? "#f59e0b"
          : holder.category === "contract"
            ? "#10b981"
            : holder.category === "multisig"
              ? "#8b5cf6"
              : "#00bfff",
    }));
  }, [holderData.topHolders]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-[#8b9dc3]"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const TreemapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">{data.name}</p>
          <p className="text-[#8b9dc3]">
            Balance: {data.size.toLocaleString()}
          </p>
          <p className="text-[#8b9dc3]">
            Percentage: {data.percentage.toFixed(2)}%
          </p>
          <p className="text-[#8b9dc3]">Type: {data.type}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Token Economics Overview
          </h3>
          <Badge
            variant="outline"
            className={
              economicsMetrics.healthScore >= 80
                ? "border-green-500/50 text-green-400 bg-green-500/10"
                : economicsMetrics.healthScore >= 60
                  ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                  : "border-red-500/50 text-red-400 bg-red-500/10"
            }
          >
            Health: {economicsMetrics.healthScore}/100
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {tokenData.holders.toLocaleString()}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Holders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {economicsMetrics.decentralizationScore.toFixed(0)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Decentralization</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {holderData.concentrationMetrics.giniCoefficient.toFixed(3)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Gini Coefficient</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {holderData.concentrationMetrics.nakamotoCoefficient}
            </div>
            <div className="text-sm text-[#8b9dc3]">Nakamoto Coeff.</div>
          </div>
        </div>

        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={economicsRadarData}>
              <PolarGrid stroke="rgba(0,191,255,0.1)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "#8b9dc3", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#8b9dc3", fontSize: 10 }}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#00bfff"
                fill="rgba(0,191,255,0.2)"
                fillOpacity={0.6}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Holder Distribution
            </h4>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={holderDistributionData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis dataKey="name" stroke="#8b9dc3" fontSize={12} />
              <YAxis stroke="#8b9dc3" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#00bfff" name="Holders" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Network className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Holder Types
            </h4>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={holderTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {holderTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Concentration Analysis
          </h4>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={concentrationData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis dataKey="name" stroke="#8b9dc3" fontSize={12} />
              <YAxis stroke="#8b9dc3" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="percentage" fill="#00bfff" name="Percentage" />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#10b981"
                strokeWidth={2}
                name="Cumulative"
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">Top 1%</div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {holderData.concentrationMetrics.top1Percentage.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">Top 10%</div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {holderData.concentrationMetrics.top10Percentage.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">HHI</div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {holderData.concentrationMetrics.herfindahlIndex.toFixed(4)}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">Nakamoto</div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {holderData.concentrationMetrics.nakamotoCoefficient}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
              <h5 className="font-medium text-[#00bfff] mb-2">
                Concentration Risk
              </h5>
              <div className="w-full bg-[rgba(0,191,255,0.1)] rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    economicsMetrics.concentrationRisk > 80
                      ? "bg-red-500"
                      : economicsMetrics.concentrationRisk > 60
                        ? "bg-orange-500"
                        : economicsMetrics.concentrationRisk > 40
                          ? "bg-yellow-500"
                          : "bg-green-500"
                  }`}
                  style={{ width: `${economicsMetrics.concentrationRisk}%` }}
                ></div>
              </div>
              <div className="text-xs text-[#8b9dc3] mt-1">
                {economicsMetrics.concentrationRisk.toFixed(1)}% concentration
                risk
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Whale Analysis
          </h4>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={whaleAnalysisData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
            <XAxis dataKey="category" stroke="#8b9dc3" fontSize={12} />
            <YAxis stroke="#8b9dc3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#00bfff" name="Count" />
            <Bar dataKey="avgBalance" fill="#10b981" name="Avg Balance" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Top Holders Visualization
          </h4>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            fill="#00bfff"
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
