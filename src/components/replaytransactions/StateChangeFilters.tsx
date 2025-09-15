import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/global";
import {
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronRight,
  Coins,
  Database,
  Download,
  Filter,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

interface StateChangeFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  availableContracts: string[];
  availableTokens: string[];
  totalStateChanges: number;
  className?: string;
}

interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | number | boolean | string[];
  enabled: boolean;
}

interface FilterGroup {
  id: string;
  name: string;
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  enabled: boolean;
}

interface FilterState {
  groups: FilterGroup[];
  globalLogic: "AND" | "OR";
  quickFilters: {
    pyusdOnly: boolean;
    securityRelevant: boolean;
    largeChanges: boolean;
    recentChanges: boolean;
  };
  searchTerm: string;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  filters: FilterState;
  category: "security" | "analysis" | "debugging" | "custom";
  isPublic: boolean;
  createdAt: number;
  usageCount: number;
}

type FilterField =
  | "address"
  | "slot"
  | "changeType"
  | "changeAmount"
  | "gasUsed"
  | "transactionIndex"
  | "tokenSymbol"
  | "isSecurityRelevant"
  | "isPYUSDRelated"
  | "timestamp";

type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "between"
  | "in"
  | "not_in"
  | "is_true"
  | "is_false";

type SortField =
  | "timestamp"
  | "gasUsed"
  | "changeAmount"
  | "transactionIndex"
  | "address"
  | "slot";

const FILTER_FIELDS: Array<{
  value: FilterField;
  label: string;
  type: "string" | "number" | "boolean" | "array";
}> = [
  { value: "address", label: "Contract Address", type: "string" },
  { value: "slot", label: "Storage Slot", type: "string" },
  { value: "changeType", label: "Change Type", type: "string" },
  { value: "changeAmount", label: "Change Amount", type: "number" },
  { value: "gasUsed", label: "Gas Used", type: "number" },
  { value: "transactionIndex", label: "Transaction Index", type: "number" },
  { value: "tokenSymbol", label: "Token Symbol", type: "string" },
  { value: "isSecurityRelevant", label: "Security Relevant", type: "boolean" },
  { value: "isPYUSDRelated", label: "PYUSD Related", type: "boolean" },
  { value: "timestamp", label: "Timestamp", type: "number" },
];

const FILTER_OPERATORS: Record<string, FilterOperator[]> = {
  string: ["equals", "not_equals", "contains", "not_contains", "in", "not_in"],
  number: ["equals", "not_equals", "greater_than", "less_than", "between"],
  boolean: ["is_true", "is_false"],
  array: ["in", "not_in"],
};

const PRESET_FILTERS: FilterPreset[] = [
  {
    id: "pyusd-security",
    name: "PYUSD Security Events",
    description: "Focus on security-relevant PYUSD contract changes",
    icon: Shield,
    category: "security",
    isPublic: true,
    createdAt: Date.now(),
    usageCount: 0,
    filters: {
      groups: [
        {
          id: "security-group",
          name: "Security Group",
          logic: "AND",
          enabled: true,
          conditions: [
            {
              id: "pyusd-condition",
              field: "isPYUSDRelated",
              operator: "is_true",
              value: true,
              enabled: true,
            },
            {
              id: "security-condition",
              field: "isSecurityRelevant",
              operator: "is_true",
              value: true,
              enabled: true,
            },
          ],
        },
      ],
      globalLogic: "AND",
      quickFilters: {
        pyusdOnly: true,
        securityRelevant: true,
        largeChanges: false,
        recentChanges: false,
      },
      searchTerm: "",
      sortBy: "timestamp",
      sortOrder: "desc",
    },
  },
  {
    id: "large-transfers",
    name: "Large Value Changes",
    description: "Filter for significant value changes above threshold",
    icon: TrendingUp,
    category: "analysis",
    isPublic: true,
    createdAt: Date.now(),
    usageCount: 0,
    filters: {
      groups: [
        {
          id: "large-changes-group",
          name: "Large Changes",
          logic: "AND",
          enabled: true,
          conditions: [
            {
              id: "amount-condition",
              field: "changeAmount",
              operator: "greater_than",
              value: 100000,
              enabled: true,
            },
          ],
        },
      ],
      globalLogic: "AND",
      quickFilters: {
        pyusdOnly: false,
        securityRelevant: false,
        largeChanges: true,
        recentChanges: false,
      },
      searchTerm: "",
      sortBy: "changeAmount",
      sortOrder: "desc",
    },
  },
  {
    id: "gas-optimization",
    name: "Gas Optimization Focus",
    description: "High gas usage changes for optimization analysis",
    icon: Coins,
    category: "debugging",
    isPublic: true,
    createdAt: Date.now(),
    usageCount: 0,
    filters: {
      groups: [
        {
          id: "gas-group",
          name: "High Gas Usage",
          logic: "AND",
          enabled: true,
          conditions: [
            {
              id: "gas-condition",
              field: "gasUsed",
              operator: "greater_than",
              value: 50000,
              enabled: true,
            },
          ],
        },
      ],
      globalLogic: "AND",
      quickFilters: {
        pyusdOnly: false,
        securityRelevant: false,
        largeChanges: false,
        recentChanges: false,
      },
      searchTerm: "",
      sortBy: "gasUsed",
      sortOrder: "desc",
    },
  },
];

