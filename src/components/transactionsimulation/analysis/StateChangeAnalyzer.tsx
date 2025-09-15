import React, { useMemo, useState } from "react";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Coins,
  Database,
  Eye,
  Shield,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SimulationUtils } from "@/lib/transactionsimulation";

interface StateChange {
  type: "transfer" | "approval" | "mint" | "burn";
  from?: string;
  to?: string;
  amount?: number;
  spender?: string;
  owner?: string;
  blockNumber?: number;
  transactionIndex?: number;
  logIndex?: number;
}

interface BalanceChange {
  address: string;
  before: number;
  after: number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
}

interface StateChangeAnalyzerProps {
  stateChanges: StateChange[];
  balanceChanges?: BalanceChange[];
  contractAddress: string;
  functionName: string;
  fromAddress: string;
  className?: string;
}

export const StateChangeAnalyzer: React.FC<StateChangeAnalyzerProps> = ({
  stateChanges,
  balanceChanges = [],
  contractAddress,
  functionName,
  fromAddress,
  className = "",
}) => {
  const [selectedView, setSelectedView] = useState<
    "overview" | "flows" | "balances" | "events"
  >("overview");

  const analysis = useMemo(() => {
    const transfers = stateChanges.filter((c) => c.type === "transfer");
    const approvals = stateChanges.filter((c) => c.type === "approval");
    const mints = stateChanges.filter((c) => c.type === "mint");
    const burns = stateChanges.filter((c) => c.type === "burn");

    const totalVolume = transfers.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalMinted = mints.reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalBurned = burns.reduce((sum, b) => sum + (b.amount || 0), 0);

    const allAddresses = new Set<string>();
    stateChanges.forEach((change) => {
      if (change.from) allAddresses.add(change.from);
      if (change.to) allAddresses.add(change.to);
      if (change.owner) allAddresses.add(change.owner);
      if (change.spender) allAddresses.add(change.spender);
    });

    const flowData = {
      nodes: Array.from(allAddresses).map((address, index) => ({
        id: index,
        name: SimulationUtils.shortenAddress(address),
        fullAddress: address,
      })),
      links: transfers.map((transfer) => {
        const sourceIndex = Array.from(allAddresses).indexOf(transfer.from!);
        const targetIndex = Array.from(allAddresses).indexOf(transfer.to!);
        return {
          source: sourceIndex,
          target: targetIndex,
          value: transfer.amount || 0,
          label: `${transfer.amount} tokens`,
        };
      }),
    };

    const balanceImpacts = balanceChanges.map((change) => ({
      ...change,
      impactLevel:
        Math.abs(change.change) > 1000
          ? "high"
          : Math.abs(change.change) > 100
            ? "medium"
            : "low",
      percentageChange:
        change.before > 0 ? (change.change / change.before) * 100 : 0,
    }));

    const riskFactors = [];
    if (totalVolume > 100000) {
      riskFactors.push({
        type: "high_volume",
        severity: "medium",
        description: `High volume transaction: ${SimulationUtils.formatTokenAmount(totalVolume)} tokens`,
      });
    }

    if (allAddresses.size > 5) {
      riskFactors.push({
        type: "multiple_addresses",
        severity: "low",
        description: `Multiple addresses involved: ${allAddresses.size} unique addresses`,
      });
    }

    if (burns.length > 0) {
      riskFactors.push({
        type: "token_burn",
        severity: "medium",
        description: `Token burning detected: ${SimulationUtils.formatTokenAmount(totalBurned)} tokens`,
      });
    }

    const eventTimeline = stateChanges.map((change, index) => ({
      step: index + 1,
      type: change.type,
      amount: change.amount || 0,
      from: change.from ? SimulationUtils.shortenAddress(change.from) : null,
      to: change.to ? SimulationUtils.shortenAddress(change.to) : null,
      description: getEventDescription(change),
    }));

    return {
      transfers,
      approvals,
      mints,
      burns,
      totalVolume,
      totalMinted,
      totalBurned,
      uniqueAddresses: allAddresses.size,
      flowData,
      balanceImpacts,
      riskFactors,
      eventTimeline,
    };
  }, [stateChanges, balanceChanges]);

  const getEventDescription = (change: StateChange): string => {
    switch (change.type) {
      case "transfer":
        return `Transfer ${SimulationUtils.formatTokenAmount(change.amount || 0)} from ${SimulationUtils.shortenAddress(change.from!)} to ${SimulationUtils.shortenAddress(change.to!)}`;
      case "approval":
        return `Approve ${SimulationUtils.formatTokenAmount(change.amount || 0)} for ${SimulationUtils.shortenAddress(change.spender!)}`;
      case "mint":
        return `Mint ${SimulationUtils.formatTokenAmount(change.amount || 0)} to ${SimulationUtils.shortenAddress(change.to!)}`;
      case "burn":
        return `Burn ${SimulationUtils.formatTokenAmount(change.amount || 0)} from ${SimulationUtils.shortenAddress(change.from!)}`;
      default:
        return "Unknown operation";
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case "transfer":
        return <ArrowRight className="h-4 w-4 text-blue-400" />;
      case "approval":
        return <Shield className="h-4 w-4 text-green-400" />;
      case "mint":
        return <ArrowUp className="h-4 w-4 text-green-400" />;
      case "burn":
        return <ArrowDown className="h-4 w-4 text-red-400" />;
      default:
        return <Database className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      case "medium":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      case "low":
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
      default:
        return "text-gray-400 border-gray-500/50 bg-gray-500/10";
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-xl font-semibold text-[#00bfff]">
            State Change Analysis
          </h3>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {stateChanges.length} changes
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={selectedView === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("overview")}
            className={
              selectedView === "overview"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <Eye className="h-4 w-4 mr-1" />
            Overview
          </Button>
          <Button
            variant={selectedView === "flows" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("flows")}
            className={
              selectedView === "flows"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            Token Flows
          </Button>
          <Button
            variant={selectedView === "balances" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("balances")}
            className={
              selectedView === "balances"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <Coins className="h-4 w-4 mr-1" />
            Balances
          </Button>
          <Button
            variant={selectedView === "events" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("events")}
            className={
              selectedView === "events"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Timeline
          </Button>
        </div>
      </div>

      {selectedView === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">Total Volume</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {SimulationUtils.formatTokenAmount(analysis.totalVolume)}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">Addresses</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {analysis.uniqueAddresses}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">Transfers</div>
              <div className="text-2xl font-bold text-blue-400">
                {analysis.transfers.length}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">Approvals</div>
              <div className="text-2xl font-bold text-green-400">
                {analysis.approvals.length}
              </div>
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Operation Breakdown
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      {
                        name: "Transfers",
                        count: analysis.transfers.length,
                        fill: "#00bfff",
                      },
                      {
                        name: "Approvals",
                        count: analysis.approvals.length,
                        fill: "#10b981",
                      },
                      {
                        name: "Mints",
                        count: analysis.mints.length,
                        fill: "#f59e0b",
                      },
                      {
                        name: "Burns",
                        count: analysis.burns.length,
                        fill: "#ef4444",
                      },
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0,191,255,0.1)"
                    />
                    <XAxis dataKey="name" stroke="#8b9dc3" />
                    <YAxis stroke="#8b9dc3" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(25,28,40,0.95)",
                        border: "1px solid rgba(0,191,255,0.3)",
                        borderRadius: "8px",
                        color: "#00bfff",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {analysis.transfers.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-[rgba(0,191,255,0.1)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-white">
                        Token Transfers
                      </span>
                    </div>
                    <span className="text-sm font-mono text-blue-400">
                      {analysis.transfers.length}
                    </span>
                  </div>
                )}
                {analysis.approvals.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-[rgba(16,185,129,0.1)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-white">Approvals</span>
                    </div>
                    <span className="text-sm font-mono text-green-400">
                      {analysis.approvals.length}
                    </span>
                  </div>
                )}
                {analysis.mints.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-[rgba(245,158,11,0.1)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-white">Token Mints</span>
                    </div>
                    <span className="text-sm font-mono text-yellow-400">
                      {analysis.mints.length}
                    </span>
                  </div>
                )}
                {analysis.burns.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-[rgba(239,68,68,0.1)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-white">Token Burns</span>
                    </div>
                    <span className="text-sm font-mono text-red-400">
                      {analysis.burns.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {analysis.riskFactors.length > 0 && (
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
                Risk Assessment
              </h4>
              <div className="space-y-3">
                {analysis.riskFactors.map((risk, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${getSeverityColor(risk.severity)}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <Badge variant="outline" className="text-xs">
                        {risk.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm">{risk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedView === "flows" && analysis.flowData.links.length > 0 && (
        <div className="space-y-6">
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Token Flow Visualization
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <Sankey
                data={analysis.flowData}
                nodePadding={50}
                margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                link={{ stroke: "#00bfff", strokeOpacity: 0.6 }}
                node={{ fill: "#8b9dc3", fillOpacity: 0.8 }}
              >
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(25,28,40,0.95)",
                    border: "1px solid rgba(0,191,255,0.3)",
                    borderRadius: "8px",
                    color: "#00bfff",
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedView === "balances" && analysis.balanceImpacts.length > 0 && (
        <div className="space-y-6">
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Balance Impact Analysis
            </h4>
            <div className="space-y-3">
              {analysis.balanceImpacts.map((impact, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[rgba(0,0,0,0.3)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-[#8b9dc3]">
                      {SimulationUtils.shortenAddress(impact.address)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        impact.impactLevel === "high"
                          ? "border-red-500/50 text-red-400"
                          : impact.impactLevel === "medium"
                            ? "border-yellow-500/50 text-yellow-400"
                            : "border-blue-500/50 text-blue-400"
                      }`}
                    >
                      {impact.impactLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">
                      {SimulationUtils.formatTokenAmount(impact.before)} →{" "}
                      {SimulationUtils.formatTokenAmount(impact.after)}
                    </div>
                    <div
                      className={`text-xs ${impact.change > 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {impact.change > 0 ? "+" : ""}
                      {SimulationUtils.formatTokenAmount(impact.change)}
                      {impact.percentageChange !== 0 &&
                        ` (${impact.percentageChange.toFixed(1)}%)`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedView === "events" && (
        <div className="space-y-6">
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Event Timeline
            </h4>
            <div className="space-y-3">
              {analysis.eventTimeline.map((event, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-[rgba(0,0,0,0.3)] rounded-lg"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-[rgba(0,191,255,0.2)] rounded-full text-xs font-mono text-[#00bfff]">
                    {event.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getChangeTypeIcon(event.type)}
                      <Badge variant="outline" className="text-xs">
                        {event.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#8b9dc3]">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StateChangeAnalyzer;
