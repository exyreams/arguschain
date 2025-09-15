import React, { useMemo, useState } from "react";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  Shield,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ExecutionStep {
  pc: number;
  op: string;
  gas: number;
  gasCost: number;
  depth: number;
  stack: string[];
  memory: string[];
  storage: Record<string, string>;
  error?: string;
}

interface ExecutionTraceAnalyzerProps {
  traceData: {
    gas: number;
    failed: boolean;
    returnValue: string;
    structLogs: ExecutionStep[];
  };
  contractAddress: string;
  functionName: string;
  className?: string;
}

export const ExecutionTraceAnalyzer: React.FC<ExecutionTraceAnalyzerProps> = ({
  traceData,
  contractAddress,
  functionName,
  className = "",
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [selectedView, setSelectedView] = useState<
    "overview" | "opcodes" | "gas" | "security"
  >("overview");

  const analysis = useMemo(() => {
    const steps = traceData.structLogs || [];

    const gasUsageByOpcode = steps.reduce(
      (acc, step) => {
        acc[step.op] = (acc[step.op] || 0) + step.gasCost;
        return acc;
      },
      {} as Record<string, number>,
    );

    const gasUsageData = Object.entries(gasUsageByOpcode)
      .map(([op, gas]) => ({
        op,
        gas,
        percentage: (gas / traceData.gas) * 100,
      }))
      .sort((a, b) => b.gas - a.gas)
      .slice(0, 10);

    const securityIssues = [];
    let hasReentrancy = false;
    let hasOverflow = false;
    let suspiciousPatterns = 0;

    const callDepths = steps.map((s) => s.depth);
    const maxDepth = Math.max(...callDepths);
    if (maxDepth > 3) {
      hasReentrancy = true;
      securityIssues.push({
        type: "warning",
        title: "Deep Call Stack Detected",
        description: `Maximum call depth: ${maxDepth}. Monitor for potential reentrancy.`,
        severity: "medium",
      });
    }

    const arithmeticOps = steps.filter((s) =>
      ["ADD", "SUB", "MUL", "DIV", "MOD"].includes(s.op),
    );
    if (arithmeticOps.length > 10) {
      suspiciousPatterns++;
      securityIssues.push({
        type: "info",
        title: "Heavy Arithmetic Operations",
        description: `${arithmeticOps.length} arithmetic operations detected. Verify overflow protection.`,
        severity: "low",
      });
    }

    const storageOps = steps.filter(
      (s) => s.op.startsWith("SSTORE") || s.op.startsWith("SLOAD"),
    );
    const storageChanges = storageOps.length;

    const memoryOps = steps.filter(
      (s) => s.op.startsWith("MSTORE") || s.op.startsWith("MLOAD"),
    );

    const callOps = steps.filter((s) =>
      ["CALL", "CALLCODE", "DELEGATECALL", "STATICCALL"].includes(s.op),
    );

    const gasEfficiency = {
      totalGas: traceData.gas,
      computationGas:
        gasUsageByOpcode["ADD"] +
          gasUsageByOpcode["SUB"] +
          gasUsageByOpcode["MUL"] +
          gasUsageByOpcode["DIV"] || 0,
      storageGas: gasUsageByOpcode["SSTORE"] + gasUsageByOpcode["SLOAD"] || 0,
      memoryGas: gasUsageByOpcode["MSTORE"] + gasUsageByOpcode["MLOAD"] || 0,
      callGas: gasUsageByOpcode["CALL"] + gasUsageByOpcode["DELEGATECALL"] || 0,
    };

    const efficiencyScore = Math.max(0, 100 - traceData.gas / 1000);

    return {
      gasUsageData,
      securityIssues,
      storageChanges,
      memoryOperations: memoryOps.length,
      externalCalls: callOps.length,
      gasEfficiency,
      efficiencyScore,
      totalSteps: steps.length,
      hasReentrancy,
      hasOverflow,
      suspiciousPatterns,
    };
  }, [traceData]);

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const getOpcodeColor = (op: string) => {
    if (op.startsWith("PUSH")) return "#00bfff";
    if (op.startsWith("DUP") || op.startsWith("SWAP")) return "#8b9dc3";
    if (["ADD", "SUB", "MUL", "DIV"].includes(op)) return "#10b981";
    if (op.startsWith("SSTORE") || op.startsWith("SLOAD")) return "#f59e0b";
    if (["CALL", "DELEGATECALL", "STATICCALL"].includes(op)) return "#ef4444";
    return "#6b7280";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      case "medium":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      case "low":
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
      default:
        return "text-gray-400 border-gray-500/50 bg-gray-500/10";
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Code className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-xl font-semibold text-[#00bfff]">
            Execution Trace Analysis
          </h3>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {analysis.totalSteps} steps
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={selectedView === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("overview")}
            className={
              selectedView === "overview"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <Activity className="h-4 w-4 mr-1" />
            Overview
          </Button>
          <Button
            variant={selectedView === "opcodes" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("opcodes")}
            className={
              selectedView === "opcodes"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <Code className="h-4 w-4 mr-1" />
            Opcodes
          </Button>
          <Button
            variant={selectedView === "gas" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("gas")}
            className={
              selectedView === "gas"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <Zap className="h-4 w-4 mr-1" />
            Gas Analysis
          </Button>
          <Button
            variant={selectedView === "security" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("security")}
            className={
              selectedView === "security"
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            }
          >
            <Shield className="h-4 w-4 mr-1" />
            Security
          </Button>
        </div>
      </div>

      {selectedView === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">Total Steps</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {analysis.totalSteps}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">Storage Changes</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {analysis.storageChanges}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">External Calls</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {analysis.externalCalls}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="text-sm text-[#8b9dc3]">Efficiency Score</div>
              <div className="text-2xl font-bold text-green-400">
                {analysis.efficiencyScore.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Gas Usage by Operation Type
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Computation",
                      value: analysis.gasEfficiency.computationGas,
                      fill: "#10b981",
                    },
                    {
                      name: "Storage",
                      value: analysis.gasEfficiency.storageGas,
                      fill: "#f59e0b",
                    },
                    {
                      name: "Memory",
                      value: analysis.gasEfficiency.memoryGas,
                      fill: "#8b5cf6",
                    },
                    {
                      name: "Calls",
                      value: analysis.gasEfficiency.callGas,
                      fill: "#ef4444",
                    },
                    {
                      name: "Other",
                      value:
                        analysis.gasEfficiency.totalGas -
                        analysis.gasEfficiency.computationGas -
                        analysis.gasEfficiency.storageGas -
                        analysis.gasEfficiency.memoryGas -
                        analysis.gasEfficiency.callGas,
                      fill: "#6b7280",
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {[
                    {
                      name: "Computation",
                      value: analysis.gasEfficiency.computationGas,
                      fill: "#10b981",
                    },
                    {
                      name: "Storage",
                      value: analysis.gasEfficiency.storageGas,
                      fill: "#f59e0b",
                    },
                    {
                      name: "Memory",
                      value: analysis.gasEfficiency.memoryGas,
                      fill: "#8b5cf6",
                    },
                    {
                      name: "Calls",
                      value: analysis.gasEfficiency.callGas,
                      fill: "#ef4444",
                    },
                    {
                      name: "Other",
                      value:
                        analysis.gasEfficiency.totalGas -
                        analysis.gasEfficiency.computationGas -
                        analysis.gasEfficiency.storageGas -
                        analysis.gasEfficiency.memoryGas -
                        analysis.gasEfficiency.callGas,
                      fill: "#6b7280",
                    },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(25,28,40,0.95)",
                    border: "1px solid rgba(0,191,255,0.3)",
                    borderRadius: "8px",
                    color: "#00bfff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedView === "gas" && (
        <div className="space-y-6">
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Top Gas Consuming Operations
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analysis.gasUsageData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis dataKey="op" stroke="#8b9dc3" />
                <YAxis stroke="#8b9dc3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(25,28,40,0.95)",
                    border: "1px solid rgba(0,191,255,0.3)",
                    borderRadius: "8px",
                    color: "#00bfff",
                  }}
                />
                <Bar dataKey="gas" fill="#00bfff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedView === "security" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3]">Reentrancy Risk</span>
              </div>
              <div
                className={`text-lg font-semibold ${analysis.hasReentrancy ? "text-yellow-400" : "text-green-400"}`}
              >
                {analysis.hasReentrancy ? "Medium" : "Low"}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3]">
                  Suspicious Patterns
                </span>
              </div>
              <div className="text-lg font-semibold text-[#00bfff]">
                {analysis.suspiciousPatterns}
              </div>
            </div>
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3]">Storage Access</span>
              </div>
              <div className="text-lg font-semibold text-[#00bfff]">
                {analysis.storageChanges} changes
              </div>
            </div>
          </div>

          {analysis.securityIssues.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Security Analysis Results
              </h4>
              {analysis.securityIssues.map((issue, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">{issue.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {issue.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-90">{issue.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedView === "opcodes" && (
        <div className="space-y-4">
          <div className="text-sm text-[#8b9dc3] mb-4">
            Showing detailed execution trace. Click on any step to expand
            details.
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {traceData.structLogs.slice(0, 50).map((step, index) => (
              <div
                key={index}
                className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg"
              >
                <div
                  className="p-3 cursor-pointer hover:bg-[rgba(0,191,255,0.05)] transition-colors"
                  onClick={() => toggleStep(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSteps.has(index) ? (
                        <ChevronDown className="h-4 w-4 text-[#8b9dc3]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#8b9dc3]" />
                      )}
                      <span className="text-xs text-[#6b7280] font-mono w-12">
                        #{step.pc}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs"
                        style={{
                          color: getOpcodeColor(step.op),
                          borderColor: getOpcodeColor(step.op) + "50",
                        }}
                      >
                        {step.op}
                      </Badge>
                      <span className="text-sm text-[#8b9dc3]">
                        Depth: {step.depth}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#8b9dc3]">
                        Gas: {step.gas.toLocaleString()}
                      </span>
                      <span className="text-sm text-yellow-400">
                        Cost: {step.gasCost}
                      </span>
                    </div>
                  </div>
                </div>

                {expandedSteps.has(index) && (
                  <div className="border-t border-[rgba(0,191,255,0.1)] p-3 space-y-3">
                    {step.stack.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-[#00bfff] mb-2">
                          Stack ({step.stack.length} items)
                        </div>
                        <div className="bg-[rgba(0,0,0,0.3)] rounded p-2 max-h-32 overflow-y-auto">
                          {step.stack.slice(-5).map((item, i) => (
                            <div
                              key={i}
                              className="text-xs font-mono text-[#8b9dc3] break-all"
                            >
                              [{step.stack.length - 5 + i}]: {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {step.memory.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-[#00bfff] mb-2">
                          Memory
                        </div>
                        <div className="bg-[rgba(0,0,0,0.3)] rounded p-2 max-h-24 overflow-y-auto">
                          <div className="text-xs font-mono text-[#8b9dc3] break-all">
                            {step.memory.join("")}
                          </div>
                        </div>
                      </div>
                    )}

                    {Object.keys(step.storage).length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-[#00bfff] mb-2">
                          Storage Changes
                        </div>
                        <div className="bg-[rgba(0,0,0,0.3)] rounded p-2 max-h-24 overflow-y-auto">
                          {Object.entries(step.storage).map(([key, value]) => (
                            <div
                              key={key}
                              className="text-xs font-mono text-[#8b9dc3]"
                            >
                              {key}: {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {traceData.structLogs.length > 50 && (
              <div className="text-center py-4">
                <span className="text-sm text-[#8b9dc3]">
                  Showing first 50 steps of {traceData.structLogs.length} total
                  steps
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionTraceAnalyzer;
