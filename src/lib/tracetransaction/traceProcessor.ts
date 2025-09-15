import { PYUSD_CONFIG, PYUSD_CONTRACTS } from "./constants";
import { decodePyusdFunction, getFunctionDescription } from "./functionDecoder";
import type {
  AnalysisSummary,
  ContractInteraction,
  ProcessedTraceAction,
  RawTraceAction,
  TokenTransfer,
} from "./types";

function hexToInt(hex: string): number {
  if (!hex || hex === "0x" || hex === "0x0") return 0;
  try {
    return parseInt(hex, 16);
  } catch {
    return 0;
  }
}

export function processTraceActions(
  traceList: RawTraceAction[],
): ProcessedTraceAction[] {
  if (!Array.isArray(traceList)) {
    console.warn("Expected array for trace list, got:", typeof traceList);
    return [];
  }

  const processedActions: ProcessedTraceAction[] = [];

  for (let i = 0; i < traceList.length; i++) {
    const traceItem = traceList[i];

    if (!traceItem || typeof traceItem !== "object") {
      console.warn(`Invalid trace item at index ${i}:`, traceItem);
      continue;
    }

    const action = traceItem.action || {};
    const result = traceItem.result || {};
    const traceType = traceItem.type?.toUpperCase() || "UNKNOWN";
    const traceAddr = traceItem.traceAddress || [];
    const error = traceItem.error;

    const currentDepth = traceAddr.length;
    const fromAddr = action.from || "";
    const toAddr = action.to || result.address || "";

    const valueRawWei = hexToInt(action.value || "0x0");
    const valueEth = valueRawWei / 10 ** 18;
    const gasUsed = hexToInt(result.gasUsed || traceItem.gasUsed || "0x0");

    const callData = action.input || "0x";
    const outputData = result.output || "0x";

    const toAddrLower = toAddr.toLowerCase();
    const isPyusdCall = toAddrLower in PYUSD_CONTRACTS;
    const contractName = isPyusdCall
      ? PYUSD_CONTRACTS[toAddrLower as keyof typeof PYUSD_CONTRACTS]
      : "Other Contract";

    let functionDecoded = { name: "N/A", category: "other", params: {} };

    if (traceType === "CREATE") {
      functionDecoded.name = "Constructor";
      functionDecoded.category = "constructor";
    } else if (
      ["CALL", "DELEGATECALL", "STATICCALL"].includes(traceType) &&
      callData &&
      callData !== "0x"
    ) {
      if (isPyusdCall) {
        functionDecoded = decodePyusdFunction(callData);
      } else {
        functionDecoded.name = getFunctionDescription(
          callData,
          isPyusdCall,
          contractName,
        );
      }
    }

    const processedAction: ProcessedTraceAction = {
      index: i,
      traceAddress: traceAddr,
      type: traceType,
      depth: currentDepth,
      from: fromAddr,
      to: toAddr,
      value: valueRawWei,
      valueEth: valueEth,
      gasUsed: gasUsed,
      isPyusd: isPyusdCall,
      contract: contractName,
      function: functionDecoded.name,
      category: functionDecoded.category,
      parameters: functionDecoded.params,
      error: error || undefined,
      inputPreview: callData.slice(0, 10) + (callData.length > 10 ? "..." : ""),
      outputPreview:
        outputData.slice(0, 10) + (outputData.length > 10 ? "..." : ""),
    };

    processedActions.push(processedAction);
  }

  return processedActions;
}

export function extractContractInteractions(
  traces: ProcessedTraceAction[],
): ContractInteraction[] {
  const interactions = new Map<string, ContractInteraction>();

  for (const trace of traces) {
    if (!trace.from || !trace.to || trace.from === trace.to) continue;

    const key = `${trace.from.toLowerCase()}:${trace.to.toLowerCase()}`;

    if (interactions.has(key)) {
      const existing = interactions.get(key)!;
      existing.count += 1;
      existing.gas += trace.gasUsed;
    } else {
      interactions.set(key, {
        from: trace.from,
        to: trace.to,
        count: 1,
        gas: trace.gasUsed,
      });
    }
  }

  return Array.from(interactions.values());
}

