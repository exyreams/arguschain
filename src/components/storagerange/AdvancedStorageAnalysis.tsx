import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Button, Input, Badge } from "@/components/global";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Download,
  Info,
  Pause,
  Play,
  Search,
  TrendingUp,
} from "lucide-react";
import type { ProcessedStorageData } from "@/lib/storagerange/processors/storageProcessor";
import {
  useHistoricalStorage,
  useRecentBlocks,
} from "@/hooks/storagerange/useHistoricalStorage";

interface AdvancedStorageAnalysisProps {
  contractAddress: string;
  processedData: ProcessedStorageData;
  onExport?: (format: "csv" | "json") => void;
}

interface HistoricalTrackingConfig {
  slot: string;
  slotName: string;
  blockCount: number;
  interval: number;
  enabled: boolean;
}

export const AdvancedStorageAnalysis: React.FC<
  AdvancedStorageAnalysisProps
> = ({ contractAddress, processedData, onExport }) => {
  const [activeAdvancedTab, setActiveAdvancedTab] = useState("historical");
  const [trackingConfigs, setTrackingConfigs] = useState<
    HistoricalTrackingConfig[]
  >([
    {
      slot: "0x0000000000000000000000000000000000000000000000000000000000000000",
      slotName: "Total Supply (Slot 0)",
      blockCount: 100,
      interval: 10,
      enabled: true,
    },
    {
      slot: "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb",
      slotName: "Paused State",
      blockCount: 100,
      interval: 10,
      enabled: false,
    },
  ]);

  const [customSlot, setCustomSlot] = useState("");
  const [customSlotName, setCustomSlotName] = useState("");

  const { blockNumbers, isLoading: blocksLoading } = useRecentBlocks(100, 10);

  const historicalQueries = trackingConfigs
    .filter((config) => config.enabled)
    .map((config) => {
      return useHistoricalStorage(
        {
          contractAddress,
          slot: config.slot,
          blockNumbers: blockNumbers.slice(-config.blockCount),
          includeTimestamps: true,
          formatValues: true,
        },
        { enabled: config.enabled && blockNumbers.length > 0 }
      );
    });

  const historicalData = useMemo(() => {
    const enabledConfigs = trackingConfigs.filter((config) => config.enabled);
    const combinedData: any[] = [];

    if (historicalQueries.length > 0 && historicalQueries[0].data) {
      const primaryData = historicalQueries[0].data.dataPoints;

      primaryData.forEach((point, index) => {
        const dataPoint: any = {
          blockNumber: point.blockNumber,
          timestamp: point.timestamp,
          datetime: point.datetime.toISOString(),
        };

        historicalQueries.forEach((query, queryIndex) => {
          if (query.data && query.data.dataPoints[index]) {
            const configName = enabledConfigs[queryIndex].slotName;
            dataPoint[configName] = query.data.dataPoints[index].valueInt;
            dataPoint[`${configName}_formatted`] =
              query.data.dataPoints[index].formattedValue;
          }
        });

        combinedData.push(dataPoint);
      });
    }

    return combinedData;
  }, [historicalQueries, trackingConfigs]);

  const patternEvolution = useMemo(() => {
    const evolution = {
      totalPatterns: processedData.patterns.detailedPatterns.length,
      patternTypes: processedData.patterns.detailedPatterns.map((p) => p.type),
      confidenceDistribution: processedData.patterns.detailedPatterns.reduce(
        (acc, p) => {
          acc[p.confidence] = (acc[p.confidence] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      securityImplications: processedData.securityFlags.length,
    };

    return evolution;
  }, [processedData]);

  const forensicsAnalysis = useMemo(() => {
    const analysis = {
      suspiciousSlots: processedData.slots.filter(
        (slot) =>
          slot.category === "unknown" &&
          slot.value !== "0x0" &&
          !slot.interpretation
      ),
      highValueSlots: processedData.slots.filter((slot) => {
        try {
          const valueInt = parseInt(slot.value, 16);
          return valueInt > 1000000;
        } catch {
          return false;
        }
      }),
      recentChanges: [],
      anomalies: processedData.slots.filter(
        (slot) =>
          slot.type === "address" &&
          slot.decodedValue &&
          slot.decodedValue.startsWith("0x000000")
      ),
    };

    return analysis;
  }, [processedData]);

  const addCustomSlot = () => {
    if (customSlot && customSlotName) {
      const newConfig: HistoricalTrackingConfig = {
        slot: customSlot.startsWith("0x") ? customSlot : `0x${customSlot}`,
        slotName: customSlotName,
        blockCount: 100,
        interval: 10,
        enabled: true,
      };
      setTrackingConfigs((prev) => [...prev, newConfig]);
      setCustomSlot("");
      setCustomSlotName("");
    }
  };

  const toggleSlotTracking = (index: number) => {
    setTrackingConfigs((prev) =>
      prev.map((config, i) =>
        i === index ? { ...config, enabled: !config.enabled } : config
      )
    );
  };

  const removeSlotTracking = (index: number) => {
    setTrackingConfigs((prev) => prev.filter((_, i) => i !== index));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">Block: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-[#8b9dc3]"
              style={{ color: entry.color }}
            >
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Advanced Storage Analysis
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.("csv")}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <Tabs value={activeAdvancedTab} onValueChange={setActiveAdvancedTab}>
          <TabsList className="grid w-full grid-cols-4 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
            <TabsTrigger
              value="historical"
              className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
            >
              <Clock className="h-4 w-4 mr-1" />
              Historical
            </TabsTrigger>
            <TabsTrigger
              value="patterns"
              className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Patterns
            </TabsTrigger>
            <TabsTrigger
              value="forensics"
              className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
            >
              <Search className="h-4 w-4 mr-1" />
              Forensics
            </TabsTrigger>
            <TabsTrigger
              value="relationships"
              className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
            >
              <Activity className="h-4 w-4 mr-1" />
              Relationships
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historical" className="space-y-6">
            <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
              <h5 className="text-md font-semibold text-[#00bfff] mb-4">
                Historical Tracking Configuration
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Input
                  placeholder="Storage slot (0x...)"
                  value={customSlot}
                  onChange={(e) => setCustomSlot(e.target.value)}
                  className="font-mono"
                />
                <Input
                  placeholder="Slot name/description"
                  value={customSlotName}
                  onChange={(e) => setCustomSlotName(e.target.value)}
                />
                <Button
                  onClick={addCustomSlot}
                  disabled={!customSlot || !customSlotName}
                  className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419]"
                >
                  Add Slot
                </Button>
                <div className="text-sm text-[#8b9dc3] flex items-center">
                  <Info className="h-4 w-4 mr-1" />
                  {blocksLoading
                    ? "Loading blocks..."
                    : `${blockNumbers.length} blocks available`}
                </div>
              </div>

              <div className="space-y-2">
                {trackingConfigs.map((config, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.4)]"
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSlotTracking(index)}
                        className={`${
                          config.enabled
                            ? "border-green-500/50 text-green-400 bg-green-500/10"
                            : "border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                        }`}
                      >
                        {config.enabled ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <div className="text-[#00bfff] font-medium">
                          {config.slotName}
                        </div>
                        <div className="text-xs text-[#8b9dc3] font-mono">
                          {config.slot}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      >
                        {config.blockCount} blocks
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSlotTracking(index)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {historicalData.length > 0 && (
              <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
                <h5 className="text-md font-semibold text-[#00bfff] mb-4">
                  Historical Storage Values
                </h5>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historicalData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0,191,255,0.1)"
                    />
                    <XAxis
                      dataKey="blockNumber"
                      stroke="#8b9dc3"
                      fontSize={12}
                    />
                    <YAxis stroke="#8b9dc3" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    {trackingConfigs
                      .filter((config) => config.enabled)
                      .map((config, index) => (
                        <Line
                          key={config.slot}
                          type="monotone"
                          dataKey={config.slotName}
                          stroke={`hsl(${index * 60}, 70%, 50%)`}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {historicalQueries.length > 0 && historicalQueries[0].data && (
              <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
                <h5 className="text-md font-semibold text-[#00bfff] mb-4">
                  Historical Analysis Summary
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {historicalQueries.map((query, index) => {
                    if (!query.data) return null;
                    const config = trackingConfigs.filter((c) => c.enabled)[
                      index
                    ];
                    const stats = query.data.statistics;

                    return (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.4)]"
                      >
                        <h6 className="text-[#00bfff] font-medium mb-2">
                          {config.slotName}
                        </h6>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#8b9dc3]">Trend:</span>
                            <Badge
                              variant="outline"
                              className={`${
                                stats.trend === "increasing"
                                  ? "border-green-500/50 text-green-400 bg-green-500/10"
                                  : stats.trend === "decreasing"
                                    ? "border-red-500/50 text-red-400 bg-red-500/10"
                                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                              }`}
                            >
                              {stats.trend.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8b9dc3]">Changes:</span>
                            <span className="text-[#00bfff]">
                              {stats.totalChanges}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8b9dc3]">Strength:</span>
                            <span className="text-[#00bfff]">
                              {(stats.trendStrength * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 p-2 rounded bg-[rgba(0,191,255,0.05)] text-xs text-[#8b9dc3]">
                          {query.data.interpretation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
              <h5 className="text-md font-semibold text-[#00bfff] mb-4">
                Pattern Evolution Analysis
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h6 className="text-[#00bfff] font-medium mb-3">
                    Detected Patterns
                  </h6>
                  <div className="space-y-2">
                    {Object.entries(
                      patternEvolution.confidenceDistribution
                    ).map(([confidence, count]) => (
                      <div
                        key={confidence}
                        className="flex items-center justify-between p-2 rounded bg-[rgba(25,28,40,0.4)]"
                      >
                        <span className="text-[#8b9dc3]">
                          {confidence.toUpperCase()} Confidence
                        </span>
                        <Badge
                          variant="outline"
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                        >
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h6 className="text-[#00bfff] font-medium mb-3">
                    Pattern Types
                  </h6>
                  <div className="space-y-2">
                    {Array.from(new Set(patternEvolution.patternTypes)).map(
                      (type) => (
                        <div
                          key={type}
                          className="flex items-center gap-2 p-2 rounded bg-[rgba(25,28,40,0.4)]"
                        >
                          <div className="w-3 h-3 rounded-full bg-[#00bfff]"></div>
                          <span className="text-[#8b9dc3]">
                            {type.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h6 className="text-[#00bfff] font-medium mb-3">
                  Pattern Evolution Timeline
                </h6>
                <div className="text-center py-8 text-[#8b9dc3]">
                  Pattern evolution tracking requires historical data
                  collection.
                  <br />
                  <span className="text-sm">
                    Enable historical tracking to see pattern changes over time.
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="forensics" className="space-y-6">
            <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
              <h5 className="text-md font-semibold text-[#00bfff] mb-4">
                Deep Forensics Analysis
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h6 className="text-[#00bfff] font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Suspicious Slots ({forensicsAnalysis.suspiciousSlots.length}
                    )
                  </h6>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {forensicsAnalysis.suspiciousSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="p-2 rounded bg-[rgba(25,28,40,0.4)] border border-yellow-500/20"
                      >
                        <div className="text-[#00bfff] font-mono text-sm">
                          Slot:{" "}
                          {slot.slotInt !== undefined
                            ? slot.slotInt
                            : slot.slot.slice(0, 10) + "..."}
                        </div>
                        <div className="text-[#8b9dc3] text-xs">
                          Value: {slot.decodedValue}
                        </div>
                      </div>
                    ))}
                    {forensicsAnalysis.suspiciousSlots.length === 0 && (
                      <div className="text-center py-4 text-[#8b9dc3]">
                        No suspicious slots detected
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h6 className="text-[#00bfff] font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    High Value Slots ({forensicsAnalysis.highValueSlots.length})
                  </h6>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {forensicsAnalysis.highValueSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="p-2 rounded bg-[rgba(25,28,40,0.4)] border border-green-500/20"
                      >
                        <div className="text-[#00bfff] font-mono text-sm">
                          Slot:{" "}
                          {slot.slotInt !== undefined
                            ? slot.slotInt
                            : slot.slot.slice(0, 10) + "..."}
                        </div>
                        <div className="text-[#8b9dc3] text-xs">
                          Value: {slot.decodedValue}
                        </div>
                        <div className="text-[#8b9dc3] text-xs">
                          Category: {slot.category?.toUpperCase() || "UNKNOWN"}
                        </div>
                      </div>
                    ))}
                    {forensicsAnalysis.highValueSlots.length === 0 && (
                      <div className="text-center py-4 text-[#8b9dc3]">
                        No high value slots detected
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h6 className="text-[#00bfff] font-medium mb-3">
                  Anomaly Detection
                </h6>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.4)]">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {forensicsAnalysis.anomalies.length}
                    </div>
                    <div className="text-sm text-[#8b9dc3]">
                      Address Anomalies
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.4)]">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {
                        processedData.slots.filter(
                          (s) => s.category === "unknown"
                        ).length
                      }
                    </div>
                    <div className="text-sm text-[#8b9dc3]">Unknown Slots</div>
                  </div>
                  <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.4)]">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {
                        processedData.securityFlags.filter(
                          (f) => f.level === "warning" || f.level === "critical"
                        ).length
                      }
                    </div>
                    <div className="text-sm text-[#8b9dc3]">Security Flags</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="relationships" className="space-y-6">
            <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
              <h5 className="text-md font-semibold text-[#00bfff] mb-4">
                Storage Slot Relationships
              </h5>

              <div className="text-center py-8 text-[#8b9dc3]">
                Storage relationship mapping coming soon...
                <br />
                <span className="text-sm">
                  Visualize connections between storage slots, proxy
                  relationships, and access control hierarchies.
                </span>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
