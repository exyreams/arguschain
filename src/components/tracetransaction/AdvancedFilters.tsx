import React, { useMemo, useState } from "react";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import { Dropdown } from "@/components/global/Dropdown";
import { Checkbox } from "@/components/global/Checkbox";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Settings,
  X,
} from "lucide-react";
import type { ProcessedTraceAction } from "@/lib/tracetransaction/types";

interface AdvancedFiltersProps {
  traces: ProcessedTraceAction[];
  onFilteredResults: (filtered: ProcessedTraceAction[]) => void;
  className?: string;
}

interface FilterState {
  searchTerm: string;
  functionFilter: string;
  contractFilter: string;
  typeFilter: string;
  errorFilter: string;
  pyusdOnly: boolean;
  gasRangeMin: string;
  gasRangeMax: string;
  depthFilter: string;
}

interface FilterPreset {
  name: string;
  filters: Partial<FilterState>;
  description: string;
}

const DEFAULT_FILTERS: FilterState = {
  searchTerm: "",
  functionFilter: "all",
  contractFilter: "all",
  typeFilter: "all",
  errorFilter: "all",
  pyusdOnly: false,
  gasRangeMin: "",
  gasRangeMax: "",
  depthFilter: "all",
};

const FILTER_PRESETS: FilterPreset[] = [
  {
    name: "PYUSD Only",
    filters: { pyusdOnly: true },
    description: "Show only PYUSD contract interactions",
  },
  {
    name: "High Gas Usage",
    filters: { gasRangeMin: "100000" },
    description: "Show operations using more than 100k gas",
  },
  {
    name: "Errors Only",
    filters: { errorFilter: "errors" },
    description: "Show only failed operations",
  },
  {
    name: "Token Transfers",
    filters: { functionFilter: "transfer" },
    description: "Show only transfer operations",
  },
  {
    name: "Deep Calls",
    filters: { depthFilter: "3+" },
    description: "Show calls at depth 3 or deeper",
  },
];

