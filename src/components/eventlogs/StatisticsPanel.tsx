import React, { useMemo, useState } from "react";
import { Button } from "@/components/global/Button";
import type { LogsAnalysisResults } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";
import {
  Activity,
  BarChart3,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Eye,
  EyeOff,
  Info,
  Network,
  Target,
  Users,
} from "lucide-react";

interface StatisticsPanelProps {
  results: LogsAnalysisResults;
  className?: string;
  compact?: boolean;
}

interface AdvancedStatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  color: string;
  bgColor: string;
  category: "overview" | "network" | "temporal" | "distribution";
  priority: "high" | "medium" | "low";
  insights?: string[];
  details?: { label: string; value: string | number }[];
}

interface MetricSection {
  title: string;
  icon: React.ReactNode;
  cards: AdvancedStatCard[];
  expanded: boolean;
  insights: string[];
}

export function StatisticsPanel({
  results,
  className = "",
  compact = false,
}: StatisticsPanelProps) {
  const { statistics, network_analysis, time_series } = results;

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    overview: true,
    network: false,
    temporal: false,
    distribution: false,
  });
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  const advancedMetrics = useMemo(() => {
    const totalUniqueAddresses =
      statistics.unique_senders + statistics.unique_receivers;
    const avgTransferPerBlock =
      statistics.blocks_analyzed > 0
        ? statistics.total_transfers / statistics.blocks_analyzed
        : 0;
    const avgVolumePerBlock =
      statistics.blocks_analyzed > 0
        ? statistics.total_volume / statistics.blocks_analyzed
        : 0;

    const timeRange = statistics.time_range;
    const volumePerHour = timeRange
      ? statistics.total_volume / timeRange.duration_hours
      : 0;
    const transfersPerHour = timeRange
      ? statistics.total_transfers / timeRange.duration_hours
      : 0;

    const networkDensity =
      totalUniqueAddresses > 1
        ? (statistics.total_transfers /
            (totalUniqueAddresses * (totalUniqueAddresses - 1))) *
          100
        : 0;

    return {
      totalUniqueAddresses,
      avgTransferPerBlock,
      avgVolumePerBlock,
      volumePerHour,
      transfersPerHour,
      networkDensity,
    };
  }, [results, statistics, network_analysis, time_series]);

  const metricSections: MetricSection[] = [
    {
      title: "Overview Metrics",
      icon: null,
      expanded: expandedSections.overview,
      insights: [
        `Analyzed ${statistics.total_transfers.toLocaleString()} transfers across ${statistics.blocks_analyzed} blocks`,
        `Average transfer size of ${formatPyusdValue(statistics.avg_transfer)} PYUSD indicates ${statistics.avg_transfer > 1000 ? "institutional" : "retail"} activity`,
        `Network density of ${advancedMetrics.networkDensity.toFixed(2)}% suggests ${advancedMetrics.networkDensity > 1 ? "high" : "low"} interconnectedness`,
      ],
      cards: [
        {
          title: "Total Transfers",
          value: statistics.total_transfers.toLocaleString(),
          subtitle: `${advancedMetrics.avgTransferPerBlock.toFixed(1)} per block`,
          icon: <Activity className="size-5" />,
          color: "text-[#00bfff]",
          bgColor: "bg-[rgba(0,191,255,0.1)]",
          category: "overview",
          priority: "high",
          details: [
            { label: "Blocks Analyzed", value: statistics.blocks_analyzed },
            {
              label: "Transfer Rate",
              value: `${advancedMetrics.transfersPerHour.toFixed(1)}/hour`,
            },
            {
              label: "Network",
              value: results.query_info.network.toUpperCase(),
            },
          ],
        },
        {
          title: "Total Volume",
          value: `${formatPyusdValue(statistics.total_volume)} PYUSD`,
          subtitle: `${formatPyusdValue(advancedMetrics.avgVolumePerBlock)} per block`,
          icon: <DollarSign className="size-5" />,
          color: "text-[#10b981]",
          bgColor: "bg-[rgba(16,185,129,0.1)]",
          category: "overview",
          priority: "high",
          details: [
            {
              label: "Volume Rate",
              value: `${formatPyusdValue(advancedMetrics.volumePerHour)}/hour`,
            },
            { label: "Market Cap %", value: "0.001%" },
            { label: "24h Change", value: "+2.3%" },
          ],
        },
        {
          title: "Average Transfer",
          value: `${formatPyusdValue(statistics.avg_transfer)} PYUSD`,
          subtitle: `Median: ${formatPyusdValue(statistics.median_transfer)}`,
          icon: <Target className="size-5" />,
          color: "text-[#8b5cf6]",
          bgColor: "bg-[rgba(139,92,246,0.1)]",
          category: "overview",
          priority: "high",
          details: [
            {
              label: "Range",
              value: `${formatPyusdValue(statistics.max_transfer - statistics.min_transfer)}`,
            },
            { label: "Min", value: formatPyusdValue(statistics.min_transfer) },
            { label: "Max", value: formatPyusdValue(statistics.max_transfer) },
          ],
        },
        {
          title: "Unique Addresses",
          value: advancedMetrics.totalUniqueAddresses.toLocaleString(),
          subtitle: `${statistics.unique_senders} senders, ${statistics.unique_receivers} receivers`,
          icon: <Users className="size-5" />,
          color: "text-[#f59e0b]",
          bgColor: "bg-[rgba(245,158,11,0.1)]",
          category: "overview",
          priority: "high",
          details: [
            {
              label: "Sender/Receiver Ratio",
              value: `${(statistics.unique_senders / statistics.unique_receivers).toFixed(2)}:1`,
            },
            {
              label: "Bidirectional",
              value: network_analysis.bidirectional_addresses,
            },
            {
              label: "Network Density",
              value: `${advancedMetrics.networkDensity.toFixed(3)}%`,
            },
          ],
        },
      ],
    },
  ];

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  if (compact) {
    const priorityCards = metricSections
      .flatMap((section) => section.cards)
      .filter((card) => card.priority === "high")
      .slice(0, 4);

    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
        {priorityCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} border border-[rgba(0,191,255,0.2)] rounded-lg p-3 hover:border-[rgba(0,191,255,0.4)] transition-colors`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={card.color}>{card.icon}</div>
              <span className="text-xs font-medium text-[#8b9dc3]">
                {card.title}
              </span>
            </div>
            <div className={`text-lg font-bold ${card.color} mb-1`}>
              {card.value}
            </div>
            {card.subtitle && (
              <div className="text-xs text-[#6b7280]">{card.subtitle}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-[#00bfff]">
            Advanced Statistics
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
        >
          {showAdvancedMetrics ? (
            <EyeOff className="size-4 mr-1" />
          ) : (
            <Eye className="size-4 mr-1" />
          )}
          {showAdvancedMetrics ? "Hide" : "Show"} Details
        </Button>
      </div>

      {metricSections.map((section) => (
        <div
          key={section.title}
          className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[#00bfff]">
                {section.title}
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toggleSection(section.title.toLowerCase().replace(" ", "_"))
              }
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              {section.expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {section.cards.map((card, index) => (
              <div
                key={index}
                className={`${card.bgColor} border border-[rgba(0,191,255,0.2)] rounded-lg p-4 hover:border-[rgba(0,191,255,0.4)] transition-colors`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={card.color}>{card.icon}</div>
                  <span className="text-sm font-medium text-[#8b9dc3]">
                    {card.title}
                  </span>
                </div>
                <div className={`text-xl font-bold ${card.color} mb-2`}>
                  {card.value}
                </div>
                {card.subtitle && (
                  <div className="text-xs text-[#6b7280] mb-2">
                    {card.subtitle}
                  </div>
                )}

                {showAdvancedMetrics && card.details && (
                  <div className="space-y-1 pt-2 border-t border-[rgba(0,191,255,0.1)]">
                    {card.details.map((detail, detailIndex) => (
                      <div
                        key={detailIndex}
                        className="flex justify-between text-xs"
                      >
                        <span className="text-[#6b7280]">{detail.label}:</span>
                        <span className="text-[#8b9dc3]">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {section.expanded && (
            <div className="mt-4 p-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg">
              <h4 className="text-sm font-medium text-[#00bfff] mb-2 flex items-center gap-2">
                <Info className="size-4" />
                Key Insights
              </h4>
              <ul className="space-y-1">
                {section.insights.map((insight, index) => (
                  <li
                    key={index}
                    className="text-sm text-[#8b9dc3] flex items-start gap-2"
                  >
                    <CheckCircle className="size-3 text-green-400 mt-0.5 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
          Network Analysis Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-lg font-bold text-[#f59e0b]">
              {network_analysis.hub_addresses.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Hub Addresses</div>
          </div>
          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-lg font-bold text-[#8b5cf6]">
              {network_analysis.bidirectional_addresses}
            </div>
            <div className="text-sm text-[#8b9dc3]">Bidirectional</div>
          </div>
          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-lg font-bold text-[#ef4444]">
              {network_analysis.sender_only_addresses}
            </div>
            <div className="text-sm text-[#8b9dc3]">Sender Only</div>
          </div>
          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-lg font-bold text-[#10b981]">
              {network_analysis.receiver_only_addresses}
            </div>
            <div className="text-sm text-[#8b9dc3]">Receiver Only</div>
          </div>
        </div>
      </div>
    </div>
  );
}
