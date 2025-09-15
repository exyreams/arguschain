import type {
  OpcodeDistribution,
  TopGasOpcode,
  VmTraceAnalysis,
  VmTraceResult,
} from "../types";
import { getOpcodeCategory } from "../constants";

export class VmTraceProcessor {
  static processVmTrace(vmTrace: VmTraceResult): VmTraceAnalysis {
    const { ops, gasUsed: gasUsedHex } = vmTrace;
    const gasUsed = parseInt(gasUsedHex, 16);

    const opcodeStats = new Map<string, { count: number; gasUsed: number }>();
    let memoryOperations = 0;
    let storageOperations = 0;
    let stackOperations = 0;

    ops.forEach((op) => {
      const { op: opcode, cost, ex } = op;

      const existing = opcodeStats.get(opcode);
      if (existing) {
        existing.count++;
        existing.gasUsed += cost;
      } else {
        opcodeStats.set(opcode, { count: 1, gasUsed: cost });
      }

      const category = getOpcodeCategory(opcode);
      switch (category) {
        case "memory":
          memoryOperations++;
          break;
        case "storage":
          storageOperations++;
          break;
        case "stack":
          stackOperations++;
          break;
      }

      if (op.sub) {
        const subAnalysis = this.processVmTrace(op.sub);

        subAnalysis.opcodeDistribution.forEach((dist) => {
          const existing = opcodeStats.get(dist.opcode);
          if (existing) {
            existing.count += dist.count;
            existing.gasUsed += dist.gasUsed;
          } else {
            opcodeStats.set(dist.opcode, {
              count: dist.count,
              gasUsed: dist.gasUsed,
            });
          }
        });

        memoryOperations += subAnalysis.memoryOperations;
        storageOperations += subAnalysis.storageOperations;
        stackOperations += subAnalysis.stackOperations;
      }
    });

    const opcodeDistribution = this.createOpcodeDistribution(
      opcodeStats,
      gasUsed,
    );
    const topGasOpcodes = this.getTopGasOpcodes(opcodeStats, 10);

    return {
      totalSteps: ops.length,
      gasUsed,
      opcodeDistribution,
      memoryOperations,
      storageOperations,
      stackOperations,
      topGasOpcodes,
    };
  }

  private static createOpcodeDistribution(
    opcodeStats: Map<string, { count: number; gasUsed: number }>,
    totalGas: number,
  ): OpcodeDistribution[] {
    const distribution: OpcodeDistribution[] = [];

    opcodeStats.forEach((stats, opcode) => {
      distribution.push({
        opcode,
        count: stats.count,
        gasUsed: stats.gasUsed,
        percentage: totalGas > 0 ? (stats.gasUsed / totalGas) * 100 : 0,
      });
    });

    return distribution.sort((a, b) => b.gasUsed - a.gasUsed);
  }

  private static getTopGasOpcodes(
    opcodeStats: Map<string, { count: number; gasUsed: number }>,
    limit: number,
  ): TopGasOpcode[] {
    const topOpcodes: TopGasOpcode[] = [];
    const totalGas = Array.from(opcodeStats.values()).reduce(
      (sum, stats) => sum + stats.gasUsed,
      0,
    );

    const sortedOpcodes = Array.from(opcodeStats.entries())
      .sort(([, a], [, b]) => b.gasUsed - a.gasUsed)
      .slice(0, limit);

    sortedOpcodes.forEach(([opcode, stats]) => {
      topOpcodes.push({
        opcode,
        count: stats.count,
        gasUsed: stats.gasUsed,
        percentage: totalGas > 0 ? (stats.gasUsed / totalGas) * 100 : 0,
      });
    });

    return topOpcodes;
  }

