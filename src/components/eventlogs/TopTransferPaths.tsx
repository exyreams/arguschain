import React, { useMemo, useState } from "react";
import { Badge, Button, Dropdown } from "@/components/global";
import {
  ArrowRight,
  Filter,
  Route,
  TrendingUp,
  Users,
  Volume2,
} from "lucide-react";
import type { LogsAnalysisResults, ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue, shortenAddress } from "@/lib/eventlogs";

interface TopTransferPathsProps {
  results: LogsAnalysisResults;
  className?: string;
}

interface TransferPath {
  id: string;
  path: string[];
  pathLabels: string[];
  totalVolume: number;
  transferCount: number;
  averageTransferSize: number;
  maxTransferSize: number;
  minTransferSize: number;
  volumePercentage: number;
  pathLength: number;
  pathType: "direct" | "multi-hop" | "circular";
  significance: "high" | "medium" | "low";
  transfers: ParsedTransferLog[];
}

interface PathMetrics {
  totalPaths: number;
  directPaths: number;
  multiHopPaths: number;
  circularPaths: number;
  averagePathLength: number;
  maxPathLength: number;
  totalPathVolume: number;
}

/**
 * TopTransferPaths - Transfer path analysis and visualization component
 *
 * This component provides comprehensive analysis of transfer paths including:
 * - Identification of most significant transfer routes
 * - Path visualization with flow direction indicators
 * - Path filtering and sorting capabilities
 * - Detailed path analysis with volume metrics
 * - Multi-hop and circular path detection
 */
