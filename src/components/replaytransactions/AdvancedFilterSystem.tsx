import React, { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/global";
import {
  Calendar,
  Check,
  DollarSign,
  Filter,
  Hash,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterCondition {
  id: string;
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "between"
    | "in"
    | "not_in"
    | "exists"
    | "not_exists";
  value: any;
  dataType: "string" | "number" | "boolean" | "date" | "array";
}

interface FilterGroup {
  id: string;
  name: string;
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  subGroups?: FilterGroup[];
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  category: "security" | "gas" | "tokens" | "general" | "custom";
  filter: FilterGroup;
  isPublic: boolean;
  createdAt: number;
  usageCount: number;
  tags: string[];
}

interface AdvancedFilterSystemProps {
  data: any[];
  onFilterChange?: (filteredData: any[]) => void;
  onPresetSave?: (preset: FilterPreset) => void;
  onPresetLoad?: (preset: FilterPreset) => void;
  className?: string;
  showPresets?: boolean;
  showPerformanceMetrics?: boolean;
}

const filterFields = [
  {
    id: "hash",
    label: "Transaction Hash",
    type: "string",
    category: "transaction",
    icon: Hash,
  },
  {
    id: "from",
    label: "From Address",
    type: "string",
    category: "transaction",
    icon: Users,
  },
  {
    id: "to",
    label: "To Address",
    type: "string",
    category: "transaction",
    icon: Users,
  },
  {
    id: "value",
    label: "ETH Value",
    type: "number",
    category: "transaction",
    icon: DollarSign,
  },
  {
    id: "gasUsed",
    label: "Gas Used",
    type: "number",
    category: "gas",
    icon: Zap,
  },
  {
    id: "gasPrice",
    label: "Gas Price",
    type: "number",
    category: "gas",
    icon: Zap,
  },
  {
    id: "status",
    label: "Status",
    type: "string",
    category: "transaction",
    icon: Check,
  },
  {
    id: "timestamp",
    label: "Timestamp",
    type: "date",
    category: "transaction",
    icon: Calendar,
  },

  {
    id: "pyusdVolume",
    label: "PYUSD Volume",
    type: "number",
    category: "tokens",
    icon: DollarSign,
  },
  {
    id: "pyusdTransferCount",
    label: "PYUSD Transfer Count",
    type: "number",
    category: "tokens",
    icon: Hash,
  },
  {
    id: "hasTokenActivity",
    label: "Has Token Activity",
    type: "boolean",
    category: "tokens",
    icon: DollarSign,
  },

  {
    id: "securityFlags",
    label: "Security Flags Count",
    type: "number",
    category: "security",
    icon: Shield,
  },
  {
    id: "riskScore",
    label: "Risk Score",
    type: "number",
    category: "security",
    icon: Shield,
  },
  {
    id: "hasAdminCalls",
    label: "Has Admin Calls",
    type: "boolean",
    category: "security",
    icon: Shield,
  },
  {
    id: "hasLargeTransfers",
    label: "Has Large Transfers",
    type: "boolean",
    category: "security",
    icon: Shield,
  },
  {
    id: "gasEfficiency",
    label: "Gas Efficiency Score",
    type: "number",
    category: "gas",
    icon: Zap,
  },
  {
    id: "callDepth",
    label: "Call Depth",
    type: "number",
    category: "gas",
    icon: Hash,
  },
  {
    id: "contractsInteracted",
    label: "Contracts Interacted",
    type: "number",
    category: "gas",
    icon: Hash,
  },
];

const operatorsByType = {
  string: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does Not Contain" },
    { value: "in", label: "In List" },
    { value: "not_in", label: "Not In List" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
    { value: "between", label: "Between" },
  ],
  boolean: [{ value: "equals", label: "Is" }],
  date: [
    { value: "equals", label: "On Date" },
    { value: "greater_than", label: "After" },
    { value: "less_than", label: "Before" },
    { value: "between", label: "Between" },
  ],
  array: [
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does Not Contain" },
    { value: "exists", label: "Has Items" },
    { value: "not_exists", label: "Is Empty" },
  ],
};

const defaultPresets: FilterPreset[] = [
  {
    id: "high-value-transactions",
    name: "High Value Transactions",
    description: "Transactions with significant ETH or PYUSD value",
    category: "general",
    isPublic: true,
    createdAt: Date.now(),
    usageCount: 0,
    tags: ["value", "high-amount"],
    filter: {
      id: "root",
      name: "High Value",
      logic: "OR",
      conditions: [
        {
          id: "eth-value",
          field: "value",
          operator: "greater_than",
          value: 1,
          dataType: "number",
        },
        {
          id: "pyusd-volume",
          field: "pyusdVolume",
          operator: "greater_than",
          value: 10000,
          dataType: "number",
        },
      ],
    },
  },
  {
    id: "security-flagged",
    name: "Security Flagged Transactions",
    description: "Transactions with security flags or high risk scores",
    category: "security",
    isPublic: true,
    createdAt: Date.now(),
    usageCount: 0,
    tags: ["security", "risk", "flags"],
    filter: {
      id: "root",
      name: "Security Issues",
      logic: "OR",
      conditions: [
        {
          id: "has-flags",
          field: "securityFlags",
          operator: "greater_than",
          value: 0,
          dataType: "number",
        },
        {
          id: "high-risk",
          field: "riskScore",
          operator: "greater_than",
          value: 70,
          dataType: "number",
        },
      ],
    },
  },
  {
    id: "gas-inefficient",
    name: "Gas Inefficient Transactions",
    description: "Transactions with poor gas efficiency",
    category: "gas",
    isPublic: true,
    createdAt: Date.now(),
    usageCount: 0,
    tags: ["gas", "efficiency", "optimization"],
    filter: {
      id: "root",
      name: "Gas Issues",
      logic: "AND",
      conditions: [
        {
          id: "high-gas",
          field: "gasUsed",
          operator: "greater_than",
          value: 200000,
          dataType: "number",
        },
        {
          id: "low-efficiency",
          field: "gasEfficiency",
          operator: "less_than",
          value: 60,
          dataType: "number",
        },
      ],
    },
  },
  {
    id: "failed-transactions",
    name: "Failed Transactions",
    description: "Transactions that failed execution",
    category: "general",
    isPublic: true,
    createdAt: Date.now(),
    usageCount: 0,
    tags: ["failed", "error", "status"],
    filter: {
      id: "root",
      name: "Failed",
      logic: "AND",
      conditions: [
        {
          id: "status-failed",
          field: "status",
          operator: "equals",
          value: "failed",
          dataType: "string",
        },
      ],
    },
  },
];

class FilterEngine {
  static evaluateCondition(item: any, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(item, condition.field);
    const { operator, value } = condition;

    switch (operator) {
      case "equals":
        return fieldValue === value;
      case "not_equals":
        return fieldValue !== value;
      case "contains":
        return String(fieldValue)
          .toLowerCase()
          .includes(String(value).toLowerCase());
      case "not_contains":
        return !String(fieldValue)
          .toLowerCase()
          .includes(String(value).toLowerCase());
      case "greater_than":
        return Number(fieldValue) > Number(value);
      case "less_than":
        return Number(fieldValue) < Number(value);
      case "between":
        const [min, max] = Array.isArray(value)
          ? value
          : [value.min, value.max];
        return (
          Number(fieldValue) >= Number(min) && Number(fieldValue) <= Number(max)
        );
      case "in":
        const inList = Array.isArray(value)
          ? value
          : String(value)
              .split(",")
              .map((v) => v.trim());
        return inList.includes(fieldValue);
      case "not_in":
        const notInList = Array.isArray(value)
          ? value
          : String(value)
              .split(",")
              .map((v) => v.trim());
        return !notInList.includes(fieldValue);
      case "exists":
        return (
          fieldValue != null &&
          (Array.isArray(fieldValue) ? fieldValue.length > 0 : true)
        );
      case "not_exists":
        return (
          fieldValue == null ||
          (Array.isArray(fieldValue) ? fieldValue.length === 0 : false)
        );
      default:
        return true;
    }
  }

  static evaluateGroup(item: any, group: FilterGroup): boolean {
    const conditionResults = group.conditions.map((condition) =>
      this.evaluateCondition(item, condition),
    );

    const subGroupResults =
      group.subGroups?.map((subGroup) => this.evaluateGroup(item, subGroup)) ||
      [];

    const allResults = [...conditionResults, ...subGroupResults];

    if (allResults.length === 0) return true;

    return group.logic === "AND"
      ? allResults.every((result) => result)
      : allResults.some((result) => result);
  }

  static applyFilter(data: any[], filter: FilterGroup): any[] {
    return data.filter((item) => this.evaluateGroup(item, filter));
  }

  private static getFieldValue(item: any, field: string): any {
    return field.split(".").reduce((obj, key) => obj?.[key], item);
  }
}

export const AdvancedFilterSystem: React.FC<AdvancedFilterSystemProps> = ({
  data,
  onFilterChange,
  onPresetSave,
  onPresetLoad,
  className,
  showPresets = true,
  showPerformanceMetrics = true,
}) => {
  const [currentFilter, setCurrentFilter] = useState<FilterGroup>({
    id: "root",
    name: "Root Filter",
    logic: "AND",
    conditions: [],
  });
  const [presets, setPresets] = useState<FilterPreset[]>(defaultPresets);
  const [activeTab, setActiveTab] = useState<
    "builder" | "presets" | "performance"
  >("builder");
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (
      currentFilter.conditions.length === 0 &&
      !currentFilter.subGroups?.length
    ) {
      return data;
    }

    const startTime = performance.now();
    const result = FilterEngine.applyFilter(data, currentFilter);
    const endTime = performance.now();

    console.log(
      `Filter applied in ${endTime - startTime}ms, ${result.length}/${data.length} items match`,
    );

    return result;
  }, [data, currentFilter]);

  React.useEffect(() => {
    onFilterChange?.(filteredData);
  }, [filteredData, onFilterChange]);

  const addCondition = useCallback((groupId: string = "root") => {
    const newCondition: FilterCondition = {
      id: `condition_${Date.now()}`,
      field: "hash",
      operator: "contains",
      value: "",
      dataType: "string",
    };

    setCurrentFilter((prev) => ({
      ...prev,
      conditions: [...prev.conditions, newCondition],
    }));
  }, []);

  const removeCondition = useCallback((conditionId: string) => {
    setCurrentFilter((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== conditionId),
    }));
  }, []);

  const updateCondition = useCallback(
    (conditionId: string, updates: Partial<FilterCondition>) => {
      setCurrentFilter((prev) => ({
        ...prev,
        conditions: prev.conditions.map((c) =>
          c.id === conditionId ? { ...c, ...updates } : c,
        ),
      }));
    },
    [],
  );

  const toggleLogic = useCallback(() => {
    setCurrentFilter((prev) => ({
      ...prev,
      logic: prev.logic === "AND" ? "OR" : "AND",
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setCurrentFilter({
      id: "root",
      name: "Root Filter",
      logic: "AND",
      conditions: [],
    });
  }, []);

  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name: presetName,
      description: presetDescription,
      category: "custom",
      filter: currentFilter,
      isPublic: false,
      createdAt: Date.now(),
      usageCount: 0,
      tags: [],
    };

    setPresets((prev) => [...prev, newPreset]);
    onPresetSave?.(newPreset);
    setPresetName("");
    setPresetDescription("");
  }, [presetName, presetDescription, currentFilter, onPresetSave]);

  const loadPreset = useCallback(
    (preset: FilterPreset) => {
      setCurrentFilter(preset.filter);
      onPresetLoad?.(preset);

      setPresets((prev) =>
        prev.map((p) =>
          p.id === preset.id ? { ...p, usageCount: p.usageCount + 1 } : p,
        ),
      );
    },
    [onPresetLoad],
  );

  const filteredPresets = useMemo(() => {
    if (!searchTerm) return presets;

    return presets.filter(
      (preset) =>
        preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );
  }, [presets, searchTerm]);

  const renderCondition = (condition: FilterCondition) => {
    const field = filterFields.find((f) => f.id === condition.field);
    const operators =
      operatorsByType[condition.dataType] || operatorsByType.string;
    const FieldIcon = field?.icon || Hash;

    return (
      <div
        key={condition.id}
        className="flex items-center space-x-2 p-3 border rounded-lg bg-background"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <FieldIcon className="h-4 w-4 text-muted-foreground" />

          <select
            value={condition.field}
            onChange={(e) => {
              const newField = filterFields.find(
                (f) => f.id === e.target.value,
              );
              updateCondition(condition.id, {
                field: e.target.value,
                dataType: (newField?.type as any) || "string",
              });
            }}
            className="px-2 py-1 text-sm border rounded bg-background min-w-0 flex-1"
          >
            {filterFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
          </select>

          <select
            value={condition.operator}
            onChange={(e) =>
              updateCondition(condition.id, { operator: e.target.value as any })
            }
            className="px-2 py-1 text-sm border rounded bg-background"
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {condition.operator === "between" ? (
            <div className="flex items-center space-x-1">
              <Input
                type={
                  condition.dataType === "number"
                    ? "number"
                    : condition.dataType === "date"
                      ? "date"
                      : "text"
                }
                placeholder="Min"
                value={
                  Array.isArray(condition.value)
                    ? condition.value[0]
                    : condition.value?.min || ""
                }
                onChange={(e) => {
                  const currentValue = Array.isArray(condition.value)
                    ? condition.value
                    : [condition.value?.min || "", condition.value?.max || ""];
                  updateCondition(condition.id, {
                    value: [e.target.value, currentValue[1]],
                  });
                }}
                className="w-20 text-sm"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type={
                  condition.dataType === "number"
                    ? "number"
                    : condition.dataType === "date"
                      ? "date"
                      : "text"
                }
                placeholder="Max"
                value={
                  Array.isArray(condition.value)
                    ? condition.value[1]
                    : condition.value?.max || ""
                }
                onChange={(e) => {
                  const currentValue = Array.isArray(condition.value)
                    ? condition.value
                    : [condition.value?.min || "", condition.value?.max || ""];
                  updateCondition(condition.id, {
                    value: [currentValue[0], e.target.value],
                  });
                }}
                className="w-20 text-sm"
              />
            </div>
          ) : condition.dataType === "boolean" ? (
            <select
              value={condition.value}
              onChange={(e) =>
                updateCondition(condition.id, {
                  value: e.target.value === "true",
                })
              }
              className="px-2 py-1 text-sm border rounded bg-background"
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : (
            <Input
              type={
                condition.dataType === "number"
                  ? "number"
                  : condition.dataType === "date"
                    ? "date"
                    : "text"
              }
              placeholder="Value"
              value={condition.value}
              onChange={(e) =>
                updateCondition(condition.id, { value: e.target.value })
              }
              className="flex-1 text-sm"
            />
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => removeCondition(condition.id)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Advanced Filter System</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredData.length} of {data.length} items match current filters
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {currentFilter.conditions.length} conditions
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={clearFilters}
            disabled={currentFilter.conditions.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: "builder", label: "Filter Builder", icon: Filter },
          ...(showPresets
            ? [{ id: "presets", label: "Presets", icon: Save }]
            : []),
          ...(showPerformanceMetrics
            ? [{ id: "performance", label: "Performance", icon: Zap }]
            : []),
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {activeTab === "builder" && (
          <div className="space-y-4">
            {currentFilter.conditions.length > 1 && (
              <div className="flex items-center justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleLogic}
                  className="font-mono"
                >
                  {currentFilter.logic}
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {currentFilter.conditions.map((condition, index) => (
                <div key={condition.id}>
                  {index > 0 && (
                    <div className="flex justify-center py-2">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {currentFilter.logic}
                      </Badge>
                    </div>
                  )}
                  {renderCondition(condition)}
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addCondition()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>

            {currentFilter.conditions.length > 0 && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium mb-3">Save as Preset</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={presetDescription}
                    onChange={(e) => setPresetDescription(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={savePreset}
                    disabled={!presetName.trim()}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Preset
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "presets" && showPresets && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search presets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-4">
              {["security", "gas", "tokens", "general", "custom"].map(
                (category) => {
                  const categoryPresets = filteredPresets.filter(
                    (p) => p.category === category,
                  );

                  if (categoryPresets.length === 0) return null;

                  return (
                    <div key={category}>
                      <h4 className="text-sm font-medium mb-2 capitalize">
                        {category} Presets ({categoryPresets.length})
                      </h4>
                      <div className="space-y-2">
                        {categoryPresets.map((preset) => (
                          <div
                            key={preset.id}
                            className="p-3 border rounded-lg hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h5 className="text-sm font-medium">
                                    {preset.name}
                                  </h5>
                                  {preset.isPublic && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Public
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {preset.description}
                                </p>
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <span>
                                    {preset.filter.conditions.length} conditions
                                  </span>
                                  <span>{preset.usageCount} uses</span>
                                  <span>
                                    {new Date(
                                      preset.createdAt,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                {preset.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {preset.tags.map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadPreset(preset)}
                                >
                                  Load
                                </Button>
                                {!preset.isPublic && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setPresets((prev) =>
                                        prev.filter((p) => p.id !== preset.id),
                                      );
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {activeTab === "performance" && showPerformanceMetrics && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {((filteredData.length / data.length) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Match Rate</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">
                  {filteredData.length.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Filtered Items
                </div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold">
                  {currentFilter.conditions.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Conditions
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium mb-3">
                Filter Performance Tips
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  • Use specific field filters before general text searches
                </li>
                <li>
                  • Combine multiple conditions with AND for better performance
                </li>
                <li>
                  • Number and date comparisons are faster than text searches
                </li>
                <li>
                  • Consider using presets for frequently used filter
                  combinations
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
