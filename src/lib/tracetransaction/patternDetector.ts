import type {
  ComplexityAnalysis,
  ComplexityFactor,
  MevAnalysis,
  MevIndicator,
  PatternMatch,
  ProcessedTraceAction,
  TokenTransfer,
  TransactionPattern,
} from "./types";

export function identifyTransactionPattern(
  traces: ProcessedTraceAction[],
  pyusdTransfers: TokenTransfer[],
): TransactionPattern {
  const result: TransactionPattern = {
    pattern: "unknown",
    confidence: 0,
    description: "Unknown transaction pattern",
    matches: [],
  };

  if (traces.length === 0) return result;

  const pyusdTraces = traces.filter((t) => t.isPyusd);
  const contractCount = new Set(pyusdTraces.map((t) => t.to)).size;
  const functionCounts: Record<string, number> = {};

  for (const trace of pyusdTraces) {
    if (trace.function && trace.function !== "N/A") {
      functionCounts[trace.function] =
        (functionCounts[trace.function] || 0) + 1;
    }
  }

  const transferCount = pyusdTransfers.length;
  const matches: PatternMatch[] = [];

  if (
    transferCount === 1 &&
    contractCount <= 1 &&
    functionCounts["transfer(address,uint256)"] === 1
  ) {
    matches.push({
      pattern: "simple_transfer",
      confidence: 0.9,
      description: "Simple PYUSD transfer between addresses",
    });
  }

  if (transferCount > 1 && functionCounts["transfer(address,uint256)"] > 1) {
    matches.push({
      pattern: "multi_transfer",
      confidence: 0.8,
      description: "Multiple PYUSD transfers in one transaction",
    });
  }

  if (functionCounts["approve(address,uint256)"] >= 1) {
    matches.push({
      pattern: "approval_flow",
      confidence: 0.85,
      description: "PYUSD approval for future spending",
    });
  }

  if (
    functionCounts["mint(address,uint256)"] >= 1 ||
    functionCounts["burn(uint256)"] >= 1
  ) {
    matches.push({
      pattern: "supply_change",
      confidence: 0.95,
      description: "Minting or burning of PYUSD supply",
    });
  }

  const externalContractCalls = traces.filter(
    (t) => !t.isPyusd && t.type === "CALL",
  ).length;

  if (transferCount >= 1 && externalContractCalls >= 3) {
    matches.push({
      pattern: "swap_operation",
      confidence: 0.7,
      description: "PYUSD swap through DEX",
    });
  }

  if (
    transferCount >= 1 &&
    pyusdTraces.some((t) => t.function.includes("mint"))
  ) {
    matches.push({
      pattern: "liquidity_provision",
      confidence: 0.6,
      description: "Adding/removing liquidity with PYUSD",
    });
  }

  const totalGas = traces.reduce((sum, t) => sum + t.gasUsed, 0);
  if (transferCount >= 1 && totalGas > 500000) {
    matches.push({
      pattern: "bridge_operation",
      confidence: 0.6,
      description: "PYUSD bridge operation (cross-chain)",
    });
  }

  if (matches.length > 0) {
    matches.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = matches[0];
    result.pattern = bestMatch.pattern;
    result.confidence = bestMatch.confidence;
    result.description = bestMatch.description;
    result.matches = matches;
  }

  return result;
}

export function detectMevPotential(
  traces: ProcessedTraceAction[],
  txHash: string,
): MevAnalysis {
  const result: MevAnalysis = {
    mev_detected: false,
    type: null,
    confidence: 0,
    description: null,
    indicators: [],
  };

  if (traces.length === 0) return result;

  const indicators: MevIndicator[] = [];
  const tokenMovements = traces.filter(
    (t) => t.function.includes("transfer") || t.function.includes("swap"),
  ).length;

  const uniqueContracts = new Set(traces.map((t) => t.to)).size;

  const hasSwap = traces.some((t) => t.function.toLowerCase().includes("swap"));

  const externalCalls = traces.filter((t) => !t.isPyusd).length;

  if (hasSwap && externalCalls > 3) {
    indicators.push({
      type: "potential_sandwich_target",
      confidence: 0.6,
      description: "Transaction contains swap with external calls",
    });
  }

  if (tokenMovements >= 3 && uniqueContracts >= 3) {
    indicators.push({
      type: "potential_arbitrage",
      confidence: 0.7,
      description: "Multiple token movements across different contracts",
    });
  }

  if (traces.length > 20 && uniqueContracts > 5) {
    indicators.push({
      type: "complex_operation",
      confidence: 0.5,
      description: "Complex multi-step operation with many contracts",
    });
  }

  const totalGas = traces.reduce((sum, t) => sum + t.gasUsed, 0);
  if (totalGas > 1000000) {
    indicators.push({
      type: "high_gas_usage",
      confidence: 0.4,
      description: "High gas usage potentially indicating MEV activity",
    });
  }

  if (indicators.length > 0) {
    indicators.sort((a, b) => b.confidence - a.confidence);
    const bestIndicator = indicators[0];

    result.mev_detected = true;
    result.type = bestIndicator.type;
    result.confidence = bestIndicator.confidence;
    result.description = bestIndicator.description;
    result.indicators = indicators;
  }

  return result;
}

