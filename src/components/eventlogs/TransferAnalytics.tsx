import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Network,
  TrendingUp,
  Users,
  Brain,
  AlertTriangle,
  Target,
  Zap,
  Eye,
  EyeOff,
  Calculator,
  PieChart,
  LineChart,
  Layers,
  Shield,
  Search,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import type { LogsAnalysisResults, ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";

interface TransferAnalyticsProps {
  results: LogsAnalysisResults;
  loading?: boolean;
  transfers?: ParsedTransferLog[];
}

interface StatisticalMetrics {
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
    iqr: number;
  };
  outliers: {
    lower: number[];
    upper: number[];
  };
}

interface ParticipantBehavior {
  whales: number;
  frequentTraders: number;
  oneTimeUsers: number;
  hubAddresses: number;
  regularUsers: number;
  behaviorPatterns: {
    burstTraders: number;
    steadyTraders: number;
    volatileTraders: number;
  };
}

interface NetworkCentrality {
  degreeCentrality: Map<string, number>;
  betweennessCentrality: Map<string, number>;
  closenessCentrality: Map<string, number>;
  eigenvectorCentrality: Map<string, number>;
  pageRank: Map<string, number>;
}

interface AnomalyDetection {
  volumeAnomalies: ParsedTransferLog[];
  timeAnomalies: ParsedTransferLog[];
  patternAnomalies: ParsedTransferLog[];
  riskScore: number;
}

