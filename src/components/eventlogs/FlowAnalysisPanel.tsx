import React, { useMemo } from "react";
import { Badge, Button } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Network,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { LogsAnalysisResults, ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue, shortenAddress } from "@/lib/eventlogs";

interface FlowAnalysisPanelProps {
  results: LogsAnalysisResults;
  className?: string;
}

interface FlowMetrics {
  totalFlows: number;
  uniqueAddresses: number;
  averageFlowSize: number;
  maxFlowSize: number;
  hubAddresses: Array<{
    address: string;
    connections: number;
    totalVolume: number;
    centrality: number;
  }>;
  concentrationRatio: number;
  networkDensity: number;
  clusteringCoefficient: number;
  anomalousFlows: Array<{
    from: string;
    to: string;
    value: number;
    reason: string;
    severity: "low" | "medium" | "high";
  }>;
  temporalPatterns: {
    peakHour: number;
    activityDistribution: Array<{ hour: number; count: number }>;
    burstDetection: Array<{ timestamp: number; intensity: number }>;
  };
}

/**
 * FlowAnalysisPanel - Comprehensive token flow analysis component
 *
 * This component provides advanced analysis of token flows including:
 * - Network centrality metrics and hub identification
 * - Flow concentration analysis and pattern detection
 * - Temporal flow analysis with trend indicators
 * - Flow anomaly detection and highlighting
 * - Network topology analysis and clustering
 */