export function analyzeComplexity(
  traces: ProcessedTraceAction[],
): ComplexityAnalysis {
  const factors: ComplexityFactor[] = [];

  const maxDepth = Math.max(...traces.map((t) => t.depth), 0);
  factors.push({
    name: "Call Depth",
    value: maxDepth,
    weight: 0.3,
    contribution: Math.min(maxDepth * 10, 50),
  });

  const uniqueContracts = new Set(traces.map((t) => t.to)).size;
  factors.push({
    name: "Unique Contracts",
    value: uniqueContracts,
    weight: 0.25,
    contribution: Math.min(uniqueContracts * 5, 30),
  });

  factors.push({
    name: "Total Calls",
    value: traces.length,
    weight: 0.2,
    contribution: Math.min(traces.length * 2, 40),
  });

  const totalGas = traces.reduce((sum, t) => sum + t.gasUsed, 0);
  const gasComplexity = Math.min(totalGas / 100000, 20);
  factors.push({
    name: "Gas Usage",
    value: totalGas,
    weight: 0.15,
    contribution: gasComplexity,
  });

  const errorCount = traces.filter((t) => t.error).length;
  const errorRate = traces.length > 0 ? (errorCount / traces.length) * 100 : 0;
  factors.push({
    name: "Error Rate",
    value: errorRate,
    weight: 0.1,
    contribution: errorRate * 2,
  });

  const score = Math.min(
    100,
    factors.reduce(
      (sum, factor) => sum + factor.contribution * factor.weight,
      0,
    ),
  );

  let level: "low" | "medium" | "high" | "very_high";
  if (score < 20) level = "low";
  else if (score < 40) level = "medium";
  else if (score < 70) level = "high";
  else level = "very_high";

  return {
    score,
    factors,
    level,
  };
}

export function analyzeTransactionPatterns(
  traces: ProcessedTraceAction[],
  transfers: TokenTransfer[],
): {
  primaryPattern: TransactionPattern;
  allPatterns: TransactionPattern[];
  complexity: ComplexityAnalysis;
  mevAnalysis: MevAnalysis;
} {
  const primaryPattern = identifyTransactionPattern(traces, transfers);
  const complexity = analyzeComplexity(traces);
  const mevAnalysis = detectMevPotential(traces, "");

  const allPatterns = [primaryPattern];

  return {
    primaryPattern,
    allPatterns,
    complexity,
    mevAnalysis,
  };
}

export function generatePatternInsights(pattern: TransactionPattern): {
  insights: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
} {
  const insights: string[] = [];
  const recommendations: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  switch (pattern.pattern) {
    case "simple_transfer":
      insights.push(
        "This is a straightforward PYUSD transfer between two addresses",
      );
      insights.push("Low complexity transaction with minimal gas usage");
      recommendations.push("Consider batching multiple transfers to save gas");
      riskLevel = "low";
      break;

    case "swap_operation":
      insights.push("This transaction involves swapping PYUSD through a DEX");
      insights.push("Multiple contract interactions detected");
      recommendations.push("Monitor slippage and MEV protection");
      recommendations.push("Consider using MEV-protected transaction pools");
      riskLevel = "medium";
      break;

    case "supply_change":
      insights.push("This transaction modifies PYUSD token supply");
      insights.push(
        "Administrative operation with high privilege requirements",
      );
      recommendations.push("Verify authorization and audit trail");
      recommendations.push("Monitor for unusual supply changes");
      riskLevel = "high";
      break;

    case "multi_transfer":
      insights.push("Multiple PYUSD transfers in a single transaction");
      insights.push("Efficient gas usage through batching");
      recommendations.push("Good practice for reducing transaction costs");
      riskLevel = "low";
      break;

    default:
      insights.push("Transaction pattern not clearly identified");
      recommendations.push(
        "Manual review recommended for complex transactions",
      );
      riskLevel = "medium";
  }

  return { insights, recommendations, riskLevel };
}