export const TransferAnalytics: React.FC<TransferAnalyticsProps> = ({
  results,
  loading = false,
  transfers = [],
}) => {
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<
    "statistical" | "behavioral" | "network" | "anomaly"
  >("statistical");
  // Advanced Statistical Analysis
  const statisticalMetrics = useMemo((): StatisticalMetrics => {
    if (!transfers || transfers.length === 0) {
      return {
        mean: 0,
        median: 0,
        mode: 0,
        standardDeviation: 0,
        variance: 0,
        skewness: 0,
        kurtosis: 0,
        quartiles: { q1: 0, q2: 0, q3: 0, iqr: 0 },
        outliers: { lower: [], upper: [] },
      };
    }

    const values = transfers.map((t) => t.value_pyusd).sort((a, b) => a - b);
    const n = values.length;

    // Basic statistics
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const median =
      n % 2 === 0
        ? (values[n / 2 - 1] + values[n / 2]) / 2
        : values[Math.floor(n / 2)];

    // Mode calculation
    const frequency = new Map<number, number>();
    values.forEach((val) => frequency.set(val, (frequency.get(val) || 0) + 1));
    const mode = Array.from(frequency.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    // Variance and standard deviation
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Skewness and kurtosis
    const skewness =
      values.reduce(
        (sum, val) => sum + Math.pow((val - mean) / standardDeviation, 3),
        0
      ) / n;
    const kurtosis =
      values.reduce(
        (sum, val) => sum + Math.pow((val - mean) / standardDeviation, 4),
        0
      ) /
        n -
      3;

    // Quartiles
    const q1 = values[Math.floor(n * 0.25)];
    const q2 = median;
    const q3 = values[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    // Outliers (using IQR method)
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const lowerOutliers = values.filter((val) => val < lowerBound);
    const upperOutliers = values.filter((val) => val > upperBound);

    return {
      mean,
      median,
      mode,
      standardDeviation,
      variance,
      skewness,
      kurtosis,
      quartiles: { q1, q2, q3, iqr },
      outliers: { lower: lowerOutliers, upper: upperOutliers },
    };
  }, [transfers]);

  // Participant Behavior Analysis
  const participantBehavior = useMemo((): ParticipantBehavior => {
    if (!transfers || transfers.length === 0) {
      return {
        whales: 0,
        frequentTraders: 0,
        oneTimeUsers: 0,
        hubAddresses: 0,
        regularUsers: 0,
        behaviorPatterns: {
          burstTraders: 0,
          steadyTraders: 0,
          volatileTraders: 0,
        },
      };
    }

    const participantStats = new Map<
      string,
      {
        totalVolume: number;
        transactionCount: number;
        timestamps: number[];
        counterparties: Set<string>;
      }
    >();

    // Analyze each participant
    transfers.forEach((transfer) => {
      [transfer.from, transfer.to].forEach((address) => {
        if (!participantStats.has(address)) {
          participantStats.set(address, {
            totalVolume: 0,
            transactionCount: 0,
            timestamps: [],
            counterparties: new Set(),
          });
        }

        const stats = participantStats.get(address)!;
        stats.totalVolume += transfer.value_pyusd;
        stats.transactionCount += 1;
        if (transfer.timestamp) stats.timestamps.push(transfer.timestamp);
        stats.counterparties.add(
          address === transfer.from ? transfer.to : transfer.from
        );
      });
    });

    let whales = 0,
      frequentTraders = 0,
      oneTimeUsers = 0,
      hubAddresses = 0,
      regularUsers = 0;
    let burstTraders = 0,
      steadyTraders = 0,
      volatileTraders = 0;

    participantStats.forEach((stats, address) => {
      // Categorize by volume and activity
      if (stats.totalVolume > 1000000) whales++;
      else if (stats.transactionCount > 100) frequentTraders++;
      else if (stats.transactionCount === 1) oneTimeUsers++;
      else if (stats.counterparties.size > 20) hubAddresses++;
      else regularUsers++;

      // Analyze trading patterns
      if (stats.timestamps.length > 1) {
        const intervals = stats.timestamps
          .slice(1)
          .map((t, i) => t - stats.timestamps[i]);
        const avgInterval =
          intervals.reduce((sum, interval) => sum + interval, 0) /
          intervals.length;
        const intervalVariance =
          intervals.reduce(
            (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
            0
          ) / intervals.length;

        if (intervalVariance > avgInterval * 2) volatileTraders++;
        else if (
          stats.timestamps.length > 10 &&
          intervalVariance < avgInterval * 0.5
        )
          steadyTraders++;
        else if (stats.timestamps.length < 5) burstTraders++;
      }
    });

    return {
      whales,
      frequentTraders,
      oneTimeUsers,
      hubAddresses,
      regularUsers,
      behaviorPatterns: { burstTraders, steadyTraders, volatileTraders },
    };
  }, [transfers]);

  // Network Centrality Analysis
  const networkCentrality = useMemo((): NetworkCentrality => {
    if (!transfers || transfers.length === 0) {
      return {
        degreeCentrality: new Map(),
        betweennessCentrality: new Map(),
        closenessCentrality: new Map(),
        eigenvectorCentrality: new Map(),
        pageRank: new Map(),
      };
    }

    const graph = new Map<string, Set<string>>();
    const addresses = new Set<string>();

    // Build graph
    transfers.forEach((transfer) => {
      addresses.add(transfer.from);
      addresses.add(transfer.to);

      if (!graph.has(transfer.from)) graph.set(transfer.from, new Set());
      if (!graph.has(transfer.to)) graph.set(transfer.to, new Set());

      graph.get(transfer.from)!.add(transfer.to);
      graph.get(transfer.to)!.add(transfer.from);
    });

    // Calculate degree centrality
    const degreeCentrality = new Map<string, number>();
    addresses.forEach((addr) => {
      degreeCentrality.set(
        addr,
        (graph.get(addr)?.size || 0) / (addresses.size - 1)
      );
    });

    // Simplified PageRank calculation
    const pageRank = new Map<string, number>();
    const dampingFactor = 0.85;
    const iterations = 10;

    // Initialize PageRank values
    addresses.forEach((addr) => pageRank.set(addr, 1 / addresses.size));

    // Iterate PageRank calculation
    for (let i = 0; i < iterations; i++) {
      const newPageRank = new Map<string, number>();

      addresses.forEach((addr) => {
        let rank = (1 - dampingFactor) / addresses.size;

        addresses.forEach((otherAddr) => {
          if (graph.get(otherAddr)?.has(addr)) {
            const outDegree = graph.get(otherAddr)?.size || 1;
            rank +=
              (dampingFactor * (pageRank.get(otherAddr) || 0)) / outDegree;
          }
        });

        newPageRank.set(addr, rank);
      });

      newPageRank.forEach((rank, addr) => pageRank.set(addr, rank));
    }

    return {
      degreeCentrality,
      betweennessCentrality: new Map(), // Simplified for performance
      closenessCentrality: new Map(), // Simplified for performance
      eigenvectorCentrality: new Map(), // Simplified for performance
      pageRank,
    };
  }, [transfers]);

  // Anomaly Detection
  const anomalyDetection = useMemo((): AnomalyDetection => {
    if (!transfers || transfers.length === 0) {
      return {
        volumeAnomalies: [],
        timeAnomalies: [],
        patternAnomalies: [],
        riskScore: 0,
      };
    }

    const values = transfers.map((t) => t.value_pyusd);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length
    );

    // Volume anomalies (Z-score > 3)
    const volumeAnomalies = transfers.filter(
      (t) => Math.abs(t.value_pyusd - mean) / std > 3
    );

    // Time anomalies (unusual timing patterns)
    const timeAnomalies: ParsedTransferLog[] = [];
    if (transfers.length > 1) {
      const timestamps = transfers
        .filter((t) => t.timestamp)
        .map((t) => t.timestamp!)
        .sort();
      const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);
      const avgInterval =
        intervals.reduce((sum, interval) => sum + interval, 0) /
        intervals.length;
      const intervalStd = Math.sqrt(
        intervals.reduce(
          (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
          0
        ) / intervals.length
      );

      transfers.forEach((transfer, i) => {
        if (i > 0 && transfer.timestamp && transfers[i - 1].timestamp) {
          const interval = transfer.timestamp - transfers[i - 1].timestamp!;
          if (Math.abs(interval - avgInterval) / intervalStd > 2) {
            timeAnomalies.push(transfer);
          }
        }
      });
    }

    // Pattern anomalies (circular transfers, etc.)
    const patternAnomalies = transfers.filter((t) => t.from === t.to); // Self-transfers

    // Risk score calculation
    const riskScore = Math.min(
      100,
      (volumeAnomalies.length / transfers.length) * 40 +
        (timeAnomalies.length / transfers.length) * 30 +
        (patternAnomalies.length / transfers.length) * 30
    );

    return {
      volumeAnomalies,
      timeAnomalies,
      patternAnomalies,
      riskScore,
    };
  }, [transfers]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-[rgba(0,191,255,0.1)] rounded mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded mb-2"></div>
                  <div className="h-4 bg-[rgba(0,191,255,0.1)] rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { statistics, network_analysis, time_series } = results;

  const avgTransferSize =
    statistics.total_volume / statistics.total_transfers || 0;
  const volumePerBlock =
    statistics.total_volume / statistics.blocks_analyzed || 0;
  const transfersPerBlock =
    statistics.total_transfers / statistics.blocks_analyzed || 0;

  const timeRange = statistics.time_range;
  const volumePerHour = timeRange
    ? statistics.total_volume / timeRange.duration_hours
    : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Analysis Controls */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Comprehensive Transfer Analytics
            </h3>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {transfers.length} transfers analyzed
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showAdvancedMetrics ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
              className={
                showAdvancedMetrics
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              {showAdvancedMetrics ? (
                <EyeOff className="h-4 w-4 mr-1" />
              ) : (
                <Eye className="h-4 w-4 mr-1" />
              )}
              Advanced Analytics
            </Button>
          </div>
        </div>

        {/* Analysis Type Selector */}
        {showAdvancedMetrics && (
          <div className="flex gap-2 mb-6">
            {[
              { key: "statistical", label: "Statistical", icon: Calculator },
              { key: "behavioral", label: "Behavioral", icon: Users },
              { key: "network", label: "Network", icon: Network },
              { key: "anomaly", label: "Anomaly", icon: AlertTriangle },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={selectedAnalysisType === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAnalysisType(key as any)}
                className={
                  selectedAnalysisType === key
                    ? "bg-[#00bfff] text-[#0f1419]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        )}

        {/* Basic Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff] mb-1">
              {statistics.total_transfers.toLocaleString()}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Transfers</div>
            <div className="text-xs text-[#6b7280] mt-1">
              {transfersPerBlock.toFixed(1)} per block
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff] mb-1">
              {formatPyusdValue(statistics.total_volume)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Volume (PYUSD)</div>
            <div className="text-xs text-[#6b7280] mt-1">
              {formatPyusdValue(volumePerBlock)} per block
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff] mb-1">
              {formatPyusdValue(statistics.avg_transfer)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Average Transfer</div>
            <div className="text-xs text-[#6b7280] mt-1">
              Median: {formatPyusdValue(statistics.median_transfer)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff] mb-1">
              {network_analysis.total_unique_addresses}
            </div>
            <div className="text-sm text-[#8b9dc3]">Unique Addresses</div>
            <div className="text-xs text-[#6b7280] mt-1">
              {network_analysis.hub_addresses.length} hubs
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        {showAdvancedMetrics && (
          <div className="mt-6 p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm font-medium text-[#00bfff]">
                  Risk Assessment
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8b9dc3]">
                  Overall Risk Score:
                </span>
                <Badge
                  variant="outline"
                  className={`${
                    anomalyDetection.riskScore > 70
                      ? "border-red-500/50 text-red-400 bg-red-500/10"
                      : anomalyDetection.riskScore > 40
                        ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                        : "border-green-500/50 text-green-400 bg-green-500/10"
                  }`}
                >
                  {anomalyDetection.riskScore.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Analytics Sections */}
      {showAdvancedMetrics && (
        <>
          {/* Statistical Analysis */}
          {selectedAnalysisType === "statistical" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-lg font-semibold text-[#00bfff]">
                  Statistical Distribution Analysis
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-[#00bfff] mb-2">
                    {formatPyusdValue(statisticalMetrics.mean)}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Mean</div>
                  <div className="text-xs text-[#6b7280]">Average value</div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-[#00bfff] mb-2">
                    {formatPyusdValue(statisticalMetrics.standardDeviation)}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Std Deviation</div>
                  <div className="text-xs text-[#6b7280]">
                    Volatility measure
                  </div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-[#00bfff] mb-2">
                    {statisticalMetrics.skewness.toFixed(2)}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Skewness</div>
                  <div className="text-xs text-[#6b7280]">
                    Distribution asymmetry
                  </div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-[#00bfff] mb-2">
                    {statisticalMetrics.kurtosis.toFixed(2)}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Kurtosis</div>
                  <div className="text-xs text-[#6b7280]">Tail heaviness</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-[#00bfff] mb-3">
                    Quartile Analysis
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Q1 (25th percentile):
                      </span>
                      <span className="text-xs text-[#00bfff]">
                        {formatPyusdValue(statisticalMetrics.quartiles.q1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Q2 (Median):
                      </span>
                      <span className="text-xs text-[#00bfff]">
                        {formatPyusdValue(statisticalMetrics.quartiles.q2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Q3 (75th percentile):
                      </span>
                      <span className="text-xs text-[#00bfff]">
                        {formatPyusdValue(statisticalMetrics.quartiles.q3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">IQR:</span>
                      <span className="text-xs text-[#00bfff]">
                        {formatPyusdValue(statisticalMetrics.quartiles.iqr)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-[#00bfff] mb-3">
                    Outlier Detection
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Lower outliers:
                      </span>
                      <span className="text-xs text-red-400">
                        {statisticalMetrics.outliers.lower.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Upper outliers:
                      </span>
                      <span className="text-xs text-red-400">
                        {statisticalMetrics.outliers.upper.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Outlier percentage:
                      </span>
                      <span className="text-xs text-yellow-400">
                        {(
                          ((statisticalMetrics.outliers.lower.length +
                            statisticalMetrics.outliers.upper.length) /
                            transfers.length) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Behavioral Analysis */}
          {selectedAnalysisType === "behavioral" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-lg font-semibold text-[#00bfff]">
                  Participant Behavior Analysis
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-purple-400 mb-2">
                    {participantBehavior.whales}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Whales</div>
                  <div className="text-xs text-[#6b7280]">{">"}$1M volume</div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-blue-400 mb-2">
                    {participantBehavior.frequentTraders}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Frequent Traders</div>
                  <div className="text-xs text-[#6b7280]">
                    {">"}100 transactions
                  </div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-orange-400 mb-2">
                    {participantBehavior.hubAddresses}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Hub Addresses</div>
                  <div className="text-xs text-[#6b7280]">
                    {">"}20 connections
                  </div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    {participantBehavior.regularUsers}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Regular Users</div>
                  <div className="text-xs text-[#6b7280]">
                    Standard activity
                  </div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-gray-400 mb-2">
                    {participantBehavior.oneTimeUsers}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">One-time Users</div>
                  <div className="text-xs text-[#6b7280]">
                    Single transaction
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-[#00bfff] mb-3">
                    Trading Patterns
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Burst Traders:
                      </span>
                      <span className="text-xs text-yellow-400">
                        {participantBehavior.behaviorPatterns.burstTraders}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Steady Traders:
                      </span>
                      <span className="text-xs text-green-400">
                        {participantBehavior.behaviorPatterns.steadyTraders}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#8b9dc3]">
                        Volatile Traders:
                      </span>
                      <span className="text-xs text-red-400">
                        {participantBehavior.behaviorPatterns.volatileTraders}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Network Analysis */}
          {selectedAnalysisType === "network" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-lg font-semibold text-[#00bfff]">
                  Network Centrality Analysis
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-[#00bfff] mb-3">
                    Top Degree Centrality
                  </h4>
                  <div className="space-y-2">
                    {Array.from(networkCentrality.degreeCentrality.entries())
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([address, centrality], index) => (
                        <div
                          key={address}
                          className="flex justify-between items-center"
                        >
                          <span className="text-xs text-[#8b9dc3] font-mono">
                            {address.slice(0, 6)}...{address.slice(-4)}
                          </span>
                          <span className="text-xs text-[#00bfff]">
                            {centrality.toFixed(3)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-[#00bfff] mb-3">
                    Top PageRank Scores
                  </h4>
                  <div className="space-y-2">
                    {Array.from(networkCentrality.pageRank.entries())
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([address, pagerank], index) => (
                        <div
                          key={address}
                          className="flex justify-between items-center"
                        >
                          <span className="text-xs text-[#8b9dc3] font-mono">
                            {address.slice(0, 6)}...{address.slice(-4)}
                          </span>
                          <span className="text-xs text-[#00bfff]">
                            {pagerank.toFixed(4)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Anomaly Detection */}
          {selectedAnalysisType === "anomaly" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-lg font-semibold text-[#00bfff]">
                  Anomaly Detection & Risk Analysis
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-red-400 mb-2">
                    {anomalyDetection.volumeAnomalies.length}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Volume Anomalies</div>
                  <div className="text-xs text-[#6b7280]">
                    Unusual transfer sizes
                  </div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400 mb-2">
                    {anomalyDetection.timeAnomalies.length}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Time Anomalies</div>
                  <div className="text-xs text-[#6b7280]">
                    Unusual timing patterns
                  </div>
                </div>

                <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <div className="text-2xl font-bold text-purple-400 mb-2">
                    {anomalyDetection.patternAnomalies.length}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">
                    Pattern Anomalies
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    Suspicious patterns
                  </div>
                </div>
              </div>

              {anomalyDetection.volumeAnomalies.length > 0 && (
                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-red-400 mb-3">
                    High-Risk Volume Anomalies
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {anomalyDetection.volumeAnomalies
                      .slice(0, 10)
                      .map((transfer, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="text-[#8b9dc3] font-mono">
                            {transfer.from.slice(0, 6)}...
                            {transfer.from.slice(-4)} →{" "}
                            {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
                          </span>
                          <span className="text-red-400">
                            {formatPyusdValue(transfer.value_pyusd)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Volume Distribution
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {formatPyusdValue(statistics.max_transfer)}
            </div>
            <div className="text-sm text-[#8b9dc3] mb-1">Largest Transfer</div>
            <Badge
              variant="outline"
              className="border-green-500/50 text-green-400 bg-green-500/10"
            >
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Maximum
            </Badge>
          </div>

          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff] mb-2">
              {formatPyusdValue(statistics.median_transfer)}
            </div>
            <div className="text-sm text-[#8b9dc3] mb-1">Median Transfer</div>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              <Activity className="h-3 w-3 mr-1" />
              Typical
            </Badge>
          </div>

          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {formatPyusdValue(statistics.min_transfer)}
            </div>
            <div className="text-sm text-[#8b9dc3] mb-1">Smallest Transfer</div>
            <Badge
              variant="outline"
              className="border-orange-500/50 text-orange-400 bg-orange-500/10"
            >
              <ArrowDownRight className="h-3 w-3 mr-1" />
              Minimum
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Network Structure
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-xl font-bold text-blue-400 mb-1">
              {network_analysis.sender_only_addresses}
            </div>
            <div className="text-xs text-[#8b9dc3]">Sender Only</div>
          </div>

          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-xl font-bold text-green-400 mb-1">
              {network_analysis.receiver_only_addresses}
            </div>
            <div className="text-xs text-[#8b9dc3]">Receiver Only</div>
          </div>

          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-xl font-bold text-purple-400 mb-1">
              {network_analysis.bidirectional_addresses}
            </div>
            <div className="text-xs text-[#8b9dc3]">Bidirectional</div>
          </div>

          <div className="text-center p-3 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-xl font-bold text-yellow-400 mb-1">
              {network_analysis.hub_addresses.length}
            </div>
            <div className="text-xs text-[#8b9dc3]">Hub Addresses</div>
          </div>
        </div>
      </div>

      {timeRange && (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Time Analysis
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
              <div className="text-lg font-bold text-[#00bfff] mb-2">
                {timeRange.duration_hours.toFixed(1)} hours
              </div>
              <div className="text-sm text-[#8b9dc3] mb-1">Time Range</div>
              <div className="text-xs text-[#6b7280]">
                {timeRange.start.toLocaleString()} -{" "}
                {timeRange.end.toLocaleString()}
              </div>
            </div>

            <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
              <div className="text-lg font-bold text-[#00bfff] mb-2">
                {formatPyusdValue(volumePerHour)}
              </div>
              <div className="text-sm text-[#8b9dc3] mb-1">Volume per Hour</div>
              <div className="text-xs text-[#6b7280]">Average rate</div>
            </div>

            <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
              <div className="text-lg font-bold text-[#00bfff] mb-2">
                {time_series.length}
              </div>
              <div className="text-sm text-[#8b9dc3] mb-1">Time Periods</div>
              <div className="text-xs text-[#6b7280]">Hourly data points</div>
            </div>
          </div>
        </div>
      )}

      {network_analysis.hub_addresses.length > 0 && (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Hub Addresses (High Connectivity)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {network_analysis.hub_addresses
              .slice(0, 10)
              .map((address, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-[rgba(25,28,40,0.6)] rounded-lg"
                >
                  <Badge
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                  >
                    #{index + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-sm font-mono text-[#8b9dc3]">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                    <div className="text-xs text-[#6b7280]">Hub Address</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
