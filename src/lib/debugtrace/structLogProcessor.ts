import { StructLogAnalysis } from "@/lib/structLogTracer";
import {
  ExecutionTimelineData,
  GasHeatmapData,
  MemoryUsageData,
  OpcodeDistributionData,
  PerformanceMetric,
  ProcessedStructLogData,
} from "./types";
import { getOpcodeColor } from "./chartTheme";

export class StructLogProcessor {
  static processOpcodeDistribution(
    structLog: StructLogAnalysis,
  ): OpcodeDistributionData[] {
    const categoryMap = new Map<string, { gasUsed: number; count: number }>();

    structLog.opcode_categories.forEach((category) => {
      categoryMap.set(category.category, {
        gasUsed: category.gas_used,
        count: 0,
      });
    });

    structLog.steps.forEach((step) => {
      const existing = categoryMap.get(step.opcode_category);
      if (existing) {
        existing.count++;
      }
    });

    const totalGas = structLog.summary.total_gas_cost;

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        gasUsed: data.gasUsed,
        percentage: (data.gasUsed / totalGas) * 100,
        count: data.count,
        color: getOpcodeColor(category),
      }))
      .sort((a, b) => b.gasUsed - a.gasUsed);
  }

  static processExecutionTimeline(
    structLog: StructLogAnalysis,
  ): ExecutionTimelineData[] {
    let cumulativeGas = 0;

    return structLog.steps.map((step, index) => {
      cumulativeGas += step.gasCost;

      return {
        step: step.step,
        gasUsed: step.gasCost,
        cumulativeGas,
        opcode: step.op,
        depth: step.depth,
        timestamp: index,
      };
    });
  }

  static processMemoryUsage(structLog: StructLogAnalysis): MemoryUsageData[] {
    return structLog.steps.map((step) => ({
      step: step.step,
      stackDepth: step.stack_depth,
      memorySize: step.mem_size_bytes,
      gasUsed: step.gasCost,
    }));
  }

  static calculatePerformanceMetrics(
    structLog: StructLogAnalysis,
  ): PerformanceMetric[] {
    const { summary, steps, top_opcodes } = structLog;

    const avgGasPerStep = summary.total_gas_cost / summary.total_steps;

    const mostExpensiveOpcode = top_opcodes[0];

    const efficiencyScore = Math.max(0, 100 - (avgGasPerStep / 1000) * 100);

    const avgMemoryUsage =
      steps.reduce((sum, step) => sum + step.mem_size_bytes, 0) / steps.length;

    const maxStackDepth = summary.max_stack_depth;
    const avgStackDepth =
      steps.reduce((sum, step) => sum + step.stack_depth, 0) / steps.length;

    return [
      {
        name: "Total Execution Steps",
        value: summary.total_steps.toLocaleString(),
        description: "Total number of opcode execution steps",
      },
      {
        name: "Average Gas per Step",
        value: Math.round(avgGasPerStep),
        unit: "gas",
        description: "Average gas consumption per execution step",
      },
      {
        name: "Efficiency Score",
        value: Math.round(efficiencyScore),
        unit: "%",
        trend:
          efficiencyScore > 70
            ? "up"
            : efficiencyScore > 40
              ? "stable"
              : "down",
        description: "Overall execution efficiency rating",
      },
      {
        name: "Most Expensive Opcode",
        value: mostExpensiveOpcode?.opcode || "N/A",
        description: `Consumed ${mostExpensiveOpcode?.gas_used.toLocaleString()} gas`,
      },
      {
        name: "Max Stack Depth",
        value: maxStackDepth,
        description: "Maximum stack depth reached during execution",
      },
      {
        name: "Average Memory Usage",
        value: Math.round(avgMemoryUsage),
        unit: "bytes",
        description: "Average memory usage during execution",
      },
      {
        name: "Stack Utilization",
        value: Math.round((avgStackDepth / maxStackDepth) * 100),
        unit: "%",
        description: "Average stack depth utilization",
      },
    ];
  }

  static generateGasHeatmap(structLog: StructLogAnalysis): GasHeatmapData[] {
    const maxGas = Math.max(...structLog.steps.map((step) => step.gasCost));

    return structLog.steps.map((step) => ({
      step: step.step,
      opcode: step.op,
      gasUsed: step.gasCost,
      intensity: step.gasCost / maxGas,
    }));
  }

  static processAll(structLog: StructLogAnalysis): ProcessedStructLogData {
    return {
      opcodeDistribution: this.processOpcodeDistribution(structLog),
      executionTimeline: this.processExecutionTimeline(structLog),
      memoryUsage: this.processMemoryUsage(structLog),
      performanceMetrics: this.calculatePerformanceMetrics(structLog),
      gasHeatmap: this.generateGasHeatmap(structLog),
    };
  }

  static getTopExpensiveOpcodes(
    structLog: StructLogAnalysis,
    limit: number = 10,
  ) {
    return structLog.top_opcodes.slice(0, limit).map((opcode, index) => ({
      ...opcode,
      rank: index + 1,
      percentage: (opcode.gas_used / structLog.summary.total_gas_cost) * 100,
      color: getOpcodeColor(opcode.opcode),
    }));
  }

  static analyzeExecutionPatterns(structLog: StructLogAnalysis) {
    const { steps } = structLog;

    const gasValues = steps.map((step) => step.gasCost);
    const avgGas =
      gasValues.reduce((sum, gas) => sum + gas, 0) / gasValues.length;
    const gasSpikes = steps.filter((step) => step.gasCost > avgGas * 3);

    const memoryValues = steps.map((step) => step.mem_size_bytes);
    const avgMemory =
      memoryValues.reduce((sum, mem) => sum + mem, 0) / memoryValues.length;
    const memorySpikes = steps.filter(
      (step) => step.mem_size_bytes > avgMemory * 2,
    );

    const deepCalls = steps.filter((step) => step.depth > 3);

    return {
      gasSpikes: gasSpikes.length,
      memorySpikes: memorySpikes.length,
      deepCalls: deepCalls.length,
      avgGasPerStep: avgGas,
      avgMemoryUsage: avgMemory,
      executionComplexity:
        gasSpikes.length + memorySpikes.length + deepCalls.length,
    };
  }

  static generateOptimizationSuggestions(structLog: StructLogAnalysis) {
    const patterns = this.analyzeExecutionPatterns(structLog);
    const suggestions = [];

    if (patterns.avgGasPerStep > 1000) {
      suggestions.push({
        type: "gas" as const,
        severity: "high" as const,
        title: "High Gas Usage per Step",
        description: `Average gas per step (${Math.round(patterns.avgGasPerStep)}) is above recommended levels`,
        recommendation:
          "Consider optimizing expensive operations or reducing computational complexity",
      });
    }

    if (patterns.memorySpikes > 10) {
      suggestions.push({
        type: "performance" as const,
        severity: "medium" as const,
        title: "Memory Usage Spikes",
        description: `${patterns.memorySpikes} memory usage spikes detected`,
        recommendation:
          "Review memory allocation patterns and consider using more efficient data structures",
      });
    }

    if (patterns.deepCalls > 5) {
      suggestions.push({
        type: "performance" as const,
        severity: "medium" as const,
        title: "Deep Call Stack",
        description: `${patterns.deepCalls} operations with call depth > 3 detected`,
        recommendation:
          "Consider flattening call hierarchy to reduce gas costs and improve readability",
      });
    }

    return suggestions;
  }
}