  static analyzeOpcodePatterns(analysis: VmTraceAnalysis): Array<{
    id: string;
    type: "gas" | "performance";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    recommendation: string;
    affectedOpcodes?: string[];
  }> {
    const suggestions = [];

    const sstoreOps = analysis.opcodeDistribution.find(
      (op) => op.opcode === "SSTORE",
    );
    if (sstoreOps && sstoreOps.count > 10) {
      suggestions.push({
        id: "excessive_sstore",
        type: "gas" as const,
        severity: "high" as const,
        title: "Excessive Storage Writes",
        description: `${sstoreOps.count} SSTORE operations detected`,
        recommendation:
          "Consider batching storage writes or using more efficient storage patterns",
        affectedOpcodes: ["SSTORE"],
      });
    }

    const keccakOps = analysis.opcodeDistribution.find(
      (op) => op.opcode === "KECCAK256",
    );
    if (keccakOps && keccakOps.count > 20) {
      suggestions.push({
        id: "excessive_keccak",
        type: "gas" as const,
        severity: "medium" as const,
        title: "High Hash Computation Usage",
        description: `${keccakOps.count} KECCAK256 operations detected`,
        recommendation:
          "Consider caching hash results or reducing hash computations",
        affectedOpcodes: ["KECCAK256"],
      });
    }

    if (analysis.memoryOperations > analysis.totalSteps * 0.3) {
      suggestions.push({
        id: "high_memory_usage",
        type: "performance" as const,
        severity: "medium" as const,
        title: "High Memory Operation Ratio",
        description: `${analysis.memoryOperations} memory operations out of ${analysis.totalSteps} total steps`,
        recommendation:
          "Review memory usage patterns for potential optimizations",
        affectedOpcodes: ["MLOAD", "MSTORE", "MSTORE8"],
      });
    }

    const stackOpsRatio = analysis.stackOperations / analysis.totalSteps;
    if (stackOpsRatio > 0.5) {
      suggestions.push({
        id: "high_stack_usage",
        type: "performance" as const,
        severity: "low" as const,
        title: "High Stack Operation Ratio",
        description: `${(stackOpsRatio * 100).toFixed(1)}% of operations are stack-related`,
        recommendation: "Consider optimizing stack usage to reduce complexity",
        affectedOpcodes: ["PUSH1", "PUSH2", "DUP1", "SWAP1"],
      });
    }

    const expensiveOps = analysis.topGasOpcodes.filter(
      (op) => op.gasUsed > analysis.gasUsed * 0.1,
    );
    if (expensiveOps.length > 0) {
      suggestions.push({
        id: "expensive_operations",
        type: "gas" as const,
        severity: "high" as const,
        title: "High-Cost Operations Detected",
        description: `${expensiveOps.length} operations consume more than 10% of total gas`,
        recommendation:
          "Focus optimization efforts on these high-cost operations",
        affectedOpcodes: expensiveOps.map((op) => op.opcode),
      });
    }

    return suggestions;
  }