export function extractPyusdTransfers(
  traces: ProcessedTraceAction[],
): TokenTransfer[] {
  const transfers: TokenTransfer[] = [];

  for (const trace of traces) {
    if (!trace.isPyusd || !trace.parameters) continue;

    const methodSig = trace.inputPreview;

    if (
      methodSig === "0xa9059cbb" &&
      trace.parameters.amount &&
      trace.parameters.to
    ) {
      transfers.push({
        from: trace.from,
        to: trace.parameters.to,
        amount: trace.parameters.amount,
        value: trace.parameters.amount / 10 ** PYUSD_CONFIG.ethereum.decimals,
        trace_addr: trace.traceAddress,
      });
    } else if (
      methodSig === "0x23b872dd" &&
      trace.parameters.amount &&
      trace.parameters.from &&
      trace.parameters.to
    ) {
      transfers.push({
        from: trace.parameters.from,
        to: trace.parameters.to,
        amount: trace.parameters.amount,
        value: trace.parameters.amount / 10 ** PYUSD_CONFIG.ethereum.decimals,
        trace_addr: trace.traceAddress,
      });
    } else if (
      methodSig === "0x40c10f19" &&
      trace.parameters.amount &&
      trace.parameters.to
    ) {
      transfers.push({
        from: "0x0000000000000000000000000000000000000000",
        to: trace.parameters.to,
        amount: trace.parameters.amount,
        value: trace.parameters.amount / 10 ** PYUSD_CONFIG.ethereum.decimals,
        trace_addr: trace.traceAddress,
      });
    } else if (methodSig === "0x42966c68" && trace.parameters.amount) {
      transfers.push({
        from: trace.from,
        to: "0x0000000000000000000000000000000000000000",
        amount: trace.parameters.amount,
        value: trace.parameters.amount / 10 ** PYUSD_CONFIG.ethereum.decimals,
        trace_addr: trace.traceAddress,
      });
    }
  }

  return transfers;
}

export function analyzeCallHierarchy(traces: ProcessedTraceAction[]) {
  const maxDepth = Math.max(...traces.map((t) => t.depth), 0);
  const gasPerDepth: Record<number, number> = {};
  const callsPerDepth: Record<number, number> = {};

  for (const trace of traces) {
    const depth = trace.depth;
    gasPerDepth[depth] = (gasPerDepth[depth] || 0) + trace.gasUsed;
    callsPerDepth[depth] = (callsPerDepth[depth] || 0) + 1;
  }

  return {
    maxDepth,
    gasPerDepth,
    callsPerDepth,
    totalCalls: traces.length,
  };
}

export function calculateGasMetrics(traces: ProcessedTraceAction[]) {
  const totalGas = traces.reduce((sum, trace) => sum + trace.gasUsed, 0);
  const pyusdTraces = traces.filter((t) => t.isPyusd);
  const pyusdGas = pyusdTraces.reduce((sum, trace) => sum + trace.gasUsed, 0);

  const gasPerContract: Record<string, number> = {};
  const gasPerFunction: Record<string, number> = {};

  for (const trace of traces) {
    gasPerContract[trace.contract] =
      (gasPerContract[trace.contract] || 0) + trace.gasUsed;
    if (trace.function !== "N/A") {
      gasPerFunction[trace.function] =
        (gasPerFunction[trace.function] || 0) + trace.gasUsed;
    }
  }

  return {
    totalGas,
    pyusdGas,
    pyusdGasPercentage: totalGas > 0 ? (pyusdGas / totalGas) * 100 : 0,
    gasPerContract,
    gasPerFunction,
    averageGasPerCall: traces.length > 0 ? totalGas / traces.length : 0,
  };
}

export function generateAnalysisSummary(
  traces: ProcessedTraceAction[],
  transfers: TokenTransfer[],
  interactions: ContractInteraction[],
): AnalysisSummary {
  const errors = traces.filter((t) => t.error).length;
  const pyusdInteractions = traces.filter((t) => t.isPyusd).length;
  const gasMetrics = calculateGasMetrics(traces);
  const hierarchyMetrics = analyzeCallHierarchy(traces);

  const uniqueContracts = new Set(traces.map((t) => t.to)).size;
  const complexityScore = Math.min(
    100,
    (traces.length * 2 +
      uniqueContracts * 5 +
      hierarchyMetrics.maxDepth * 10 +
      transfers.length * 3 +
      errors * 5) /
      3,
  );

  return {
    totalActions: traces.length,
    totalGasUsed: gasMetrics.totalGas,
    errorsCount: errors,
    pyusdInteractions,
    pyusdTransfers: transfers.length,
    complexityScore,
    uniqueContracts,
    maxDepth: hierarchyMetrics.maxDepth,
    pyusdGasUsage: gasMetrics.pyusdGas,
    pyusdGasPercentage: gasMetrics.pyusdGasPercentage,
  };
}
