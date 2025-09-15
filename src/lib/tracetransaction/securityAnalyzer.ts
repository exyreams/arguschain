import { SECURITY_RISK_LEVELS } from "./constants";
import type {
  ApprovalOperation,
  ApprovalRisk,
  HighRiskOperation,
  ProcessedTraceAction,
  RiskAssessment,
  SecurityAssessmentData,
  SecurityConcern,
  SecurityRecommendation,
} from "./types";

export function detectSecurityConcerns(
  traces: ProcessedTraceAction[],
): SecurityConcern[] {
  const concerns: SecurityConcern[] = [];

  for (const trace of traces) {
    const functionName = trace.function;

    if (functionName in SECURITY_RISK_LEVELS) {
      const riskLevel =
        SECURITY_RISK_LEVELS[functionName as keyof typeof SECURITY_RISK_LEVELS];
      concerns.push({
        level: riskLevel as "low" | "medium" | "high" | "critical",
        description: `High-risk function '${functionName}' called`,
        contract: trace.contract,
        from: trace.from,
      });
    }

    if (
      functionName === "approve(address,uint256)" &&
      trace.parameters.amount
    ) {
      const amount = trace.parameters.amount;
      const maxUintApprox = 2 ** 256 - 2 ** 128;

      if (amount >= maxUintApprox) {
        concerns.push({
          level: "medium",
          description: "Potentially infinite approval granted",
          contract: trace.contract,
          from: trace.from,
        });
      } else if (amount >= 10 ** 6 * 1000000) {
        concerns.push({
          level: "low",
          description: `Large approval granted: ${trace.parameters.amount_formatted || "Unknown amount"}`,
          contract: trace.contract,
          from: trace.from,
        });
      }
    }

    if (functionName.toLowerCase().includes("selfdestruct")) {
      concerns.push({
        level: "critical",
        description: "Contract self-destruct called",
        contract: trace.contract,
        from: trace.from,
      });
    }

    if (functionName === "transferOwnership(address)") {
      concerns.push({
        level: "high",
        description: "Contract ownership transfer detected",
        contract: trace.contract,
        from: trace.from,
      });
    }

    if (functionName === "pause()" || functionName === "unpause()") {
      concerns.push({
        level: "medium",
        description: `Contract ${functionName === "pause()" ? "paused" : "unpaused"}`,
        contract: trace.contract,
        from: trace.from,
      });
    }

    if (trace.error) {
      concerns.push({
        level: "medium",
        description: `Transaction failed: ${trace.error}`,
        contract: trace.contract,
        from: trace.from,
      });
    }
  }

  return concerns;
}

export function analyzeRiskLevel(
  functionName: string,
  parameters: any[],
): RiskAssessment {
  let level: "low" | "medium" | "high" | "critical" = "low";
  let score = 0;
  const factors: string[] = [];
  const recommendations: string[] = [];

  if (functionName in SECURITY_RISK_LEVELS) {
    const riskLevel =
      SECURITY_RISK_LEVELS[functionName as keyof typeof SECURITY_RISK_LEVELS];
    switch (riskLevel) {
      case "critical":
        level = "critical";
        score = 100;
        factors.push("Critical system function");
        recommendations.push("Immediate review required");
        break;
      case "high":
        level = "high";
        score = 80;
        factors.push("High-privilege operation");
        recommendations.push("Verify authorization");
        break;
      case "medium":
        level = "medium";
        score = 50;
        factors.push("Administrative function");
        recommendations.push("Monitor for unusual activity");
        break;
      default:
        level = "low";
        score = 20;
        factors.push("Standard operation");
        break;
    }
  }

  if (functionName.includes("transfer") && parameters.length > 0) {
    const amount = parameters.find((p) => typeof p === "number" && p > 0);
    if (amount && amount > 1000000 * 10 ** 6) {
      score += 20;
      factors.push("Large transfer amount");
      recommendations.push("Verify transfer legitimacy");
    }
  }

  if (functionName.includes("approve")) {
    score += 10;
    factors.push("Approval operation");
    recommendations.push("Review approval amount and spender");
  }

  if (score >= 90) level = "critical";
  else if (score >= 70) level = "high";
  else if (score >= 40) level = "medium";
  else level = "low";

  return {
    level,
    score,
    factors,
    recommendations,
  };
}

export function validateApprovalAmounts(
  traces: ProcessedTraceAction[],
): ApprovalRisk[] {
  const approvalRisks: ApprovalRisk[] = [];

  for (const trace of traces) {
    if (
      trace.function === "approve(address,uint256)" &&
      trace.parameters.amount
    ) {
      const amount = trace.parameters.amount;
      const spender = trace.parameters.spender || "Unknown";
      const formattedAmount = trace.parameters.amount_formatted || "Unknown";

      const maxUintApprox = 2 ** 256 - 2 ** 128;
      const isInfinite = amount >= maxUintApprox;

      let riskLevel: "low" | "medium" | "high" = "low";
      let description = "";
      let recommendation = "";

      if (isInfinite) {
        riskLevel = "high";
        description = "Infinite approval granted - allows unlimited spending";
        recommendation =
          "Consider using exact approval amounts instead of infinite approvals";
      } else if (amount >= 1000000 * 10 ** 6) {
        riskLevel = "medium";
        description = `Large approval amount: ${formattedAmount}`;
        recommendation =
          "Verify the approval amount is appropriate for intended use";
      } else if (amount >= 10000 * 10 ** 6) {
        riskLevel = "low";
        description = `Moderate approval amount: ${formattedAmount}`;
        recommendation = "Monitor spender activity for unusual patterns";
      }

      if (riskLevel !== "low" || amount > 0) {
        const operation: ApprovalOperation = {
          spender,
          amount,
          formattedAmount,
          isInfinite,
          riskLevel,
        };

        approvalRisks.push({
          operation,
          riskLevel,
          description,
          recommendation,
        });
      }
    }
  }

  return approvalRisks;
}