export const FlowAnalysisPanel: React.FC<FlowAnalysisPanelProps> = ({
  results,
  className = "",
}) => {
  const flowMetrics = useMemo((): FlowMetrics => {
    if (!results?.raw_logs || results.raw_logs.length === 0) {
      return {
        totalFlows: 0,
        uniqueAddresses: 0,
        averageFlowSize: 0,
        maxFlowSize: 0,
        hubAddresses: [],
        concentrationRatio: 0,
        networkDensity: 0,
        clusteringCoefficient: 0,
        anomalousFlows: [],
        temporalPatterns: {
          peakHour: 0,
          activityDistribution: [],
          burstDetection: [],
        },
      };
    }

    const transfers = results.raw_logs;
    const totalFlows = transfers.length;

    // Calculate address statistics
    const addressStats = new Map<
      string,
      {
        sent: number;
        received: number;
        connections: Set<string>;
        transactions: number;
      }
    >();

    transfers.forEach((transfer) => {
      // Initialize sender stats
      if (!addressStats.has(transfer.from)) {
        addressStats.set(transfer.from, {
          sent: 0,
          received: 0,
          connections: new Set(),
          transactions: 0,
        });
      }

      // Initialize receiver stats
      if (!addressStats.has(transfer.to)) {
        addressStats.set(transfer.to, {
          sent: 0,
          received: 0,
          connections: new Set(),
          transactions: 0,
        });
      }

      const senderStats = addressStats.get(transfer.from)!;
      const receiverStats = addressStats.get(transfer.to)!;

      senderStats.sent += transfer.value_pyusd;
      senderStats.connections.add(transfer.to);
      senderStats.transactions += 1;

      receiverStats.received += transfer.value_pyusd;
      receiverStats.connections.add(transfer.from);
      receiverStats.transactions += 1;
    });

    const uniqueAddresses = addressStats.size;
    const totalVolume = transfers.reduce((sum, t) => sum + t.value_pyusd, 0);
    const averageFlowSize = totalVolume / totalFlows;
    const maxFlowSize = Math.max(...transfers.map((t) => t.value_pyusd));

    // Calculate hub addresses (high connectivity and volume)
    const addresses = Array.from(addressStats.entries());
    const avgConnections =
      addresses.reduce((sum, [, stats]) => sum + stats.connections.size, 0) /
      addresses.length;
    const avgVolume =
      addresses.reduce(
        (sum, [, stats]) => sum + stats.sent + stats.received,
        0,
      ) / addresses.length;

    const hubThreshold = Math.max(3, avgConnections * 1.5);
    const volumeThreshold = avgVolume * 2;

    const hubAddresses = addresses
      .filter(([, stats]) => {
        const totalVolume = stats.sent + stats.received;
        return (
          stats.connections.size >= hubThreshold ||
          totalVolume >= volumeThreshold
        );
      })
      .map(([address, stats]) => {
        const totalVolume = stats.sent + stats.received;
        const connections = stats.connections.size;

        // Simple centrality calculation (degree centrality)
        const centrality = connections / (uniqueAddresses - 1);

        return {
          address,
          connections,
          totalVolume,
          centrality,
        };
      })
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, 10);

    // Calculate concentration ratio (top 10% of addresses by volume)
    const sortedByVolume = addresses
      .map(([address, stats]) => ({
        address,
        volume: stats.sent + stats.received,
      }))
      .sort((a, b) => b.volume - a.volume);

    const top10PercentCount = Math.max(1, Math.floor(addresses.length * 0.1));
    const top10PercentVolume = sortedByVolume
      .slice(0, top10PercentCount)
      .reduce((sum, item) => sum + item.volume, 0);
    const concentrationRatio = (top10PercentVolume / totalVolume) * 100;

    // Calculate network density
    const maxPossibleEdges = uniqueAddresses * (uniqueAddresses - 1);
    const actualEdges = transfers.length;
    const networkDensity = (actualEdges / maxPossibleEdges) * 100;

    // Simple clustering coefficient calculation
    let clusteringSum = 0;
    let validNodes = 0;

    addresses.forEach(([address, stats]) => {
      const neighbors = Array.from(stats.connections);
      if (neighbors.length < 2) return;

      let triangles = 0;
      const maxTriangles = (neighbors.length * (neighbors.length - 1)) / 2;

      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const neighbor1Stats = addressStats.get(neighbors[i]);
          if (neighbor1Stats?.connections.has(neighbors[j])) {
            triangles++;
          }
        }
      }

      clusteringSum += triangles / maxTriangles;
      validNodes++;
    });

    const clusteringCoefficient =
      validNodes > 0 ? (clusteringSum / validNodes) * 100 : 0;

    // Detect anomalous flows
    const anomalousFlows: FlowMetrics["anomalousFlows"] = [];

    // Large transfers (> 3 standard deviations from mean)
    const values = transfers.map((t) => t.value_pyusd);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const largeTransferThreshold = mean + 3 * stdDev;

    transfers.forEach((transfer) => {
      if (transfer.value_pyusd > largeTransferThreshold) {
        anomalousFlows.push({
          from: transfer.from,
          to: transfer.to,
          value: transfer.value_pyusd,
          reason: "Unusually large transfer amount",
          severity: "high",
        });
      }
    });

    // Circular flows (A -> B -> A patterns)
    const flowPairs = new Map<string, Set<string>>();
    transfers.forEach((transfer) => {
      if (!flowPairs.has(transfer.from)) {
        flowPairs.set(transfer.from, new Set());
      }
      flowPairs.get(transfer.from)!.add(transfer.to);
    });

    flowPairs.forEach((targets, source) => {
      targets.forEach((target) => {
        if (flowPairs.get(target)?.has(source)) {
          const sourceToTarget = transfers.find(
            (t) => t.from === source && t.to === target,
          );
          if (sourceToTarget) {
            anomalousFlows.push({
              from: source,
              to: target,
              value: sourceToTarget.value_pyusd,
              reason: "Circular flow pattern detected",
              severity: "medium",
            });
          }
        }
      });
    });

    // Temporal pattern analysis
    const hourlyActivity = new Array(24).fill(0);
    const timestampedTransfers = transfers.filter((t) => t.datetime);

    timestampedTransfers.forEach((transfer) => {
      if (transfer.datetime) {
        const hour = transfer.datetime.getHours();
        hourlyActivity[hour]++;
      }
    });

    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const activityDistribution = hourlyActivity.map((count, hour) => ({
      hour,
      count,
    }));

    // Simple burst detection (periods of high activity)
    const burstDetection: Array<{ timestamp: number; intensity: number }> = [];
    if (timestampedTransfers.length > 0) {
      const sortedTransfers = timestampedTransfers.sort(
        (a, b) => a.datetime!.getTime() - b.datetime!.getTime(),
      );

      // Group transfers by 10-minute windows
      const windowSize = 10 * 60 * 1000; // 10 minutes in milliseconds
      const windows = new Map<number, number>();

      sortedTransfers.forEach((transfer) => {
        const windowStart =
          Math.floor(transfer.datetime!.getTime() / windowSize) * windowSize;
        windows.set(windowStart, (windows.get(windowStart) || 0) + 1);
      });

      const avgActivity =
        Array.from(windows.values()).reduce((sum, count) => sum + count, 0) /
        windows.size;
      const burstThreshold = avgActivity * 2;

      windows.forEach((count, timestamp) => {
        if (count > burstThreshold) {
          burstDetection.push({
            timestamp,
            intensity: count / avgActivity,
          });
        }
      });
    }

    return {
      totalFlows,
      uniqueAddresses,
      averageFlowSize,
      maxFlowSize,
      hubAddresses,
      concentrationRatio,
      networkDensity,
      clusteringCoefficient,
      anomalousFlows: anomalousFlows.slice(0, 10), // Limit to top 10
      temporalPatterns: {
        peakHour,
        activityDistribution,
        burstDetection: burstDetection.slice(0, 5), // Limit to top 5
      },
    };
  }, [results]);

  if (!results?.raw_logs || results.raw_logs.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No transfer data available for flow analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Network Metrics Overview */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Network className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Network Topology Analysis
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {flowMetrics.totalFlows.toLocaleString()}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Total Flows</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {flowMetrics.uniqueAddresses}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Unique Addresses</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {flowMetrics.networkDensity.toFixed(2)}%
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Network Density</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {flowMetrics.clusteringCoefficient.toFixed(2)}%
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Clustering</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg">
          <p className="text-sm text-[#8b9dc3]">
            <span className="font-medium text-[#00bfff]">
              Network Analysis:
            </span>
            {flowMetrics.networkDensity > 5 ? (
              <span>
                {" "}
                High-density network with extensive interconnections between
                addresses.
              </span>
            ) : flowMetrics.networkDensity > 1 ? (
              <span>
                {" "}
                Moderate-density network with selective address interactions.
              </span>
            ) : (
              <span>
                {" "}
                Sparse network with limited connections between addresses.
              </span>
            )}
            {flowMetrics.clusteringCoefficient > 20 && (
              <span>
                {" "}
                Strong clustering indicates community formation within the
                network.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Hub Addresses */}
      {flowMetrics.hubAddresses.length > 0 && (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Hub Addresses
            </h3>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {flowMetrics.hubAddresses.length} hubs detected
            </Badge>
          </div>

          <div className="space-y-3">
            {flowMetrics.hubAddresses.map((hub, index) => (
              <div
                key={hub.address}
                className="flex items-center justify-between p-3 bg-[rgba(25,28,40,0.6)] rounded-lg hover:bg-[rgba(25,28,40,0.8)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="border-[rgba(245,158,11,0.3)] text-[#f59e0b] bg-[rgba(245,158,11,0.1)]"
                  >
                    #{index + 1}
                  </Badge>
                  <div>
                    <div className="text-sm font-mono text-[#8b9dc3]">
                      {shortenAddress(hub.address)}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {hub.connections} connections
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-[#00bfff]">
                    {formatPyusdValue(hub.totalVolume)} PYUSD
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {(hub.centrality * 100).toFixed(1)}% centrality
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flow Concentration Analysis */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Flow Concentration
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {formatPyusdValue(flowMetrics.averageFlowSize)}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Average Flow</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {formatPyusdValue(flowMetrics.maxFlowSize)}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Largest Flow</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {flowMetrics.concentrationRatio.toFixed(1)}%
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Top 10% Volume</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg">
          <p className="text-sm text-[#8b9dc3]">
            <span className="font-medium text-[#00bfff]">
              Concentration Analysis:
            </span>
            {flowMetrics.concentrationRatio > 80 ? (
              <span>
                {" "}
                Highly concentrated network - top 10% of addresses control{" "}
                {flowMetrics.concentrationRatio.toFixed(1)}% of total volume.
              </span>
            ) : flowMetrics.concentrationRatio > 50 ? (
              <span>
                {" "}
                Moderately concentrated network with{" "}
                {flowMetrics.concentrationRatio.toFixed(1)}% volume
                concentration.
              </span>
            ) : (
              <span>
                {" "}
                Well-distributed network with{" "}
                {flowMetrics.concentrationRatio.toFixed(1)}% concentration
                ratio.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Anomalous Flows */}
      {flowMetrics.anomalousFlows.length > 0 && (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Anomalous Flows
            </h3>
            <Badge
              variant="outline"
              className="border-[rgba(245,158,11,0.3)] text-[#f59e0b] bg-[rgba(245,158,11,0.1)]"
            >
              {flowMetrics.anomalousFlows.length} detected
            </Badge>
          </div>

          <div className="space-y-3">
            {flowMetrics.anomalousFlows.map((anomaly, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[rgba(25,28,40,0.6)] rounded-lg border-l-4 border-l-yellow-500"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`${
                      anomaly.severity === "high"
                        ? "border-red-500/50 text-red-400 bg-red-500/10"
                        : anomaly.severity === "medium"
                          ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                          : "border-blue-500/50 text-blue-400 bg-blue-500/10"
                    }`}
                  >
                    {anomaly.severity.toUpperCase()}
                  </Badge>
                  <div>
                    <div className="text-sm font-mono text-[#8b9dc3]">
                      {shortenAddress(anomaly.from)} →{" "}
                      {shortenAddress(anomaly.to)}
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {anomaly.reason}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-[#00bfff]">
                    {formatPyusdValue(anomaly.value)} PYUSD
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Temporal Patterns */}
      {flowMetrics.temporalPatterns.activityDistribution.some(
        (d) => d.count > 0,
      ) && (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Temporal Patterns
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-[#8b9dc3] mb-3">
                Hourly Activity Distribution
              </h4>
              <div className="space-y-2">
                {flowMetrics.temporalPatterns.activityDistribution
                  .filter((d) => d.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 6)
                  .map((item) => (
                    <div
                      key={item.hour}
                      className="flex items-center justify-between p-2 bg-[rgba(25,28,40,0.6)] rounded"
                    >
                      <span className="text-sm text-[#8b9dc3]">
                        {item.hour.toString().padStart(2, "0")}:00
                        {item.hour ===
                          flowMetrics.temporalPatterns.peakHour && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] text-xs"
                          >
                            PEAK
                          </Badge>
                        )}
                      </span>
                      <span className="text-sm font-mono text-[#00bfff]">
                        {item.count} transfers
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {flowMetrics.temporalPatterns.burstDetection.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-[#8b9dc3] mb-3">
                  Activity Bursts
                </h4>
                <div className="space-y-2">
                  {flowMetrics.temporalPatterns.burstDetection.map(
                    (burst, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-[rgba(25,28,40,0.6)] rounded"
                      >
                        <span className="text-sm text-[#8b9dc3]">
                          {new Date(burst.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-sm font-mono text-[#f59e0b]">
                          {burst.intensity.toFixed(1)}x intensity
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowAnalysisPanel;
