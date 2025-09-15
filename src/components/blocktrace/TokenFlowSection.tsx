import React, { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  DollarSign,
  Eye,
  GitBranch,
  Network,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/global";

interface TokenFlowSectionProps {
  tokenFlow: {
    totalTransfers: number;
    totalVolume: string;
    uniqueSenders: number;
    uniqueReceivers: number;
    averageTransfer: string;
    pyusdTransfers?: number;
    pyusdVolume?: string;
    largestTransfer?: string;
    medianTransfer?: string;
    topSenders?: Array<{
      address: string;
      volume: string;
      count: number;
      dominance: string;
    }>;
    topReceivers?: Array<{
      address: string;
      volume: string;
      count: number;
      dominance: string;
    }>;
    topFlows?: Array<{
      from: string;
      to: string;
      volume: string;
      count: number;
      successRate: string;
    }>;
    networkMetrics?: {
      density: string;
      clustering: string;
      centralNodes: number;
      connectivity: string;
    };
    patterns?: Array<{
      pattern: string;
      count: number;
      description: string;
      severity: "low" | "medium" | "high";
    }>;
    riskMetrics?: {
      concentrationRisk: string;
      failureRate: string;
      whaleActivity: number;
      suspiciousPatterns: string[];
    };
  };
}

export const TokenFlowSection: React.FC<TokenFlowSectionProps> = ({
  tokenFlow,
}) => {
  const insights = useMemo(() => {
    const insights = [];

    if (tokenFlow.riskMetrics?.concentrationRisk === "High") {
      insights.push({
        type: "warning",
        message:
          "High concentration risk detected - single address dominates flows",
        icon: AlertTriangle,
        color: "text-[#f59e0b]",
      });
    }

    if (
      tokenFlow.riskMetrics?.whaleActivity &&
      tokenFlow.riskMetrics.whaleActivity > 5
    ) {
      insights.push({
        type: "info",
        message: `${tokenFlow.riskMetrics.whaleActivity} whale transactions detected`,
        icon: TrendingUp,
        color: "text-[#00bfff]",
      });
    }

    if (
      tokenFlow.riskMetrics?.suspiciousPatterns &&
      tokenFlow.riskMetrics.suspiciousPatterns.length > 0
    ) {
      insights.push({
        type: "error",
        message: `Suspicious patterns detected: ${tokenFlow.riskMetrics.suspiciousPatterns.join(", ")}`,
        icon: Shield,
        color: "text-[#ef4444]",
      });
    }

    return insights;
  }, [tokenFlow.riskMetrics]);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high":
        return "text-[#ef4444] bg-[rgba(239,68,68,0.1)]";
      case "medium":
        return "text-[#f59e0b] bg-[rgba(245,158,11,0.1)]";
      case "low":
        return "text-[#10b981] bg-[rgba(16,185,129,0.1)]";
      default:
        return "text-[#8b9dc3] bg-[rgba(139,157,195,0.1)]";
    }
  };

  const getPatternSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)]";
      case "medium":
        return "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)]";
      case "low":
        return "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)]";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 hover:border-[rgba(0,191,255,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-[#00bfff]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Total Transfers
              </span>
            </div>
            {tokenFlow.pyusdTransfers && (
              <div className="text-xs text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] px-2 py-1 rounded">
                {tokenFlow.pyusdTransfers} PYUSD
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-[#00bfff] mb-2">
            {tokenFlow.totalTransfers.toLocaleString()}
          </div>
          <div className="text-xs text-[#8b9dc3]">
            {tokenFlow.pyusdTransfers
              ? `${((tokenFlow.pyusdTransfers / tokenFlow.totalTransfers) * 100).toFixed(1)}% PYUSD`
              : "All token types"}
          </div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(139,92,246,0.2)] rounded-lg p-6 hover:border-[rgba(139,92,246,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#8b5cf6]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Total Volume
              </span>
            </div>
            <div className="text-xs text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] px-2 py-1 rounded">
              USD
            </div>
          </div>
          <div className="text-3xl font-bold text-[#8b5cf6] mb-2">
            {tokenFlow.totalVolume}
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-[#10b981]" />
            <span className="text-xs text-[#8b9dc3]">
              Avg: {tokenFlow.averageTransfer}
            </span>
          </div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(16,185,129,0.2)] rounded-lg p-6 hover:border-[rgba(16,185,129,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#10b981]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Network Participants
              </span>
            </div>
            <div className="text-xs text-[#10b981] bg-[rgba(16,185,129,0.1)] px-2 py-1 rounded">
              Active
            </div>
          </div>
          <div className="text-3xl font-bold text-[#10b981] mb-2">
            {(
              tokenFlow.uniqueSenders + tokenFlow.uniqueReceivers
            ).toLocaleString()}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8b9dc3]">
              {tokenFlow.uniqueSenders} senders
            </span>
            <span className="text-xs text-[#8b9dc3]">
              {tokenFlow.uniqueReceivers} receivers
            </span>
          </div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(245,158,11,0.2)] rounded-lg p-6 hover:border-[rgba(245,158,11,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#f59e0b]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Network Health
              </span>
            </div>
            {tokenFlow.riskMetrics?.concentrationRisk && (
              <div
                className={`text-xs px-2 py-1 rounded ${getRiskColor(tokenFlow.riskMetrics.concentrationRisk)}`}
              >
                {tokenFlow.riskMetrics.concentrationRisk} Risk
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-[#f59e0b] mb-2">
            {tokenFlow.riskMetrics?.failureRate || "0"}%
          </div>
          <div className="text-xs text-[#8b9dc3]">Failure rate</div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Flow Analysis Insights
            </h3>
          </div>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]"
              >
                <insight.icon className={`h-4 w-4 mt-0.5 ${insight.color}`} />
                <span className="text-sm text-[#8b9dc3]">
                  {insight.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tokenFlow.networkMetrics && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Network className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Network Topology
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="text-2xl font-bold text-[#00bfff] mb-1">
                {tokenFlow.networkMetrics.density}
              </div>
              <div className="text-sm text-[#8b9dc3]">Network Density</div>
              <div className="text-xs text-[#6b7280] mt-1">
                Connection ratio
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="text-2xl font-bold text-[#8b5cf6] mb-1">
                {tokenFlow.networkMetrics.clustering}
              </div>
              <div className="text-sm text-[#8b9dc3]">Clustering</div>
              <div className="text-xs text-[#6b7280] mt-1">
                Local connectivity
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="text-2xl font-bold text-[#10b981] mb-1">
                {tokenFlow.networkMetrics.centralNodes}
              </div>
              <div className="text-sm text-[#8b9dc3]">Hub Nodes</div>
              <div className="text-xs text-[#6b7280] mt-1">High centrality</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="text-2xl font-bold text-[#f59e0b] mb-1">
                {tokenFlow.networkMetrics.connectivity}
              </div>
              <div className="text-sm text-[#8b9dc3]">Connectivity</div>
              <div className="text-xs text-[#6b7280] mt-1">Avg connections</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tokenFlow.topSenders && tokenFlow.topSenders.length > 0 && (
          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="h-5 w-5 text-[#00bfff]" />
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Top Senders
              </h4>
            </div>
            <div className="space-y-3">
              {tokenFlow.topSenders.slice(0, 5).map((sender, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-[#8b9dc3]">
                      {shortenAddress(sender.address)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {sender.count} txs
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#00bfff]">
                      {sender.volume}
                    </div>
                    <div className="text-xs text-[#8b9dc3]">
                      {sender.dominance}% dominance
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tokenFlow.topReceivers && tokenFlow.topReceivers.length > 0 && (
          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-[#8b5cf6]" />
              <h4 className="text-lg font-semibold text-[#8b5cf6]">
                Top Receivers
              </h4>
            </div>
            <div className="space-y-3">
              {tokenFlow.topReceivers.slice(0, 5).map((receiver, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(139,92,246,0.1)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-[#8b9dc3]">
                      {shortenAddress(receiver.address)}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs border-[rgba(139,92,246,0.3)]"
                    >
                      {receiver.count} txs
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#8b5cf6]">
                      {receiver.volume}
                    </div>
                    <div className="text-xs text-[#8b9dc3]">
                      {receiver.dominance}% dominance
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {tokenFlow.topFlows && tokenFlow.topFlows.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Major Flow Pairs
            </h4>
          </div>
          <div className="space-y-3">
            {tokenFlow.topFlows.slice(0, 5).map((flow, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[#8b9dc3]">
                      {shortenAddress(flow.from)}
                    </span>
                    <ArrowRightLeft className="h-3 w-3 text-[#00bfff]" />
                    <span className="font-mono text-sm text-[#8b9dc3]">
                      {shortenAddress(flow.to)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {flow.count} transfers
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        parseFloat(flow.successRate) >= 95
                          ? "border-[rgba(16,185,129,0.3)] text-[#10b981]"
                          : parseFloat(flow.successRate) >= 80
                            ? "border-[rgba(245,158,11,0.3)] text-[#f59e0b]"
                            : "border-[rgba(239,68,68,0.3)] text-[#ef4444]"
                      }`}
                    >
                      {flow.successRate}% success
                    </Badge>
                  </div>
                </div>
                <div className="text-lg font-medium text-[#00bfff]">
                  {flow.volume}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tokenFlow.patterns && tokenFlow.patterns.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Flow Patterns
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tokenFlow.patterns.map((pattern, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getPatternSeverityColor(pattern.severity)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#00bfff]">
                    {pattern.pattern}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      pattern.severity === "high"
                        ? "border-[rgba(239,68,68,0.3)] text-[#ef4444]"
                        : pattern.severity === "medium"
                          ? "border-[rgba(245,158,11,0.3)] text-[#f59e0b]"
                          : "border-[rgba(16,185,129,0.3)] text-[#10b981]"
                    }`}
                  >
                    {pattern.count}
                  </Badge>
                </div>
                <p className="text-sm text-[#8b9dc3]">{pattern.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
