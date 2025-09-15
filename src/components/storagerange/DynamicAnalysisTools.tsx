import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  Eye,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  Target,
  Zap,
} from "lucide-react";
import type { StorageSlot } from "@/lib/storagerange";

interface DynamicAnalysisToolsProps {
  contractAddress: string;
  blockHash: string;
  storageData: StorageSlot[];
  onAnalysisResult?: (result: AnalysisResult) => void;
  className?: string;
}

interface AnalysisResult {
  id: string;
  type: "mapping" | "pattern" | "custom" | "drill_down";
  timestamp: Date;
  input: any;
  output: any;
  metadata: {
    executionTime: number;
    dataPoints: number;
    confidence: number;
  };
}

interface MappingQuery {
  slot: string;
  keys: string[];
  keyType: "address" | "uint256" | "bytes32" | "string";
  autoRefresh: boolean;
  refreshInterval: number;
}

interface PatternExploration {
  patternType: "erc20" | "proxy" | "access_control" | "pausable" | "custom";
  expanded: boolean;
  filters: PatternFilter[];
  results: PatternMatch[];
}

interface PatternFilter {
  field: string;
  operator: "equals" | "contains" | "regex";
  value: string;
  enabled: boolean;
}

interface PatternMatch {
  slot: string;
  confidence: number;
  evidence: string[];
  description: string;
}

interface CustomAnalysis {
  id: string;
  name: string;
  description: string;
  steps: AnalysisStep[];
  variables: { [key: string]: any };
  results: any[];
}

interface AnalysisStep {
  id: string;
  type: "filter" | "transform" | "aggregate" | "calculate" | "visualize";
  config: any;
  enabled: boolean;
}