export function AdvancedFilters({
  traces,
  onFilteredResults,
  className = "",
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const { functions, contracts, types } = useMemo(() => {
    const functions = new Set<string>();
    const contracts = new Set<string>();
    const types = new Set<string>();

    traces.forEach((trace) => {
      if (trace.function && trace.function !== "N/A") {
        functions.add(trace.function);
      }
      if (trace.contract) {
        contracts.add(trace.contract);
      }
      if (trace.type) {
        types.add(trace.type);
      }
    });

    return {
      functions: Array.from(functions).sort(),
      contracts: Array.from(contracts).sort(),
      types: Array.from(types).sort(),
    };
  }, [traces]);

  const filteredTraces = useMemo(() => {
    let filtered = [...traces];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (trace) =>
          trace.from.toLowerCase().includes(searchLower) ||
          trace.to.toLowerCase().includes(searchLower) ||
          trace.function.toLowerCase().includes(searchLower) ||
          trace.contract.toLowerCase().includes(searchLower)
      );
    }

    if (filters.functionFilter !== "all") {
      if (filters.functionFilter === "transfer") {
        filtered = filtered.filter((trace) =>
          trace.function.toLowerCase().includes("transfer")
        );
      } else {
        filtered = filtered.filter(
          (trace) => trace.function === filters.functionFilter
        );
      }
    }

    if (filters.contractFilter !== "all") {
      filtered = filtered.filter(
        (trace) => trace.contract === filters.contractFilter
      );
    }

    if (filters.typeFilter !== "all") {
      filtered = filtered.filter((trace) => trace.type === filters.typeFilter);
    }

    if (filters.errorFilter === "errors") {
      filtered = filtered.filter((trace) => trace.error);
    } else if (filters.errorFilter === "success") {
      filtered = filtered.filter((trace) => !trace.error);
    }

    if (filters.pyusdOnly) {
      filtered = filtered.filter((trace) => trace.isPyusd);
    }

    if (filters.gasRangeMin) {
      const minGas = parseInt(filters.gasRangeMin);
      if (!isNaN(minGas)) {
        filtered = filtered.filter((trace) => trace.gasUsed >= minGas);
      }
    }

    if (filters.gasRangeMax) {
      const maxGas = parseInt(filters.gasRangeMax);
      if (!isNaN(maxGas)) {
        filtered = filtered.filter((trace) => trace.gasUsed <= maxGas);
      }
    }

    if (filters.depthFilter !== "all") {
      if (filters.depthFilter === "3+") {
        filtered = filtered.filter((trace) => trace.depth >= 3);
      } else {
        const depth = parseInt(filters.depthFilter);
        if (!isNaN(depth)) {
          filtered = filtered.filter((trace) => trace.depth === depth);
        }
      }
    }

    return filtered;
  }, [traces, filters]);

  React.useEffect(() => {
    onFilteredResults(filteredTraces);
  }, [filteredTraces, onFilteredResults]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  };

  const applyPreset = (preset: FilterPreset) => {
    setFilters((prev) => ({ ...prev, ...preset.filters }));
    setActivePreset(preset.name);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActivePreset(null);
  };

  const hasActiveFilters = Object.keys(filters).some((key) => {
    const value = filters[key as keyof FilterState];
    const defaultValue = DEFAULT_FILTERS[key as keyof FilterState];
    return value !== defaultValue;
  });

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Advanced Filters
          </h3>
          {hasActiveFilters && (
            <Badge
              variant="outline"
              className="text-[#00bfff] border-[#00bfff]"
            >
              {filteredTraces.length} / {traces.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="default" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#00bfff] border-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Settings className="h-3 w-3 mr-1" />
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
          <Input
            placeholder="Search addresses, functions, contracts..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-[#8b9dc3] mb-2">Quick Filters:</div>
        <div className="flex flex-wrap gap-2">
          {FILTER_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant={activePreset === preset.name ? "default" : "secondary"}
              size="sm"
              onClick={() => applyPreset(preset)}
              className={
                activePreset === preset.name
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "text-[#8b9dc3] border-[#8b9dc3] hover:bg-[rgba(139,157,195,0.1)]"
              }
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 border-t border-[rgba(0,191,255,0.1)] pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Dropdown
              title="Function"
              value={filters.functionFilter}
              onValueChange={(value) =>
                handleFilterChange("functionFilter", value)
              }
              placeholder="All Functions"
              options={[
                { value: "all", label: "All Functions" },
                { value: "transfer", label: "Transfer Operations" },
                ...functions.map((f) => ({ value: f, label: f })),
              ]}
            />

            <Dropdown
              title="Contract"
              value={filters.contractFilter}
              onValueChange={(value) =>
                handleFilterChange("contractFilter", value)
              }
              placeholder="All Contracts"
              options={[
                { value: "all", label: "All Contracts" },
                ...contracts.map((c) => ({ value: c, label: c })),
              ]}
            />

            <Dropdown
              title="Call Type"
              value={filters.typeFilter}
              onValueChange={(value) => handleFilterChange("typeFilter", value)}
              placeholder="All Types"
              options={[
                { value: "all", label: "All Types" },
                ...types.map((t) => ({ value: t, label: t })),
              ]}
            />

            <Dropdown
              title="Status"
              value={filters.errorFilter}
              onValueChange={(value) =>
                handleFilterChange("errorFilter", value)
              }
              placeholder="All Status"
              options={[
                { value: "all", label: "All Status" },
                { value: "success", label: "Success Only" },
                { value: "errors", label: "Errors Only" },
              ]}
            />

            <Dropdown
              title="Call Depth"
              value={filters.depthFilter}
              onValueChange={(value) =>
                handleFilterChange("depthFilter", value)
              }
              placeholder="All Depths"
              options={[
                { value: "all", label: "All Depths" },
                { value: "0", label: "Depth 0 (Root)" },
                { value: "1", label: "Depth 1" },
                { value: "2", label: "Depth 2" },
                { value: "3+", label: "Depth 3+" },
              ]}
            />

            <Checkbox
              id="pyusd-only"
              checked={filters.pyusdOnly}
              onChange={(checked) => handleFilterChange("pyusdOnly", checked)}
              textClassName="text-sm text-[#8b9dc3]"
            >
              PYUSD Only
            </Checkbox>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#8b9dc3] mb-2 block">
                Min Gas Usage
              </label>
              <Input
                type="number"
                placeholder="0"
                value={filters.gasRangeMin}
                onChange={(e) =>
                  handleFilterChange("gasRangeMin", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm text-[#8b9dc3] mb-2 block">
                Max Gas Usage
              </label>
              <Input
                type="number"
                placeholder="No limit"
                value={filters.gasRangeMax}
                onChange={(e) =>
                  handleFilterChange("gasRangeMax", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-[rgba(0,191,255,0.1)]">
          <div className="text-sm text-[#8b9dc3]">
            Showing{" "}
            <span className="text-[#00bfff] font-semibold">
              {filteredTraces.length}
            </span>{" "}
            of{" "}
            <span className="text-[#00bfff] font-semibold">
              {traces.length}
            </span>{" "}
            trace actions
            {filteredTraces.length < traces.length && (
              <span className="text-[#8b9dc3]">
                {" "}
                ({Math.round((filteredTraces.length / traces.length) * 100)}%
                shown)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
