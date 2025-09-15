import React, { useMemo, useState } from "react";
import {
  Brain,
  AlertTriangle,
  Target,
  Zap,
  TrendingUp,
  Activity,
  Eye,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";

interface PatternRecognitionProps {
  transfers: ParsedTransferLog[];
  loading?: boolean;
}

interface WhaleActivity {
  address: string;
  totalVolume: number;
  transactionCount: number;
  averageSize: number;
  timeSpread: number;
  riskLevel: "low" | "medium" | "high";
}

interface MEVPattern {
  type: "sandwich" | "arbitrage" | "frontrun" | "backrun";
  transactions: ParsedTransferLog[];
  profitEstimate: number;
  confidence: number;
  blockNumber?: number;
}

interface CircularFlow {
  path: string[];
  totalVolume: number;
  hops: number;
  timeSpan: number;
  suspiciousScore: number;
}

interface PatternAnalysis {
  whaleActivities: WhaleActivity[];
  mevPatterns: MEVPattern[];
  circularFlows: CircularFlow[];
  anomalousPatterns: {
    rapidBursts: ParsedTransferLog[][];
    unusualTiming: ParsedTransferLog[];
    volumeSpikes: ParsedTransferLog[];
    suspiciousRounds: ParsedTransferLog[][];
  };
}

export const PatternRecognition: React.FC<PatternRecognitionProps> = ({
  transfers,
  loading = false,
}) => {
  const [selectedPattern, setSelectedPattern] = useState<
    "whale" | "mev" | "circular" | "anomalous"
  >("whale");
  const [showDetails, setShowDetails] = useState(false);

  // Advanced Pattern Analysis
  const patternAnalysis = useMemo((): PatternAnalysis => {
    if (!transfers || transfers.length === 0) {
      return {
        whaleActivities: [],
        mevPatterns: [],
        circularFlows: [],
        anomalousPatterns: {
          rapidBursts: [],
          unusualTiming: [],
          volumeSpikes: [],
          suspiciousRounds: [],
        },
      };
    }

    // Whale Activity Detection
    const addressStats = new Map<
      string,
      {
        totalVolume: number;
        transactions: ParsedTransferLog[];
        timestamps: number[];
      }
    >();

    transfers.forEach((transfer) => {
      [transfer.from, transfer.to].forEach((address) => {
        if (!addressStats.has(address)) {
          addressStats.set(address, {
            totalVolume: 0,
            transactions: [],
            timestamps: [],
          });
        }
        const stats = addressStats.get(address)!;
        stats.totalVolume += transfer.value_pyusd;
        stats.transactions.push(transfer);
        if (transfer.timestamp) stats.timestamps.push(transfer.timestamp);
      });
    });

    const whaleActivities: WhaleActivity[] = Array.from(addressStats.entries())
      .filter(([, stats]) => stats.totalVolume > 100000) // $100k+ threshold
      .map(([address, stats]) => {
        const averageSize = stats.totalVolume / stats.transactions.length;
        const timeSpread =
          stats.timestamps.length > 1
            ? Math.max(...stats.timestamps) - Math.min(...stats.timestamps)
            : 0;

        let riskLevel: "low" | "medium" | "high" = "low";
        if (stats.totalVolume > 1000000 && timeSpread < 3600)
          riskLevel = "high"; // $1M+ in 1 hour
        else if (stats.totalVolume > 500000 && timeSpread < 7200)
          riskLevel = "medium"; // $500k+ in 2 hours

        return {
          address,
          totalVolume: stats.totalVolume,
          transactionCount: stats.transactions.length,
          averageSize,
          timeSpread,
          riskLevel,
        };
      })
      .sort((a, b) => b.totalVolume - a.totalVolume);

    // MEV Pattern Detection
    const mevPatterns: MEVPattern[] = [];
    const blockGroups = new Map<number, ParsedTransferLog[]>();

    // Group transfers by block
    transfers.forEach((transfer) => {
      if (transfer.blockNumber) {
        if (!blockGroups.has(transfer.blockNumber)) {
          blockGroups.set(transfer.blockNumber, []);
        }
        blockGroups.get(transfer.blockNumber)!.push(transfer);
      }
    });

    // Detect sandwich attacks and arbitrage
    blockGroups.forEach((blockTransfers, blockNumber) => {
      if (blockTransfers.length >= 3) {
        // Look for sandwich patterns (same address at start and end)
        const addressCounts = new Map<string, number>();
        blockTransfers.forEach((t) => {
          addressCounts.set(t.from, (addressCounts.get(t.from) || 0) + 1);
          addressCounts.set(t.to, (addressCounts.get(t.to) || 0) + 1);
        });

        const repeatedAddresses = Array.from(addressCounts.entries()).filter(
          ([, count]) => count >= 2,
        );

        if (repeatedAddresses.length > 0) {
          const totalVolume = blockTransfers.reduce(
            (sum, t) => sum + t.value_pyusd,
            0,
          );
          mevPatterns.push({
            type: "sandwich",
            transactions: blockTransfers,
            profitEstimate: totalVolume * 0.001, // Rough estimate
            confidence: Math.min(90, repeatedAddresses.length * 30),
            blockNumber,
          });
        }
      }
    });

    // Circular Flow Detection
    const circularFlows: CircularFlow[] = [];
    const addressGraph = new Map<string, Set<string>>();

    // Build transaction graph
    transfers.forEach((transfer) => {
      if (!addressGraph.has(transfer.from)) {
        addressGraph.set(transfer.from, new Set());
      }
      addressGraph.get(transfer.from)!.add(transfer.to);
    });

    // Find circular paths (simplified DFS)
    const findCircularPaths = (
      start: string,
      current: string,
      path: string[],
      visited: Set<string>,
      maxDepth: number = 5,
    ): string[][] => {
      if (path.length > maxDepth) return [];
      if (path.length > 2 && current === start) {
        return [path];
      }
      if (visited.has(current)) return [];

      const circles: string[][] = [];
      visited.add(current);

      const neighbors = addressGraph.get(current) || new Set();
      for (const neighbor of neighbors) {
        const subCircles = findCircularPaths(
          start,
          neighbor,
          [...path, neighbor],
          new Set(visited),
          maxDepth,
        );
        circles.push(...subCircles);
      }

      return circles;
    };

    // Check for circular flows
    Array.from(addressGraph.keys())
      .slice(0, 20) // Limit for performance
      .forEach((address) => {
        const circles = findCircularPaths(
          address,
          address,
          [address],
          new Set(),
        );
        circles.forEach((path) => {
          if (path.length >= 3) {
            const pathVolume = transfers
              .filter((t) => path.includes(t.from) && path.includes(t.to))
              .reduce((sum, t) => sum + t.value_pyusd, 0);

            if (pathVolume > 10000) {
              // $10k+ threshold
              circularFlows.push({
                path,
                totalVolume: pathVolume,
                hops: path.length - 1,
                timeSpan: 0, // Would need timestamp analysis
                suspiciousScore: Math.min(
                  100,
                  (pathVolume / 100000) * 50 + path.length * 10,
                ),
              });
            }
          }
        });
      });

    // Anomalous Pattern Detection
    const sortedByTime = transfers
      .filter((t) => t.timestamp)
      .sort((a, b) => a.timestamp! - b.timestamp!);

    // Rapid burst detection
    const rapidBursts: ParsedTransferLog[][] = [];
    let currentBurst: ParsedTransferLog[] = [];
    let lastTimestamp = 0;

    sortedByTime.forEach((transfer) => {
      if (transfer.timestamp! - lastTimestamp < 60) {
        // Within 1 minute
        currentBurst.push(transfer);
      } else {
        if (currentBurst.length >= 5) {
          // 5+ transactions in rapid succession
          rapidBursts.push([...currentBurst]);
        }
        currentBurst = [transfer];
      }
      lastTimestamp = transfer.timestamp!;
    });

    // Volume spike detection
    const values = transfers.map((t) => t.value_pyusd);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length,
    );
    const volumeSpikes = transfers.filter(
      (t) => t.value_pyusd > mean + 3 * std,
    );

    // Unusual timing patterns
    const intervals = sortedByTime
      .slice(1)
      .map((t, i) => t.timestamp! - sortedByTime[i].timestamp!);
    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const intervalStd = Math.sqrt(
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
        0,
      ) / intervals.length,
    );

    const unusualTiming = sortedByTime.filter((transfer, i) => {
      if (i === 0) return false;
      const interval = transfer.timestamp! - sortedByTime[i - 1].timestamp!;
      return Math.abs(interval - avgInterval) > 2 * intervalStd;
    });

    // Suspicious round numbers
    const suspiciousRounds: ParsedTransferLog[][] = [];
    const roundAmounts = transfers.filter(
      (t) => t.value_pyusd % 1000 === 0 && t.value_pyusd >= 10000,
    );
    if (roundAmounts.length >= 3) {
      suspiciousRounds.push(roundAmounts);
    }

    return {
      whaleActivities,
      mevPatterns,
      circularFlows,
      anomalousPatterns: {
        rapidBursts,
        unusualTiming,
        volumeSpikes,
        suspiciousRounds,
      },
    };
  }, [transfers]);

  if (loading) {
    return (
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-[rgba(0,191,255,0.1)] rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-[rgba(0,191,255,0.1)] rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Advanced Pattern Recognition
            </h3>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              AI-Powered Analysis
            </Badge>
          </div>

          <Button
            variant={showDetails ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className={
              showDetails
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            }
          >
            <Eye className="h-4 w-4 mr-1" />
            {showDetails ? "Hide Details" : "Show Details"}
          </Button>
        </div>

        {/* Pattern Type Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "whale", label: "Whale Activity", icon: Target },
            { key: "mev", label: "MEV Patterns", icon: Zap },
            { key: "circular", label: "Circular Flows", icon: RefreshCw },
            { key: "anomalous", label: "Anomalies", icon: AlertTriangle },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={selectedPattern === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPattern(key as any)}
              className={
                selectedPattern === key
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              <Icon className="h-4 w-4 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-purple-400 mb-2">
              {patternAnalysis.whaleActivities.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Whale Activities</div>
            <div className="text-xs text-[#6b7280]">
              {
                patternAnalysis.whaleActivities.filter(
                  (w) => w.riskLevel === "high",
                ).length
              }{" "}
              high risk
            </div>
          </div>

          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-yellow-400 mb-2">
              {patternAnalysis.mevPatterns.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">MEV Patterns</div>
            <div className="text-xs text-[#6b7280]">
              {patternAnalysis.mevPatterns
                .reduce((sum, p) => sum + p.profitEstimate, 0)
                .toFixed(0)}{" "}
              est. profit
            </div>
          </div>

          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {patternAnalysis.circularFlows.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Circular Flows</div>
            <div className="text-xs text-[#6b7280]">
              {formatPyusdValue(
                patternAnalysis.circularFlows.reduce(
                  (sum, c) => sum + c.totalVolume,
                  0,
                ),
              )}{" "}
              volume
            </div>
          </div>

          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-red-400 mb-2">
              {patternAnalysis.anomalousPatterns.rapidBursts.length +
                patternAnalysis.anomalousPatterns.volumeSpikes.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Anomalies</div>
            <div className="text-xs text-[#6b7280]">
              {patternAnalysis.anomalousPatterns.rapidBursts.length} bursts
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      {showDetails && (
        <>
          {/* Whale Activity Analysis */}
          {selectedPattern === "whale" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-purple-400">
                  Whale Activity Detection
                </h3>
              </div>

              <div className="space-y-4">
                {patternAnalysis.whaleActivities
                  .slice(0, 10)
                  .map((whale, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg border-l-4 border-purple-400"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-[#00bfff]">
                            {whale.address.slice(0, 10)}...
                            {whale.address.slice(-8)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`${
                              whale.riskLevel === "high"
                                ? "border-red-500/50 text-red-400 bg-red-500/10"
                                : whale.riskLevel === "medium"
                                  ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                  : "border-green-500/50 text-green-400 bg-green-500/10"
                            }`}
                          >
                            {whale.riskLevel.toUpperCase()} RISK
                          </Badge>
                        </div>
                        <div className="text-lg font-bold text-purple-400">
                          {formatPyusdValue(whale.totalVolume)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-[#8b9dc3]">Transactions: </span>
                          <span className="text-[#00bfff]">
                            {whale.transactionCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8b9dc3]">Avg Size: </span>
                          <span className="text-[#00bfff]">
                            {formatPyusdValue(whale.averageSize)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8b9dc3]">Time Span: </span>
                          <span className="text-[#00bfff]">
                            {(whale.timeSpread / 3600).toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* MEV Pattern Analysis */}
          {selectedPattern === "mev" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-yellow-400">
                  MEV Pattern Detection
                </h3>
              </div>

              <div className="space-y-4">
                {patternAnalysis.mevPatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg border-l-4 border-yellow-400"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                        >
                          {pattern.type.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-[#8b9dc3]">
                          Block #{pattern.blockNumber}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-yellow-400">
                        ${pattern.profitEstimate.toFixed(2)} profit
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[#8b9dc3]">Transactions: </span>
                        <span className="text-[#00bfff]">
                          {pattern.transactions.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8b9dc3]">Confidence: </span>
                        <span className="text-[#00bfff]">
                          {pattern.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {patternAnalysis.mevPatterns.length === 0 && (
                  <div className="text-center py-8 text-[#8b9dc3]">
                    No MEV patterns detected in current dataset
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Circular Flow Analysis */}
          {selectedPattern === "circular" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <RefreshCw className="h-5 w-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-orange-400">
                  Circular Flow Analysis
                </h3>
              </div>

              <div className="space-y-4">
                {patternAnalysis.circularFlows.map((flow, index) => (
                  <div
                    key={index}
                    className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg border-l-4 border-orange-400"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#8b9dc3]">
                          {flow.hops} hops
                        </span>
                        <Badge
                          variant="outline"
                          className={`${
                            flow.suspiciousScore > 70
                              ? "border-red-500/50 text-red-400 bg-red-500/10"
                              : flow.suspiciousScore > 40
                                ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                : "border-green-500/50 text-green-400 bg-green-500/10"
                          }`}
                        >
                          {flow.suspiciousScore.toFixed(0)}% suspicious
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-orange-400">
                        {formatPyusdValue(flow.totalVolume)}
                      </div>
                    </div>
                    <div className="text-xs text-[#8b9dc3] font-mono">
                      Path:{" "}
                      {flow.path
                        .map((addr) => `${addr.slice(0, 6)}...`)
                        .join(" → ")}
                    </div>
                  </div>
                ))}

                {patternAnalysis.circularFlows.length === 0 && (
                  <div className="text-center py-8 text-[#8b9dc3]">
                    No circular flows detected in current dataset
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Anomalous Pattern Analysis */}
          {selectedPattern === "anomalous" && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-semibold text-red-400">
                  Anomaly Detection
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-red-400 mb-3">
                    Rapid Transaction Bursts
                  </h4>
                  <div className="text-2xl font-bold text-red-400 mb-2">
                    {patternAnalysis.anomalousPatterns.rapidBursts.length}
                  </div>
                  <div className="text-xs text-[#8b9dc3]">
                    Detected burst sequences of 5+ transactions within 1 minute
                  </div>
                </div>

                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-red-400 mb-3">
                    Volume Spikes
                  </h4>
                  <div className="text-2xl font-bold text-red-400 mb-2">
                    {patternAnalysis.anomalousPatterns.volumeSpikes.length}
                  </div>
                  <div className="text-xs text-[#8b9dc3]">
                    Transactions with volume 3+ standard deviations above mean
                  </div>
                </div>

                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-red-400 mb-3">
                    Unusual Timing
                  </h4>
                  <div className="text-2xl font-bold text-red-400 mb-2">
                    {patternAnalysis.anomalousPatterns.unusualTiming.length}
                  </div>
                  <div className="text-xs text-[#8b9dc3]">
                    Transactions with irregular timing patterns
                  </div>
                </div>

                <div className="p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
                  <h4 className="text-sm font-medium text-red-400 mb-3">
                    Suspicious Round Numbers
                  </h4>
                  <div className="text-2xl font-bold text-red-400 mb-2">
                    {patternAnalysis.anomalousPatterns.suspiciousRounds.length}
                  </div>
                  <div className="text-xs text-[#8b9dc3]">
                    Groups of transactions with suspiciously round amounts
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
