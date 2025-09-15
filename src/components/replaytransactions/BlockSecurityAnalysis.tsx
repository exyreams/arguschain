import React, { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/global";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Eye,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityFlag {
  id: string;
  type: string;
  category: "admin" | "transfer" | "contract" | "gas" | "access" | "compliance";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  transactionHash: string;
  timestamp: number;
  contractAddress?: string;
  affectedAddresses?: string[];
}

interface TransactionSecurityData {
  hash: string;
  flags: SecurityFlag[];
  riskScore: number;
  gasAnomalies: boolean;
  largeTransfers: boolean;
  adminCalls: boolean;
  contractChanges: boolean;
}

interface BlockSecurityData {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  transactions: TransactionSecurityData[];
  totalFlags: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  securityScore: number;
  trends: {
    flagsVsPrevious: number;
    riskScoreVsPrevious: number;
    newThreats: string[];
  };
  correlations: {
    id: string;
    description: string;
    affectedTransactions: string[];
    severity: "low" | "medium" | "high" | "critical";
  }[];
}

interface BlockSecurityAnalysisProps {
  blockData: BlockSecurityData;
  historicalData?: BlockSecurityData[];
  onFlagSelect?: (flag: SecurityFlag) => void;
  onTransactionSelect?: (transactionHash: string) => void;
  onCorrelationAnalysis?: (correlation: any) => void;
  className?: string;
  showTrends?: boolean;
  showCorrelations?: boolean;
}

class BlockSecurityAnalysisEngine {
  static calculateBlockSecurityScore(blockData: BlockSecurityData): number {
    const { riskDistribution, totalFlags, transactions } = blockData;

    let score = 100;

    score -= riskDistribution.critical * 25;
    score -= riskDistribution.high * 15;
    score -= riskDistribution.medium * 8;
    score -= riskDistribution.low * 3;

    const highRiskTxCount = transactions.filter(
      (tx) => tx.riskScore > 70,
    ).length;
    score -= highRiskTxCount * 5;

    const adminCallCount = transactions.filter((tx) => tx.adminCalls).length;
    const contractChangeCount = transactions.filter(
      (tx) => tx.contractChanges,
    ).length;
    score -= adminCallCount * 10;
    score -= contractChangeCount * 15;

    return Math.max(0, Math.min(100, score));
  }

  static detectSecurityCorrelations(blockData: BlockSecurityData): any[] {
    const correlations = [];
    const { transactions } = blockData;

    const adminTransactions = transactions.filter((tx) => tx.adminCalls);
    if (adminTransactions.length >= 2) {
      correlations.push({
        id: "coordinated-admin",
        description: `${adminTransactions.length} coordinated administrative calls detected`,
        affectedTransactions: adminTransactions.map((tx) => tx.hash),
        severity: adminTransactions.length > 3 ? "critical" : "high",
        type: "admin_coordination",
        riskLevel: adminTransactions.length * 20,
      });
    }

    const largeTransferTxs = transactions.filter((tx) => tx.largeTransfers);
    if (largeTransferTxs.length >= 3) {
      correlations.push({
        id: "large-transfer-pattern",
        description: `Pattern of ${largeTransferTxs.length} large transfers in single block`,
        affectedTransactions: largeTransferTxs.map((tx) => tx.hash),
        severity: largeTransferTxs.length > 5 ? "critical" : "medium",
        type: "transfer_pattern",
        riskLevel: largeTransferTxs.length * 15,
      });
    }

    const gasAnomalyTxs = transactions.filter((tx) => tx.gasAnomalies);
    if (gasAnomalyTxs.length >= 4) {
      correlations.push({
        id: "gas-anomaly-cluster",
        description: `Cluster of ${gasAnomalyTxs.length} transactions with gas anomalies`,
        affectedTransactions: gasAnomalyTxs.map((tx) => tx.hash),
        severity: "medium",
        type: "gas_anomaly",
        riskLevel: gasAnomalyTxs.length * 10,
      });
    }

    const contractChangeTxs = transactions.filter((tx) => tx.contractChanges);
    if (contractChangeTxs.length >= 2) {
      correlations.push({
        id: "contract-change-coordination",
        description: `${contractChangeTxs.length} coordinated contract modifications`,
        affectedTransactions: contractChangeTxs.map((tx) => tx.hash),
        severity: "critical",
        type: "contract_coordination",
        riskLevel: contractChangeTxs.length * 30,
      });
    }

    const highRiskTxs = transactions.filter((tx) => tx.riskScore > 80);
    if (highRiskTxs.length >= 3) {
      correlations.push({
        id: "high-risk-cluster",
        description: `Cluster of ${highRiskTxs.length} high-risk transactions`,
        affectedTransactions: highRiskTxs.map((tx) => tx.hash),
        severity: "high",
        type: "risk_cluster",
        riskLevel: highRiskTxs.length * 25,
      });
    }

    return correlations.sort((a, b) => b.riskLevel - a.riskLevel);
  }

