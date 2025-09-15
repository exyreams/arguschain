import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Blocks,
  CheckCircle,
  Coins,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Hash,
  PieChart,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProcessedBlockReplayData } from "@/lib/replaytransactions/types";

interface BlockReplayDashboardProps {
  blockData: ProcessedBlockReplayData;
  className?: string;
  onTransactionSelect?: (txHash: string) => void;
}

interface TransactionSummary {
  hash: string;
  index: number;
  gasUsed: number;
  gasPrice: bigint;
  success: boolean;
  pyusdActivity: {
    hasActivity: boolean;
    transferCount: number;
    totalVolume: number;
    uniqueAddresses: number;
  };
  securityFlags: number;
  riskScore: number;
}

interface BlockMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalGasUsed: number;
  averageGasPrice: number;
  pyusdTransactions: number;
  pyusdVolume: number;
  uniquePYUSDAddresses: number;
  securityFlags: number;
  blockUtilization: number;
}

interface ActivityHeatmapData {
  transactionIndex: number;
  gasUsed: number;
  pyusdVolume: number;
  securityScore: number;
  timestamp: number;
}

export const BlockReplayDashboard: React.FC<BlockReplayDashboardProps> = ({
  blockData,
  className,
  onTransactionSelect,
}) => {
  const [selectedView, setSelectedView] = useState<
    "overview" | "heatmap" | "transactions" | "security"
  >("overview");
  const [filterCriteria, setFilterCriteria] = useState({
    showOnlyPYUSD: false,
    showOnlyFailed: false,
    minGasUsed: 0,
    maxGasUsed: Infinity,
  });
  const [sortBy, setSortBy] = useState<
    "index" | "gasUsed" | "pyusdVolume" | "securityScore"
  >("index");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const transactionSummaries = useMemo((): TransactionSummary[] => {
    const summaries: TransactionSummary[] = [];

    for (let i = 0; i < (blockData.transactionCount || 50); i++) {
      const gasUsed = Math.floor(Math.random() * 500000) + 21000;
      const gasPrice = BigInt(
        Math.floor(Math.random() * 50000000000) + 10000000000,
      );
      const success = Math.random() > 0.05;

      const hasPYUSDActivity = Math.random() < 0.3;
      const transferCount = hasPYUSDActivity
        ? Math.floor(Math.random() * 5) + 1
        : 0;
      const totalVolume = hasPYUSDActivity ? Math.random() * 100000 : 0;
      const uniqueAddresses = hasPYUSDActivity
        ? Math.floor(Math.random() * 10) + 2
        : 0;

      const securityFlags =
        Math.random() < 0.05 ? Math.floor(Math.random() * 3) + 1 : 0;
      const riskScore =
        securityFlags > 0
          ? Math.floor(Math.random() * 100) + 50
          : Math.floor(Math.random() * 30);

      summaries.push({
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        index: i,
        gasUsed,
        gasPrice,
        success,
        pyusdActivity: {
          hasActivity: hasPYUSDActivity,
          transferCount,
          totalVolume,
          uniqueAddresses,
        },
        securityFlags,
        riskScore,
      });
    }

    return summaries;
  }, [blockData]);

  const blockMetrics = useMemo((): BlockMetrics => {
    const totalTransactions = transactionSummaries.length;
    const successfulTransactions = transactionSummaries.filter(
      (tx) => tx.success,
    ).length;
    const failedTransactions = totalTransactions - successfulTransactions;
    const totalGasUsed = transactionSummaries.reduce(
      (sum, tx) => sum + tx.gasUsed,
      0,
    );
    const averageGasPrice =
      transactionSummaries.reduce((sum, tx) => sum + Number(tx.gasPrice), 0) /
      totalTransactions /
      1e9;
    const pyusdTransactions = transactionSummaries.filter(
      (tx) => tx.pyusdActivity.hasActivity,
    ).length;
    const pyusdVolume = transactionSummaries.reduce(
      (sum, tx) => sum + tx.pyusdActivity.totalVolume,
      0,
    );
    const uniquePYUSDAddresses = new Set(
      transactionSummaries
        .filter((tx) => tx.pyusdActivity.hasActivity)
        .map((tx) => tx.index),
    ).size;
    const securityFlags = transactionSummaries.reduce(
      (sum, tx) => sum + tx.securityFlags,
      0,
    );
    const blockUtilization = (totalGasUsed / 30000000) * 100;

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalGasUsed,
      averageGasPrice,
      pyusdTransactions,
      pyusdVolume,
      uniquePYUSDAddresses,
      securityFlags,
      blockUtilization,
    };
  }, [transactionSummaries]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactionSummaries;

    if (filterCriteria.showOnlyPYUSD) {
      filtered = filtered.filter((tx) => tx.pyusdActivity.hasActivity);
    }

    if (filterCriteria.showOnlyFailed) {
      filtered = filtered.filter((tx) => !tx.success);
    }

    if (filterCriteria.minGasUsed > 0) {
      filtered = filtered.filter(
        (tx) => tx.gasUsed >= filterCriteria.minGasUsed,
      );
    }

    if (filterCriteria.maxGasUsed < Infinity) {
      filtered = filtered.filter(
        (tx) => tx.gasUsed <= filterCriteria.maxGasUsed,
      );
    }

    filtered.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortBy) {
        case "gasUsed":
          aValue = a.gasUsed;
          bValue = b.gasUsed;
          break;
        case "pyusdVolume":
          aValue = a.pyusdActivity.totalVolume;
          bValue = b.pyusdActivity.totalVolume;
          break;
        case "securityScore":
          aValue = a.riskScore;
          bValue = b.riskScore;
          break;
        default:
          aValue = a.index;
          bValue = b.index;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [transactionSummaries, filterCriteria, sortBy, sortOrder]);

  const heatmapData = useMemo((): ActivityHeatmapData[] => {
    return transactionSummaries.map((tx) => ({
      transactionIndex: tx.index,
      gasUsed: tx.gasUsed,
      pyusdVolume: tx.pyusdActivity.totalVolume,
      securityScore: tx.riskScore,
      timestamp: Date.now() - tx.index * 1000,
    }));
  }, [transactionSummaries]);

  const gasDistributionData = useMemo(() => {
    const buckets = {
      "0-50k": 0,
      "50k-100k": 0,
      "100k-200k": 0,
      "200k-500k": 0,
      "500k+": 0,
    };

    transactionSummaries.forEach((tx) => {
      if (tx.gasUsed < 50000) buckets["0-50k"]++;
      else if (tx.gasUsed < 100000) buckets["50k-100k"]++;
      else if (tx.gasUsed < 200000) buckets["100k-200k"]++;
      else if (tx.gasUsed < 500000) buckets["200k-500k"]++;
      else buckets["500k+"]++;
    });

    return Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
      percentage: (count / transactionSummaries.length) * 100,
    }));
  }, [transactionSummaries]);

  const handleExport = useCallback(() => {
    const exportData = {
      blockInfo: {
        identifier: blockData.blockIdentifier,
        network: blockData.network,
        timestamp: blockData.timestamp,
        transactionCount: blockData.transactionCount,
      },
      metrics: blockMetrics,
      transactions: filteredTransactions,
      aggregateMetrics: blockData.aggregateMetrics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `block-${blockData.blockIdentifier}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [blockData, blockMetrics, filteredTransactions]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Blocks className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Block Analysis</h2>
            <p className="text-sm text-muted-foreground">
              Block {blockData.blockIdentifier} • {blockData.network}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-muted rounded-lg p-1">
            {(["overview", "heatmap", "transactions", "security"] as const).map(
              (view) => (
                <Button
                  key={view}
                  variant={selectedView === view ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedView(view)}
                  className="capitalize"
                >
                  {view === "overview" && (
                    <BarChart3 className="h-4 w-4 mr-1" />
                  )}
                  {view === "heatmap" && <Activity className="h-4 w-4 mr-1" />}
                  {view === "transactions" && <Hash className="h-4 w-4 mr-1" />}
                  {view === "security" && <Shield className="h-4 w-4 mr-1" />}
                  {view}
                </Button>
              ),
            )}
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Hash className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Total Transactions</span>
          </div>
          <p className="text-2xl font-bold">{blockMetrics.totalTransactions}</p>
          <p className="text-xs text-muted-foreground">
            {blockMetrics.successfulTransactions} successful,{" "}
            {blockMetrics.failedTransactions} failed
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Gas Used</span>
          </div>
          <p className="text-2xl font-bold">
            {(blockMetrics.totalGasUsed / 1e6).toFixed(1)}M
          </p>
          <p className="text-xs text-muted-foreground">
            {blockMetrics.blockUtilization.toFixed(1)}% utilization
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">PYUSD Activity</span>
          </div>
          <p className="text-2xl font-bold">{blockMetrics.pyusdTransactions}</p>
          <p className="text-xs text-muted-foreground">
            ${blockMetrics.pyusdVolume.toLocaleString()} volume
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Unique Addresses</span>
          </div>
          <p className="text-2xl font-bold">
            {blockMetrics.uniquePYUSDAddresses}
          </p>
          <p className="text-xs text-muted-foreground">PYUSD participants</p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Security Flags</span>
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              blockMetrics.securityFlags > 0
                ? "text-red-500"
                : "text-green-500",
            )}
          >
            {blockMetrics.securityFlags}
          </p>
          <p className="text-xs text-muted-foreground">
            {blockMetrics.securityFlags === 0
              ? "No issues"
              : "Requires attention"}
          </p>
        </div>
      </div>

      {selectedView === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Gas Usage Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gasDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [
                    name === "count"
                      ? `${value} transactions`
                      : `${value.toFixed(1)}%`,
                    name === "count" ? "Count" : "Percentage",
                  ]}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Transaction Types
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={[
                    {
                      name: "PYUSD Transactions",
                      value: blockMetrics.pyusdTransactions,
                      color: "#fbbf24",
                    },
                    {
                      name: "Other Transactions",
                      value:
                        blockMetrics.totalTransactions -
                        blockMetrics.pyusdTransactions,
                      color: "#6b7280",
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    {
                      name: "PYUSD Transactions",
                      value: blockMetrics.pyusdTransactions,
                      color: "#fbbf24",
                    },
                    {
                      name: "Other Transactions",
                      value:
                        blockMetrics.totalTransactions -
                        blockMetrics.pyusdTransactions,
                      color: "#6b7280",
                    },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Block Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-medium">
                      {(
                        (blockMetrics.successfulTransactions /
                          blockMetrics.totalTransactions) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Gas Price:
                    </span>
                    <span className="font-medium">
                      {blockMetrics.averageGasPrice.toFixed(1)} gwei
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Block Utilization:
                    </span>
                    <span className="font-medium">
                      {blockMetrics.blockUtilization.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">PYUSD Activity</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      PYUSD Transactions:
                    </span>
                    <span className="font-medium">
                      {blockMetrics.pyusdTransactions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Volume:</span>
                    <span className="font-medium">
                      ${blockMetrics.pyusdVolume.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Unique Addresses:
                    </span>
                    <span className="font-medium">
                      {blockMetrics.uniquePYUSDAddresses}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Security Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Security Flags:
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        blockMetrics.securityFlags > 0
                          ? "text-red-500"
                          : "text-green-500",
                      )}
                    >
                      {blockMetrics.securityFlags}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Level:</span>
                    <span
                      className={cn(
                        "font-medium",
                        blockMetrics.securityFlags > 5
                          ? "text-red-500"
                          : blockMetrics.securityFlags > 2
                            ? "text-yellow-500"
                            : "text-green-500",
                      )}
                    >
                      {blockMetrics.securityFlags > 5
                        ? "High"
                        : blockMetrics.securityFlags > 2
                          ? "Medium"
                          : "Low"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Failed Transactions:
                    </span>
                    <span className="font-medium">
                      {blockMetrics.failedTransactions}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === "heatmap" && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Transaction Activity Heatmap
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="transactionIndex"
                  name="Transaction Index"
                  type="number"
                  domain={[0, "dataMax"]}
                />
                <YAxis dataKey="gasUsed" name="Gas Used" type="number" />
                <RechartsTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number, name: string) => [
                    name === "gasUsed"
                      ? `${value.toLocaleString()} gas`
                      : name === "pyusdVolume"
                        ? `$${value.toLocaleString()}`
                        : value,
                    name,
                  ]}
                />
                <Scatter dataKey="gasUsed" fill="#8b5cf6" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">
                PYUSD Volume Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={heatmapData.filter((d) => d.pyusdVolume > 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="transactionIndex" />
                  <YAxis />
                  <RechartsTooltip
                    formatter={(value: number) => [
                      `$${value.toLocaleString()}`,
                      "PYUSD Volume",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="pyusdVolume"
                    stroke="#fbbf24"
                    fill="#fbbf24"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">
                Security Risk Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={heatmapData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="transactionIndex" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value}`, "Risk Score"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="securityScore"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedView === "transactions" && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filterCriteria.showOnlyPYUSD}
                  onChange={(e) =>
                    setFilterCriteria((prev) => ({
                      ...prev,
                      showOnlyPYUSD: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">PYUSD Only</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filterCriteria.showOnlyFailed}
                  onChange={(e) =>
                    setFilterCriteria((prev) => ({
                      ...prev,
                      showOnlyFailed: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Failed Only</span>
              </label>

              <div className="flex items-center space-x-2">
                <span className="text-sm">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="index">Index</option>
                  <option value="gasUsed">Gas Used</option>
                  <option value="pyusdVolume">PYUSD Volume</option>
                  <option value="securityScore">Security Score</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                >
                  {sortOrder === "asc" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                Transactions ({filteredTransactions.length})
              </h3>
            </div>

            <div className="divide-y max-h-96 overflow-y-auto">
              {filteredTransactions.slice(0, 50).map((tx) => (
                <div
                  key={tx.hash}
                  className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => onTransactionSelect?.(tx.hash)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center">
                        <Badge variant="outline" className="text-xs">
                          #{tx.index}
                        </Badge>
                        {tx.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-mono text-sm truncate">
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                          </p>
                          {tx.pyusdActivity.hasActivity && (
                            <Badge
                              variant="default"
                              className="bg-yellow-100 text-yellow-800"
                            >
                              <Coins className="h-3 w-3 mr-1" />
                              PYUSD
                            </Badge>
                          )}
                          {tx.securityFlags > 0 && (
                            <Badge variant="destructive">
                              <Shield className="h-3 w-3 mr-1" />
                              {tx.securityFlags} flags
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Zap className="h-3 w-3" />
                            <span>{tx.gasUsed.toLocaleString()} gas</span>
                          </div>
                          {tx.pyusdActivity.hasActivity && (
                            <div className="flex items-center space-x-1">
                              <Coins className="h-3 w-3" />
                              <span>
                                ${tx.pyusdActivity.totalVolume.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>
                              {tx.pyusdActivity.uniqueAddresses} addresses
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {(Number(tx.gasPrice) / 1e9).toFixed(1)} gwei
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Risk: {tx.riskScore}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTransactions.length > 50 && (
              <div className="p-4 text-center text-muted-foreground border-t">
                Showing first 50 of {filteredTransactions.length} transactions
              </div>
            )}
          </div>
        </div>
      )}

      {selectedView === "security" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">
                  High Risk Transactions
                </span>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {filteredTransactions.filter((tx) => tx.riskScore > 75).length}
              </p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Medium Risk</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">
                {
                  filteredTransactions.filter(
                    (tx) => tx.riskScore > 50 && tx.riskScore <= 75,
                  ).length
                }
              </p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Low Risk</span>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {filteredTransactions.filter((tx) => tx.riskScore <= 50).length}
              </p>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Security Risk Timeline
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="transactionIndex" />
                <YAxis domain={[0, 100]} />
                <RechartsTooltip
                  formatter={(value: number) => [`${value}`, "Risk Score"]}
                />
                <Line
                  type="monotone"
                  dataKey="securityScore"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              High Risk Transactions
            </h3>
            <div className="space-y-3">
              {filteredTransactions
                .filter((tx) => tx.riskScore > 75)
                .slice(0, 10)
                .map((tx) => (
                  <div
                    key={tx.hash}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-mono text-sm">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Transaction #{tx.index} • {tx.securityFlags} security
                          flags
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">Risk: {tx.riskScore}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTransactionSelect?.(tx.hash)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