export const TopTransferPaths: React.FC<TopTransferPathsProps> = ({
  results,
  className = "",
}) => {
  const [selectedPathType, setSelectedPathType] = useState<
    "all" | "direct" | "multi-hop" | "circular"
  >("all");
  const [sortBy, setSortBy] = useState<
    "volume" | "count" | "average" | "significance"
  >("volume");
  const [minVolume, setMinVolume] = useState(0);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const { paths, metrics } = useMemo((): {
    paths: TransferPath[];
    metrics: PathMetrics;
  } => {
    if (!results?.raw_logs || results.raw_logs.length === 0) {
      return {
        paths: [],
        metrics: {
          totalPaths: 0,
          directPaths: 0,
          multiHopPaths: 0,
          circularPaths: 0,
          averagePathLength: 0,
          maxPathLength: 0,
          totalPathVolume: 0,
        },
      };
    }

    const transfers = results.raw_logs;
    const totalVolume = transfers.reduce((sum, t) => sum + t.value_pyusd, 0);

    // Group transfers by direct paths (from -> to)
    const directPathMap = new Map<
      string,
      {
        from: string;
        to: string;
        transfers: ParsedTransferLog[];
        totalVolume: number;
        transferCount: number;
      }
    >();

    transfers.forEach((transfer) => {
      const pathKey = `${transfer.from}->${transfer.to}`;
      if (!directPathMap.has(pathKey)) {
        directPathMap.set(pathKey, {
          from: transfer.from,
          to: transfer.to,
          transfers: [],
          totalVolume: 0,
          transferCount: 0,
        });
      }

      const pathData = directPathMap.get(pathKey)!;
      pathData.transfers.push(transfer);
      pathData.totalVolume += transfer.value_pyusd;
      pathData.transferCount += 1;
    });

    // Convert direct paths to TransferPath objects
    const directPaths: TransferPath[] = Array.from(directPathMap.values())
      .filter((pathData) => pathData.totalVolume >= minVolume)
      .map((pathData) => {
        const volumes = pathData.transfers.map((t) => t.value_pyusd);
        const maxTransferSize = Math.max(...volumes);
        const minTransferSize = Math.min(...volumes);
        const averageTransferSize =
          pathData.totalVolume / pathData.transferCount;
        const volumePercentage = (pathData.totalVolume / totalVolume) * 100;

        // Determine significance based on volume and frequency
        let significance: "high" | "medium" | "low";
        if (volumePercentage > 5 || pathData.transferCount > 10) {
          significance = "high";
        } else if (volumePercentage > 1 || pathData.transferCount > 3) {
          significance = "medium";
        } else {
          significance = "low";
        }

        // Check if this is a circular path (A -> B and B -> A exists)
        const reverseKey = `${pathData.to}->${pathData.from}`;
        const isCircular = directPathMap.has(reverseKey);

        return {
          id: `${pathData.from}-${pathData.to}`,
          path: [pathData.from, pathData.to],
          pathLabels: [
            shortenAddress(pathData.from),
            shortenAddress(pathData.to),
          ],
          totalVolume: pathData.totalVolume,
          transferCount: pathData.transferCount,
          averageTransferSize,
          maxTransferSize,
          minTransferSize,
          volumePercentage,
          pathLength: 2,
          pathType: isCircular ? "circular" : "direct",
          significance,
          transfers: pathData.transfers,
        };
      });

    // Detect multi-hop paths (A -> B -> C patterns)
    const multiHopPaths: TransferPath[] = [];
    const addressConnections = new Map<string, Set<string>>();

    // Build connection graph
    transfers.forEach((transfer) => {
      if (!addressConnections.has(transfer.from)) {
        addressConnections.set(transfer.from, new Set());
      }
      addressConnections.get(transfer.from)!.add(transfer.to);
    });

    // Find 3-hop paths (A -> B -> C)
    addressConnections.forEach((targets, source) => {
      targets.forEach((intermediate) => {
        const intermediateTargets = addressConnections.get(intermediate);
        if (intermediateTargets) {
          intermediateTargets.forEach((destination) => {
            if (destination !== source) {
              // Found a 3-hop path: source -> intermediate -> destination
              const pathTransfers = transfers.filter(
                (t) =>
                  (t.from === source && t.to === intermediate) ||
                  (t.from === intermediate && t.to === destination)
              );

              if (pathTransfers.length >= 2) {
                const totalVolume = pathTransfers.reduce(
                  (sum, t) => sum + t.value_pyusd,
                  0
                );

                if (totalVolume >= minVolume) {
                  const volumes = pathTransfers.map((t) => t.value_pyusd);
                  const maxTransferSize = Math.max(...volumes);
                  const minTransferSize = Math.min(...volumes);
                  const averageTransferSize =
                    totalVolume / pathTransfers.length;
                  const volumePercentage = (totalVolume / totalVolume) * 100;

                  let significance: "high" | "medium" | "low";
                  if (volumePercentage > 2 || pathTransfers.length > 5) {
                    significance = "high";
                  } else if (
                    volumePercentage > 0.5 ||
                    pathTransfers.length > 2
                  ) {
                    significance = "medium";
                  } else {
                    significance = "low";
                  }

                  multiHopPaths.push({
                    id: `${source}-${intermediate}-${destination}`,
                    path: [source, intermediate, destination],
                    pathLabels: [
                      shortenAddress(source),
                      shortenAddress(intermediate),
                      shortenAddress(destination),
                    ],
                    totalVolume,
                    transferCount: pathTransfers.length,
                    averageTransferSize,
                    maxTransferSize,
                    minTransferSize,
                    volumePercentage,
                    pathLength: 3,
                    pathType: "multi-hop",
                    significance,
                    transfers: pathTransfers,
                  });
                }
              }
            }
          });
        }
      });
    });

    // Combine all paths
    let allPaths = [...directPaths, ...multiHopPaths];

    // Filter by path type
    if (selectedPathType !== "all") {
      allPaths = allPaths.filter((path) => path.pathType === selectedPathType);
    }

    // Sort paths
    allPaths.sort((a, b) => {
      switch (sortBy) {
        case "volume":
          return b.totalVolume - a.totalVolume;
        case "count":
          return b.transferCount - a.transferCount;
        case "average":
          return b.averageTransferSize - a.averageTransferSize;
        case "significance":
          const significanceOrder = { high: 3, medium: 2, low: 1 };
          return (
            significanceOrder[b.significance] -
            significanceOrder[a.significance]
          );
        default:
          return b.totalVolume - a.totalVolume;
      }
    });

    // Limit to top 50 paths for performance
    const topPaths = allPaths.slice(0, 50);

    // Calculate metrics
    const directPathCount = directPaths.length;
    const multiHopPathCount = multiHopPaths.length;
    const circularPathCount = directPaths.filter(
      (p) => p.pathType === "circular"
    ).length;
    const totalPathVolume = topPaths.reduce(
      (sum, path) => sum + path.totalVolume,
      0
    );
    const pathLengths = topPaths.map((p) => p.pathLength);
    const averagePathLength =
      pathLengths.reduce((sum, len) => sum + len, 0) / pathLengths.length || 0;
    const maxPathLength = Math.max(...pathLengths, 0);

    const metrics: PathMetrics = {
      totalPaths: topPaths.length,
      directPaths: directPathCount,
      multiHopPaths: multiHopPathCount,
      circularPaths: circularPathCount,
      averagePathLength,
      maxPathLength,
      totalPathVolume,
    };

    return { paths: topPaths, metrics };
  }, [results, selectedPathType, sortBy, minVolume]);

  if (!results?.raw_logs || results.raw_logs.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Route className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No transfer data available for path analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Path Metrics Overview */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Route className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Transfer Path Analysis
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {metrics.totalPaths}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Total Paths</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {metrics.directPaths}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Direct Paths</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {metrics.multiHopPaths}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Multi-Hop</div>
          </div>
          <div className="text-center p-4 bg-[rgba(25,28,40,0.6)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff]">
              {metrics.circularPaths}
            </div>
            <div className="text-sm text-[#8b9dc3] mt-1">Circular</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Path Type:</span>
            <Dropdown
              value={selectedPathType}
              onValueChange={(value) =>
                setSelectedPathType(
                  value as "all" | "direct" | "multi-hop" | "circular"
                )
              }
              placeholder="Select path type"
              options={[
                { value: "all", label: "All Paths" },
                { value: "direct", label: "Direct Only" },
                { value: "multi-hop", label: "Multi-Hop Only" },
                { value: "circular", label: "Circular Only" },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Sort By:</span>
            <Dropdown
              value={sortBy}
              onValueChange={(value) =>
                setSortBy(
                  value as "volume" | "count" | "average" | "significance"
                )
              }
              placeholder="Select sort option"
              options={[
                { value: "volume", label: "Total Volume" },
                { value: "count", label: "Transfer Count" },
                { value: "average", label: "Average Size" },
                { value: "significance", label: "Significance" },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Min Volume:</span>
            <input
              type="number"
              value={minVolume}
              onChange={(e) => setMinVolume(Number(e.target.value))}
              className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded px-3 py-1 text-sm text-[#8b9dc3] w-24"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Transfer Paths List */}
      {paths.length > 0 ? (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Top Transfer Paths
            </h4>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {paths.length} paths found
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {paths.map((path, index) => (
              <div
                key={path.id}
                className="border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)] rounded-lg p-4 hover:bg-[rgba(25,28,40,0.8)] transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      #{index + 1}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${
                        path.pathType === "circular"
                          ? "border-purple-500/50 text-purple-400 bg-purple-500/10"
                          : path.pathType === "multi-hop"
                            ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                            : "border-green-500/50 text-green-400 bg-green-500/10"
                      }`}
                    >
                      {path.pathType.toUpperCase()}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${
                        path.significance === "high"
                          ? "border-red-500/50 text-red-400 bg-red-500/10"
                          : path.significance === "medium"
                            ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                            : "border-blue-500/50 text-blue-400 bg-blue-500/10"
                      }`}
                    >
                      {path.significance.toUpperCase()}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowDetails(showDetails === path.id ? null : path.id)
                    }
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    {showDetails === path.id ? "Hide" : "Details"}
                  </Button>
                </div>

                {/* Path Visualization */}
                <div className="flex items-center gap-2 mb-3 overflow-x-auto">
                  {path.pathLabels.map((label, labelIndex) => (
                    <React.Fragment key={labelIndex}>
                      <div className="flex items-center gap-2 bg-[rgba(15,20,25,0.8)] rounded px-3 py-1 whitespace-nowrap">
                        <Users className="h-3 w-3 text-[#8b9dc3]" />
                        <span className="text-sm font-mono text-[#8b9dc3]">
                          {label}
                        </span>
                      </div>
                      {labelIndex < path.pathLabels.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-[#00bfff] flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Path Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#00bfff]">
                      {formatPyusdValue(path.totalVolume)}
                    </div>
                    <div className="text-xs text-[#8b9dc3]">Total Volume</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#00bfff]">
                      {path.transferCount}
                    </div>
                    <div className="text-xs text-[#8b9dc3]">Transfers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#00bfff]">
                      {formatPyusdValue(path.averageTransferSize)}
                    </div>
                    <div className="text-xs text-[#8b9dc3]">Avg Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#00bfff]">
                      {path.volumePercentage.toFixed(2)}%
                    </div>
                    <div className="text-xs text-[#8b9dc3]">Of Total</div>
                  </div>
                </div>

                {/* Detailed Information */}
                {showDetails === path.id && (
                  <div className="mt-4 pt-4 border-t border-[rgba(0,191,255,0.1)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="text-sm font-medium text-[#00bfff] mb-2">
                          Transfer Range
                        </h5>
                        <div className="space-y-1 text-sm text-[#8b9dc3]">
                          <div>
                            Max: {formatPyusdValue(path.maxTransferSize)} PYUSD
                          </div>
                          <div>
                            Min: {formatPyusdValue(path.minTransferSize)} PYUSD
                          </div>
                          <div>Path Length: {path.pathLength} hops</div>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-[#00bfff] mb-2">
                          Full Addresses
                        </h5>
                        <div className="space-y-1 text-xs font-mono text-[#6b7280]">
                          {path.path.map((address, addrIndex) => (
                            <div key={addrIndex} className="break-all">
                              {addrIndex + 1}. {address}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recent Transfers in Path */}
                    <div>
                      <h5 className="text-sm font-medium text-[#00bfff] mb-2">
                        Recent Transfers ({path.transfers.length} total)
                      </h5>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {path.transfers.slice(0, 5).map((transfer, tIndex) => (
                          <div
                            key={tIndex}
                            className="flex items-center justify-between p-2 bg-[rgba(15,20,25,0.8)] rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Volume2 className="h-3 w-3 text-[#8b9dc3]" />
                              <span className="font-mono text-[#8b9dc3]">
                                {shortenAddress(transfer.from)} →{" "}
                                {shortenAddress(transfer.to)}
                              </span>
                            </div>
                            <div className="text-[#00bfff] font-mono">
                              {formatPyusdValue(transfer.value_pyusd)}
                            </div>
                          </div>
                        ))}
                        {path.transfers.length > 5 && (
                          <div className="text-center text-xs text-[#6b7280] py-1">
                            ... and {path.transfers.length - 5} more transfers
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(255,193,7,0.1)] rounded-full flex items-center justify-center">
              <Filter className="h-8 w-8 text-yellow-400" />
            </div>
            <p className="text-[#8b9dc3] text-sm">
              No paths found matching the current filters
            </p>
            <p className="text-[#6b7280] text-xs mt-1">
              Try adjusting the path type, minimum volume, or sort criteria
            </p>
          </div>
        </div>
      )}

      {/* Path Analysis Summary */}
      {paths.length > 0 && (
        <div className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#00bfff] mb-2">
            Path Analysis Summary
          </h4>
          <div className="text-sm text-[#8b9dc3] space-y-1">
            <p>
              <span className="font-medium text-[#00bfff]">
                Network Structure:
              </span>
              {metrics.multiHopPaths > metrics.directPaths * 0.3 ? (
                <span>
                  {" "}
                  Complex network with significant multi-hop routing (
                  {metrics.multiHopPaths} multi-hop vs {metrics.directPaths}{" "}
                  direct paths).
                </span>
              ) : (
                <span>
                  {" "}
                  Primarily direct transfer network with limited intermediation.
                </span>
              )}
            </p>
            <p>
              <span className="font-medium text-[#00bfff]">
                Circular Activity:
              </span>
              {metrics.circularPaths > 0 ? (
                <span>
                  {" "}
                  {metrics.circularPaths} circular paths detected, indicating
                  potential arbitrage or wash trading activity.
                </span>
              ) : (
                <span> No circular transfer patterns detected.</span>
              )}
            </p>
            <p>
              <span className="font-medium text-[#00bfff]">
                Path Efficiency:
              </span>
              <span>
                {" "}
                Average path length of {metrics.averagePathLength.toFixed(
                  1
                )}{" "}
                hops suggests{" "}
                {metrics.averagePathLength < 2.5
                  ? "efficient direct routing"
                  : "complex multi-step transfers"}
                .
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopTransferPaths;
