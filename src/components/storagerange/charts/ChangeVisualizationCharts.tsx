import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import { AlertTriangle, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { StorageComparison } from "@/lib/storagerange/api/storageApi";

interface ChangeVisualizationChartsProps {
  changes: StorageComparison[];
  contractAddress: string;
  blockHash1: string;
  blockHash2: string;
  className?: string;
}

interface SupplyChangeData {
  fromValue: number;
  toValue: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface ChangeTimelineData {
  step: number;
  slot: string;
  changeType: "supply" | "balance" | "other";
  magnitude: number;
  impact: "low" | "medium" | "high" | "critical";
}

export const ChangeVisualizationCharts: React.FC<
  ChangeVisualizationChartsProps
> = ({ changes, contractAddress, blockHash1, blockHash2, className = "" }) => {
  const supplyChanges = React.useMemo((): SupplyChangeData[] => {
    const supplyChange = changes.find((c) => c.isSupplyChange);
    if (!supplyChange || !supplyChange.numericDiff) return [];

    const fromValue = parseInt(supplyChange.valueBlock1, 16) / 1e6;
    const toValue = parseInt(supplyChange.valueBlock2, 16) / 1e6;
    const change = supplyChange.numericDiff / 1e6;
    const changePercent = fromValue > 0 ? (change / fromValue) * 100 : 0;

    return [
      {
        fromValue,
        toValue,
        change,
        changePercent,
        timestamp: Date.now(),
      },
    ];
  }, [changes]);

  const changeTimelineData = React.useMemo((): ChangeTimelineData[] => {
    return changes
      .filter((c) => c.changed)
      .map((change, index) => {
        const magnitude = Math.abs(change.numericDiff || 0);
        let impact: "low" | "medium" | "high" | "critical" = "low";

        if (change.isSupplyChange) impact = "critical";
        else if (change.isBalanceChange) impact = "high";
        else if (magnitude > 1000000) impact = "medium";

        const changeType: "supply" | "balance" | "other" = change.isSupplyChange
          ? "supply"
          : change.isBalanceChange
            ? "balance"
            : "other";

        return {
          step: index + 1,
          slot: change.slot.slice(0, 10) + "...",
          changeType,
          magnitude,
          impact,
        };
      })
      .slice(0, 20);
  }, [changes]);

  const changeFrequencyData = React.useMemo(() => {
    const distribution = {
      supply: changes.filter((c) => c.isSupplyChange).length,
      balance: changes.filter((c) => c.isBalanceChange).length,
      other: changes.filter(
        (c) => c.changed && !c.isSupplyChange && !c.isBalanceChange,
      ).length,
    };

    return [
      { name: "Supply Changes", value: distribution.supply, color: "#ef4444" },
      {
        name: "Balance Changes",
        value: distribution.balance,
        color: "#3b82f6",
      },
      { name: "Other Changes", value: distribution.other, color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  }, [changes]);

  const securityAlerts = React.useMemo(() => {
    const alerts = [];

    const supplyChange = changes.find((c) => c.isSupplyChange);
    if (supplyChange) {
      const change = supplyChange.numericDiff || 0;
      alerts.push({
        type: "supply_change",
        severity: Math.abs(change) > 1000000 ? "critical" : "high",
        message: `Total supply ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change / 1e6).toFixed(2)} tokens`,
        impact: "Token economics affected",
      });
    }

    const balanceChanges = changes.filter((c) => c.isBalanceChange).length;
    if (balanceChanges > 5) {
      alerts.push({
        type: "mass_balance_change",
        severity: "medium",
        message: `${balanceChanges} balance changes detected`,
        impact: "Multiple holder balances modified",
      });
    }

    const proxySlots = [
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
    ];

    const proxyChanges = changes.filter((c) => proxySlots.includes(c.slot));
    if (proxyChanges.length > 0) {
      alerts.push({
        type: "proxy_change",
        severity: "critical",
        message: "Proxy configuration changed",
        impact: "Contract upgrade or admin change detected",
      });
    }

    return alerts;
  }, [changes]);

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
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {supplyChanges.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Supply Change Analysis
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="flex items-center gap-2 mb-2">
                  {supplyChanges[0].change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-[#00bfff]">
                    Supply Change
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#00bfff]">
                  {supplyChanges[0].change > 0 ? "+" : ""}
                  {supplyChanges[0].change.toFixed(2)} tokens
                </div>
                <div className="text-sm text-[#8b9dc3]">
                  {supplyChanges[0].changePercent > 0 ? "+" : ""}
                  {supplyChanges[0].changePercent.toFixed(2)}% change
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                  <div className="text-sm text-[#8b9dc3]">From</div>
                  <div className="text-lg font-bold text-[#00bfff]">
                    {supplyChanges[0].fromValue.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                  <div className="text-sm text-[#8b9dc3]">To</div>
                  <div className="text-lg font-bold text-[#00bfff]">
                    {supplyChanges[0].toValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(0,191,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={supplyChanges[0].change > 0 ? "#10b981" : "#ef4444"}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${Math.min(Math.abs(supplyChanges[0].changePercent) * 2.51, 251)} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div
                      className={`text-lg font-bold ${supplyChanges[0].change > 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {supplyChanges[0].changePercent > 0 ? "+" : ""}
                      {supplyChanges[0].changePercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Change Distribution
          </h4>
          {changeFrequencyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={changeFrequencyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {changeFrequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-[#8b9dc3]">
              No changes to visualize
            </div>
          )}
        </Card>

        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Change Timeline
          </h4>
          {changeTimelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={changeTimelineData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis dataKey="step" stroke="#8b9dc3" fontSize={12} />
                <YAxis stroke="#8b9dc3" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="magnitude"
                  stroke="#00bfff"
                  fill="rgba(0,191,255,0.2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-[#8b9dc3]">
              No timeline data available
            </div>
          )}
        </Card>
      </div>

      {securityAlerts.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Security Change Alerts
            </h4>
            <Badge
              variant="outline"
              className="border-red-500/50 text-red-400 bg-red-500/10"
            >
              {securityAlerts.length} Alert
              {securityAlerts.length > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="space-y-3">
            {securityAlerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="mt-0.5">
                  {alert.severity === "critical" && (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  {alert.severity === "high" && (
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                  )}
                  {alert.severity === "medium" && (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#00bfff] text-sm">
                      {alert.type.replace("_", " ").toUpperCase()}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        alert.severity === "critical"
                          ? "border-red-500/50 text-red-400 bg-red-500/10"
                          : alert.severity === "high"
                            ? "border-orange-500/50 text-orange-400 bg-orange-500/10"
                            : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                      }`}
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[#8b9dc3] text-sm mb-1">{alert.message}</p>
                  <p className="text-[#6b7280] text-xs">
                    Impact: {alert.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Change Impact Analysis
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-sm text-[#8b9dc3] mb-1">Critical Changes</div>
            <div className="text-2xl font-bold text-red-400">
              {changes.filter((c) => c.isSupplyChange).length}
            </div>
            <div className="text-xs text-[#6b7280]">Supply modifications</div>
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-sm text-[#8b9dc3] mb-1">High Impact</div>
            <div className="text-2xl font-bold text-orange-400">
              {changes.filter((c) => c.isBalanceChange).length}
            </div>
            <div className="text-xs text-[#6b7280]">Balance modifications</div>
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-sm text-[#8b9dc3] mb-1">Total Changes</div>
            <div className="text-2xl font-bold text-[#00bfff]">
              {changes.filter((c) => c.changed).length}
            </div>
            <div className="text-xs text-[#6b7280]">Storage modifications</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
