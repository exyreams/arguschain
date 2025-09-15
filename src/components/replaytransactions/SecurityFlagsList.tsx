import React, { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/global";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityFlag {
  id: string;
  type: string;
  category: "admin" | "transfer" | "contract" | "gas" | "access" | "compliance";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  recommendation: string;
  timestamp: number;
  transactionHash?: string;
  contractAddress?: string;
  affectedAddresses?: string[];
  metadata?: Record<string, any>;
  acknowledged?: boolean;
  falsePositive?: boolean;
}

interface SecurityFlagsListProps {
  flags: SecurityFlag[];
  onFlagSelect?: (flag: SecurityFlag) => void;
  onFlagAcknowledge?: (flagId: string) => void;
  onFlagMarkFalsePositive?: (flagId: string) => void;
  className?: string;
  showFilters?: boolean;
  groupByCategory?: boolean;
}

const severityConfig = {
  critical: {
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    icon: XCircle,
    label: "Critical",
  },
  high: {
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: AlertTriangle,
    label: "High",
  },
  medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: AlertCircle,
    label: "Medium",
  },
  low: {
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Eye,
    label: "Low",
  },
};

const categoryConfig = {
  admin: {
    label: "Administrative",
    description: "Admin function calls and ownership changes",
    icon: Shield,
    color: "text-purple-600",
  },
  transfer: {
    label: "Token Transfers",
    description: "Large or suspicious token movements",
    icon: AlertTriangle,
    color: "text-orange-600",
  },
  contract: {
    label: "Contract Changes",
    description: "Smart contract modifications and deployments",
    icon: AlertCircle,
    color: "text-red-600",
  },
  gas: {
    label: "Gas Anomalies",
    description: "Unusual gas usage patterns",
    icon: Clock,
    color: "text-yellow-600",
  },
  access: {
    label: "Access Control",
    description: "Permission and access violations",
    icon: Eye,
    color: "text-blue-600",
  },
  compliance: {
    label: "Compliance",
    description: "Regulatory and compliance issues",
    icon: CheckCircle,
    color: "text-green-600",
  },
};

