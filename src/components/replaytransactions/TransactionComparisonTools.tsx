import React, { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/global";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  CheckCircle,
  DollarSign,
  Eye,
  Search,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionData {
  hash: string;
  blockNumber: number;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  gasLimit: number;
  status: "success" | "failed";
  timestamp: number;
  pyusdActivity?: {
    hasActivity: boolean;
    transferCount: number;
    totalVolume: number;
    uniqueAddresses: number;
  };
  gasEfficiency?: {
    score: number;
    category: "excellent" | "good" | "average" | "poor";
  };
  securityFlags?: {
    count: number;
    severity: "low" | "medium" | "high" | "critical";
    hasAdminCalls: boolean;
    hasLargeTransfers: boolean;
  };
  complexity?: {
    callDepth: number;
    contractsInteracted: number;
    eventsEmitted: number;
  };
}

interface TransactionCluster {
  id: string;
  name: string;
  transactions: TransactionData[];
  characteristics: {
    avgGasUsed: number;
    avgPyusdVolume: number;
    successRate: number;
    commonPattern: string;
  };
  anomalyScore: number;
}

interface TransactionComparisonToolsProps {
  transactions: TransactionData[];
  onTransactionSelect?: (transaction: TransactionData) => void;
  onComparisonSelect?: (transactions: TransactionData[]) => void;
  onClusterAnalysis?: (cluster: TransactionCluster) => void;
  className?: string;
  showClustering?: boolean;
  showAnomalyDetection?: boolean;
}

class TransactionAnalysisEngine {
  static rankTransactions(
    transactions: TransactionData[],
    criteria: "pyusd" | "gas" | "security" | "complexity",
  ): TransactionData[] {
    return [...transactions].sort((a, b) => {
      switch (criteria) {
        case "pyusd":
          const aVolume = a.pyusdActivity?.totalVolume || 0;
          const bVolume = b.pyusdActivity?.totalVolume || 0;
          return bVolume - aVolume;
        case "gas":
          return b.gasUsed - a.gasUsed;
        case "security":
          const aFlags = a.securityFlags?.count || 0;
          const bFlags = b.securityFlags?.count || 0;
          return bFlags - aFlags;
        case "complexity":
          const aComplexity =
            (a.complexity?.callDepth || 0) +
            (a.complexity?.contractsInteracted || 0);
          const bComplexity =
            (b.complexity?.callDepth || 0) +
            (b.complexity?.contractsInteracted || 0);
          return bComplexity - aComplexity;
        default:
          return 0;
      }
    });
  }

  static clusterTransactions(
    transactions: TransactionData[],
  ): TransactionCluster[] {
    const clusters: TransactionCluster[] = [];

    const gasRanges = [
      { min: 0, max: 50000, name: "Low Gas Usage" },
      { min: 50000, max: 200000, name: "Medium Gas Usage" },
      { min: 200000, max: 500000, name: "High Gas Usage" },
      { min: 500000, max: Infinity, name: "Very High Gas Usage" },
    ];

    gasRanges.forEach((range) => {
      const clusterTxs = transactions.filter(
        (tx) => tx.gasUsed >= range.min && tx.gasUsed < range.max,
      );

      if (clusterTxs.length > 0) {
        clusters.push({
          id: `gas-${range.min}-${range.max}`,
          name: range.name,
          transactions: clusterTxs,
          characteristics: {
            avgGasUsed:
              clusterTxs.reduce((sum, tx) => sum + tx.gasUsed, 0) /
              clusterTxs.length,
            avgPyusdVolume:
              clusterTxs.reduce(
                (sum, tx) => sum + (tx.pyusdActivity?.totalVolume || 0),
                0,
              ) / clusterTxs.length,
            successRate:
              (clusterTxs.filter((tx) => tx.status === "success").length /
                clusterTxs.length) *
              100,
            commonPattern: this.identifyCommonPattern(clusterTxs),
          },
          anomalyScore: this.calculateAnomalyScore(clusterTxs),
        });
      }
    });

    const pyusdClusters = [
      {
        filter: (tx: TransactionData) => !tx.pyusdActivity?.hasActivity,
        name: "No PYUSD Activity",
      },
      {
        filter: (tx: TransactionData) =>
          (tx.pyusdActivity?.totalVolume || 0) < 1000,
        name: "Small PYUSD Transfers",
      },
      {
        filter: (tx: TransactionData) =>
          (tx.pyusdActivity?.totalVolume || 0) >= 1000 &&
          (tx.pyusdActivity?.totalVolume || 0) < 10000,
        name: "Medium PYUSD Transfers",
      },
      {
        filter: (tx: TransactionData) =>
          (tx.pyusdActivity?.totalVolume || 0) >= 10000,
        name: "Large PYUSD Transfers",
      },
    ];

    pyusdClusters.forEach((cluster, index) => {
      const clusterTxs = transactions.filter(cluster.filter);

      if (clusterTxs.length > 0) {
        clusters.push({
          id: `pyusd-${index}`,
          name: cluster.name,
          transactions: clusterTxs,
          characteristics: {
            avgGasUsed:
              clusterTxs.reduce((sum, tx) => sum + tx.gasUsed, 0) /
              clusterTxs.length,
            avgPyusdVolume:
              clusterTxs.reduce(
                (sum, tx) => sum + (tx.pyusdActivity?.totalVolume || 0),
                0,
              ) / clusterTxs.length,
            successRate:
              (clusterTxs.filter((tx) => tx.status === "success").length /
                clusterTxs.length) *
              100,
            commonPattern: this.identifyCommonPattern(clusterTxs),
          },
          anomalyScore: this.calculateAnomalyScore(clusterTxs),
        });
      }
    });

    return clusters.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }

  static detectAnomalies(transactions: TransactionData[]): TransactionData[] {
    const anomalies: TransactionData[] = [];

    const gasUsages = transactions.map((tx) => tx.gasUsed);
    const avgGas =
      gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
    const gasStdDev = Math.sqrt(
      gasUsages.reduce((sum, gas) => sum + Math.pow(gas - avgGas, 2), 0) /
        gasUsages.length,
    );
    const gasThreshold = avgGas + 2 * gasStdDev;

    const pyusdVolumes = transactions.map(
      (tx) => tx.pyusdActivity?.totalVolume || 0,
    );
    const avgVolume =
      pyusdVolumes.reduce((sum, vol) => sum + vol, 0) / pyusdVolumes.length;
    const volumeStdDev = Math.sqrt(
      pyusdVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) /
        pyusdVolumes.length,
    );
    const volumeThreshold = avgVolume + 2 * volumeStdDev;

    transactions.forEach((tx) => {
      let isAnomaly = false;

      if (tx.gasUsed > gasThreshold) {
        isAnomaly = true;
      }

      if ((tx.pyusdActivity?.totalVolume || 0) > volumeThreshold) {
        isAnomaly = true;
      }

      if (tx.securityFlags && tx.securityFlags.count > 3) {
        isAnomaly = true;
      }

      if (tx.status === "failed" && tx.gasUsed > avgGas) {
        isAnomaly = true;
      }

      if (isAnomaly) {
        anomalies.push(tx);
      }
    });

    return anomalies;
  }

  private static identifyCommonPattern(
    transactions: TransactionData[],
  ): string {
    if (transactions.length === 0) return "No pattern";

    const hasHighGas = transactions.some((tx) => tx.gasUsed > 200000);
    const hasPyusdActivity = transactions.some(
      (tx) => tx.pyusdActivity?.hasActivity,
    );
    const hasSecurityFlags = transactions.some(
      (tx) => (tx.securityFlags?.count || 0) > 0,
    );
    const highFailureRate =
      transactions.filter((tx) => tx.status === "failed").length /
        transactions.length >
      0.1;

    if (hasHighGas && hasPyusdActivity) return "Complex PYUSD Operations";
    if (hasSecurityFlags) return "Security-Flagged Transactions";
    if (highFailureRate) return "High Failure Rate";
    if (hasPyusdActivity) return "PYUSD Activity";
    if (hasHighGas) return "Gas-Intensive Operations";

    return "Standard Transactions";
  }

  private static calculateAnomalyScore(
    transactions: TransactionData[],
  ): number {
    if (transactions.length === 0) return 0;

    let score = 0;

    const avgGas =
      transactions.reduce((sum, tx) => sum + tx.gasUsed, 0) /
      transactions.length;
    if (avgGas > 200000) score += 30;
    else if (avgGas > 100000) score += 15;

    const avgSecurityFlags =
      transactions.reduce(
        (sum, tx) => sum + (tx.securityFlags?.count || 0),
        0,
      ) / transactions.length;
    score += avgSecurityFlags * 20;

    const failureRate =
      transactions.filter((tx) => tx.status === "failed").length /
      transactions.length;
    score += failureRate * 40;

    const avgVolume =
      transactions.reduce(
        (sum, tx) => sum + (tx.pyusdActivity?.totalVolume || 0),
        0,
      ) / transactions.length;
    if (avgVolume > 100000) score += 25;
    else if (avgVolume > 10000) score += 10;

    return Math.min(100, score);
  }
}

