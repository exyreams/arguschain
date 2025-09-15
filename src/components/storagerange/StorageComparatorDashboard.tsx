import React, { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  GitCompare,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { StorageComparisonResult } from "@/lib/storagerange/storageService";

interface StorageComparatorDashboardProps {
  comparisonResult: StorageComparisonResult;
  loading?: boolean;
  className?: string;
  onExport?: (format: "csv" | "json") => void;
}

export const StorageComparatorDashboard: React.FC<
  StorageComparatorDashboardProps
> = ({ comparisonResult, loading = false, className = "", onExport }) => {
  const [activeTab, setActiveTab] = useState("overview");

  const { comparisons, processedData, analysisMetadata } = comparisonResult;

  const changesByType = useMemo(() => {
    const changes = comparisons.filter((c) => c.changed);
    return {
      supply: changes.filter((c) => c.isSupplyChange),
      balance: changes.filter((c) => c.isBalanceChange),
      other: changes.filter((c) => !c.isSupplyChange && !c.isBalanceChange),
    };
  }, [comparisons]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">{label}</p>
          {payload.map((entry: any, index: number) => {
            const entryName = String(entry.name || entry.dataKey || "Value");
            return (
              <p
                key={index}
                className="text-[#8b9dc3]"
                style={{ color: entry.color }}
              >
                {`${entryName}: ${entry.value}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-[rgba(0,191,255,0.1)] rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Storage Comparison
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.("csv")}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.("json")}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-[#8b9dc3]">Block 1</div>
              <div className="text-[#00bfff] font-mono">
                {comparisonResult.blockHash1.slice(0, 10)}...
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#8b9dc3]" />
            <div className="text-center">
              <div className="text-[#8b9dc3]">Block 2</div>
              <div className="text-[#00bfff] font-mono">
                {comparisonResult.blockHash2.slice(0, 10)}...
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {analysisMetadata.slotsCompared}
            </div>
            <div className="text-sm text-[#8b9dc3]">Slots Compared</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {analysisMetadata.changesDetected}
            </div>
            <div className="text-sm text-[#8b9dc3]">Changes Detected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {processedData.summary.supplyChanges}
            </div>
            <div className="text-sm text-[#8b9dc3]">Supply Changes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {processedData.summary.balanceChanges}
            </div>
            <div className="text-sm text-[#8b9dc3]">Balance Changes</div>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="changes"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Changes
          </TabsTrigger>
          <TabsTrigger
            value="impact"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Impact
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
                Change Distribution
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={processedData.changesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, count }) => `${category} (${count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {processedData.changesByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.category.includes("Supply")
                            ? "#10b981"
                            : entry.category.includes("Balance")
                              ? "#3b82f6"
                              : "#f59e0b"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
                Change Summary
              </h4>
              <div className="space-y-4">
                {processedData.changesByCategory.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                  >
                    <div className="flex items-center gap-2">
                      {category.category.includes("Supply") ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : category.category.includes("Balance") ? (
                        <TrendingDown className="h-4 w-4 text-blue-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      )}
                      <span className="text-[#8b9dc3]">
                        {category.category}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      {category.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="changes" className="space-y-6">
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Detected Changes ({processedData.changes.length})
            </h4>
            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[rgba(25,28,40,0.95)]">
                  <tr className="border-b border-[rgba(0,191,255,0.1)]">
                    <th className="text-left py-2 text-[#8b9dc3]">Slot</th>
                    <th className="text-left py-2 text-[#8b9dc3]">Type</th>
                    <th className="text-left py-2 text-[#8b9dc3]">Before</th>
                    <th className="text-left py-2 text-[#8b9dc3]">After</th>
                    <th className="text-left py-2 text-[#8b9dc3]">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.changes.map((change, index) => (
                    <tr
                      key={index}
                      className="border-b border-[rgba(0,191,255,0.05)] hover:bg-[rgba(0,191,255,0.05)]"
                    >
                      <td className="py-2 font-mono text-[#00bfff]">
                        {change.slot}
                      </td>
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className={
                            change.isSupplyChange
                              ? "border-green-500/50 text-green-400 bg-green-500/10"
                              : change.isBalanceChange
                                ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                                : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                          }
                        >
                          {change.isSupplyChange
                            ? "SUPPLY"
                            : change.isBalanceChange
                              ? "BALANCE"
                              : "OTHER"}
                        </Badge>
                      </td>
                      <td className="py-2 text-[#8b9dc3] font-mono text-xs">
                        {change.valueBlock1.length > 20
                          ? `${change.valueBlock1.slice(0, 10)}...${change.valueBlock1.slice(-6)}`
                          : change.valueBlock1}
                      </td>
                      <td className="py-2 text-[#8b9dc3] font-mono text-xs">
                        {change.valueBlock2.length > 20
                          ? `${change.valueBlock2.slice(0, 10)}...${change.valueBlock2.slice(-6)}`
                          : change.valueBlock2}
                      </td>
                      <td className="py-2 text-[#8b9dc3]">
                        {change.diff || "Changed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <h4 className="text-lg font-semibold text-green-400 mb-4">
                Supply Impact
              </h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {changesByType.supply.length}
                </div>
                <div className="text-sm text-[#8b9dc3] mb-4">
                  Supply-related changes
                </div>
                {changesByType.supply.length > 0 && (
                  <div className="text-xs text-[#8b9dc3]">
                    Critical for token economics
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <h4 className="text-lg font-semibold text-blue-400 mb-4">
                Balance Impact
              </h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {changesByType.balance.length}
                </div>
                <div className="text-sm text-[#8b9dc3] mb-4">
                  Balance-related changes
                </div>
                {changesByType.balance.length > 0 && (
                  <div className="text-xs text-[#8b9dc3]">
                    User balance modifications
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <h4 className="text-lg font-semibold text-yellow-400 mb-4">
                Other Impact
              </h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {changesByType.other.length}
                </div>
                <div className="text-sm text-[#8b9dc3] mb-4">Other changes</div>
                {changesByType.other.length > 0 && (
                  <div className="text-xs text-[#8b9dc3]">
                    Configuration or metadata
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Impact Analysis
            </h4>
            <div className="space-y-4">
              {analysisMetadata.changesDetected === 0 && (
                <div className="text-center py-8 text-[#8b9dc3]">
                  <Info className="h-12 w-12 mx-auto mb-4" />
                  <h5 className="text-lg font-semibold mb-2">
                    No Changes Detected
                  </h5>
                  <p>
                    Storage state remained identical between the compared
                    blocks.
                  </p>
                </div>
              )}

              {changesByType.supply.length > 0 && (
                <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 font-medium">
                      Supply Changes Detected
                    </span>
                  </div>
                  <p className="text-sm text-[#8b9dc3]">
                    {changesByType.supply.length} supply-related storage slot(s)
                    changed. This may indicate token minting, burning, or supply
                    adjustments.
                  </p>
                </div>
              )}

              {changesByType.balance.length > 0 && (
                <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">
                      Balance Changes Detected
                    </span>
                  </div>
                  <p className="text-sm text-[#8b9dc3]">
                    {changesByType.balance.length} balance-related storage
                    slot(s) changed. This indicates user balance modifications
                    or transfers.
                  </p>
                </div>
              )}

              {changesByType.other.length > 0 && (
                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-400 font-medium">
                      Configuration Changes
                    </span>
                  </div>
                  <p className="text-sm text-[#8b9dc3]">
                    {changesByType.other.length} other storage slot(s) changed.
                    This may include configuration, metadata, or access control
                    changes.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Comparison Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#8b9dc3]">Contract Address: </span>
                <span className="text-[#00bfff] font-mono">
                  {comparisonResult.contractAddress}
                </span>
              </div>
              <div>
                <span className="text-[#8b9dc3]">Analysis Time: </span>
                <span className="text-[#00bfff]">
                  {new Date(analysisMetadata.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[#8b9dc3]">Block Hash 1: </span>
                <span className="text-[#00bfff] font-mono text-xs">
                  {comparisonResult.blockHash1}
                </span>
              </div>
              <div>
                <span className="text-[#8b9dc3]">Block Hash 2: </span>
                <span className="text-[#00bfff] font-mono text-xs">
                  {comparisonResult.blockHash2}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
