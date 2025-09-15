import React, { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/global";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  GitBranch,
  Home,
  Layers,
  Network,
  Search,
  Settings,
  Share2,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPoint {
  id: string;
  type:
    | "transaction"
    | "address"
    | "contract"
    | "token"
    | "block"
    | "security_flag";
  label: string;
  value: any;
  metadata: Record<string, any>;
  timestamp?: number;
  relationships: string[];
}

interface Correlation {
  id: string;
  sourceId: string;
  targetId: string;
  type: "causal" | "temporal" | "functional" | "structural" | "statistical";
  strength: number;
  confidence: number;
  description: string;
  evidence: string[];
  metadata: Record<string, any>;
}

interface BreadcrumbItem {
  id: string;
  label: string;
  type: string;
}

interface CustomView {
  id: string;
  name: string;
  description: string;
  layout: "grid" | "network" | "timeline" | "hierarchy";
  filters: any[];
  dataPoints: string[];
  correlations: string[];
  createdAt: number;
}

interface DataCorrelationToolsProps {
  data: DataPoint[];
  correlations: Correlation[];
  onDataPointSelect?: (dataPoint: DataPoint) => void;
  onCorrelationSelect?: (correlation: Correlation) => void;
  onViewSave?: (view: CustomView) => void;
  className?: string;
  showBreadcrumbs?: boolean;
  showCustomViews?: boolean;
}

class CorrelationAnalysisEngine {
  static findCorrelations(data: DataPoint[]): Correlation[] {
    const correlations: Correlation[] = [];

    const temporalCorrelations = this.findTemporalCorrelations(data);
    correlations.push(...temporalCorrelations);

    const functionalCorrelations = this.findFunctionalCorrelations(data);
    correlations.push(...functionalCorrelations);

    const statisticalCorrelations = this.findStatisticalCorrelations(data);
    correlations.push(...statisticalCorrelations);

    const structuralCorrelations = this.findStructuralCorrelations(data);
    correlations.push(...structuralCorrelations);

    return correlations.sort(
      (a, b) => b.strength * b.confidence - a.strength * a.confidence,
    );
  }

  private static findTemporalCorrelations(data: DataPoint[]): Correlation[] {
    const correlations: Correlation[] = [];
    const timeWindow = 300000;

    const timedData = data
      .filter((d) => d.timestamp)
      .sort((a, b) => a.timestamp! - b.timestamp!);

    for (let i = 0; i < timedData.length - 1; i++) {
      for (let j = i + 1; j < timedData.length; j++) {
        const timeDiff = timedData[j].timestamp! - timedData[i].timestamp!;
        if (timeDiff > timeWindow) break;

        const strength = Math.max(0, 1 - timeDiff / timeWindow);
        if (strength > 0.3) {
          correlations.push({
            id: `temporal_${timedData[i].id}_${timedData[j].id}`,
            sourceId: timedData[i].id,
            targetId: timedData[j].id,
            type: "temporal",
            strength,
            confidence: 0.7,
            description: `Events occurred within ${Math.round(timeDiff / 1000)} seconds`,
            evidence: [`Time difference: ${timeDiff}ms`],
            metadata: { timeDiff },
          });
        }
      }
    }

    return correlations;
  }

  private static findFunctionalCorrelations(data: DataPoint[]): Correlation[] {
    const correlations: Correlation[] = [];

    const addressGroups = new Map<string, DataPoint[]>();
    data.forEach((point) => {
      const addresses = this.extractAddresses(point);
      addresses.forEach((address) => {
        if (!addressGroups.has(address)) {
          addressGroups.set(address, []);
        }
        addressGroups.get(address)!.push(point);
      });
    });

    addressGroups.forEach((points, address) => {
      if (points.length > 1) {
        for (let i = 0; i < points.length - 1; i++) {
          for (let j = i + 1; j < points.length; j++) {
            correlations.push({
              id: `functional_${points[i].id}_${points[j].id}`,
              sourceId: points[i].id,
              targetId: points[j].id,
              type: "functional",
              strength: 0.8,
              confidence: 0.9,
              description: `Both involve address ${address.slice(0, 10)}...`,
              evidence: [`Shared address: ${address}`],
              metadata: { sharedAddress: address },
            });
          }
        }
      }
    });

    return correlations;
  }

  private static findStatisticalCorrelations(data: DataPoint[]): Correlation[] {
    const correlations: Correlation[] = [];

    const numericData = data.filter((d) => typeof d.value === "number");

    for (let i = 0; i < numericData.length - 1; i++) {
      for (let j = i + 1; j < numericData.length; j++) {
        const ratio =
          Math.min(numericData[i].value, numericData[j].value) /
          Math.max(numericData[i].value, numericData[j].value);

        if (ratio > 0.8) {
          correlations.push({
            id: `statistical_${numericData[i].id}_${numericData[j].id}`,
            sourceId: numericData[i].id,
            targetId: numericData[j].id,
            type: "statistical",
            strength: ratio,
            confidence: 0.6,
            description: `Similar values: ${numericData[i].value} ≈ ${numericData[j].value}`,
            evidence: [`Value ratio: ${ratio.toFixed(3)}`],
            metadata: { valueRatio: ratio },
          });
        }
      }
    }

    return correlations;
  }

  private static findStructuralCorrelations(data: DataPoint[]): Correlation[] {
    const correlations: Correlation[] = [];

    data.forEach((point) => {
      point.relationships.forEach((relatedId) => {
        const relatedPoint = data.find((d) => d.id === relatedId);
        if (relatedPoint) {
          correlations.push({
            id: `structural_${point.id}_${relatedId}`,
            sourceId: point.id,
            targetId: relatedId,
            type: "structural",
            strength: 0.9,
            confidence: 1.0,
            description: `Direct structural relationship`,
            evidence: ["Explicit relationship defined"],
            metadata: { relationshipType: "direct" },
          });
        }
      });
    });

    return correlations;
  }

  private static extractAddresses(dataPoint: DataPoint): string[] {
    const addresses: string[] = [];

    Object.values(dataPoint.metadata).forEach((value) => {
      if (typeof value === "string" && value.match(/^0x[a-fA-F0-9]{40}$/)) {
        addresses.push(value);
      }
    });

    return addresses;
  }

  static buildCorrelationNetwork(
    data: DataPoint[],
    correlations: Correlation[],
  ) {
    const nodes = data.map((point) => ({
      id: point.id,
      label: point.label,
      type: point.type,
      value: point.value,
      metadata: point.metadata,
    }));

    const edges = correlations.map((corr) => ({
      id: corr.id,
      source: corr.sourceId,
      target: corr.targetId,
      type: corr.type,
      strength: corr.strength,
      confidence: corr.confidence,
      description: corr.description,
    }));

    return { nodes, edges };
  }
}

export const DataCorrelationTools: React.FC<DataCorrelationToolsProps> = ({
  data,
  correlations: initialCorrelations,
  onDataPointSelect,
  onCorrelationSelect,
  onViewSave,
  className,
  showBreadcrumbs = true,
  showCustomViews = true,
}) => {
  const [selectedDataPoint, setSelectedDataPoint] = useState<string | null>(
    null,
  );
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", label: "Overview", type: "root" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<
    "network" | "list" | "timeline" | "matrix"
  >("network");
  const [customViews, setCustomViews] = useState<CustomView[]>([]);
  const [showViewBuilder, setShowViewBuilder] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [expandedCorrelations, setExpandedCorrelations] = useState<Set<string>>(
    new Set(),
  );

  const correlations = useMemo(() => {
    return initialCorrelations.length > 0
      ? initialCorrelations
      : CorrelationAnalysisEngine.findCorrelations(data);
  }, [data, initialCorrelations]);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = filtered.filter(
        (point) =>
          point.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          point.id.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((point) => point.type === filterType);
    }

    return filtered;
  }, [data, searchTerm, filterType]);

  const relatedCorrelations = useMemo(() => {
    if (!selectedDataPoint) return [];

    return correlations.filter(
      (corr) =>
        corr.sourceId === selectedDataPoint ||
        corr.targetId === selectedDataPoint,
    );
  }, [correlations, selectedDataPoint]);

  const handleDataPointSelect = useCallback(
    (dataPoint: DataPoint) => {
      setSelectedDataPoint(dataPoint.id);
      onDataPointSelect?.(dataPoint);

      const newBreadcrumb: BreadcrumbItem = {
        id: dataPoint.id,
        label: dataPoint.label,
        type: dataPoint.type,
      };

      setBreadcrumbs((prev) => [...prev, newBreadcrumb]);
    },
    [onDataPointSelect],
  );

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const breadcrumb = breadcrumbs[index];
      setBreadcrumbs((prev) => prev.slice(0, index + 1));

      if (breadcrumb.id === "root") {
        setSelectedDataPoint(null);
      } else {
        setSelectedDataPoint(breadcrumb.id);
      }
    },
    [breadcrumbs],
  );

  const toggleCorrelationExpansion = useCallback((correlationId: string) => {
    setExpandedCorrelations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(correlationId)) {
        newSet.delete(correlationId);
      } else {
        newSet.add(correlationId);
      }
      return newSet;
    });
  }, []);

  const saveCustomView = useCallback(() => {
    if (!newViewName.trim()) return;

    const newView: CustomView = {
      id: `view_${Date.now()}`,
      name: newViewName,
      description: `Custom view with ${filteredData.length} data points`,
      layout: viewMode === "network" ? "network" : "grid",
      filters: [{ type: filterType, search: searchTerm }],
      dataPoints: filteredData.map((d) => d.id),
      correlations: relatedCorrelations.map((c) => c.id),
      createdAt: Date.now(),
    };

    setCustomViews((prev) => [...prev, newView]);
    onViewSave?.(newView);
    setNewViewName("");
    setShowViewBuilder(false);
  }, [
    newViewName,
    filteredData,
    viewMode,
    filterType,
    searchTerm,
    relatedCorrelations,
    onViewSave,
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return BarChart3;
      case "address":
        return Users;
      case "contract":
        return Target;
      case "token":
        return DollarSign;
      case "block":
        return Layers;
      case "security_flag":
        return Shield;
      default:
        return Target;
    }
  };

  const getCorrelationColor = (type: string) => {
    switch (type) {
      case "causal":
        return "text-red-600";
      case "temporal":
        return "text-blue-600";
      case "functional":
        return "text-green-600";
      case "structural":
        return "text-purple-600";
      case "statistical":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const renderNetworkView = () => (
    <div className="space-y-4">
      <div className="h-96 border rounded-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Interactive Network Visualization</p>
          <p className="text-xs">
            {filteredData.length} nodes, {correlations.length} connections
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">
            <Target className="h-3 w-3 mr-1" />
            Center View
          </Button>
          <Button size="sm" variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            Auto Layout
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Click nodes to explore relationships
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="space-y-3">
      {filteredData.map((dataPoint) => {
        const TypeIcon = getTypeIcon(dataPoint.type);
        const pointCorrelations = correlations.filter(
          (c) => c.sourceId === dataPoint.id || c.targetId === dataPoint.id,
        );

        return (
          <div
            key={dataPoint.id}
            className={cn(
              "p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
              selectedDataPoint === dataPoint.id &&
                "border-primary bg-primary/5",
            )}
            onClick={() => handleDataPointSelect(dataPoint)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="p-2 rounded-full bg-muted">
                  <TypeIcon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium truncate">
                      {dataPoint.label}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {dataPoint.type}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2">
                    ID: {dataPoint.id}
                  </div>

                  {dataPoint.timestamp && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(dataPoint.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {pointCorrelations.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {pointCorrelations.length} connections
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTimelineView = () => (
    <div className="space-y-4">
      <div className="h-96 border rounded-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Timeline Visualization</p>
          <p className="text-xs">
            Chronological view of{" "}
            {filteredData.filter((d) => d.timestamp).length} timed events
          </p>
        </div>
      </div>
    </div>
  );

  const renderMatrixView = () => (
    <div className="space-y-4">
      <div className="h-96 border rounded-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Correlation Matrix</p>
          <p className="text-xs">Heatmap showing correlation strengths</p>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Data Correlation Tools</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Explore relationships and patterns across {data.length} data points
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowViewBuilder(!showViewBuilder)}
          >
            <Settings className="h-3 w-3 mr-1" />
            Custom View
          </Button>
          <Button size="sm" variant="outline">
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {showBreadcrumbs && breadcrumbs.length > 1 && (
        <div className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.id}>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={cn(
                  "hover:text-primary transition-colors",
                  index === breadcrumbs.length - 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {breadcrumb.id === "root" ? (
                  <Home className="h-4 w-4" />
                ) : (
                  breadcrumb.label
                )}
              </button>
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search data points..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="all">All Types</option>
            <option value="transaction">Transactions</option>
            <option value="address">Addresses</option>
            <option value="contract">Contracts</option>
            <option value="token">Tokens</option>
            <option value="block">Blocks</option>
            <option value="security_flag">Security Flags</option>
          </select>
        </div>

        <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
          {[
            { id: "network", label: "Network", icon: Network },
            { id: "list", label: "List", icon: BarChart3 },
            { id: "timeline", label: "Timeline", icon: Clock },
            { id: "matrix", label: "Matrix", icon: Target },
          ].map((mode) => {
            const ModeIcon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={cn(
                  "flex items-center space-x-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewMode === mode.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ModeIcon className="h-4 w-4" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showViewBuilder && (
        <Card className="p-4 bg-muted/50">
          <h4 className="text-sm font-medium mb-3">Create Custom View</h4>
          <div className="flex items-center space-x-3">
            <Input
              placeholder="View name"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={saveCustomView}
              disabled={!newViewName.trim()}
            >
              Save View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowViewBuilder(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {viewMode === "network" && renderNetworkView()}
          {viewMode === "list" && renderListView()}
          {viewMode === "timeline" && renderTimelineView()}
          {viewMode === "matrix" && renderMatrixView()}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Statistics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Data Points:</span>
                <span className="font-medium">{filteredData.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Correlations:</span>
                <span className="font-medium">{correlations.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Strong Correlations:</span>
                <span className="font-medium">
                  {correlations.filter((c) => c.strength > 0.7).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>High Confidence:</span>
                <span className="font-medium">
                  {correlations.filter((c) => c.confidence > 0.8).length}
                </span>
              </div>
            </div>
          </Card>

          {selectedDataPoint && relatedCorrelations.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-3">
                Related Correlations ({relatedCorrelations.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {relatedCorrelations.map((correlation) => {
                  const isExpanded = expandedCorrelations.has(correlation.id);
                  const otherPointId =
                    correlation.sourceId === selectedDataPoint
                      ? correlation.targetId
                      : correlation.sourceId;
                  const otherPoint = data.find((d) => d.id === otherPointId);

                  return (
                    <div
                      key={correlation.id}
                      className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCorrelationExpansion(correlation.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              getCorrelationColor(correlation.type),
                            )}
                          />
                          <span className="text-sm truncate">
                            {otherPoint?.label || otherPointId}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {(correlation.strength * 100).toFixed(0)}%
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="text-xs">
                            <div className="font-medium mb-1">
                              Type: {correlation.type}
                            </div>
                            <div className="text-muted-foreground mb-2">
                              {correlation.description}
                            </div>
                            <div className="space-y-1">
                              <div>
                                Strength:{" "}
                                {(correlation.strength * 100).toFixed(1)}%
                              </div>
                              <div>
                                Confidence:{" "}
                                {(correlation.confidence * 100).toFixed(1)}%
                              </div>
                            </div>
                            {correlation.evidence.length > 0 && (
                              <div className="mt-2">
                                <div className="font-medium mb-1">
                                  Evidence:
                                </div>
                                <ul className="list-disc list-inside space-y-1">
                                  {correlation.evidence.map(
                                    (evidence, index) => (
                                      <li
                                        key={index}
                                        className="text-muted-foreground"
                                      >
                                        {evidence}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {showCustomViews && customViews.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-3">
                Custom Views ({customViews.length})
              </h4>
              <div className="space-y-2">
                {customViews.map((view) => (
                  <div
                    key={view.id}
                    className="p-2 border rounded cursor-pointer hover:bg-muted/50"
                  >
                    <div className="text-sm font-medium">{view.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {view.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(view.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Card>
  );
};