  static generateGasEfficiencyReport(analysis: VmTraceAnalysis): {
    overallEfficiency: number;
    categoryBreakdown: Array<{
      category: string;
      gasUsed: number;
      percentage: number;
      efficiency: "excellent" | "good" | "average" | "poor";
    }>;
    recommendations: string[];
  } {
    const categoryGas = new Map<string, number>();

    analysis.opcodeDistribution.forEach((dist) => {
      const category = getOpcodeCategory(dist.opcode);
      const existing = categoryGas.get(category) || 0;
      categoryGas.set(category, existing + dist.gasUsed);
    });

    const categoryBreakdown = Array.from(categoryGas.entries()).map(
      ([category, gasUsed]) => {
        const percentage = (gasUsed / analysis.gasUsed) * 100;
        let efficiency: "excellent" | "good" | "average" | "poor";

        switch (category) {
          case "storage":
            efficiency =
              percentage < 20
                ? "excellent"
                : percentage < 40
                  ? "good"
                  : percentage < 60
                    ? "average"
                    : "poor";
            break;
          case "arithmetic":
            efficiency =
              percentage < 30
                ? "excellent"
                : percentage < 50
                  ? "good"
                  : percentage < 70
                    ? "average"
                    : "poor";
            break;
          case "system":
            efficiency =
              percentage < 15
                ? "excellent"
                : percentage < 30
                  ? "good"
                  : percentage < 50
                    ? "average"
                    : "poor";
            break;
          default:
            efficiency =
              percentage < 25
                ? "excellent"
                : percentage < 45
                  ? "good"
                  : percentage < 65
                    ? "average"
                    : "poor";
        }

        return {
          category,
          gasUsed,
          percentage,
          efficiency,
        };
      },
    );

    const storagePercentage =
      categoryBreakdown.find((c) => c.category === "storage")?.percentage || 0;
    const systemPercentage =
      categoryBreakdown.find((c) => c.category === "system")?.percentage || 0;
    const overallEfficiency = Math.max(
      0,
      100 - storagePercentage * 0.5 - systemPercentage * 0.3,
    );

    const recommendations: string[] = [];

    if (storagePercentage > 40) {
      recommendations.push(
        "Optimize storage operations - they consume a high percentage of gas",
      );
    }

    if (systemPercentage > 30) {
      recommendations.push(
        "Review external calls and system operations for efficiency",
      );
    }

    const memoryPercentage =
      categoryBreakdown.find((c) => c.category === "memory")?.percentage || 0;
    if (memoryPercentage > 25) {
      recommendations.push("Consider optimizing memory usage patterns");
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Gas usage appears well-optimized across all categories",
      );
    }

    return {
      overallEfficiency,
      categoryBreakdown: categoryBreakdown.sort(
        (a, b) => b.gasUsed - a.gasUsed,
      ),
      recommendations,
    };
  }

  static detectAntiPatterns(analysis: VmTraceAnalysis): Array<{
    pattern: string;
    severity: "low" | "medium" | "high";
    description: string;
    occurrences: number;
    recommendation: string;
  }> {
    const antiPatterns = [];

    const jumpiOps = analysis.opcodeDistribution.find(
      (op) => op.opcode === "JUMPI",
    );
    if (jumpiOps && jumpiOps.count > 50) {
      antiPatterns.push({
        pattern: "excessive_loops",
        severity: "medium" as const,
        description: "High number of conditional jumps suggests complex loops",
        occurrences: jumpiOps.count,
        recommendation: "Consider loop unrolling or alternative algorithms",
      });
    }

    const sloadOps = analysis.opcodeDistribution.find(
      (op) => op.opcode === "SLOAD",
    );
    if (sloadOps && sloadOps.count > 20) {
      antiPatterns.push({
        pattern: "redundant_storage_reads",
        severity: "high" as const,
        description: "Multiple storage reads may indicate lack of caching",
        occurrences: sloadOps.count,
        recommendation: "Cache frequently accessed storage values in memory",
      });
    }

    const stackOpsCount = analysis.stackOperations;
    const stackRatio = stackOpsCount / analysis.totalSteps;
    if (stackRatio > 0.6) {
      antiPatterns.push({
        pattern: "inefficient_stack_management",
        severity: "low" as const,
        description:
          "High ratio of stack operations suggests inefficient variable management",
        occurrences: stackOpsCount,
        recommendation: "Optimize variable usage and stack management",
      });
    }

    const callOps = analysis.opcodeDistribution.find(
      (op) => op.opcode === "CALL",
    );
    const staticCallOps = analysis.opcodeDistribution.find(
      (op) => op.opcode === "STATICCALL",
    );
    const totalCalls = (callOps?.count || 0) + (staticCallOps?.count || 0);

    if (totalCalls > 10) {
      antiPatterns.push({
        pattern: "excessive_external_calls",
        severity: "medium" as const,
        description:
          "High number of external calls increases gas cost and complexity",
        occurrences: totalCalls,
        recommendation: "Batch external calls or use multicall patterns",
      });
    }

    return antiPatterns;
  }
}
