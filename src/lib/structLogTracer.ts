import { ethers } from "ethers";
import {
  getContractName,
  OPCODE_CATEGORIES,
  shortenAddress,
  TRACE_CONFIG,
} from "./config";

export interface StructLogStep {
  step: number;
  pc: number;
  op: string;
  opcode_category: string;
  gas: number;
  gasCost: number;
  depth: number;
  stack_depth: number;
  mem_size_bytes: number;
  current_contract?: string;
  is_pyusd_contract: boolean;
  is_pyusd_related: boolean;
}

export interface StructLogAnalysis {
  steps: StructLogStep[];
  summary: {
    total_gas_used: any;
    total_steps: number;
    total_gas_cost: number;
    max_depth: number;
    max_stack_depth: number;
    max_memory_bytes: number;
    pyusd_steps: number;
    pyusd_percentage: number;
  };
  opcode_categories: Array<{
    category: string;
    gas_used: number;
    percentage: number;
  }>;
  top_opcodes: Array<{
    opcode: string;
    gas_used: number;
    count: number;
  }>;
  pyusd_analysis?: {
    top_operations: Array<{
      opcode: string;
      count: number;
      percentage: number;
    }>;
    gas_by_category: Array<{
      category: string;
      gas_used: number;
      percentage: number;
    }>;
  };
}

export class StructLogTracer {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  private getOpcodeCategory(opcode: string): string {
    for (const [category, opcodes] of Object.entries(OPCODE_CATEGORIES)) {
      if (opcodes.includes(opcode)) {
        return category;
      }
    }
    return "other";
  }

  async makeRpcRequest(method: string, params: any[]): Promise<any> {
    try {
      const result = await (this.provider as any).send(method, params);
      return result;
    } catch (error) {
      console.error(`RPC Error (${method}):`, error);
      return null;
    }
  }

  async traceTransactionStructLog(txHash: string): Promise<any> {
    return await this.makeRpcRequest("debug_traceTransaction", [
      txHash,
      TRACE_CONFIG.structLog,
    ]);
  }

