import { StructLogAnalysis } from "@/lib/structLogTracer";
import { TransactionAnalysis } from "@/lib/transactionTracer";
import { ValidationResult } from "./types";

export class DataValidator {
  static validateStructLogData(data: StructLogAnalysis): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.summary) {
      errors.push("Missing summary data");
    } else {
      if (data.summary.total_steps <= 0) {
        errors.push("Invalid total_steps: must be greater than 0");
      }
      if (data.summary.total_gas_cost <= 0) {
        errors.push("Invalid total_gas_cost: must be greater than 0");
      }
    }

    if (!data.steps || !Array.isArray(data.steps)) {
      errors.push("Missing or invalid steps array");
    } else {
      if (data.steps.length === 0) {
        warnings.push("Empty steps array");
      }

      data.steps.forEach((step, index) => {
        if (typeof step.step !== "number") {
          errors.push(`Step ${index}: invalid step number`);
        }
        if (typeof step.gasCost !== "number" || step.gasCost < 0) {
          errors.push(`Step ${index}: invalid gas cost`);
        }
        if (!step.op || typeof step.op !== "string") {
          errors.push(`Step ${index}: missing or invalid opcode`);
        }
      });
    }

    if (!data.opcode_categories || !Array.isArray(data.opcode_categories)) {
      errors.push("Missing or invalid opcode_categories array");
    }

    if (!data.top_opcodes || !Array.isArray(data.top_opcodes)) {
      errors.push("Missing or invalid top_opcodes array");
    }

    if (data.steps && data.steps.length > 10000) {
      warnings.push(
        "Large dataset detected (>10k steps): consider using data virtualization",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateCallTraceData(data: TransactionAnalysis): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.transaction_stats) {
      errors.push("Missing transaction_stats data");
    } else {
      if (data.transaction_stats.total_calls <= 0) {
        errors.push("Invalid total_calls: must be greater than 0");
      }
      if (data.transaction_stats.total_gas <= 0) {
        errors.push("Invalid total_gas: must be greater than 0");
      }
    }

    if (!data.call_data || !Array.isArray(data.call_data)) {
      errors.push("Missing or invalid call_data array");
    } else {
      if (data.call_data.length === 0) {
        warnings.push("Empty call_data array");
      }

      data.call_data.forEach((call, index) => {
        if (!call.id || typeof call.id !== "string") {
          errors.push(`Call ${index}: missing or invalid id`);
        }
        if (!call.from || typeof call.from !== "string") {
          errors.push(`Call ${index}: missing or invalid from address`);
        }
        if (!call.to || typeof call.to !== "string") {
          errors.push(`Call ${index}: missing or invalid to address`);
        }
        if (typeof call.gasUsed !== "number" || call.gasUsed < 0) {
          errors.push(`Call ${index}: invalid gas usage`);
        }
        if (typeof call.value_eth !== "number" || call.value_eth < 0) {
          errors.push(`Call ${index}: invalid value`);
        }
      });

      const callIds = new Set(data.call_data.map((call) => call.id));
      data.call_data.forEach((call, index) => {
        if (call.parent_id && !callIds.has(call.parent_id)) {
          warnings.push(
            `Call ${index}: parent_id references non-existent call`,
          );
        }
      });
    }

    if (!data.logs_data || !Array.isArray(data.logs_data)) {
      warnings.push("Missing logs_data array");
    }

    if (data.call_data && data.call_data.length > 1000) {
      warnings.push(
        "Large dataset detected (>1k calls): consider using data virtualization",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateChartData(data: any[], dataType: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(data)) {
      errors.push(`${dataType}: data must be an array`);
      return { isValid: false, errors, warnings };
    }

    if (data.length === 0) {
      warnings.push(`${dataType}: empty data array`);
      return { isValid: true, errors, warnings };
    }

    data.forEach((item, index) => {
      if (typeof item !== "object" || item === null) {
        errors.push(`${dataType}[${index}]: invalid data item`);
        return;
      }

      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === "number") {
          if (isNaN(value)) {
            errors.push(`${dataType}[${index}].${key}: NaN value detected`);
          }
          if (!isFinite(value)) {
            errors.push(
              `${dataType}[${index}].${key}: Infinity value detected`,
            );
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateNetworkData(nodes: any[], edges: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(nodes)) {
      errors.push("Nodes must be an array");
    } else {
      const nodeIds = new Set<string>();
      nodes.forEach((node, index) => {
        if (!node.id || typeof node.id !== "string") {
          errors.push(`Node ${index}: missing or invalid id`);
        } else {
          if (nodeIds.has(node.id)) {
            errors.push(`Node ${index}: duplicate id "${node.id}"`);
          }
          nodeIds.add(node.id);
        }
      });
    }

    if (!Array.isArray(edges)) {
      errors.push("Edges must be an array");
    } else {
      const nodeIds = new Set(nodes.map((n) => n.id));
      edges.forEach((edge, index) => {
        if (!edge.id || typeof edge.id !== "string") {
          errors.push(`Edge ${index}: missing or invalid id`);
        }
        if (!edge.source || !nodeIds.has(edge.source)) {
          errors.push(`Edge ${index}: invalid source node "${edge.source}"`);
        }
        if (!edge.target || !nodeIds.has(edge.target)) {
          errors.push(`Edge ${index}: invalid target node "${edge.target}"`);
        }
      });
    }

    if (nodes.length > 100) {
      warnings.push(
        "Large network detected (>100 nodes): consider using clustering or filtering",
      );
    }
    if (edges.length > 500) {
      warnings.push(
        "Large network detected (>500 edges): consider using edge bundling or filtering",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateAnalyticsData(
    structLog?: StructLogAnalysis,
    callTrace?: TransactionAnalysis,
  ): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    if (structLog) {
      const structLogValidation = this.validateStructLogData(structLog);
      allErrors.push(
        ...structLogValidation.errors.map((e) => `StructLog: ${e}`),
      );
      allWarnings.push(
        ...structLogValidation.warnings.map((w) => `StructLog: ${w}`),
      );
    }

    if (callTrace) {
      const callTraceValidation = this.validateCallTraceData(callTrace);
      allErrors.push(
        ...callTraceValidation.errors.map((e) => `CallTrace: ${e}`),
      );
      allWarnings.push(
        ...callTraceValidation.warnings.map((w) => `CallTrace: ${w}`),
      );
    }

    if (!structLog && !callTrace) {
      allWarnings.push("No trace data provided");
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}