  static analyzeTrends(
    currentBlock: BlockSecurityData,
    historicalData: BlockSecurityData[],
  ): any {
    if (!historicalData || historicalData.length === 0) {
      return {
        flagsTrend: "stable",
        riskTrend: "stable",
        flagsChange: 0,
        riskChange: 0,
        emergingThreats: [],
        improvingAreas: [],
      };
    }

    const recentBlocks = historicalData.slice(-5);
    const avgFlags =
      recentBlocks.reduce((sum, block) => sum + block.totalFlags, 0) /
      recentBlocks.length;
    const avgRisk =
      recentBlocks.reduce((sum, block) => sum + block.securityScore, 0) /
      recentBlocks.length;

    const flagsChange = ((currentBlock.totalFlags - avgFlags) / avgFlags) * 100;
    const riskChange = ((currentBlock.securityScore - avgRisk) / avgRisk) * 100;

    const emergingThreats = [];
    const currentFlagTypes = new Set(
      currentBlock.transactions.flatMap((tx) =>
        tx.flags.map((flag) => flag.type),
      ),
    );

    const historicalFlagTypes = new Set(
      recentBlocks.flatMap((block) =>
        block.transactions.flatMap((tx) => tx.flags.map((flag) => flag.type)),
      ),
    );

    currentFlagTypes.forEach((flagType) => {
      if (!historicalFlagTypes.has(flagType)) {
        emergingThreats.push(flagType);
      }
    });

    return {
      flagsTrend:
        flagsChange > 20
          ? "increasing"
          : flagsChange < -20
            ? "decreasing"
            : "stable",
      riskTrend:
        riskChange < -10
          ? "improving"
          : riskChange > 10
            ? "deteriorating"
            : "stable",
      flagsChange: Math.round(flagsChange),
      riskChange: Math.round(riskChange),
      emergingThreats,
      improvingAreas: riskChange < -10 ? ["Overall security posture"] : [],
    };
  }

  static prioritizeSecurityAlerts(blockData: BlockSecurityData): any[] {
    const alerts = [];

    if (blockData.riskDistribution.critical > 2) {
      alerts.push({
        id: "multiple-critical",
        priority: "critical",
        title: "Multiple Critical Security Flags",
        description: `${blockData.riskDistribution.critical} critical security flags detected in this block`,
        action: "Immediate investigation required",
        escalate: true,
      });
    }

    if (blockData.securityScore < 30) {
      alerts.push({
        id: "low-security-score",
        priority: "high",
        title: "Low Block Security Score",
        description: `Block security score is ${blockData.securityScore}/100`,
        action: "Review all transactions in this block",
        escalate: true,
      });
    }

    const adminCallCount = blockData.transactions.filter(
      (tx) => tx.adminCalls,
    ).length;
    if (adminCallCount > 3) {
      alerts.push({
        id: "multiple-admin-calls",
        priority: "high",
        title: "Multiple Administrative Calls",
        description: `${adminCallCount} transactions contain administrative function calls`,
        action: "Verify authorization for admin actions",
        escalate: false,
      });
    }

    if (blockData.totalFlags > 15) {
      alerts.push({
        id: "high-flag-concentration",
        priority: "medium",
        title: "High Security Flag Concentration",
        description: `${blockData.totalFlags} security flags in single block`,
        action: "Monitor for patterns",
        escalate: false,
      });
    }

    return alerts.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}

const severityConfig = {
  critical: {
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200",
    icon: XCircle,
    label: "Critical",
  },
  high: {
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200",
    icon: AlertTriangle,
    label: "High",
  },
  medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    borderColor: "border-yellow-200",
    icon: AlertCircle,
    label: "Medium",
  },
  low: {
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200",
    icon: Eye,
    label: "Low",
  },
};

