import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
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
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Database, Download, Eye, EyeOff, Filter } from "lucide-react";
import type { StorageAnalysisResult } from "@/lib/storagerange/storageService";
import { SecurityAnalysisPanel } from "./SecurityAnalysisPanel";

interface StorageAnalyticsProps {
  analysisResult: StorageAnalysisResult;
  loading?: boolean;
  className?: string;
  onExport?: (format: "csv" | "json") => void;
}

interface FilterState {
  categories: Set<string>;
  showOnlyInterpreted: boolean;
  showOnlyNonZero: boolean;
}

export const StorageAnalytics: React.FC<StorageAnalyticsProps> = ({
  analysisResult,
  loading = false,
  className = "",
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<FilterState>({
    categories: new Set(),
    showOnlyInterpreted: false,
    showOnlyNonZero: false,
  });

  const { processedData, visualizationData, analysisMetadata } = analysisResult;

  const filteredSlots = useMemo(() => {
    let slots = processedData.slots;

    if (filters.categories.size > 0) {
      slots = slots.filter(
        (slot) => slot.category && filters.categories.has(slot.category),
      );
    }

    if (filters.showOnlyInterpreted) {
      slots = slots.filter((slot) => slot.interpretation);
    }

    if (filters.showOnlyNonZero) {
      slots = slots.filter(
        (slot) =>
          slot.value !== "0x0" &&
          slot.value !==
            "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
    }

    return slots;
  }, [processedData.slots, filters]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">{label}</p>
          {payload.map((entry: any, index: number) => {
            const entryName = String(entry.name || entry.dataKey || "Value");
            const isPercentage = entryName.toLowerCase().includes("percentage");
            return (
              <p
                key={index}
                className="text-[#8b9dc3]"
                style={{ color: entry.color }}
              >
                {`${entryName}: ${entry.value}${isPercentage ? "%" : ""}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const toggleCategoryFilter = (category: string) => {
    const newCategories = new Set(filters.categories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setFilters((prev) => ({ ...prev, categories: newCategories }));
  };

  const clearFilters = () => {
    setFilters({
      categories: new Set(),
      showOnlyInterpreted: false,
      showOnlyNonZero: false,
    });
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
            <Database className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Storage Analysis
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {analysisMetadata.slotsAnalyzed}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Slots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {processedData.summary.interpretedSlots}
            </div>
            <div className="text-sm text-[#8b9dc3]">Interpreted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {analysisMetadata.patternsDetected}
            </div>
            <div className="text-sm text-[#8b9dc3]">Patterns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {processedData.summary.contractType.toUpperCase()}
            </div>
            <div className="text-sm text-[#8b9dc3]">Contract Type</div>
          </div>
        </div>

        {(processedData.summary.implementationAddress ||
          processedData.summary.totalSupply) && (
          <div className="mt-4 pt-4 border-t border-[rgba(0,191,255,0.1)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {processedData.summary.implementationAddress && (
                <div>
                  <span className="text-[#8b9dc3]">Implementation: </span>
                  <span className="text-[#00bfff] font-mono">
                    {processedData.summary.implementationAddress.slice(0, 10)}
                    ...
                    {processedData.summary.implementationAddress.slice(-8)}
                  </span>
                </div>
              )}
              {processedData.summary.totalSupply && (
                <div>
                  <span className="text-[#8b9dc3]">Total Supply: </span>
                  <span className="text-[#00bfff]">
                    {(processedData.summary.totalSupply / 1e6).toLocaleString()}{" "}
                    tokens
                  </span>
                </div>
              )}
              {processedData.summary.isPaused !== undefined && (
                <div>
                  <span className="text-[#8b9dc3]">Status: </span>
                  <Badge
                    variant={
                      processedData.summary.isPaused ? "destructive" : "outline"
                    }
                    className={
                      processedData.summary.isPaused
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    }
                  >
                    {processedData.summary.isPaused ? "Paused" : "Active"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="slots"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Storage Slots
          </TabsTrigger>
          <TabsTrigger
            value="patterns"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Patterns
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
          >
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
                Storage Categories
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={visualizationData.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) =>
                      `${name} (${percentage.toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {visualizationData.categoryDistribution.map(
                      (entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ),
                    )}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
                Storage Layout
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={visualizationData.slotLayout}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,191,255,0.1)"
                  />
                  <XAxis dataKey="slot" stroke="#8b9dc3" fontSize={12} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="slotInt" fill="#00bfff" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Category Summary
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(0,191,255,0.1)]">
                    <th className="text-left py-2 text-[#8b9dc3]">Category</th>
                    <th className="text-right py-2 text-[#8b9dc3]">Count</th>
                    <th className="text-right py-2 text-[#8b9dc3]">
                      Percentage
                    </th>
                    <th className="text-left py-2 text-[#8b9dc3]">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visualizationData.categoryDistribution.map(
                    (category: any, index: number) => (
                      <tr
                        key={index}
                        className="border-b border-[rgba(0,191,255,0.05)]"
                      >
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <span className="text-[#00bfff]">
                              {category.category}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2 text-[#8b9dc3]">
                          {category.count}
                        </td>
                        <td className="text-right py-2 text-[#8b9dc3]">
                          {category.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2 text-[#8b9dc3]">
                          {category.description}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="slots" className="space-y-6">
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#00bfff]" />
                <span className="text-[#00bfff] font-medium">Filters</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-[#8b9dc3] mb-2 block">
                  Categories:
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(processedData.categories)
                    .filter(([_, slots]) => slots.length > 0)
                    .map(([category, slots]) => (
                      <Button
                        key={category}
                        variant={
                          filters.categories.has(category)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => toggleCategoryFilter(category)}
                        className={
                          filters.categories.has(category)
                            ? "bg-[#00bfff] text-[#0f1419]"
                            : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        }
                      >
                        {category.replace("_", " ").toUpperCase()} (
                        {slots.length})
                      </Button>
                    ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      showOnlyInterpreted: !prev.showOnlyInterpreted,
                    }))
                  }
                  className={`border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)] ${
                    filters.showOnlyInterpreted
                      ? "text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      : "text-[#8b9dc3]"
                  }`}
                >
                  {filters.showOnlyInterpreted ? (
                    <Eye className="h-4 w-4 mr-1" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-1" />
                  )}
                  Only Interpreted
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      showOnlyNonZero: !prev.showOnlyNonZero,
                    }))
                  }
                  className={`border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)] ${
                    filters.showOnlyNonZero
                      ? "text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      : "text-[#8b9dc3]"
                  }`}
                >
                  {filters.showOnlyNonZero ? (
                    <Eye className="h-4 w-4 mr-1" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-1" />
                  )}
                  Only Non-Zero
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Storage Slots ({filteredSlots.length} of{" "}
              {processedData.slots.length})
            </h4>
            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[rgba(25,28,40,0.95)]">
                  <tr className="border-b border-[rgba(0,191,255,0.1)]">
                    <th className="text-left py-2 text-[#8b9dc3]">Slot</th>
                    <th className="text-left py-2 text-[#8b9dc3]">Category</th>
                    <th className="text-left py-2 text-[#8b9dc3]">
                      Decoded Value
                    </th>
                    <th className="text-left py-2 text-[#8b9dc3]">
                      Interpretation
                    </th>
                    <th className="text-left py-2 text-[#8b9dc3]">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map((slot, index) => (
                    <tr
                      key={index}
                      className="border-b border-[rgba(0,191,255,0.05)] hover:bg-[rgba(0,191,255,0.05)]"
                    >
                      <td className="py-2 font-mono text-[#00bfff]">
                        {slot.slotInt !== undefined
                          ? slot.slotInt
                          : slot.slot.slice(0, 10) + "..."}
                      </td>
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                        >
                          {slot.category?.replace("_", " ").toUpperCase() ||
                            "UNKNOWN"}
                        </Badge>
                      </td>
                      <td className="py-2 text-[#8b9dc3] max-w-xs truncate">
                        {slot.decodedValue}
                      </td>
                      <td className="py-2 text-[#8b9dc3] max-w-xs truncate">
                        {slot.interpretation || "Unknown"}
                      </td>
                      <td className="py-2 text-[#8b9dc3]">
                        {slot.type || "unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Detected Patterns
            </h4>

            {processedData.patterns.detailedPatterns.length > 0 ? (
              <div className="space-y-4">
                {processedData.patterns.detailedPatterns.map(
                  (pattern, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-[#00bfff]">
                          {pattern.type.replace("_", " ").toUpperCase()}
                        </h5>
                        <Badge
                          variant="outline"
                          className={`${
                            pattern.confidence === "high"
                              ? "border-green-500/50 text-green-400 bg-green-500/10"
                              : pattern.confidence === "medium"
                                ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                : "border-red-500/50 text-red-400 bg-red-500/10"
                          }`}
                        >
                          {pattern.confidence.toUpperCase()} CONFIDENCE
                        </Badge>
                      </div>
                      <p className="text-[#8b9dc3] text-sm mb-2">
                        {pattern.description}
                      </p>
                      <div className="text-xs text-[#6b7280]">
                        Slots: {pattern.slots.join(", ")}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8b9dc3]">
                No specific patterns detected in storage layout
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityAnalysisPanel
            storageData={processedData}
            contractAddress={analysisResult.contractAddress}
          />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-[#00bfff]" />
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Advanced Storage Analysis
              </h4>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <h5 className="text-md font-semibold text-[#00bfff] mb-3">
                  Historical Tracking
                </h5>
                <p className="text-[#8b9dc3] mb-4">
                  Track storage values across multiple blocks to identify
                  patterns and changes over time.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded bg-[rgba(25,28,40,0.4)]">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {processedData.slots.length}
                    </div>
                    <div className="text-sm text-[#8b9dc3]">
                      Slots Available
                    </div>
                  </div>
                  <div className="text-center p-3 rounded bg-[rgba(25,28,40,0.4)]">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {processedData.patterns.detailedPatterns.length}
                    </div>
                    <div className="text-sm text-[#8b9dc3]">
                      Patterns Detected
                    </div>
                  </div>
                  <div className="text-center p-3 rounded bg-[rgba(25,28,40,0.4)]">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {processedData.securityFlags.length}
                    </div>
                    <div className="text-sm text-[#8b9dc3]">Security Flags</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <h5 className="text-md font-semibold text-[#00bfff] mb-3">
                  Pattern Evolution
                </h5>
                <p className="text-[#8b9dc3] mb-4">
                  Analyze how storage patterns evolve over time and detect
                  changes in contract behavior.
                </p>
                <div className="space-y-2">
                  {processedData.patterns.detailedPatterns.map(
                    (pattern, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-[rgba(25,28,40,0.4)]"
                      >
                        <span className="text-[#8b9dc3]">
                          {pattern.type.replace("_", " ").toUpperCase()}
                        </span>
                        <Badge
                          variant="outline"
                          className={`${
                            pattern.confidence === "high"
                              ? "border-green-500/50 text-green-400 bg-green-500/10"
                              : pattern.confidence === "medium"
                                ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                : "border-red-500/50 text-red-400 bg-red-500/10"
                          }`}
                        >
                          {pattern.confidence.toUpperCase()}
                        </Badge>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <h5 className="text-md font-semibold text-[#00bfff] mb-3">
                  Deep Forensics
                </h5>
                <p className="text-[#8b9dc3] mb-4">
                  Advanced analysis for anomaly detection and suspicious
                  activity identification.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h6 className="text-[#00bfff] font-medium mb-2">
                      Unknown Slots
                    </h6>
                    <div className="text-2xl font-bold text-yellow-400">
                      {
                        processedData.slots.filter(
                          (s) => s.category === "unknown",
                        ).length
                      }
                    </div>
                    <div className="text-sm text-[#8b9dc3]">
                      Unidentified storage slots
                    </div>
                  </div>
                  <div>
                    <h6 className="text-[#00bfff] font-medium mb-2">
                      High Value Slots
                    </h6>
                    <div className="text-2xl font-bold text-green-400">
                      {
                        processedData.slots.filter((s) => {
                          try {
                            const valueInt = parseInt(s.value, 16);
                            return valueInt > 1000000;
                          } catch {
                            return false;
                          }
                        }).length
                      }
                    </div>
                    <div className="text-sm text-[#8b9dc3]">
                      Slots with significant values
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div>
                  <h5 className="text-md font-semibold text-[#00bfff] mb-1">
                    Export Advanced Analysis
                  </h5>
                  <p className="text-sm text-[#8b9dc3]">
                    Export comprehensive analysis data including patterns and
                    forensics
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExport?.("csv")}
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExport?.("json")}
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    JSON
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