export const SecurityFlagsList: React.FC<SecurityFlagsListProps> = ({
  flags,
  onFlagSelect,
  onFlagAcknowledge,
  onFlagMarkFalsePositive,
  className,
  showFilters = true,
  groupByCategory = true,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([
    "critical",
    "high",
    "medium",
    "low",
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    Object.keys(categoryConfig),
  );
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [showFalsePositives, setShowFalsePositives] = useState(false);
  const [sortBy, setSortBy] = useState<"timestamp" | "severity" | "category">(
    "severity",
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(categoryConfig)),
  );

  const filteredFlags = useMemo(() => {
    let filtered = flags.filter((flag) => {
      if (
        searchTerm &&
        !flag.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !flag.description.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      if (!selectedSeverities.includes(flag.severity)) {
        return false;
      }

      if (!selectedCategories.includes(flag.category)) {
        return false;
      }

      if (!showAcknowledged && flag.acknowledged) {
        return false;
      }

      if (!showFalsePositives && flag.falsePositive) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "severity":
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        case "timestamp":
          return b.timestamp - a.timestamp;
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    flags,
    searchTerm,
    selectedSeverities,
    selectedCategories,
    showAcknowledged,
    showFalsePositives,
    sortBy,
  ]);

  const groupedFlags = useMemo(() => {
    if (!groupByCategory) {
      return { all: filteredFlags };
    }

    return filteredFlags.reduce(
      (groups, flag) => {
        if (!groups[flag.category]) {
          groups[flag.category] = [];
        }
        groups[flag.category].push(flag);
        return groups;
      },
      {} as Record<string, SecurityFlag[]>,
    );
  }, [filteredFlags, groupByCategory]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSeverityFilter = (severity: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity)
        ? prev.filter((s) => s !== severity)
        : [...prev, severity],
    );
  };

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const getSeverityStats = () => {
    const stats = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredFlags.forEach((flag) => {
      stats[flag.severity]++;
    });
    return stats;
  };

  const renderFlag = (flag: SecurityFlag) => {
    const severityInfo = severityConfig[flag.severity];
    const SeverityIcon = severityInfo.icon;

    return (
      <div
        key={flag.id}
        className={cn(
          "p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
          severityInfo.bgColor,
          severityInfo.borderColor,
          flag.acknowledged && "opacity-60",
          flag.falsePositive && "opacity-40",
        )}
        onClick={() => onFlagSelect?.(flag)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={cn("p-1 rounded-full", severityInfo.color)}>
              <SeverityIcon className="h-4 w-4 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium text-foreground truncate">
                  {flag.title}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {severityInfo.label}
                </Badge>
                {flag.acknowledged && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Acknowledged
                  </Badge>
                )}
                {flag.falsePositive && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    False Positive
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {flag.description}
              </p>

              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{new Date(flag.timestamp).toLocaleString()}</span>
                {flag.transactionHash && (
                  <span className="font-mono">
                    {flag.transactionHash.slice(0, 10)}...
                  </span>
                )}
                {flag.contractAddress && (
                  <span className="font-mono">
                    {flag.contractAddress.slice(0, 10)}...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            {!flag.acknowledged && onFlagAcknowledge && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlagAcknowledge(flag.id);
                }}
                className="h-6 px-2 text-xs"
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            )}
            {!flag.falsePositive && onFlagMarkFalsePositive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlagMarkFalsePositive(flag.id);
                }}
                className="h-6 px-2 text-xs"
              >
                <XCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {flag.recommendation && (
          <div className="mt-3 p-2 bg-background/50 rounded border">
            <div className="text-xs font-medium text-foreground mb-1">
              Recommendation:
            </div>
            <div className="text-xs text-muted-foreground">
              {flag.recommendation}
            </div>
          </div>
        )}
      </div>
    );
  };

  const severityStats = getSeverityStats();

  return (
    <Card className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Security Flags</h3>
          <p className="text-sm text-muted-foreground">
            {filteredFlags.length} flags found
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {Object.entries(severityStats).map(([severity, count]) => {
            const config =
              severityConfig[severity as keyof typeof severityConfig];
            return count > 0 ? (
              <Badge
                key={severity}
                variant="outline"
                className={cn("text-xs", config.textColor)}
              >
                {count} {config.label}
              </Badge>
            ) : null;
          })}
        </div>
      </div>

      {showFilters && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Severity
              </label>
              <div className="space-y-1">
                {Object.entries(severityConfig).map(([severity, config]) => (
                  <div key={severity} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`severity-${severity}`}
                      checked={selectedSeverities.includes(severity)}
                      onChange={() => toggleSeverityFilter(severity)}
                      className="rounded"
                    />
                    <label htmlFor={`severity-${severity}`} className="text-xs">
                      {config.label} (
                      {severityStats[severity as keyof typeof severityStats]})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Category
              </label>
              <div className="space-y-1">
                {Object.entries(categoryConfig).map(([category, config]) => (
                  <div key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategoryFilter(category)}
                      className="rounded"
                    />
                    <label htmlFor={`category-${category}`} className="text-xs">
                      {config.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Options
              </label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show-acknowledged"
                    checked={showAcknowledged}
                    onChange={(e) => setShowAcknowledged(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="show-acknowledged" className="text-xs">
                    Show acknowledged
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show-false-positives"
                    checked={showFalsePositives}
                    onChange={(e) => setShowFalsePositives(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="show-false-positives" className="text-xs">
                    Show false positives
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    <option value="severity">Severity</option>
                    <option value="timestamp">Time</option>
                    <option value="category">Category</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredFlags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No security flags match your current filters</p>
          </div>
        ) : groupByCategory ? (
          Object.entries(groupedFlags).map(([category, categoryFlags]) => {
            const categoryInfo =
              categoryConfig[category as keyof typeof categoryConfig];
            const CategoryIcon = categoryInfo?.icon || Shield;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="space-y-2">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center space-x-2 w-full text-left p-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <CategoryIcon
                    className={cn("h-4 w-4", categoryInfo?.color)}
                  />
                  <span className="font-medium">
                    {categoryInfo?.label || category} ({categoryFlags.length})
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-2 ml-6">
                    {categoryFlags.map(renderFlag)}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="space-y-2">{filteredFlags.map(renderFlag)}</div>
        )}
      </div>
    </Card>
  );
};