export const StateChangeFilters: React.FC<StateChangeFiltersProps> = ({
  onFiltersChange,
  availableContracts,
  availableTokens,
  totalStateChanges,
  className,
}) => {
  const [filterState, setFilterState] = useState<FilterState>({
    groups: [],
    globalLogic: "AND",
    quickFilters: {
      pyusdOnly: false,
      securityRelevant: false,
      largeChanges: false,
      recentChanges: false,
    },
    searchTerm: "",
    sortBy: "timestamp",
    sortOrder: "desc",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedPresets, setSavedPresets] =
    useState<FilterPreset[]>(PRESET_FILTERS);
  const [showPresets, setShowPresets] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const applyFilters = useCallback(
    (newFilters: FilterState) => {
      setFilterState(newFilters);
      onFiltersChange(newFilters);
    },
    [onFiltersChange],
  );

  const handleQuickFilterChange = useCallback(
    (key: keyof FilterState["quickFilters"], value: boolean) => {
      const newFilters = {
        ...filterState,
        quickFilters: {
          ...filterState.quickFilters,
          [key]: value,
        },
      };
      applyFilters(newFilters);
    },
    [filterState, applyFilters],
  );

  const addFilterGroup = useCallback(() => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      name: `Filter Group ${filterState.groups.length + 1}`,
      logic: "AND",
      enabled: true,
      conditions: [],
    };

    const newFilters = {
      ...filterState,
      groups: [...filterState.groups, newGroup],
    };
    applyFilters(newFilters);
  }, [filterState, applyFilters]);

  const addCondition = useCallback(
    (groupId: string) => {
      const newCondition: FilterCondition = {
        id: `condition-${Date.now()}`,
        field: "address",
        operator: "equals",
        value: "",
        enabled: true,
      };

      const newFilters = {
        ...filterState,
        groups: filterState.groups.map((group) =>
          group.id === groupId
            ? { ...group, conditions: [...group.conditions, newCondition] }
            : group,
        ),
      };
      applyFilters(newFilters);
    },
    [filterState, applyFilters],
  );

  const updateCondition = useCallback(
    (
      groupId: string,
      conditionId: string,
      updates: Partial<FilterCondition>,
    ) => {
      const newFilters = {
        ...filterState,
        groups: filterState.groups.map((group) =>
          group.id === groupId
            ? {
                ...group,
                conditions: group.conditions.map((condition) =>
                  condition.id === conditionId
                    ? { ...condition, ...updates }
                    : condition,
                ),
              }
            : group,
        ),
      };
      applyFilters(newFilters);
    },
    [filterState, applyFilters],
  );

  const removeCondition = useCallback(
    (groupId: string, conditionId: string) => {
      const newFilters = {
        ...filterState,
        groups: filterState.groups.map((group) =>
          group.id === groupId
            ? {
                ...group,
                conditions: group.conditions.filter(
                  (condition) => condition.id !== conditionId,
                ),
              }
            : group,
        ),
      };
      applyFilters(newFilters);
    },
    [filterState, applyFilters],
  );

  const removeGroup = useCallback(
    (groupId: string) => {
      const newFilters = {
        ...filterState,
        groups: filterState.groups.filter((group) => group.id !== groupId),
      };
      applyFilters(newFilters);
    },
    [filterState, applyFilters],
  );

  const applyPreset = useCallback(
    (preset: FilterPreset) => {
      applyFilters(preset.filters);

      setSavedPresets((prev) =>
        prev.map((p) =>
          p.id === preset.id ? { ...p, usageCount: p.usageCount + 1 } : p,
        ),
      );
    },
    [applyFilters],
  );

  const saveAsPreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName,
      description: "Custom filter preset",
      icon: Bookmark,
      category: "custom",
      isPublic: false,
      createdAt: Date.now(),
      usageCount: 0,
      filters: { ...filterState },
    };

    setSavedPresets((prev) => [...prev, newPreset]);
    setNewPresetName("");
    setShowSaveDialog(false);
  }, [newPresetName, filterState]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      groups: [],
      globalLogic: "AND",
      quickFilters: {
        pyusdOnly: false,
        securityRelevant: false,
        largeChanges: false,
        recentChanges: false,
      },
      searchTerm: "",
      sortBy: "timestamp",
      sortOrder: "desc",
    };
    applyFilters(clearedFilters);
  }, [applyFilters]);

  const exportFilters = useCallback(() => {
    const exportData = {
      filters: filterState,
      presets: savedPresets.filter((p) => p.category === "custom"),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state-change-filters-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filterState, savedPresets]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterState.searchTerm) count++;
    count += Object.values(filterState.quickFilters).filter(Boolean).length;
    count += filterState.groups
      .filter((g) => g.enabled)
      .reduce(
        (sum, group) => sum + group.conditions.filter((c) => c.enabled).length,
        0,
      );
    return count;
  }, [filterState]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Advanced Filters</h2>
          {activeFiltersCount > 0 && (
            <Badge variant="default">{activeFiltersCount} active</Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Presets
          </Button>

          <Button variant="outline" size="sm" onClick={exportFilters}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            disabled={activeFiltersCount === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search addresses, slots, or descriptions..."
          value={filterState.searchTerm}
          onChange={(e) =>
            applyFilters({ ...filterState, searchTerm: e.target.value })
          }
          className="pl-10"
        />
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-3">Quick Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterState.quickFilters.pyusdOnly}
              onChange={(e) =>
                handleQuickFilterChange("pyusdOnly", e.target.checked)
              }
              className="rounded"
            />
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">PYUSD Only</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterState.quickFilters.securityRelevant}
              onChange={(e) =>
                handleQuickFilterChange("securityRelevant", e.target.checked)
              }
              className="rounded"
            />
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-sm">Security Relevant</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterState.quickFilters.largeChanges}
              onChange={(e) =>
                handleQuickFilterChange("largeChanges", e.target.checked)
              }
              className="rounded"
            />
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm">Large Changes</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterState.quickFilters.recentChanges}
              onChange={(e) =>
                handleQuickFilterChange("recentChanges", e.target.checked)
              }
              className="rounded"
            />
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Recent Changes</span>
          </label>
        </div>
      </div>

      {showPresets && (
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Filter Presets</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Current
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedPresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <div
                  key={preset.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => applyPreset(preset)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">{preset.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {preset.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {preset.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Used {preset.usageCount} times</span>
                    <span>
                      {new Date(preset.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-medium mb-3">Save Filter Preset</h3>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Preset name..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="default"
              size="sm"
              onClick={saveAsPreset}
              disabled={!newPresetName.trim()}
            >
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced Filters
            {showAdvanced ? (
              <ChevronDown className="h-4 w-4 ml-2" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-2" />
            )}
          </Button>

          {showAdvanced && (
            <Button variant="outline" size="sm" onClick={addFilterGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          )}
        </div>

        {showAdvanced && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Groups Logic:</span>
              <select
                value={filterState.globalLogic}
                onChange={(e) =>
                  applyFilters({
                    ...filterState,
                    globalLogic: e.target.value as "AND" | "OR",
                  })
                }
                className="text-sm border rounded px-2 py-1"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>

            {filterState.groups.map((group, groupIndex) => (
              <div key={group.id} className="bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={group.enabled}
                      onChange={(e) => {
                        const newFilters = {
                          ...filterState,
                          groups: filterState.groups.map((g) =>
                            g.id === group.id
                              ? { ...g, enabled: e.target.checked }
                              : g,
                          ),
                        };
                        applyFilters(newFilters);
                      }}
                      className="rounded"
                    />
                    <Input
                      value={group.name}
                      onChange={(e) => {
                        const newFilters = {
                          ...filterState,
                          groups: filterState.groups.map((g) =>
                            g.id === group.id
                              ? { ...g, name: e.target.value }
                              : g,
                          ),
                        };
                        applyFilters(newFilters);
                      }}
                      className="font-medium"
                    />
                    <select
                      value={group.logic}
                      onChange={(e) => {
                        const newFilters = {
                          ...filterState,
                          groups: filterState.groups.map((g) =>
                            g.id === group.id
                              ? { ...g, logic: e.target.value as "AND" | "OR" }
                              : g,
                          ),
                        };
                        applyFilters(newFilters);
                      }}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCondition(group.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeGroup(group.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.conditions.map((condition, conditionIndex) => (
                    <div
                      key={condition.id}
                      className="flex items-center space-x-2 p-2 bg-background rounded"
                    >
                      <input
                        type="checkbox"
                        checked={condition.enabled}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            enabled: e.target.checked,
                          })
                        }
                        className="rounded"
                      />

                      <select
                        value={condition.field}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            field: e.target.value as FilterField,
                            operator:
                              FILTER_OPERATORS[
                                FILTER_FIELDS.find(
                                  (f) => f.value === e.target.value,
                                )?.type || "string"
                              ][0],
                            value: "",
                          })
                        }
                        className="text-sm border rounded px-2 py-1"
                      >
                        {FILTER_FIELDS.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            operator: e.target.value as FilterOperator,
                          })
                        }
                        className="text-sm border rounded px-2 py-1"
                      >
                        {FILTER_OPERATORS[
                          FILTER_FIELDS.find((f) => f.value === condition.field)
                            ?.type || "string"
                        ].map((op) => (
                          <option key={op} value={op}>
                            {op.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>

                      {condition.operator !== "is_true" &&
                        condition.operator !== "is_false" && (
                          <Input
                            value={condition.value as string}
                            onChange={(e) =>
                              updateCondition(group.id, condition.id, {
                                value: e.target.value,
                              })
                            }
                            placeholder="Value..."
                            className="flex-1"
                          />
                        )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeCondition(group.id, condition.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {group.conditions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No conditions. Click + to add conditions.
                    </p>
                  )}
                </div>
              </div>
            ))}

            {filterState.groups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No filter groups. Click "Add Group" to create advanced filters.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-3">Sort Options</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Sort by:</span>
            <select
              value={filterState.sortBy}
              onChange={(e) =>
                applyFilters({
                  ...filterState,
                  sortBy: e.target.value as SortField,
                })
              }
              className="text-sm border rounded px-2 py-1"
            >
              <option value="timestamp">Timestamp</option>
              <option value="gasUsed">Gas Used</option>
              <option value="changeAmount">Change Amount</option>
              <option value="transactionIndex">Transaction Index</option>
              <option value="address">Address</option>
              <option value="slot">Storage Slot</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm">Order:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                applyFilters({
                  ...filterState,
                  sortOrder: filterState.sortOrder === "asc" ? "desc" : "asc",
                })
              }
            >
              {filterState.sortOrder === "asc" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {filterState.sortOrder === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-accent/50 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <span>
            {activeFiltersCount > 0
              ? `${activeFiltersCount} filters active • Showing filtered results`
              : `No filters active • Showing all ${totalStateChanges} state changes`}
          </span>
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {totalStateChanges.toLocaleString()} total changes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