  parseStructLog(structLogs: any[], txHash: string): StructLogAnalysis {
    if (!structLogs || !Array.isArray(structLogs)) {
      throw new Error("No structLog data provided or invalid format");
    }

    const logData: StructLogStep[] = [];
    let totalGasCost = 0;
    let lastGas = 0;
    const currentContracts: Record<number, string> = {};
    let pyusdExecutionSteps = 0;

    if (structLogs.length > 0 && structLogs[0].gas) {
      lastGas = structLogs[0].gas;
    }

    for (let i = 0; i < structLogs.length; i++) {
      const step = structLogs[i];
      if (!step || typeof step !== "object") continue;

      const currentGas = step.gas || lastGas;
      const gasCost = Math.max(0, lastGas - currentGas);
      totalGasCost += gasCost;

      const depth = step.depth || 0;
      const op = step.op || "N/A";

      let isPyusdRelated = false;
      if (["CALL", "STATICCALL", "DELEGATECALL"].includes(op)) {
        try {
          const stack = step.stack || [];
          if (stack.length >= 2) {
            let addressRaw = stack[1];
            let address: string | null = null;

            if (typeof addressRaw === "string" && addressRaw.startsWith("0x")) {
              address = "0x" + addressRaw.slice(-40);
            } else {
              try {
                const addressNum =
                  typeof addressRaw === "string"
                    ? parseInt(addressRaw, 16)
                    : addressRaw;
                address = "0x" + addressNum.toString(16).padStart(40, "0");
              } catch {
                address = null;
              }
            }

            if (address) {
              currentContracts[depth + 1] = address.toLowerCase();
              const contractName = getContractName(address);
              isPyusdRelated = contractName !== "Unknown Contract";
            }
          }
        } catch (error) {}
      }

      const currentContract = currentContracts[depth];
      const contractName = currentContract
        ? getContractName(currentContract)
        : "Unknown Contract";
      const isInKnownContract = contractName !== "Unknown Contract";

      if (isInKnownContract) {
        pyusdExecutionSteps++;
      }

      const opcodeCategory = this.getOpcodeCategory(op);

      logData.push({
        step: i,
        pc: step.pc || 0,
        op,
        opcode_category: opcodeCategory,
        gas: currentGas,
        gasCost,
        depth,
        stack_depth: (step.stack || []).length,
        mem_size_bytes: (step.memory || []).length * 32,
        current_contract: currentContract,
        is_pyusd_contract: isInKnownContract,
        is_pyusd_related: isPyusdRelated || isInKnownContract,
      });

      lastGas = currentGas;
    }

    const summary = {
      total_steps: logData.length,
      total_gas_cost: totalGasCost,
      max_depth: Math.max(...logData.map((step) => step.depth)),
      max_stack_depth: Math.max(...logData.map((step) => step.stack_depth)),
      max_memory_bytes: Math.max(...logData.map((step) => step.mem_size_bytes)),
      pyusd_steps: pyusdExecutionSteps,
      pyusd_percentage:
        logData.length > 0 ? (pyusdExecutionSteps / logData.length) * 100 : 0,
    };

    const categoryGasMap: Record<string, number> = {};
    logData.forEach((step) => {
      categoryGasMap[step.opcode_category] =
        (categoryGasMap[step.opcode_category] || 0) + step.gasCost;
    });

    const opcodeCategories = Object.entries(categoryGasMap)
      .filter(([_, gas]) => gas > 0)
      .map(([category, gas_used]) => ({
        category,
        gas_used,
        percentage: totalGasCost > 0 ? (gas_used / totalGasCost) * 100 : 0,
      }))
      .sort((a, b) => b.gas_used - a.gas_used);

    const opcodeGasMap: Record<string, { gas_used: number; count: number }> =
      {};
    logData.forEach((step) => {
      if (!opcodeGasMap[step.op]) {
        opcodeGasMap[step.op] = { gas_used: 0, count: 0 };
      }
      opcodeGasMap[step.op].gas_used += step.gasCost;
      opcodeGasMap[step.op].count++;
    });

    const topOpcodes = Object.entries(opcodeGasMap)
      .filter(([_, data]) => data.gas_used > 0)
      .map(([opcode, data]) => ({
        opcode,
        gas_used: data.gas_used,
        count: data.count,
      }))
      .sort((a, b) => b.gas_used - a.gas_used)
      .slice(0, 30);

    let pyusdAnalysis: StructLogAnalysis["pyusd_analysis"];
    const pyusdSteps = logData.filter((step) => step.is_pyusd_contract);

    if (pyusdSteps.length > 0) {
      const pyusdOpcodeMap: Record<string, number> = {};
      pyusdSteps.forEach((step) => {
        pyusdOpcodeMap[step.op] = (pyusdOpcodeMap[step.op] || 0) + 1;
      });

      const topOperations = Object.entries(pyusdOpcodeMap)
        .map(([opcode, count]) => ({
          opcode,
          count,
          percentage: (count / pyusdSteps.length) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const pyusdCategoryGasMap: Record<string, number> = {};
      pyusdSteps.forEach((step) => {
        pyusdCategoryGasMap[step.opcode_category] =
          (pyusdCategoryGasMap[step.opcode_category] || 0) + step.gasCost;
      });

      const totalPyusdGas = Object.values(pyusdCategoryGasMap).reduce(
        (sum, gas) => sum + gas,
        0
      );
      const gasByCategory = Object.entries(pyusdCategoryGasMap)
        .map(([category, gas_used]) => ({
          category,
          gas_used,
          percentage: totalPyusdGas > 0 ? (gas_used / totalPyusdGas) * 100 : 0,
        }))
        .sort((a, b) => b.gas_used - a.gas_used);

      pyusdAnalysis = {
        top_operations: topOperations,
        gas_by_category: gasByCategory,
      };
    }

    return {
      steps: logData,
      summary,
      opcode_categories: opcodeCategories,
      top_opcodes: topOpcodes,
      pyusd_analysis: pyusdAnalysis,
    };
  }

  generateOverview(analysis: StructLogAnalysis, txHash: string): string {
    const { summary } = analysis;

    return `
StructLog Trace Summary for ${shortenAddress(txHash)}
Total Steps Parsed: ${summary.total_steps.toLocaleString()}
Total Gas Cost (calc): ${summary.total_gas_cost.toLocaleString()}
Max Depth: ${summary.max_depth}
Max Stack Depth: ${summary.max_stack_depth}
Max Memory (bytes): ${summary.max_memory_bytes.toLocaleString()}
Steps in PYUSD Contracts: ${summary.pyusd_steps.toLocaleString()} (${summary.pyusd_percentage.toFixed(
      1
    )}% of execution)
    `.trim();
  }
}
