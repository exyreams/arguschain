import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Cpu,
  Database,
  DollarSign,
  Info,
  Lightbulb,
  Settings,
  Target,
  Zap,
} from "lucide-react";
import type { ReplayTracer } from "@/lib/replaytransactions/types";

interface TracerConfigurationPanelProps {
  selectedTracers: ReplayTracer[];
  onTracersChange: (tracers: ReplayTracer[]) => void;
  estimatedTransactionCount?: number;
  currentGasPrice?: number;
  ethPrice?: number;
  className?: string;
  onConfigurationSave?: (config: TracerConfiguration) => void;
}

interface TracerInfo {
  id: ReplayTracer;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  costMultiplier: number;
  dataSize: "small" | "medium" | "large" | "xlarge";
  processingTime: "fast" | "medium" | "slow" | "very_slow";
  useCase: string;
  pros: string[];
  cons: string[];
  requiredFor: string[];
  incompatibleWith?: ReplayTracer[];
  recommendedWith?: ReplayTracer[];
}

interface TracerConfiguration {
  tracers: ReplayTracer[];
  costEstimate: CostEstimate;
  optimizationLevel: "minimal" | "balanced" | "comprehensive" | "maximum";
  customSettings: {
    enableCaching: boolean;
    batchSize: number;
    timeoutMs: number;
    retryAttempts: number;
  };
}

interface CostEstimate {
  totalCostUSD: number;
  totalCostETH: number;
  gasEstimate: number;
  timeEstimate: number;
  rpcCalls: number;
  dataSize: number;
  breakdown: Array<{
    tracer: ReplayTracer;
    costUSD: number;
    gasUsed: number;
    percentage: number;
  }>;
}

const TRACER_INFO: TracerInfo[] = [
  {
    id: "trace",
    name: "Call Trace",
    description:
      "Captures internal calls, value transfers, and contract interactions",
    icon: Activity,
    costMultiplier: 10,
    dataSize: "medium",
    processingTime: "medium",
    useCase: "Function call analysis, contract interaction mapping",
    pros: [
      "Detailed call hierarchy",
      "Value transfer tracking",
      "Gas usage per call",
      "Error location identification",
    ],
    cons: [
      "Moderate cost increase",
      "Limited opcode details",
      "No memory/storage state",
    ],
    requiredFor: ["Function analysis", "Contract interactions", "Value flows"],
    recommendedWith: ["stateDiff"],
  },
  {
    id: "stateDiff",
    name: "State Diff",
    description:
      "Tracks all storage changes, balance updates, and nonce modifications",
    icon: Database,
    costMultiplier: 20,
    dataSize: "large",
    processingTime: "slow",
    useCase: "Storage analysis, balance tracking, state change monitoring",
    pros: [
      "Complete state changes",
      "Balance modifications",
      "Storage slot analysis",
      "Nonce tracking",
    ],
    cons: ["High cost impact", "Large data size", "Slower processing"],
    requiredFor: ["PYUSD analysis", "Balance tracking", "Storage monitoring"],
    recommendedWith: ["trace"],
  },
  {
    id: "vmTrace",
    name: "VM Trace",
    description:
      "Opcode-level execution trace with memory, stack, and storage details",
    icon: Cpu,
    costMultiplier: 50,
    dataSize: "xlarge",
    processingTime: "very_slow",
    useCase: "Deep debugging, gas optimization, opcode analysis",
    pros: [
      "Opcode-level details",
      "Memory state tracking",
      "Stack operations",
      "Precise gas costs",
    ],
    cons: [
      "Very high cost",
      "Extremely large data",
      "Very slow processing",
      "Complex analysis required",
    ],
    requiredFor: ["Gas optimization", "Deep debugging", "Opcode analysis"],
    incompatibleWith: [],
  },
];

const OPTIMIZATION_PRESETS = {
  minimal: {
    name: "Minimal Cost",
    description: "Basic analysis with lowest cost",
    tracers: ["trace"] as ReplayTracer[],
    icon: DollarSign,
    color: "text-green-500",
  },
  balanced: {
    name: "Balanced Analysis",
    description: "Good balance of insights and cost",
    tracers: ["trace", "stateDiff"] as ReplayTracer[],
    icon: Target,
    color: "text-blue-500",
  },
  comprehensive: {
    name: "Comprehensive",
    description: "Detailed analysis for thorough investigation",
    tracers: ["trace", "stateDiff"] as ReplayTracer[],
    icon: BarChart3,
    color: "text-purple-500",
  },
  maximum: {
    name: "Maximum Detail",
    description: "Complete analysis with all available data",
    tracers: ["trace", "stateDiff", "vmTrace"] as ReplayTracer[],
    icon: Zap,
    color: "text-orange-500",
  },
};