export const BlockSecurityAnalysis: React.FC<BlockSecurityAnalysisProps> = ({
  blockData,
  historicalData,
  onFlagSelect,
  onTransactionSelect,
  onCorrelationAnalysis,
  className,
  showTrends = true,
  showCorrelations = true,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "correlations" | "trends" | "alerts"
  >("overview");

  const securityScore = useMemo(() => {
    return BlockSecurityAnalysisEngine.calculateBlockSecurityScore(blockData);
  }, [blockData]);

  const correlations = useMemo(() => {
    return showCorrelations
      ? BlockSecurityAnalysisEngine.detectSecurityCorrelations(blockData)
      : [];
  }, [blockData, showCorrelations]);

  const trends = useMemo(() => {
    return showTrends && historicalData
      ? BlockSecurityAnalysisEngine.analyzeTrends(blockData, historicalData)
      : null;
  }, [blockData, historicalData, showTrends]);

  const prioritizedAlerts = useMemo(() => {
    return BlockSecurityAnalysisEngine.prioritizeSecurityAlerts(blockData);
  }, [blockData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
      case "deteriorating":
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case "decreasing":
      case "improving":
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Block Security Analysis</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Block #{blockData.blockNumber} • {blockData.transactions.length}{" "}
            transactions
          </p>
        </div>

        <div className="text-right">
          <div
            className={cn("text-2xl font-bold", getScoreColor(securityScore))}
          >
            {securityScore}/100
          </div>
          <div className="text-sm text-muted-foreground">Security Score</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-red-600">
            {blockData.riskDistribution.critical}
          </div>
          <div className="text-xs text-muted-foreground">Critical Flags</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-orange-600">
            {blockData.riskDistribution.high}
          </div>
          <div className="text-xs text-muted-foreground">High Risk</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold">
            {blockData.transactions.filter((tx) => tx.adminCalls).length}
          </div>
          <div className="text-xs text-muted-foreground">Admin Calls</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold">{correlations.length}</div>
          <div className="text-xs text-muted-foreground">Correlations</div>
        </div>
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "correlations", label: "Correlations", icon: Target },
          { id: "trends", label: "Trends", icon: TrendingUp },
          { id: "alerts", label: "Alerts", icon: AlertTriangle },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.id
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

      <div className="space-y-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Risk Distribution</h4>
              <div className="space-y-2">
                {Object.entries(blockData.riskDistribution).map(
                  ([severity, count]) => {
                    const config =
                      severityConfig[severity as keyof typeof severityConfig];
                    const SeverityIcon = config.icon;

                    return count > 0 ? (
                      <div
                        key={severity}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={cn("p-1 rounded-full", config.color)}>
                            <SeverityIcon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium">
                            {config.label}
                          </span>
                        </div>
                        <Badge variant="outline">{count} flags</Badge>
                      </div>
                    ) : null;
                  },
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">
                High-Risk Transactions
              </h4>
              <div className="space-y-2">
                {blockData.transactions
                  .filter((tx) => tx.riskScore > 60)
                  .slice(0, 5)
                  .map((tx) => (
                    <div
                      key={tx.hash}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => onTransactionSelect?.(tx.hash)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-mono">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </div>
                        <div className="flex items-center space-x-1">
                          {tx.adminCalls && (
                            <Badge variant="destructive" className="text-xs">
                              Admin
                            </Badge>
                          )}
                          {tx.largeTransfers && (
                            <Badge variant="secondary" className="text-xs">
                              Large Transfer
                            </Badge>
                          )}
                          {tx.contractChanges && (
                            <Badge variant="destructive" className="text-xs">
                              Contract Change
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            getScoreColor(100 - tx.riskScore),
                          )}
                        >
                          {tx.riskScore}% risk
                        </span>
                        <Badge variant="outline">{tx.flags.length} flags</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "correlations" && (
          <div className="space-y-4">
            {correlations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No security correlations detected</p>
                <p className="text-xs">Transactions appear to be independent</p>
              </div>
            ) : (
              correlations.map((correlation) => {
                const severityInfo = severityConfig[correlation.severity];
                const SeverityIcon = severityInfo.icon;

                return (
                  <div
                    key={correlation.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all duration-200",
                      severityInfo.bgColor,
                      severityInfo.borderColor,
                    )}
                    onClick={() => onCorrelationAnalysis?.(correlation)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className={cn("p-2 rounded-full", severityInfo.color)}
                        >
                          <SeverityIcon className="h-4 w-4 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="text-sm font-medium">
                              {correlation.description}
                            </h5>
                            <Badge variant="outline" className="text-xs">
                              {severityInfo.label}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground mb-2">
                            Affects {correlation.affectedTransactions.length}{" "}
                            transactions
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Risk Level: {correlation.riskLevel}/100
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCorrelationAnalysis?.(correlation);
                        }}
                      >
                        Analyze
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "trends" && trends && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium">Security Flags Trend</h5>
                  {getTrendIcon(trends.flagsTrend)}
                </div>
                <div className="text-2xl font-bold mb-1">
                  {trends.flagsChange > 0 ? "+" : ""}
                  {trends.flagsChange}%
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. recent average
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium">Security Score Trend</h5>
                  {getTrendIcon(trends.riskTrend)}
                </div>
                <div className="text-2xl font-bold mb-1">
                  {trends.riskChange > 0 ? "+" : ""}
                  {trends.riskChange}%
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. recent average
                </div>
              </div>
            </div>

            {trends.emergingThreats.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-3">Emerging Threats</h5>
                <div className="space-y-2">
                  {trends.emergingThreats.map((threat) => (
                    <div
                      key={threat}
                      className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 rounded"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{threat}</span>
                      <Badge variant="destructive" className="text-xs">
                        New
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trends.improvingAreas.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-3">Improving Areas</h5>
                <div className="space-y-2">
                  {trends.improvingAreas.map((area) => (
                    <div
                      key={area}
                      className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 rounded"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{area}</span>
                      <Badge variant="default" className="text-xs bg-green-600">
                        Improving
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-4">
            {prioritizedAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No security alerts</p>
                <p className="text-xs">Block security appears normal</p>
              </div>
            ) : (
              prioritizedAlerts.map((alert) => {
                const severityInfo =
                  severityConfig[alert.priority as keyof typeof severityConfig];
                const SeverityIcon = severityInfo.icon;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 border rounded-lg",
                      severityInfo.bgColor,
                      severityInfo.borderColor,
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className={cn("p-2 rounded-full", severityInfo.color)}
                        >
                          <SeverityIcon className="h-4 w-4 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="text-sm font-medium">
                              {alert.title}
                            </h5>
                            <Badge variant="outline" className="text-xs">
                              {severityInfo.label}
                            </Badge>
                            {alert.escalate && (
                              <Badge variant="destructive" className="text-xs">
                                Escalate
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.description}
                          </p>

                          <div className="text-xs font-medium text-foreground">
                            Recommended Action: {alert.action}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