export function generateSecurityAssessment(
  traces: ProcessedTraceAction[],
): SecurityAssessmentData {
  const concerns = detectSecurityConcerns(traces);
  const approvalRisks = validateApprovalAmounts(traces);

  const highRiskOperations: HighRiskOperation[] = [];
  for (const trace of traces) {
    const riskAssessment = analyzeRiskLevel(
      trace.function,
      Object.values(trace.parameters),
    );
    if (
      riskAssessment.level === "high" ||
      riskAssessment.level === "critical"
    ) {
      highRiskOperations.push({
        functionName: trace.function,
        riskLevel: riskAssessment.level,
        description: riskAssessment.factors.join(", "),
        contract: trace.contract,
      });
    }
  }

  let overallRisk: "low" | "medium" | "high" | "critical" = "low";
  const criticalConcerns = concerns.filter(
    (c) => c.level === "critical",
  ).length;
  const highConcerns = concerns.filter((c) => c.level === "high").length;
  const mediumConcerns = concerns.filter((c) => c.level === "medium").length;

  if (criticalConcerns > 0) {
    overallRisk = "critical";
  } else if (highConcerns > 0) {
    overallRisk = "high";
  } else if (mediumConcerns > 2 || highRiskOperations.length > 0) {
    overallRisk = "medium";
  }

  const recommendations: SecurityRecommendation[] = [];

  if (criticalConcerns > 0) {
    recommendations.push({
      type: "immediate_action",
      description:
        "Critical security issues detected - immediate review required",
      severity: "high",
    });
  }

  if (approvalRisks.some((r) => r.riskLevel === "high")) {
    recommendations.push({
      type: "approval_review",
      description: "Review infinite approvals and consider using exact amounts",
      severity: "medium",
    });
  }

  if (highRiskOperations.length > 0) {
    recommendations.push({
      type: "privilege_review",
      description: "High-privilege operations detected - verify authorization",
      severity: "medium",
    });
  }

  const errorCount = traces.filter((t) => t.error).length;
  if (errorCount > 0) {
    recommendations.push({
      type: "error_investigation",
      description: `${errorCount} failed operations detected - investigate causes`,
      severity: "low",
    });
  }

  if (concerns.length === 0 && highRiskOperations.length === 0) {
    recommendations.push({
      type: "monitoring",
      description: "No immediate security concerns - continue monitoring",
      severity: "low",
    });
  }

  return {
    overallRisk,
    concerns,
    highRiskOperations,
    recommendations,
  };
}

export function detectSecurityAntiPatterns(traces: ProcessedTraceAction[]): {
  patterns: string[];
  severity: "low" | "medium" | "high";
  recommendations: string[];
} {
  const patterns: string[] = [];
  const recommendations: string[] = [];
  let severity: "low" | "medium" | "high" = "low";

  const externalCalls = traces.filter((t) => t.type === "CALL" && !t.isPyusd);
  const stateChanges = traces.filter(
    (t) => t.function.includes("transfer") || t.function.includes("approve"),
  );

  if (externalCalls.length > 0 && stateChanges.length > 0) {
    for (let i = 0; i < traces.length - 1; i++) {
      if (
        !traces[i].isPyusd &&
        traces[i].type === "CALL" &&
        traces[i + 1].isPyusd &&
        traces[i + 1].function.includes("transfer")
      ) {
        patterns.push("Potential reentrancy pattern detected");
        severity = "medium";
        recommendations.push(
          "Review call order and implement reentrancy guards",
        );
        break;
      }
    }
  }

  const approvals = traces.filter(
    (t) => t.function === "approve(address,uint256)",
  );
  const transfers = traces.filter((t) => t.function.includes("transfer"));

  if (approvals.length > transfers.length && approvals.length > 2) {
    patterns.push("Unusual approval-to-transfer ratio");
    severity =
      Math.max(severity === "high" ? 2 : severity === "medium" ? 1 : 0, 1) === 2
        ? "high"
        : "medium";
    recommendations.push("Review approval strategy and consider batching");
  }

  const highGasCalls = traces.filter((t) => t.gasUsed > 500000);
  if (highGasCalls.length > 0) {
    patterns.push("High gas usage operations detected");
    recommendations.push("Optimize gas usage to prevent out-of-gas failures");
  }

  return {
    patterns,
    severity,
    recommendations,
  };
}
