import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/global";
import {
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Download,
  Eye,
  Hash,
  Layers,
  MemoryStick,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProcessedReplayData } from "@/lib/replaytransactions/types";
import { VISUALIZATION_COLORS } from "@/lib/replaytransactions/constants";

interface VMTraceAnalyzerProps {
  processedData: ProcessedReplayData;
  className?: string;
  onOpcodeSelect?: (opcode: VMTraceStep) => void;
}

interface VMTraceStep {
  pc: number;
  op: string;
  opName: string;
  gas: number;
  gasCost: number;
  depth: number;
  stack: string[];
  memory: string[];
  storage: Record<string, string>;
  error?: string;
  reason?: string;
}

interface OpcodeAnalysis {
  opcode: string;
  count: number;
  totalGas: number;
  averageGas: number;
  percentage: number;
  category:
    | "arithmetic"
    | "comparison"
    | "bitwise"
    | "memory"
    | "storage"
    | "control"
    | "system"
    | "other";
  description: string;
  optimization?: string;
}

interface ExecutionBottleneck {
  type: "gas" | "memory" | "storage" | "computation";
  location: number;
  description: string;
  impact: "low" | "medium" | "high";
  suggestion: string;
  gasWasted: number;
}

export const VMTraceAnalyzer: React.FC<VMTraceAnalyzerProps> = ({
  processedData,
  className,
  onOpcodeSelect,
}) => {
  const [selectedView, setSelectedView] = useState<
    "timeline" | "opcodes" | "memory" | "storage" | "bottlenecks"
  >("timeline");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOpcodes, setSelectedOpcodes] = useState<string[]>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const vmTraceSteps = useMemo((): VMTraceStep[] => {
    const steps: VMTraceStep[] = [];

    const opcodes = [
      "PUSH1",
      "PUSH2",
      "PUSH32",
      "POP",
      "ADD",
      "SUB",
      "MUL",
      "DIV",
      "MOD",
      "LT",
      "GT",
      "EQ",
      "ISZERO",
      "AND",
      "OR",
      "XOR",
      "NOT",
      "BYTE",
      "KECCAK256",
      "ADDRESS",
      "BALANCE",
      "ORIGIN",
      "CALLER",
      "CALLVALUE",
      "CALLDATALOAD",
      "CALLDATASIZE",
      "CALLDATACOPY",
      "CODESIZE",
      "CODECOPY",
      "GASPRICE",
      "EXTCODESIZE",
      "EXTCODECOPY",
      "RETURNDATASIZE",
      "RETURNDATACOPY",
      "BLOCKHASH",
      "COINBASE",
      "TIMESTAMP",
      "NUMBER",
      "DIFFICULTY",
      "GASLIMIT",
      "MLOAD",
      "MSTORE",
      "MSTORE8",
      "SLOAD",
      "SSTORE",
      "JUMP",
      "JUMPI",
      "PC",
      "MSIZE",
      "GAS",
      "JUMPDEST",
      "CREATE",
      "CALL",
      "CALLCODE",
      "RETURN",
      "DELEGATECALL",
      "CREATE2",
      "STATICCALL",
      "REVERT",
      "SELFDESTRUCT",
    ];

    let gasUsed = 0;
    let depth = 0;
    const stack: string[] = [];
    const memory: string[] = [];
    const storage: Record<string, string> = {};

    for (let i = 0; i < 500; i++) {
      const opcode = opcodes[Math.floor(Math.random() * opcodes.length)];
      const gasCost = getOpcodeGasCost(opcode);
      gasUsed += gasCost;

      if (opcode.startsWith("PUSH")) {
        stack.push(`0x${Math.random().toString(16).substr(2, 8)}`);
      } else if (opcode === "POP" && stack.length > 0) {
        stack.pop();
      } else if (
        ["ADD", "SUB", "MUL", "DIV"].includes(opcode) &&
        stack.length >= 2
      ) {
        stack.pop();
        stack.pop();
        stack.push(`0x${Math.random().toString(16).substr(2, 8)}`);
      }

      if (opcode === "MSTORE" && Math.random() < 0.1) {
        memory.push(`0x${Math.random().toString(16).substr(2, 64)}`);
      }

      if (opcode === "SSTORE" && Math.random() < 0.05) {
        const slot = `0x${Math.random().toString(16).substr(2, 8)}`;
        storage[slot] = `0x${Math.random().toString(16).substr(2, 64)}`;
      }

      if (opcode === "CALL" && Math.random() < 0.1) {
        depth++;
      } else if (opcode === "RETURN" && depth > 0 && Math.random() < 0.1) {
        depth--;
      }

      const hasError = Math.random() < 0.02;

      steps.push({
        pc: i,
        op: `0x${getOpcodeHex(opcode)}`,
        opName: opcode,
        gas: 1000000 - gasUsed,
        gasCost,
        depth,
        stack: [...stack],
        memory: [...memory],
        storage: { ...storage },
        error: hasError ? "OUT_OF_GAS" : undefined,
        reason: hasError ? "Insufficient gas for operation" : undefined,
      });
    }

    return steps;
  }, []);

  const opcodeAnalysis = useMemo((): OpcodeAnalysis[] => {
    const opcodeMap = new Map<string, { count: number; totalGas: number }>();
    const totalGas = vmTraceSteps.reduce((sum, step) => sum + step.gasCost, 0);

    vmTraceSteps.forEach((step) => {
      const existing = opcodeMap.get(step.opName) || { count: 0, totalGas: 0 };
      opcodeMap.set(step.opName, {
        count: existing.count + 1,
        totalGas: existing.totalGas + step.gasCost,
      });
    });

    return Array.from(opcodeMap.entries())
      .map(([opcode, data]) => ({
        opcode,
        count: data.count,
        totalGas: data.totalGas,
        averageGas: data.totalGas / data.count,
        percentage: (data.totalGas / totalGas) * 100,
        category: getOpcodeCategory(opcode),
        description: getOpcodeDescription(opcode),
        optimization: getOptimizationSuggestion(opcode, data.count),
      }))
      .sort((a, b) => b.totalGas - a.totalGas);
  }, [vmTraceSteps]);

  const executionBottlenecks = useMemo((): ExecutionBottleneck[] => {
    const bottlenecks: ExecutionBottleneck[] = [];

    vmTraceSteps.forEach((step, index) => {
      if (step.gasCost > 5000) {
        bottlenecks.push({
          type: "gas",
          location: index,
          description: `High gas cost operation: ${step.opName}`,
          impact:
            step.gasCost > 20000
              ? "high"
              : step.gasCost > 10000
                ? "medium"
                : "low",
          suggestion: `Consider optimizing ${step.opName} operation or caching results`,
          gasWasted: step.gasCost - getOptimalGasCost(step.opName),
        });
      }
    });

    const operationCounts = new Map<string, number>();
    vmTraceSteps.forEach((step) => {
      if (["SLOAD", "SSTORE", "KECCAK256", "CALL"].includes(step.opName)) {
        operationCounts.set(
          step.opName,
          (operationCounts.get(step.opName) || 0) + 1,
        );
      }
    });

    operationCounts.forEach((count, opcode) => {
      if (count > 10) {
        bottlenecks.push({
          type: "computation",
          location: -1,
          description: `Repeated expensive operation: ${opcode} (${count} times)`,
          impact: count > 50 ? "high" : count > 25 ? "medium" : "low",
          suggestion: `Consider batching ${opcode} operations or using more efficient alternatives`,
          gasWasted: (count - 1) * getOpcodeGasCost(opcode) * 0.5,
        });
      }
    });

    let maxMemoryUsed = 0;
    vmTraceSteps.forEach((step, index) => {
      const memoryUsed = step.memory.length * 32;
      if (memoryUsed > maxMemoryUsed) {
        maxMemoryUsed = memoryUsed;
        if (memoryUsed > 10000) {
          bottlenecks.push({
            type: "memory",
            location: index,
            description: `High memory usage: ${memoryUsed} bytes`,
            impact:
              memoryUsed > 50000
                ? "high"
                : memoryUsed > 25000
                  ? "medium"
                  : "low",
            suggestion:
              "Consider optimizing memory usage or using more efficient data structures",
            gasWasted: Math.floor(memoryUsed / 1000) * 3,
          });
        }
      }
    });

    return bottlenecks.sort((a, b) => b.gasWasted - a.gasWasted);
  }, [vmTraceSteps]);

  const filteredSteps = useMemo(() => {
    let filtered = vmTraceSteps;

    if (searchTerm) {
      filtered = filtered.filter(
        (step) =>
          step.opName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          step.op.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedOpcodes.length > 0) {
      filtered = filtered.filter((step) =>
        selectedOpcodes.includes(step.opName),
      );
    }

    if (showOnlyErrors) {
      filtered = filtered.filter((step) => step.error);
    }

    return filtered;
  }, [vmTraceSteps, searchTerm, selectedOpcodes, showOnlyErrors]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= filteredSteps.length - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [filteredSteps.length, playbackSpeed]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStepForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, filteredSteps.length - 1));
  }, [filteredSteps.length]);

  const handleStepBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleJumpToStep = useCallback(
    (step: number) => {
      setCurrentStep(Math.max(0, Math.min(step, filteredSteps.length - 1)));
    },
    [filteredSteps.length],
  );

  const handleExport = useCallback(() => {
    const exportData = {
      vmTrace: filteredSteps,
      opcodeAnalysis,
      bottlenecks: executionBottlenecks,
      summary: {
        totalSteps: vmTraceSteps.length,
        totalGasUsed: vmTraceSteps.reduce((sum, step) => sum + step.gasCost, 0),
        errorCount: vmTraceSteps.filter((step) => step.error).length,
        maxDepth: Math.max(...vmTraceSteps.map((step) => step.depth)),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vm-trace-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSteps, opcodeAnalysis, executionBottlenecks, vmTraceSteps]);

  const currentStepData = filteredSteps[currentStep];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Cpu className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">VM Trace Analyzer</h2>
            <p className="text-sm text-muted-foreground">
              {vmTraceSteps.length} execution steps •{" "}
              {vmTraceSteps.filter((s) => s.error).length} errors
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-muted rounded-lg p-1">
            {(
              [
                "timeline",
                "opcodes",
                "memory",
                "storage",
                "bottlenecks",
              ] as const
            ).map((view) => (
              <Button
                key={view}
                variant={selectedView === view ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedView(view)}
                className="capitalize"
              >
                {view === "timeline" && <Clock className="h-4 w-4 mr-1" />}
                {view === "opcodes" && <Hash className="h-4 w-4 mr-1" />}
                {view === "memory" && <MemoryStick className="h-4 w-4 mr-1" />}
                {view === "storage" && <Database className="h-4 w-4 mr-1" />}
                {view === "bottlenecks" && (
                  <AlertTriangle className="h-4 w-4 mr-1" />
                )}
                {view}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStepBack}
                disabled={currentStep === 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={isPlaying ? handlePause : handlePlay}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleStepForward}
                disabled={currentStep === filteredSteps.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm">Step:</span>
              <Input
                type="number"
                value={currentStep}
                onChange={(e) => handleJumpToStep(Number(e.target.value))}
                min={0}
                max={filteredSteps.length - 1}
                className="w-20 text-sm"
              />
              <span className="text-sm text-muted-foreground">
                / {filteredSteps.length - 1}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search opcodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
              />
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Errors Only</span>
            </label>
          </div>
        </div>

        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / filteredSteps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {selectedView === "timeline" && currentStepData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Current Step</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">PC: {currentStepData.pc}</Badge>
                  <Badge variant="outline">
                    Depth: {currentStepData.depth}
                  </Badge>
                  {currentStepData.error && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Operation</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Opcode:</span>
                      <span className="font-mono">
                        {currentStepData.opName}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hex:</span>
                      <span className="font-mono">{currentStepData.op}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gas Cost:</span>
                      <span className="font-medium">
                        {currentStepData.gasCost}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Gas Remaining:
                      </span>
                      <span className="font-medium">
                        {currentStepData.gas.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {getOpcodeDescription(currentStepData.opName)}
                  </p>
                  {currentStepData.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-600 font-medium">
                        {currentStepData.error}
                      </p>
                      {currentStepData.reason && (
                        <p className="text-xs text-red-500 mt-1">
                          {currentStepData.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Stack ({currentStepData.stack.length} items)
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {currentStepData.stack
                  .slice(-10)
                  .reverse()
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-background rounded text-sm"
                    >
                      <span className="text-muted-foreground">
                        #{currentStepData.stack.length - index - 1}
                      </span>
                      <span className="font-mono">{item}</span>
                    </div>
                  ))}
                {currentStepData.stack.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Stack is empty
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MemoryStick className="h-5 w-5 mr-2" />
                Memory ({currentStepData.memory.length} words)
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {currentStepData.memory.slice(-5).map((item, index) => (
                  <div
                    key={index}
                    className="p-2 bg-background rounded text-xs font-mono break-all"
                  >
                    {item}
                  </div>
                ))}
                {currentStepData.memory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No memory allocated
                  </p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Storage ({Object.keys(currentStepData.storage).length} slots)
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(currentStepData.storage)
                  .slice(-3)
                  .map(([slot, value]) => (
                    <div key={slot} className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        Slot: {slot}
                      </div>
                      <div className="p-2 bg-background rounded text-xs font-mono break-all">
                        {value}
                      </div>
                    </div>
                  ))}
                {Object.keys(currentStepData.storage).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No storage changes
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === "opcodes" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">
                Top Opcodes by Gas Usage
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={opcodeAnalysis.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="opcode" />
                  <YAxis />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      name === "totalGas"
                        ? `${value.toLocaleString()} gas`
                        : value,
                      name === "totalGas" ? "Total Gas" : name,
                    ]}
                  />
                  <Bar dataKey="totalGas" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Opcode Categories</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={getCategoryDistribution(opcodeAnalysis)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCategoryDistribution(opcodeAnalysis).map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            VISUALIZATION_COLORS[
                              index % VISUALIZATION_COLORS.length
                            ]
                          }
                        />
                      ),
                    )}
                  </Pie>
                  <RechartsTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Opcode Analysis</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Opcode</th>
                    <th className="text-right py-3 px-4">Count</th>
                    <th className="text-right py-3 px-4">Total Gas</th>
                    <th className="text-right py-3 px-4">Avg Gas</th>
                    <th className="text-right py-3 px-4">% of Total</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Optimization</th>
                  </tr>
                </thead>
                <tbody>
                  {opcodeAnalysis.slice(0, 20).map((opcode, index) => (
                    <tr key={index} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-4 font-mono font-medium">
                        {opcode.opcode}
                      </td>
                      <td className="text-right py-3 px-4">{opcode.count}</td>
                      <td className="text-right py-3 px-4">
                        {opcode.totalGas.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4">
                        {Math.round(opcode.averageGas)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {opcode.percentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {opcode.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {opcode.optimization || "No optimization available"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedView === "bottlenecks" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Gas Bottlenecks</span>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {executionBottlenecks.filter((b) => b.type === "gas").length}
              </p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MemoryStick className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Memory Issues</span>
              </div>
              <p className="text-2xl font-bold text-orange-500">
                {executionBottlenecks.filter((b) => b.type === "memory").length}
              </p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Storage Issues</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">
                {
                  executionBottlenecks.filter((b) => b.type === "storage")
                    .length
                }
              </p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Computation</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">
                {
                  executionBottlenecks.filter((b) => b.type === "computation")
                    .length
                }
              </p>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Execution Bottlenecks
            </h3>
            <div className="space-y-4">
              {executionBottlenecks.slice(0, 10).map((bottleneck, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border-l-4",
                    bottleneck.impact === "high" && "border-red-500 bg-red-50",
                    bottleneck.impact === "medium" &&
                      "border-yellow-500 bg-yellow-50",
                    bottleneck.impact === "low" && "border-blue-500 bg-blue-50",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge
                          variant={
                            bottleneck.impact === "high"
                              ? "destructive"
                              : bottleneck.impact === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {bottleneck.impact} impact
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {bottleneck.type}
                        </Badge>
                        {bottleneck.location >= 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleJumpToStep(bottleneck.location)
                            }
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Step {bottleneck.location}
                          </Button>
                        )}
                      </div>
                      <h4 className="font-medium mb-1">
                        {bottleneck.description}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {bottleneck.suggestion}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>
                          Gas Wasted: {bottleneck.gasWasted.toLocaleString()}
                        </span>
                        <span>
                          Potential Savings: $
                          {(bottleneck.gasWasted * 0.00002).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getOpcodeGasCost(opcode: string): number {
  const gasCosts: Record<string, number> = {
    STOP: 0,
    ADD: 3,
    MUL: 5,
    SUB: 3,
    DIV: 5,
    SDIV: 5,
    MOD: 5,
    SMOD: 5,
    ADDMOD: 8,
    MULMOD: 8,
    EXP: 10,
    SIGNEXTEND: 5,
    LT: 3,
    GT: 3,
    SLT: 3,
    SGT: 3,
    EQ: 3,
    ISZERO: 3,
    AND: 3,
    OR: 3,
    XOR: 3,
    NOT: 3,
    BYTE: 3,
    SHL: 3,
    SHR: 3,
    SAR: 3,
    KECCAK256: 30,
    ADDRESS: 2,
    BALANCE: 700,
    ORIGIN: 2,
    CALLER: 2,
    CALLVALUE: 2,
    CALLDATALOAD: 3,
    CALLDATASIZE: 2,
    CALLDATACOPY: 3,
    CODESIZE: 2,
    CODECOPY: 3,
    GASPRICE: 2,
    EXTCODESIZE: 700,
    EXTCODECOPY: 700,
    RETURNDATASIZE: 2,
    RETURNDATACOPY: 3,
    EXTCODEHASH: 700,
    BLOCKHASH: 20,
    COINBASE: 2,
    TIMESTAMP: 2,
    NUMBER: 2,
    DIFFICULTY: 2,
    GASLIMIT: 2,
    CHAINID: 2,
    SELFBALANCE: 5,
    POP: 2,
    MLOAD: 3,
    MSTORE: 3,
    MSTORE8: 3,
    SLOAD: 800,
    SSTORE: 20000,
    JUMP: 8,
    JUMPI: 10,
    PC: 2,
    MSIZE: 2,
    GAS: 2,
    JUMPDEST: 1,
    PUSH1: 3,
    PUSH2: 3,
    PUSH32: 3,
    DUP1: 3,
    SWAP1: 3,
    LOG0: 375,
    LOG1: 750,
    LOG2: 1125,
    LOG3: 1500,
    LOG4: 1875,
    CREATE: 32000,
    CALL: 700,
    CALLCODE: 700,
    RETURN: 0,
    DELEGATECALL: 700,
    CREATE2: 32000,
    STATICCALL: 700,
    REVERT: 0,
    SELFDESTRUCT: 5000,
  };

  return gasCosts[opcode] || 3;
}

function getOpcodeHex(opcode: string): string {
  const opcodeHex: Record<string, string> = {
    STOP: "00",
    ADD: "01",
    MUL: "02",
    SUB: "03",
    DIV: "04",
    PUSH1: "60",
    PUSH2: "61",
    PUSH32: "7f",
    POP: "50",
    MLOAD: "51",
    MSTORE: "52",
    SLOAD: "54",
    SSTORE: "55",
    JUMP: "56",
    JUMPI: "57",
    PC: "58",
    MSIZE: "59",
    GAS: "5a",
    CALL: "f1",
    RETURN: "f3",
    REVERT: "fd",
    SELFDESTRUCT: "ff",
  };

  return opcodeHex[opcode] || "00";
}

function getOpcodeCategory(opcode: string): OpcodeAnalysis["category"] {
  if (["ADD", "SUB", "MUL", "DIV", "MOD", "EXP"].includes(opcode))
    return "arithmetic";
  if (["LT", "GT", "EQ", "ISZERO"].includes(opcode)) return "comparison";
  if (["AND", "OR", "XOR", "NOT", "BYTE"].includes(opcode)) return "bitwise";
  if (["MLOAD", "MSTORE", "MSTORE8", "MSIZE"].includes(opcode)) return "memory";
  if (["SLOAD", "SSTORE"].includes(opcode)) return "storage";
  if (["JUMP", "JUMPI", "JUMPDEST", "PC"].includes(opcode)) return "control";
  if (["CALL", "RETURN", "REVERT", "CREATE"].includes(opcode)) return "system";
  return "other";
}

function getOpcodeDescription(opcode: string): string {
  const descriptions: Record<string, string> = {
    ADD: "Addition operation",
    SUB: "Subtraction operation",
    MUL: "Multiplication operation",
    DIV: "Integer division operation",
    SLOAD: "Load word from storage",
    SSTORE: "Save word to storage",
    MLOAD: "Load word from memory",
    MSTORE: "Save word to memory",
    CALL: "Message-call into an account",
    RETURN: "Halt execution returning output data",
    PUSH1: "Place 1 byte item on stack",
    PUSH32: "Place 32 byte item on stack",
    POP: "Remove item from stack",
    JUMP: "Alter the program counter",
    JUMPI: "Conditionally alter the program counter",
  };

  return descriptions[opcode] || `${opcode} operation`;
}

function getOptimizationSuggestion(
  opcode: string,
  count: number,
): string | undefined {
  if (opcode === "SLOAD" && count > 5) {
    return "Consider caching storage reads in memory";
  }
  if (opcode === "SSTORE" && count > 3) {
    return "Batch storage writes to reduce gas costs";
  }
  if (opcode === "KECCAK256" && count > 10) {
    return "Cache hash results to avoid recomputation";
  }
  if (["CALL", "DELEGATECALL", "STATICCALL"].includes(opcode) && count > 5) {
    return "Consider batching external calls";
  }
  return undefined;
}

function getOptimalGasCost(opcode: string): number {
  return getOpcodeGasCost(opcode);
}

function getCategoryDistribution(opcodeAnalysis: OpcodeAnalysis[]) {
  const categoryTotals = opcodeAnalysis.reduce(
    (acc, opcode) => {
      acc[opcode.category] = (acc[opcode.category] || 0) + opcode.totalGas;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(categoryTotals).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
}