const rankingCriteria = [
  {
    id: "pyusd",
    label: "PYUSD Activity",
    icon: DollarSign,
    description: "Ranked by PYUSD transfer volume",
  },
  {
    id: "gas",
    label: "Gas Usage",
    icon: Zap,
    description: "Ranked by gas consumption",
  },
  {
    id: "security",
    label: "Security Flags",
    icon: Shield,
    description: "Ranked by security flag count",
  },
  {
    id: "complexity",
    label: "Complexity",
    icon: BarChart3,
    description: "Ranked by transaction complexity",
  },
];

export const TransactionComparisonTools: React.FC<
  TransactionComparisonToolsProps
> = ({
  transactions,
  onTransactionSelect,
  onComparisonSelect,
  onClusterAnalysis,
  className,
  showClustering = true,
  showAnomalyDetection = true,
}) => {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );
  const [rankingCriteria, setRankingCriteria] = useState<
    "pyusd" | "gas" | "security" | "complexity"
  >("pyusd");
  const [searchTerm, setSearchTerm] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [activeView, setActiveView] = useState<
    "ranking" | "clustering" | "anomalies"
  >("ranking");

  const rankedTransactions = useMemo(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = transactions.filter(
        (tx) =>
          tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.to.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return TransactionAnalysisEngine.rankTransactions(
      filtered,
      rankingCriteria,
    );
  }, [transactions, rankingCriteria, searchTerm]);

  const transactionClusters = useMemo(() => {
    return showClustering
      ? TransactionAnalysisEngine.clusterTransactions(transactions)
      : [];
  }, [transactions, showClustering]);

  const anomalousTransactions = useMemo(() => {
    return showAnomalyDetection
      ? TransactionAnalysisEngine.detectAnomalies(transactions)
      : [];
  }, [transactions, showAnomalyDetection]);

  const toggleTransactionSelection = (txHash: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(txHash)) {
      newSelected.delete(txHash);
    } else {
      newSelected.add(txHash);
    }
    setSelectedTransactions(newSelected);
  };

  const handleCompareSelected = () => {
    const selectedTxs = transactions.filter((tx) =>
      selectedTransactions.has(tx.hash),
    );
    onComparisonSelect?.(selectedTxs);
    setShowComparison(true);
  };

  const clearSelection = () => {
    setSelectedTransactions(new Set());
    setShowComparison(false);
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <ArrowLeftRight className="h-5 w-5" />
            <span>Transaction Comparison Tools</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Analyze and compare {transactions.length} transactions
          </p>
        </div>

        {selectedTransactions.size > 0 && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {selectedTransactions.size} selected
            </Badge>
            <Button
              size="sm"
              onClick={handleCompareSelected}
              disabled={selectedTransactions.size < 2}
            >
              Compare
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: "ranking", label: "Ranking", icon: TrendingUp },
          { id: "clustering", label: "Clustering", icon: Users },
          { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeView === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions by hash, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {activeView === "ranking" && (
          <select
            value={rankingCriteria}
            onChange={(e) => setRankingCriteria(e.target.value as any)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            {rankingCriteria.map((criteria) => (
              <option key={criteria.id} value={criteria.id}>
                {criteria.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-4">
        {activeView === "ranking" && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              {
                rankingCriteria.find((c) => c.id === rankingCriteria)
                  ?.description
              }
            </div>

            {rankedTransactions.map((tx, index) => (
              <div
                key={tx.hash}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
                  selectedTransactions.has(tx.hash) &&
                    "border-primary bg-primary/5",
                )}
                onClick={() => {
                  toggleTransactionSelection(tx.hash);
                  onTransactionSelect?.(tx);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-mono truncate">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </span>
                        <Badge
                          variant={
                            tx.status === "success" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {tx.status}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Gas: {tx.gasUsed.toLocaleString()}</span>
                        {tx.pyusdActivity?.hasActivity && (
                          <span>
                            PYUSD: $
                            {tx.pyusdActivity.totalVolume.toLocaleString()}
                          </span>
                        )}
                        {tx.securityFlags && tx.securityFlags.count > 0 && (
                          <span
                            className={getSeverityColor(
                              tx.securityFlags.severity,
                            )}
                          >
                            {tx.securityFlags.count} flags
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {tx.gasEfficiency && (
                      <div
                        className={cn(
                          "text-sm font-medium",
                          getEfficiencyColor(tx.gasEfficiency.score),
                        )}
                      >
                        {tx.gasEfficiency.score}%
                      </div>
                    )}

                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(tx.hash)}
                      onChange={() => toggleTransactionSelection(tx.hash)}
                      className="rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === "clustering" && (
          <div className="space-y-4">
            {transactionClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => onClusterAnalysis?.(cluster)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium">{cluster.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {cluster.transactions.length} transactions •{" "}
                      {cluster.characteristics.commonPattern}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        cluster.anomalyScore > 50
                          ? "destructive"
                          : cluster.anomalyScore > 25
                            ? "secondary"
                            : "default"
                      }
                      className="text-xs"
                    >
                      {cluster.anomalyScore.toFixed(0)}% anomaly
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Avg Gas</div>
                    <div className="font-medium">
                      {cluster.characteristics.avgGasUsed.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Avg PYUSD
                    </div>
                    <div className="font-medium">
                      ${cluster.characteristics.avgPyusdVolume.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Success Rate
                    </div>
                    <div className="font-medium">
                      {cluster.characteristics.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Count</div>
                    <div className="font-medium">
                      {cluster.transactions.length}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === "anomalies" && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              {anomalousTransactions.length} anomalous transactions detected
              using statistical analysis
            </div>

            {anomalousTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No anomalous transactions detected</p>
                <p className="text-xs">
                  All transactions appear to follow normal patterns
                </p>
              </div>
            ) : (
              anomalousTransactions.map((tx) => (
                <div
                  key={tx.hash}
                  className="p-4 border border-orange-200 bg-orange-50 dark:bg-orange-950 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                  onClick={() => onTransactionSelect?.(tx)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-mono truncate">
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                          </span>
                          <Badge
                            variant={
                              tx.status === "success"
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {tx.status}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Gas: {tx.gasUsed.toLocaleString()}</span>
                          {tx.pyusdActivity?.hasActivity && (
                            <span>
                              PYUSD: $
                              {tx.pyusdActivity.totalVolume.toLocaleString()}
                            </span>
                          )}
                          {tx.securityFlags && tx.securityFlags.count > 0 && (
                            <span
                              className={getSeverityColor(
                                tx.securityFlags.severity,
                              )}
                            >
                              {tx.securityFlags.count} security flags
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTransactionSelect?.(tx);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Analyze
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showComparison && selectedTransactions.size >= 2 && (
        <div className="mt-6 p-4 border-t">
          <h4 className="text-sm font-medium mb-4">Transaction Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(selectedTransactions)
              .slice(0, 3)
              .map((txHash) => {
                const tx = transactions.find((t) => t.hash === txHash);
                if (!tx) return null;

                return (
                  <div
                    key={txHash}
                    className="p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="text-xs font-mono mb-2 truncate">
                      {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Gas Used:</span>
                        <span className="font-medium">
                          {tx.gasUsed.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge
                          variant={
                            tx.status === "success" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      {tx.pyusdActivity?.hasActivity && (
                        <div className="flex justify-between">
                          <span>PYUSD Volume:</span>
                          <span className="font-medium">
                            ${tx.pyusdActivity.totalVolume.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {tx.gasEfficiency && (
                        <div className="flex justify-between">
                          <span>Efficiency:</span>
                          <span
                            className={cn(
                              "font-medium",
                              getEfficiencyColor(tx.gasEfficiency.score),
                            )}
                          >
                            {tx.gasEfficiency.score}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </Card>
  );
};
