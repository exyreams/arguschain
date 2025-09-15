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
import { Input } from "@/components/global/Input";
import { Database, Download, Eye, EyeOff, Filter, Search } from "lucide-react";
import type { MappingAnalysisResult } from "@/lib/storagerange/storageService";

interface MappingAnalyticsProps {
  analysisResult: MappingAnalysisResult;
  loading?: boolean;
  className?: string;
  onExport?: (format: "csv" | "json") => void;
}

interface FilterState {
  showOnlyNonZero: boolean;
  minValue: number;
  searchTerm: string;
}

export const MappingAnalytics: React.FC<MappingAnalyticsProps> = ({
  analysisResult,
  loading = false,
  className = "",
  onExport,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    showOnlyNonZero: true,
    minValue: 0,
    searchTerm: "",
  });

  const { results, processedData, analysisMetadata } = analysisResult;

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (filters.showOnlyNonZero) {
      filtered = filtered.filter(
        (result) => result.valueInt && result.valueInt > 0,
      );
    }

    if (filters.minValue > 0) {
      filtered = filtered.filter(
        (result) => (result.valueInt || 0) >= filters.minValue,
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (result) =>
          result.key.toLowerCase().includes(searchLower) ||
          result.keyDisplay.toLowerCase().includes(searchLower) ||
          (result.keyContext &&
            result.keyContext.toLowerCase().includes(searchLower)),
      );
    }

    return filtered.sort((a, b) => (b.valueInt || 0) - (a.valueInt || 0));
  }, [results, filters]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 bg-[rgba(0,191,255,0.1)] rounded"
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
              Mapping Analysis - Slot {analysisResult.mappingSlot}
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
              {analysisMetadata.keysAnalyzed}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Keys</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {processedData.summary.nonZeroValues}
            </div>
            <div className="text-sm text-[#8b9dc3]">Non-Zero Values</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {(processedData.summary.totalValue / 1e6).toLocaleString()}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Value (tokens)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {(
                (processedData.summary.nonZeroValues /
                  analysisMetadata.keysAnalyzed) *
                100
              ).toFixed(1)}
              %
            </div>
            <div className="text-sm text-[#8b9dc3]">Active Rate</div>
          </div>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-[#00bfff]" />
          <span className="text-[#00bfff] font-medium">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
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
              Non-Zero Only
            </Button>
          </div>
          <Input
            placeholder="Min value"
            type="number"
            value={filters.minValue}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                minValue: parseFloat(e.target.value) || 0,
              }))
            }
          />
          <Input
            placeholder="Search keys..."
            value={filters.searchTerm}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                searchTerm: e.target.value,
              }))
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters({
                showOnlyNonZero: true,
                minValue: 0,
                searchTerm: "",
              })
            }
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {processedData.distribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Value Distribution
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData.distribution.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ key, percentage }) =>
                    `${key.slice(0, 8)}... (${percentage.toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processedData.distribution
                    .slice(0, 8)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${index * 45}, 70%, 50%)`}
                      />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Top Holders
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processedData.topHolders.slice(0, 10)}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis
                  dataKey="keyDisplay"
                  stroke="#8b9dc3"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#8b9dc3" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valueInt" fill="#00bfff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
          Mapping Results ({filteredResults.length} of {results.length})
        </h4>
        <div className="overflow-x-auto max-h-96 custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(25,28,40,0.95)]">
              <tr className="border-b border-[rgba(0,191,255,0.1)]">
                <th className="text-left py-2 text-[#8b9dc3]">Key</th>
                <th className="text-left py-2 text-[#8b9dc3]">Context</th>
                <th className="text-right py-2 text-[#8b9dc3]">Value</th>
                <th className="text-right py-2 text-[#8b9dc3]">Percentage</th>
                <th className="text-left py-2 text-[#8b9dc3]">Storage Slot</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, index) => {
                const percentage =
                  processedData.summary.totalValue > 0
                    ? ((result.valueInt || 0) /
                        processedData.summary.totalValue) *
                      100
                    : 0;

                return (
                  <tr
                    key={index}
                    className="border-b border-[rgba(0,191,255,0.05)] hover:bg-[rgba(0,191,255,0.05)]"
                  >
                    <td className="py-2 font-mono text-[#00bfff]">
                      {result.keyDisplay}
                    </td>
                    <td className="py-2">
                      {result.keyContext && (
                        <Badge
                          variant="outline"
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                        >
                          {result.keyContext}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 text-right text-[#8b9dc3]">
                      {result.decodedValue}
                    </td>
                    <td className="py-2 text-right text-[#8b9dc3]">
                      {percentage.toFixed(2)}%
                    </td>
                    <td className="py-2 font-mono text-xs text-[#8b9dc3]">
                      {result.calculatedSlot.slice(0, 10)}...
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredResults.length === 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-[#8b9dc3] mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-[#8b9dc3] mb-2">
              No Results Found
            </h4>
            <p className="text-[#8b9dc3]">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