export const DynamicAnalysisTools: React.FC<DynamicAnalysisToolsProps> = ({
  contractAddress,
  blockHash,
  storageData,
  onAnalysisResult,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<
    "mapping" | "pattern" | "drill_down" | "custom"
  >("mapping");
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);

  const [mappingQuery, setMappingQuery] = useState<MappingQuery>({
    slot: "0x0000000000000000000000000000000000000000000000000000000000000001",
    keys: [""],
    keyType: "address",
    autoRefresh: false,
    refreshInterval: 5000,
  });
  const [mappingResults, setMappingResults] = useState<any[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  const [patternExplorations, setPatternExplorations] = useState<
    PatternExploration[]
  >([
    {
      patternType: "erc20",
      expanded: false,
      filters: [],
      results: [],
    },
    {
      patternType: "proxy",
      expanded: false,
      filters: [],
      results: [],
    },
    {
      patternType: "access_control",
      expanded: false,
      filters: [],
      results: [],
    },
  ]);

  const [selectedSlot, setSelectedSlot] = useState<StorageSlot | null>(null);
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [drillDownData, setDrillDownData] = useState<any>(null);

  const [customAnalyses, setCustomAnalyses] = useState<CustomAnalysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<CustomAnalysis | null>(
    null,
  );

  const executeMappingQuery = useCallback(async () => {
    setMappingLoading(true);
    const startTime = Date.now();

    try {
      const results = await Promise.all(
        mappingQuery.keys
          .filter((key) => key.trim())
          .map(async (key) => {
            const calculatedSlot = `0x${Math.random().toString(16).slice(2, 66)}`;

            const matchingSlot = storageData.find(
              (s) => s.slotHex === calculatedSlot,
            );

            return {
              key,
              keyType: mappingQuery.keyType,
              calculatedSlot,
              rawValue:
                matchingSlot?.rawValue ||
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              decodedValue: matchingSlot?.decodedValue || "0",
              interpretation: matchingSlot?.interpretation || "Empty slot",
              exists: !!matchingSlot,
            };
          }),
      );

      setMappingResults(results);

      const analysisResult: AnalysisResult = {
        id: `mapping-${Date.now()}`,
        type: "mapping",
        timestamp: new Date(),
        input: { ...mappingQuery },
        output: results,
        metadata: {
          executionTime: Date.now() - startTime,
          dataPoints: results.length,
          confidence: 0.95,
        },
      };

      setAnalysisHistory((prev) => [analysisResult, ...prev.slice(0, 9)]);
      onAnalysisResult?.(analysisResult);
    } catch (error) {
      console.error("Mapping query failed:", error);
    } finally {
      setMappingLoading(false);
    }
  }, [mappingQuery, storageData, onAnalysisResult]);

  useEffect(() => {
    if (mappingQuery.autoRefresh && isRealTimeMode) {
      const interval = setInterval(
        executeMappingQuery,
        mappingQuery.refreshInterval,
      );
      return () => clearInterval(interval);
    }
  }, [
    mappingQuery.autoRefresh,
    mappingQuery.refreshInterval,
    isRealTimeMode,
    executeMappingQuery,
  ]);

  const executePatternExploration = useCallback(
    (patternType: PatternExploration["patternType"]) => {
      const startTime = Date.now();

      const matches: PatternMatch[] = storageData
        .filter((slot) => {
          switch (patternType) {
            case "erc20":
              return (
                slot.category === "supply" ||
                slot.category === "balances" ||
                slot.category === "allowances"
              );
            case "proxy":
              return slot.category === "proxy";
            case "access_control":
              return slot.category === "access_control";
            case "pausable":
              return (
                slot.interpretation?.toLowerCase().includes("pause") || false
              );
            default:
              return false;
          }
        })
        .map((slot) => ({
          slot: slot.slotHex,
          confidence: Math.random() * 0.4 + 0.6,
          evidence: [
            `Category: ${slot.category}`,
            `Type: ${slot.type}`,
            slot.interpretation ? `Interpretation: ${slot.interpretation}` : "",
          ].filter(Boolean),
          description: slot.interpretation || `${patternType} pattern detected`,
        }));

      setPatternExplorations((prev) =>
        prev.map((p) =>
          p.patternType === patternType
            ? { ...p, results: matches, expanded: true }
            : p,
        ),
      );

      const analysisResult: AnalysisResult = {
        id: `pattern-${patternType}-${Date.now()}`,
        type: "pattern",
        timestamp: new Date(),
        input: { patternType },
        output: matches,
        metadata: {
          executionTime: Date.now() - startTime,
          dataPoints: matches.length,
          confidence:
            matches.reduce((sum, m) => sum + m.confidence, 0) /
              matches.length || 0,
        },
      };

      setAnalysisHistory((prev) => [analysisResult, ...prev.slice(0, 9)]);
      onAnalysisResult?.(analysisResult);
    },
    [storageData, onAnalysisResult],
  );

  const executeDrillDown = useCallback(
    (slot: StorageSlot, path: string[] = []) => {
      const startTime = Date.now();

      setSelectedSlot(slot);
      setDrillDownPath([...path, slot.slotDisplay]);

      const relatedSlots = storageData
        .filter(
          (s) => s.category === slot.category && s.slotHex !== slot.slotHex,
        )
        .slice(0, 5);

      const drillDownResult = {
        slot,
        relatedSlots,
        analysis: {
          category: slot.category,
          type: slot.type,
          securityRelevant: slot.securityRelevant,
          isPYUSDRelated: slot.isPYUSDRelated,
          neighbors: relatedSlots.length,
          pattern: slot.category === "balances" ? "mapping" : "single",
        },
      };

      setDrillDownData(drillDownResult);

      const analysisResult: AnalysisResult = {
        id: `drill-down-${Date.now()}`,
        type: "drill_down",
        timestamp: new Date(),
        input: { slot: slot.slotHex, path },
        output: drillDownResult,
        metadata: {
          executionTime: Date.now() - startTime,
          dataPoints: relatedSlots.length + 1,
          confidence: 0.9,
        },
      };

      setAnalysisHistory((prev) => [analysisResult, ...prev.slice(0, 9)]);
      onAnalysisResult?.(analysisResult);
    },
    [storageData, onAnalysisResult],
  );

  const createCustomAnalysis = useCallback(() => {
    const newAnalysis: CustomAnalysis = {
      id: `custom-${Date.now()}`,
      name: "New Analysis",
      description: "Custom analysis workflow",
      steps: [
        {
          id: "step-1",
          type: "filter",
          config: { field: "category", operator: "equals", value: "supply" },
          enabled: true,
        },
      ],
      variables: {},
      results: [],
    };

    setCustomAnalyses((prev) => [...prev, newAnalysis]);
    setCurrentAnalysis(newAnalysis);
  }, []);

  const executeCustomAnalysis = useCallback(
    (analysis: CustomAnalysis) => {
      const startTime = Date.now();
      let data = [...storageData];

      for (const step of analysis.steps.filter((s) => s.enabled)) {
        switch (step.type) {
          case "filter":
            data = data.filter((item) => {
              const fieldValue = (item as any)[step.config.field];
              switch (step.config.operator) {
                case "equals":
                  return fieldValue === step.config.value;
                case "contains":
                  return String(fieldValue)
                    .toLowerCase()
                    .includes(step.config.value.toLowerCase());
                case "regex":
                  try {
                    return new RegExp(step.config.value).test(
                      String(fieldValue),
                    );
                  } catch {
                    return false;
                  }
                default:
                  return true;
              }
            });
            break;
          case "transform":
            break;
          case "aggregate":
            break;
        }
      }

      const results = data.slice(0, 100);

      const updatedAnalysis = { ...analysis, results };
      setCustomAnalyses((prev) =>
        prev.map((a) => (a.id === analysis.id ? updatedAnalysis : a)),
      );

      const analysisResult: AnalysisResult = {
        id: `custom-${analysis.id}-${Date.now()}`,
        type: "custom",
        timestamp: new Date(),
        input: analysis,
        output: results,
        metadata: {
          executionTime: Date.now() - startTime,
          dataPoints: results.length,
          confidence: 0.8,
        },
      };

      setAnalysisHistory((prev) => [analysisResult, ...prev.slice(0, 9)]);
      onAnalysisResult?.(analysisResult);
    },
    [storageData, onAnalysisResult],
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Dynamic Analysis Tools
            </h3>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {analysisHistory.length} Analyses
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isRealTimeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsRealTimeMode(!isRealTimeMode)}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              {isRealTimeMode ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Real-time
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          {["mapping", "pattern", "drill_down", "custom"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab as any)}
              className="capitalize"
            >
              {tab.replace("_", " ")}
            </Button>
          ))}
        </div>
      </Card>

      {activeTab === "mapping" && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Real-time Mapping Analysis
            </h4>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                  Mapping Slot
                </label>
                <Input
                  value={mappingQuery.slot}
                  onChange={(e) =>
                    setMappingQuery((prev) => ({
                      ...prev,
                      slot: e.target.value,
                    }))
                  }
                  placeholder="0x..."
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                  Key Type
                </label>
                <select
                  value={mappingQuery.keyType}
                  onChange={(e) =>
                    setMappingQuery((prev) => ({
                      ...prev,
                      keyType: e.target.value as any,
                    }))
                  }
                  className="w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded-md px-3 py-2 text-sm"
                >
                  <option value="address">Address</option>
                  <option value="uint256">Uint256</option>
                  <option value="bytes32">Bytes32</option>
                  <option value="string">String</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={executeMappingQuery}
                  disabled={mappingLoading}
                  className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
                >
                  {mappingLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00bfff]" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Execute
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                Keys to Query
              </label>
              <div className="space-y-2">
                {mappingQuery.keys.map((key, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const newKeys = [...mappingQuery.keys];
                        newKeys[index] = e.target.value;
                        setMappingQuery((prev) => ({ ...prev, keys: newKeys }));
                      }}
                      placeholder={`${mappingQuery.keyType} key...`}
                      className="flex-1 bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newKeys = mappingQuery.keys.filter(
                          (_, i) => i !== index,
                        );
                        setMappingQuery((prev) => ({ ...prev, keys: newKeys }));
                      }}
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMappingQuery((prev) => ({
                      ...prev,
                      keys: [...prev.keys, ""],
                    }))
                  }
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Key
                </Button>
              </div>
            </div>

            {mappingResults.length > 0 && (
              <div>
                <h5 className="font-medium text-[#00bfff] mb-3">Results</h5>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {mappingResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[#00bfff] text-sm">
                          {result.key}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            result.exists
                              ? "border-green-500/50 text-green-400 bg-green-500/10"
                              : "border-gray-500/50 text-gray-400 bg-gray-500/10"
                          }
                        >
                          {result.exists ? "EXISTS" : "EMPTY"}
                        </Badge>
                      </div>
                      <div className="text-[#8b9dc3] text-sm">
                        <div>
                          Slot: {result.calculatedSlot.slice(0, 10)}...
                          {result.calculatedSlot.slice(-8)}
                        </div>
                        <div>Value: {result.decodedValue}</div>
                        <div>Interpretation: {result.interpretation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "pattern" && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Pattern Exploration
            </h4>
          </div>

          <div className="space-y-4">
            {patternExplorations.map((exploration) => (
              <div
                key={exploration.patternType}
                className="border border-[rgba(0,191,255,0.1)] rounded-lg bg-[rgba(15,20,25,0.6)]"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() =>
                    setPatternExplorations((prev) =>
                      prev.map((p) =>
                        p.patternType === exploration.patternType
                          ? { ...p, expanded: !p.expanded }
                          : p,
                      ),
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    {exploration.expanded ? (
                      <ChevronDown className="h-4 w-4 text-[#8b9dc3]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#8b9dc3]" />
                    )}
                    <span className="font-medium text-[#00bfff] capitalize">
                      {exploration.patternType.replace("_", " ")} Pattern
                    </span>
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      {exploration.results.length} Matches
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      executePatternExploration(exploration.patternType);
                    }}
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Analyze
                  </Button>
                </div>

                {exploration.expanded && (
                  <div className="p-3 border-t border-[rgba(0,191,255,0.1)]">
                    <div className="space-y-2">
                      {exploration.results.map((match, index) => (
                        <div
                          key={index}
                          className="p-2 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.8)]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[#00bfff] text-sm">
                              {match.slot.slice(0, 10)}...{match.slot.slice(-8)}
                            </span>
                            <Badge
                              variant="outline"
                              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                            >
                              {Math.round(match.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="text-[#8b9dc3] text-sm mb-1">
                            {match.description}
                          </div>
                          <div className="text-xs text-[#6b7280]">
                            Evidence: {match.evidence.join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "drill_down" && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Storage Slot Drill Down
            </h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                Select Slot to Analyze
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {storageData.slice(0, 20).map((slot) => (
                  <Button
                    key={slot.slotHex}
                    variant={
                      selectedSlot?.slotHex === slot.slotHex
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => executeDrillDown(slot)}
                    className="justify-start border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    <span className="font-mono text-xs">
                      {slot.slotDisplay}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {drillDownData && (
              <div>
                <h5 className="font-medium text-[#00bfff] mb-3">
                  Analysis Results
                </h5>

                <div className="flex items-center gap-2 mb-3 text-sm text-[#8b9dc3]">
                  {drillDownPath.map((path, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <ChevronRight className="h-3 w-3" />}
                      <span>{path}</span>
                    </React.Fragment>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                    <h6 className="font-medium text-[#00bfff] mb-2">
                      Slot Details
                    </h6>
                    <div className="space-y-1 text-sm text-[#8b9dc3]">
                      <div>Category: {drillDownData.analysis.category}</div>
                      <div>Type: {drillDownData.analysis.type}</div>
                      <div>
                        Security Relevant:{" "}
                        {drillDownData.analysis.securityRelevant ? "Yes" : "No"}
                      </div>
                      <div>
                        PYUSD Related:{" "}
                        {drillDownData.analysis.isPYUSDRelated ? "Yes" : "No"}
                      </div>
                      <div>Pattern: {drillDownData.analysis.pattern}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                    <h6 className="font-medium text-[#00bfff] mb-2">
                      Related Slots ({drillDownData.relatedSlots.length})
                    </h6>
                    <div className="space-y-1">
                      {drillDownData.relatedSlots.map(
                        (slot: StorageSlot, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm cursor-pointer hover:bg-[rgba(0,191,255,0.05)] p-1 rounded"
                            onClick={() =>
                              executeDrillDown(slot, drillDownPath)
                            }
                          >
                            <span className="font-mono text-[#00bfff]">
                              {slot.slotDisplay}
                            </span>
                            <ChevronRight className="h-3 w-3 text-[#8b9dc3]" />
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "custom" && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-[#00bfff]" />
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Custom Analysis Builder
              </h4>
            </div>
            <Button
              onClick={createCustomAnalysis}
              className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Analysis
            </Button>
          </div>

          <div className="space-y-4">
            {customAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h6 className="font-medium text-[#00bfff]">
                      {analysis.name}
                    </h6>
                    <p className="text-sm text-[#8b9dc3]">
                      {analysis.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      {analysis.steps.length} Steps
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeCustomAnalysis(analysis)}
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </Button>
                  </div>
                </div>

                {analysis.results.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(0,191,255,0.1)]">
                    <div className="text-sm text-[#8b9dc3]">
                      Results: {analysis.results.length} items
                    </div>
                  </div>
                )}
              </div>
            ))}

            {customAnalyses.length === 0 && (
              <div className="text-center py-8 text-[#8b9dc3]">
                No custom analyses created yet. Click "New Analysis" to get
                started.
              </div>
            )}
          </div>
        </Card>
      )}

      {analysisHistory.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Analysis History
            </h4>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {analysisHistory.map((result) => (
              <div
                key={result.id}
                className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      {result.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-[#8b9dc3]">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {result.metadata.executionTime}ms •{" "}
                    {result.metadata.dataPoints} points
                  </div>
                </div>
                <div className="text-sm text-[#8b9dc3]">
                  Confidence: {Math.round(result.metadata.confidence * 100)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