export const TracerConfigurationPanel: React.FC<
  TracerConfigurationPanelProps
> = ({
  selectedTracers,
  onTracersChange,
  estimatedTransactionCount = 1,
  currentGasPrice = 20,
  ethPrice = 2000,
  className,
  onConfigurationSave,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<
    keyof typeof OPTIMIZATION_PRESETS | null
  >(null);
  const [customSettings, setCustomSettings] = useState({
    enableCaching: true,
    batchSize: 10,
    timeoutMs: 30000,
    retryAttempts: 3,
  });

  const costEstimate = useMemo((): CostEstimate => {
    const baseCost = 0.001;
    let totalMultiplier = 1;
    const breakdown: CostEstimate["breakdown"] = [];

    selectedTracers.forEach((tracerId) => {
      const tracerInfo = TRACER_INFO.find((t) => t.id === tracerId);
      if (tracerInfo) {
        const tracerCost =
          baseCost * tracerInfo.costMultiplier * estimatedTransactionCount;
        totalMultiplier += tracerInfo.costMultiplier;

        breakdown.push({
          tracer: tracerId,
          costUSD: tracerCost,
          gasUsed: tracerInfo.costMultiplier * 1000,
          percentage: (tracerInfo.costMultiplier / totalMultiplier) * 100,
        });
      }
    });

    const totalCostUSD = baseCost * totalMultiplier * estimatedTransactionCount;
    const totalCostETH = totalCostUSD / ethPrice;
    const gasEstimate = totalMultiplier * 1000 * estimatedTransactionCount;
    const timeEstimate = Math.max(
      5,
      totalMultiplier * 2 * estimatedTransactionCount,
    );
    const rpcCalls = selectedTracers.length * estimatedTransactionCount;
    const dataSize = selectedTracers.reduce((size, tracerId) => {
      const tracerInfo = TRACER_INFO.find((t) => t.id === tracerId);
      const sizeMap = { small: 0.1, medium: 0.5, large: 2, xlarge: 10 };
      return (
        size +
        sizeMap[tracerInfo?.dataSize || "small"] * estimatedTransactionCount
      );
    }, 0);

    return {
      totalCostUSD,
      totalCostETH,
      gasEstimate,
      timeEstimate,
      rpcCalls,
      dataSize,
      breakdown,
    };
  }, [selectedTracers, estimatedTransactionCount, ethPrice]);

  const handleTracerToggle = useCallback(
    (tracerId: ReplayTracer) => {
      const newTracers = selectedTracers.includes(tracerId)
        ? selectedTracers.filter((t) => t !== tracerId)
        : [...selectedTracers, tracerId];

      onTracersChange(newTracers);
      setSelectedPreset(null);
    },
    [selectedTracers, onTracersChange],
  );

  const handlePresetSelect = useCallback(
    (presetKey: keyof typeof OPTIMIZATION_PRESETS) => {
      const preset = OPTIMIZATION_PRESETS[presetKey];
      onTracersChange(preset.tracers);
      setSelectedPreset(presetKey);
    },
    [onTracersChange],
  );

  const recommendations = useMemo(() => {
    const recs: Array<{
      type: "warning" | "info" | "success";
      message: string;
    }> = [];

    if (selectedTracers.length === 0) {
      recs.push({
        type: "warning",
        message: "No tracers selected. You won't get any analysis data.",
      });
    }

    if (selectedTracers.includes("vmTrace") && estimatedTransactionCount > 1) {
      recs.push({
        type: "warning",
        message:
          "VM Trace is very expensive for multiple transactions. Consider using it only for single transaction analysis.",
      });
    }

    if (
      selectedTracers.includes("stateDiff") &&
      !selectedTracers.includes("trace")
    ) {
      recs.push({
        type: "info",
        message:
          "Adding Call Trace would provide better context for state changes with minimal additional cost.",
      });
    }

    if (costEstimate.totalCostUSD > 10) {
      recs.push({
        type: "warning",
        message: `High cost estimate ($${costEstimate.totalCostUSD.toFixed(2)}). Consider using caching or reducing tracer scope.`,
      });
    }

    if (selectedTracers.length >= 2 && !customSettings.enableCaching) {
      recs.push({
        type: "info",
        message:
          "Enable caching to reduce costs for repeated analysis of the same transactions.",
      });
    }

    return recs;
  }, [
    selectedTracers,
    estimatedTransactionCount,
    costEstimate,
    customSettings,
  ]);

  const handleSaveConfiguration = useCallback(() => {
    const config: TracerConfiguration = {
      tracers: selectedTracers,
      costEstimate,
      optimizationLevel: selectedPreset || "balanced",
      customSettings,
    };

    onConfigurationSave?.(config);
  }, [
    selectedTracers,
    costEstimate,
    selectedPreset,
    customSettings,
    onConfigurationSave,
  ]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Tracer Configuration</h2>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced Settings
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSaveConfiguration}
            disabled={selectedTracers.length === 0}
          >
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quick Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(OPTIMIZATION_PRESETS).map(([key, preset]) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === key;

            return (
              <div
                key={key}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50",
                )}
                onClick={() =>
                  handlePresetSelect(key as keyof typeof OPTIMIZATION_PRESETS)
                }
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className={cn("h-5 w-5", preset.color)} />
                  <h4 className="font-medium">{preset.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {preset.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {preset.tracers.map((tracer) => (
                    <Badge key={tracer} variant="outline" className="text-xs">
                      {tracer}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tracer Selection</h3>
        <div className="space-y-4">
          {TRACER_INFO.map((tracer) => {
            const Icon = tracer.icon;
            const isSelected = selectedTracers.includes(tracer.id);

            return (
              <div
                key={tracer.id}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  isSelected ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTracerToggle(tracer.id)}
                        className="rounded"
                      />
                      <Icon className="h-5 w-5 text-blue-500" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{tracer.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {tracer.costMultiplier}x cost
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {tracer.dataSize} data
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {tracer.processingTime.replace("_", " ")}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {tracer.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-green-600 mb-1">
                            Pros:
                          </p>
                          <ul className="text-xs space-y-1">
                            {tracer.pros.map((pro, index) => (
                              <li
                                key={index}
                                className="flex items-center space-x-1"
                              >
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="font-medium text-orange-600 mb-1">
                            Cons:
                          </p>
                          <ul className="text-xs space-y-1">
                            {tracer.cons.map((con, index) => (
                              <li
                                key={index}
                                className="flex items-center space-x-1"
                              >
                                <AlertTriangle className="h-3 w-3 text-orange-500" />
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="font-medium text-blue-600 mb-1 text-sm">
                          Best for:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tracer.requiredFor.map((useCase, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {useCase}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-green-500" />
          Cost Estimate
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ${costEstimate.totalCostUSD.toFixed(3)}
            </p>
            <p className="text-sm text-muted-foreground">Total Cost (USD)</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {costEstimate.totalCostETH.toFixed(6)}
            </p>
            <p className="text-sm text-muted-foreground">Total Cost (ETH)</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(costEstimate.timeEstimate)}s
            </p>
            <p className="text-sm text-muted-foreground">Est. Time</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {costEstimate.dataSize.toFixed(1)}MB
            </p>
            <p className="text-sm text-muted-foreground">Data Size</p>
          </div>
        </div>

        {costEstimate.breakdown.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Cost Breakdown</h4>
            <div className="space-y-2">
              {costEstimate.breakdown.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {item.tracer}
                    </Badge>
                    <span>${item.costUSD.toFixed(3)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-12 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Recommendations
          </h3>

          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border-l-4",
                rec.type === "warning" && "border-orange-500 bg-orange-50",
                rec.type === "info" && "border-blue-500 bg-blue-50",
                rec.type === "success" && "border-green-500 bg-green-50",
              )}
            >
              <div className="flex items-start space-x-2">
                {rec.type === "warning" && (
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                )}
                {rec.type === "info" && (
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                )}
                {rec.type === "success" && (
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                )}
                <p className="text-sm">{rec.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdvanced && (
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h3 className="text-lg font-semibold">Advanced Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Performance</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={customSettings.enableCaching}
                    onChange={(e) =>
                      setCustomSettings((prev) => ({
                        ...prev,
                        enableCaching: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Enable Caching</span>
                </label>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={customSettings.batchSize}
                    onChange={(e) =>
                      setCustomSettings((prev) => ({
                        ...prev,
                        batchSize: Number(e.target.value),
                      }))
                    }
                    min={1}
                    max={100}
                    className="w-full text-sm border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Reliability</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={customSettings.timeoutMs}
                    onChange={(e) =>
                      setCustomSettings((prev) => ({
                        ...prev,
                        timeoutMs: Number(e.target.value),
                      }))
                    }
                    min={5000}
                    max={300000}
                    step={5000}
                    className="w-full text-sm border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    value={customSettings.retryAttempts}
                    onChange={(e) =>
                      setCustomSettings((prev) => ({
                        ...prev,
                        retryAttempts: Number(e.target.value),
                      }))
                    }
                    min={0}
                    max={10}
                    className="w-full text-sm border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
