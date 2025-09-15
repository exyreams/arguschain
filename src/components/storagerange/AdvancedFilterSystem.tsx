import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Save,
  Search,
  Target,
  X,
  Zap,
} from "lucide-react";
import type { StorageSlot } from "@/lib/storagerange/types";

interface AdvancedFilterSystemProps {
  data: StorageSlot[];
  onFilteredDataChange: (filteredData: StorageSlot[]) => void;
  className?: string;
}

interface FilterCriteria {
  id: string;
  field: keyof StorageSlot | "all";
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "regex"
    | "range"
    | "exists";
  value: string | number | boolean | [number, number];
  enabled: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  criteria: FilterCriteria[];
  searchTerm: string;
  createdAt: Date;
}

interface SearchOptions {
  fuzzyMatch: boolean;
  caseSensitive: boolean;
  searchFields: (keyof StorageSlot)[];
  maxResults: number;
}

export const AdvancedFilterSystem: React.FC<AdvancedFilterSystemProps> = ({
  data,
  onFilteredDataChange,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria[]>([]);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    fuzzyMatch: true,
    caseSensitive: false,
    searchFields: ["slotDisplay", "decodedValue", "interpretation"],
    maxResults: 1000,
  });
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const defaultPresets: FilterPreset[] = useMemo(
    () => [
      {
        id: "supply-related",
        name: "Supply Related",
        description: "Show only supply-related storage slots",
        criteria: [
          {
            id: "supply-category",
            field: "category",
            operator: "equals",
            value: "supply",
            enabled: true,
          },
        ],
        searchTerm: "",
        createdAt: new Date(),
      },
      {
        id: "balance-mappings",
        name: "Balance Mappings",
        description: "Show balance mapping slots",
        criteria: [
          {
            id: "balance-category",
            field: "category",
            operator: "equals",
            value: "balances",
            enabled: true,
          },
        ],
        searchTerm: "",
        createdAt: new Date(),
      },
      {
        id: "proxy-slots",
        name: "Proxy Slots",
        description: "Show proxy-related storage slots",
        criteria: [
          {
            id: "proxy-category",
            field: "category",
            operator: "equals",
            value: "proxy",
            enabled: true,
          },
        ],
        searchTerm: "",
        createdAt: new Date(),
      },
      {
        id: "security-relevant",
        name: "Security Relevant",
        description: "Show security-relevant slots",
        criteria: [
          {
            id: "security-flag",
            field: "securityRelevant",
            operator: "equals",
            value: true,
            enabled: true,
          },
        ],
        searchTerm: "",
        createdAt: new Date(),
      },
      {
        id: "pyusd-related",
        name: "PYUSD Related",
        description: "Show PYUSD-specific slots",
        criteria: [
          {
            id: "pyusd-flag",
            field: "isPYUSDRelated",
            operator: "equals",
            value: true,
            enabled: true,
          },
        ],
        searchTerm: "",
        createdAt: new Date(),
      },
    ],
    [],
  );

  useEffect(() => {
    setSavedPresets(defaultPresets);
  }, [defaultPresets]);

  const fuzzyMatch = useCallback(
    (text: string, pattern: string): boolean => {
      if (!searchOptions.fuzzyMatch) {
        return searchOptions.caseSensitive
          ? text.includes(pattern)
          : text.toLowerCase().includes(pattern.toLowerCase());
      }

      const textToSearch = searchOptions.caseSensitive
        ? text
        : text.toLowerCase();
      const patternToMatch = searchOptions.caseSensitive
        ? pattern
        : pattern.toLowerCase();

      let patternIndex = 0;
      for (
        let i = 0;
        i < textToSearch.length && patternIndex < patternToMatch.length;
        i++
      ) {
        if (textToSearch[i] === patternToMatch[patternIndex]) {
          patternIndex++;
        }
      }
      return patternIndex === patternToMatch.length;
    },
    [searchOptions.fuzzyMatch, searchOptions.caseSensitive],
  );

  const searchFilter = useCallback(
    (item: StorageSlot, term: string): boolean => {
      if (!term.trim()) return true;

      return searchOptions.searchFields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return fuzzyMatch(String(value), term);
      });
    },
    [searchOptions.searchFields, fuzzyMatch],
  );

  const criteriaFilter = useCallback(
    (item: StorageSlot, criteria: FilterCriteria): boolean => {
      if (!criteria.enabled) return true;

      const fieldValue = criteria.field === "all" ? null : item[criteria.field];

      switch (criteria.operator) {
        case "equals":
          return fieldValue === criteria.value;

        case "contains":
          return String(fieldValue)
            .toLowerCase()
            .includes(String(criteria.value).toLowerCase());

        case "startsWith":
          return String(fieldValue)
            .toLowerCase()
            .startsWith(String(criteria.value).toLowerCase());

        case "endsWith":
          return String(fieldValue)
            .toLowerCase()
            .endsWith(String(criteria.value).toLowerCase());

        case "regex":
          try {
            const regex = new RegExp(
              String(criteria.value),
              searchOptions.caseSensitive ? "g" : "gi",
            );
            return regex.test(String(fieldValue));
          } catch {
            return false;
          }

        case "range":
          if (Array.isArray(criteria.value) && typeof fieldValue === "number") {
            const [min, max] = criteria.value;
            return fieldValue >= min && fieldValue <= max;
          }
          return false;

        case "exists":
          return (
            fieldValue !== null && fieldValue !== undefined && fieldValue !== ""
          );

        default:
          return true;
      }
    },
    [searchOptions.caseSensitive],
  );

  const filteredData = useMemo(() => {
    let result = data;

    if (searchTerm.trim()) {
      result = result.filter((item) => searchFilter(item, searchTerm));
    }

    const enabledCriteria = filterCriteria.filter((c) => c.enabled);
    if (enabledCriteria.length > 0) {
      result = result.filter((item) =>
        enabledCriteria.every((criteria) => criteriaFilter(item, criteria)),
      );
    }

    return result.slice(0, searchOptions.maxResults);
  }, [
    data,
    searchTerm,
    filterCriteria,
    searchFilter,
    criteriaFilter,
    searchOptions.maxResults,
  ]);

  useEffect(() => {
    onFilteredDataChange(filteredData);
  }, [filteredData, onFilteredDataChange]);

  const addFilterCriteria = useCallback(() => {
    const newCriteria: FilterCriteria = {
      id: `criteria-${Date.now()}`,
      field: "category",
      operator: "equals",
      value: "",
      enabled: true,
    };
    setFilterCriteria((prev) => [...prev, newCriteria]);
  }, []);

  const updateFilterCriteria = useCallback(
    (id: string, updates: Partial<FilterCriteria>) => {
      setFilterCriteria((prev) =>
        prev.map((criteria) =>
          criteria.id === id ? { ...criteria, ...updates } : criteria,
        ),
      );
    },
    [],
  );

  const removeFilterCriteria = useCallback((id: string) => {
    setFilterCriteria((prev) => prev.filter((criteria) => criteria.id !== id));
  }, []);

  const saveCurrentAsPreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName,
      description: `Custom preset with ${filterCriteria.length} criteria`,
      criteria: [...filterCriteria],
      searchTerm,
      createdAt: new Date(),
    };

    setSavedPresets((prev) => [...prev, newPreset]);
    setNewPresetName("");
  }, [newPresetName, filterCriteria, searchTerm]);

  const loadPreset = useCallback((preset: FilterPreset) => {
    setFilterCriteria(preset.criteria);
    setSearchTerm(preset.searchTerm);
    setShowPresets(false);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setFilterCriteria([]);
  }, []);

  const getFieldOptions = (): Array<{
    value: keyof StorageSlot | "all";
    label: string;
  }> => [
    { value: "all", label: "All Fields" },
    { value: "slotDisplay", label: "Slot" },
    { value: "decodedValue", label: "Decoded Value" },
    { value: "interpretation", label: "Interpretation" },
    { value: "category", label: "Category" },
    { value: "type", label: "Type" },
    { value: "securityRelevant", label: "Security Relevant" },
    { value: "isPYUSDRelated", label: "PYUSD Related" },
  ];

  const getOperatorOptions = () => [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "startsWith", label: "Starts With" },
    { value: "endsWith", label: "Ends With" },
    { value: "regex", label: "Regex" },
    { value: "range", label: "Range" },
    { value: "exists", label: "Exists" },
  ];

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Advanced Filters
          </h3>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {filteredData.length} / {data.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Presets
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search storage slots..."
          className="pl-10 bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showPresets && (
        <div className="mb-4 p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <h4 className="font-medium text-[#00bfff] mb-3">Filter Presets</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {savedPresets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => loadPreset(preset)}
                className="justify-start border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <Target className="h-3 w-3 mr-2" />
                {preset.name}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
            />
            <Button
              onClick={saveCurrentAsPreset}
              disabled={!newPresetName.trim()}
              className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <h4 className="font-medium text-[#00bfff] mb-3">Search Options</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchOptions.fuzzyMatch}
                    onChange={(e) =>
                      setSearchOptions((prev) => ({
                        ...prev,
                        fuzzyMatch: e.target.checked,
                      }))
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />
                  <span className="text-[#8b9dc3] text-sm">Fuzzy Matching</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchOptions.caseSensitive}
                    onChange={(e) =>
                      setSearchOptions((prev) => ({
                        ...prev,
                        caseSensitive: e.target.checked,
                      }))
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />
                  <span className="text-[#8b9dc3] text-sm">Case Sensitive</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                  Max Results
                </label>
                <Input
                  type="number"
                  value={searchOptions.maxResults}
                  onChange={(e) =>
                    setSearchOptions((prev) => ({
                      ...prev,
                      maxResults: parseInt(e.target.value) || 1000,
                    }))
                  }
                  min="10"
                  max="10000"
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-[#00bfff]">Filter Criteria</h4>
              <Button
                onClick={addFilterCriteria}
                size="sm"
                className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>

            <div className="space-y-3">
              {filterCriteria.map((criteria) => (
                <div
                  key={criteria.id}
                  className="flex items-center gap-2 p-3 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.8)]"
                >
                  <input
                    type="checkbox"
                    checked={criteria.enabled}
                    onChange={(e) =>
                      updateFilterCriteria(criteria.id, {
                        enabled: e.target.checked,
                      })
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />

                  <select
                    value={criteria.field}
                    onChange={(e) =>
                      updateFilterCriteria(criteria.id, {
                        field: e.target.value as any,
                      })
                    }
                    className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded px-2 py-1 text-sm"
                  >
                    {getFieldOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={criteria.operator}
                    onChange={(e) =>
                      updateFilterCriteria(criteria.id, {
                        operator: e.target.value as any,
                      })
                    }
                    className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded px-2 py-1 text-sm"
                  >
                    {getOperatorOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <Input
                    value={String(criteria.value)}
                    onChange={(e) =>
                      updateFilterCriteria(criteria.id, {
                        value: e.target.value,
                      })
                    }
                    placeholder="Value..."
                    className="flex-1 bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilterCriteria(criteria.id)}
                    className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {filterCriteria.length === 0 && (
                <div className="text-center py-4 text-[#8b9dc3] text-sm">
                  No filter criteria added. Click "Add Filter" to create custom
                  filters.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              >
                <Zap className="h-3 w-3 mr-1" />
                {filteredData.length} results
              </Badge>
              {filteredData.length < data.length && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                >
                  {data.length - filteredData.length} filtered out
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              disabled={!searchTerm && filterCriteria.length === 0}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
