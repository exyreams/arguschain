import type {
  ProcessedReplayData,
  SecurityFlag,
  StateDiffAnalysis,
  TokenTransfer,
  TraceAnalysis,
} from "./types";
import { SECURITY_THRESHOLDS } from "./constants";

export interface SecurityAnalysisResult {
  flags: SecurityFlag[];
  riskScore: number;
  riskLevel: "minimal" | "low" | "medium" | "high" | "critical";
  recommendations: SecurityRecommendation[];
  patterns: SuspiciousPattern[];
  timeline: SecurityEvent[];
}

export interface SecurityRecommendation {
  id: string;
  type: "immediate" | "monitoring" | "investigation" | "prevention";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  action: string;
  resources?: string[];
  estimatedEffort: "low" | "medium" | "high";
}

export interface SuspiciousPattern {
  id: string;
  type:
    | "admin_abuse"
    | "flash_loan"
    | "sandwich_attack"
    | "front_running"
    | "rug_pull"
    | "unusual_activity";
  confidence: number;
  description: string;
  indicators: string[];
  severity: "low" | "medium" | "high" | "critical";
  mitigation: string;
}

export interface SecurityEvent {
  timestamp: number;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  transactionIndex?: number;
  address?: string;
  metadata?: Record<string, any>;
}

export class SecurityAnalysisEngine {
  static analyzeTransaction(data: ProcessedReplayData): SecurityAnalysisResult {
    const flags: SecurityFlag[] = [];
    const patterns: SuspiciousPattern[] = [];
    const timeline: SecurityEvent[] = [];

    if (data.traceAnalysis) {
      flags.push(...this.analyzeCallTrace(data.traceAnalysis));
      patterns.push(...this.detectTracePatterns(data.traceAnalysis));
    }

    if (data.stateDiffAnalysis) {
      flags.push(...this.analyzeStateDiff(data.stateDiffAnalysis));
      patterns.push(...this.detectStateDiffPatterns(data.stateDiffAnalysis));
    }

    if (data.tokenAnalysis) {
      flags.push(...this.analyzeTokenActivity(data.tokenAnalysis));
      patterns.push(...this.detectTokenPatterns(data.tokenAnalysis));
    }

    flags.push(...this.performCrossReferenceAnalysis(data));
    patterns.push(...this.detectAdvancedPatterns(data));

    timeline.push(...this.generateSecurityTimeline(flags, data));

    const riskScore = this.calculateRiskScore(flags, patterns);
    const riskLevel = this.determineRiskLevel(riskScore);

    const recommendations = this.generateRecommendations(
      flags,
      patterns,
      riskLevel,
    );

    return {
      flags,
      riskScore,
      riskLevel,
      recommendations,
      patterns,
      timeline,
    };
  }

  private static analyzeCallTrace(
    traceAnalysis: TraceAnalysis,
  ): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    traceAnalysis.functionCalls?.forEach((call, index) => {
      if (this.isAdminFunction(call.name || call.signature)) {
        flags.push({
          id: `admin-call-${index}`,
          type: "admin_function",
          severity: this.getAdminFunctionSeverity(call.name || call.signature),
          title: "Administrative Function Called",
          description: `Admin function ${call.name || call.signature} was executed`,
          details: `The administrative function ${call.name || call.signature} was called on contract ${call.contractAddress}. This could affect contract security or operations.`,
          transactionIndex: index,
          address: call.contractAddress,
          recommendation:
            "Verify that this administrative action was authorized and expected.",
          metadata: {
            functionName: call.name || call.signature,
            gasUsed: call.gasUsed,
            success: call.success,
          },
        });
      }

      if (call.gasUsed > SECURITY_THRESHOLDS.highGasUsage) {
        flags.push({
          id: `high-gas-${index}`,
          type: "suspicious_pattern",
          severity: "medium",
          title: "High Gas Usage Function Call",
          description: `Function call used ${call.gasUsed.toLocaleString()} gas`,
          details: `A function call consumed an unusually high amount of gas (${call.gasUsed.toLocaleString()}), which could indicate complex operations or potential issues.`,
          transactionIndex: index,
          address: call.contractAddress,
          recommendation:
            "Review the function logic for optimization opportunities or potential security issues.",
          metadata: {
            functionName: call.name || call.signature,
            gasUsed: call.gasUsed,
          },
        });
      }
    });

    if (traceAnalysis.maxDepth > SECURITY_THRESHOLDS.deepCallStack) {
      flags.push({
        id: "deep-call-stack",
        type: "suspicious_pattern",
        severity: "medium",
        title: "Deep Call Stack Detected",
        description: `Transaction has ${traceAnalysis.maxDepth} levels of nested calls`,
        details: `The transaction created a call stack ${traceAnalysis.maxDepth} levels deep, which could indicate complex interactions or potential reentrancy issues.`,
        recommendation:
          "Review the call pattern for potential reentrancy vulnerabilities or optimization opportunities.",
        metadata: {
          maxDepth: traceAnalysis.maxDepth,
          totalCalls: traceAnalysis.totalCalls,
        },
      });
    }

    if (traceAnalysis.errorCount > 0) {
      flags.push({
        id: "failed-calls",
        type: "suspicious_pattern",
        severity: traceAnalysis.errorCount > 3 ? "high" : "medium",
        title: "Failed Function Calls",
        description: `${traceAnalysis.errorCount} function calls failed during execution`,
        details: `Multiple function calls failed during transaction execution, which could indicate issues with contract logic or malicious activity.`,
        recommendation:
          "Investigate the cause of failed calls and ensure proper error handling.",
        metadata: {
          errorCount: traceAnalysis.errorCount,
          totalCalls: traceAnalysis.totalCalls,
          failureRate:
            (traceAnalysis.errorCount / traceAnalysis.totalCalls) * 100,
        },
      });
    }

    return flags;
  }

  private static analyzeStateDiff(
    stateDiffAnalysis: StateDiffAnalysis,
  ): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    stateDiffAnalysis.storageChanges?.forEach((change, index) => {
      if (this.isOwnershipSlot(change.slot)) {
        flags.push({
          id: `ownership-change-${index}`,
          type: "ownership_change",
          severity: "critical",
          title: "Contract Ownership Changed",
          description: "Contract ownership has been transferred",
          details: `Contract ownership changed from ${change.fromValue} to ${change.toValue} at slot ${change.slot}`,
          address: change.address,
          recommendation:
            "Immediately verify the legitimacy of this ownership transfer and ensure the new owner is trusted.",
          metadata: {
            oldOwner: change.fromValue,
            newOwner: change.toValue,
            slot: change.slot,
          },
        });
      }

      if (this.isPauseSlot(change.slot)) {
        const wasPaused = parseInt(change.fromValue, 16) > 0;
        const isPaused = parseInt(change.toValue, 16) > 0;

        flags.push({
          id: `pause-change-${index}`,
          type: "pause_state",
          severity: "high",
          title: "Contract Pause State Changed",
          description: `Contract ${isPaused ? "paused" : "unpaused"}`,
          details: `Contract pause state changed from ${wasPaused ? "paused" : "active"} to ${isPaused ? "paused" : "active"}`,
          address: change.address,
          recommendation:
            "Verify that the pause state change was intentional and authorized.",
          metadata: {
            wasPaused,
            isPaused,
            slot: change.slot,
          },
        });
      }
    });

    stateDiffAnalysis.codeChanges?.forEach((change, index) => {
      flags.push({
        id: `code-change-${index}`,
        type: "code_change",
        severity: "critical",
        title: "Contract Code Modified",
        description: `Contract code was ${change.changeType}`,
        details: `Contract at ${change.address} had its code ${change.changeType}. This is a critical security event that requires immediate attention.`,
        address: change.address,
        recommendation:
          "Immediately investigate this code change and verify its legitimacy. Consider pausing operations if unauthorized.",
        metadata: {
          changeType: change.changeType,
          fromCodeHash: change.fromCodeHash,
          toCodeHash: change.toCodeHash,
        },
      });
    });

    stateDiffAnalysis.balanceChanges?.forEach((change, index) => {
      const balanceChange = BigInt(change.toValue) - BigInt(change.fromValue);
      const changeAmount = Number(balanceChange) / 1e18;

      if (Math.abs(changeAmount) > 100) {
        flags.push({
          id: `large-balance-change-${index}`,
          type: "large_transfer",
          severity: Math.abs(changeAmount) > 1000 ? "critical" : "high",
          title: "Large Balance Change",
          description: `Balance changed by ${changeAmount.toFixed(4)} ETH`,
          details: `A significant balance change of ${changeAmount.toFixed(4)} ETH occurred at address ${change.address}`,
          address: change.address,
          recommendation:
            "Monitor this large balance change for potential security implications.",
          metadata: {
            changeAmount,
            fromBalance: change.fromValue,
            toBalance: change.toValue,
          },
        });
      }
    });

    return flags;
  }

  private static analyzeTokenActivity(tokenAnalysis: any): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    tokenAnalysis.tokenTransfers?.forEach(
      (transfer: TokenTransfer, index: number) => {
        const amount = Number(transfer.amount) / Math.pow(10, 6);

        if (amount > SECURITY_THRESHOLDS.largeTransfer) {
          flags.push({
            id: `large-token-transfer-${index}`,
            type: "large_transfer",
            severity: amount > 10000000 ? "critical" : "high",
            title: "Large Token Transfer",
            description: `Large ${transfer.tokenSymbol} transfer of ${transfer.formattedAmount}`,
            details: `A significant token transfer was detected from ${transfer.from} to ${transfer.to} for ${transfer.formattedAmount}.`,
            transactionIndex: transfer.transactionIndex,
            recommendation:
              "Monitor this large transfer for potential security implications or market impact.",
            metadata: {
              amount: transfer.formattedAmount,
              from: transfer.from,
              to: transfer.to,
              tokenAddress: transfer.tokenAddress,
              tokenSymbol: transfer.tokenSymbol,
            },
          });
        }

        if (
          transfer.from === "0x0000000000000000000000000000000000000000" ||
          transfer.to === "0x0000000000000000000000000000000000000000"
        ) {
          const isMint =
            transfer.from === "0x0000000000000000000000000000000000000000";

          flags.push({
            id: `${isMint ? "mint" : "burn"}-${index}`,
            type: "supply_change",
            severity: amount > 1000000 ? "high" : "medium",
            title: `Token ${isMint ? "Mint" : "Burn"} Detected`,
            description: `${transfer.formattedAmount} ${transfer.tokenSymbol} ${isMint ? "minted" : "burned"}`,
            details: `Token supply was ${isMint ? "increased" : "decreased"} by ${transfer.formattedAmount} ${transfer.tokenSymbol}.`,
            transactionIndex: transfer.transactionIndex,
            recommendation: `Verify that this ${isMint ? "mint" : "burn"} operation was authorized and expected.`,
            metadata: {
              operation: isMint ? "mint" : "burn",
              amount: transfer.formattedAmount,
              address: isMint ? transfer.to : transfer.from,
              tokenAddress: transfer.tokenAddress,
            },
          });
        }
      },
    );

    return flags;
  }

  private static performCrossReferenceAnalysis(
    data: ProcessedReplayData,
  ): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    if (
      data.tokenAnalysis?.tokenTransfers &&
      data.stateDiffAnalysis?.storageChanges
    ) {
      const tokenTransfers = data.tokenAnalysis.tokenTransfers;
      const storageChanges = data.stateDiffAnalysis.storageChanges;

      tokenTransfers.forEach((transfer, index) => {
        const relatedStorageChanges = storageChanges.filter(
          (change) =>
            change.address.toLowerCase() ===
            transfer.tokenAddress.toLowerCase(),
        );

        if (relatedStorageChanges.length === 0) {
          flags.push({
            id: `missing-storage-change-${index}`,
            type: "suspicious_pattern",
            severity: "medium",
            title: "Token Transfer Without Storage Change",
            description:
              "Token transfer detected without corresponding storage changes",
            details: `A token transfer of ${transfer.formattedAmount} ${transfer.tokenSymbol} was detected, but no corresponding storage changes were found.`,
            transactionIndex: transfer.transactionIndex,
            recommendation:
              "Investigate why the token transfer did not result in storage changes.",
            metadata: {
              transfer,
              expectedStorageChanges: relatedStorageChanges.length,
            },
          });
        }
      });
    }

    return flags;
  }

  private static detectAdvancedPatterns(
    data: ProcessedReplayData,
  ): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    if (this.detectFlashLoanPattern(data)) {
      patterns.push({
        id: "flash-loan-pattern",
        type: "flash_loan",
        confidence: 0.8,
        description: "Potential flash loan usage detected",
        indicators: [
          "Large temporary balance increase",
          "Complex DeFi interactions",
          "Balance returned to original state",
        ],
        severity: "medium",
        mitigation: "Monitor for arbitrage or liquidation activities",
      });
    }

    if (this.detectSandwichAttackPattern(data)) {
      patterns.push({
        id: "sandwich-attack-pattern",
        type: "sandwich_attack",
        confidence: 0.7,
        description: "Potential sandwich attack pattern detected",
        indicators: [
          "Multiple transactions in sequence",
          "Price manipulation indicators",
          "MEV extraction patterns",
        ],
        severity: "high",
        mitigation: "Implement MEV protection mechanisms",
      });
    }

    if (this.detectAdminAbusePattern(data)) {
      patterns.push({
        id: "admin-abuse-pattern",
        type: "admin_abuse",
        confidence: 0.9,
        description: "Potential admin privilege abuse detected",
        indicators: [
          "Multiple admin function calls",
          "Unusual parameter values",
          "Timing inconsistencies",
        ],
        severity: "critical",
        mitigation: "Implement multi-signature requirements and time delays",
      });
    }

    return patterns;
  }

  private static generateSecurityTimeline(
    flags: SecurityFlag[],
    data: ProcessedReplayData,
  ): SecurityEvent[] {
    const events: SecurityEvent[] = [];

    flags.forEach((flag) => {
      events.push({
        timestamp: Date.now() - (flag.transactionIndex || 0) * 1000,
        type: flag.type,
        severity: flag.severity,
        description: flag.title,
        transactionIndex: flag.transactionIndex,
        address: flag.address,
        metadata: flag.metadata,
      });
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  private static calculateRiskScore(
    flags: SecurityFlag[],
    patterns: SuspiciousPattern[],
  ): number {
    let score = 0;

    flags.forEach((flag) => {
      switch (flag.severity) {
        case "critical":
          score += 25;
          break;
        case "high":
          score += 15;
          break;
        case "medium":
          score += 8;
          break;
        case "low":
          score += 3;
          break;
      }
    });

    patterns.forEach((pattern) => {
      const confidenceMultiplier = pattern.confidence;
      switch (pattern.severity) {
        case "critical":
          score += 20 * confidenceMultiplier;
          break;
        case "high":
          score += 12 * confidenceMultiplier;
          break;
        case "medium":
          score += 6 * confidenceMultiplier;
          break;
        case "low":
          score += 2 * confidenceMultiplier;
          break;
      }
    });

    return Math.min(100, score);
  }

  private static determineRiskLevel(
    score: number,
  ): SecurityAnalysisResult["riskLevel"] {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    if (score >= 20) return "low";
    return "minimal";
  }

  private static generateRecommendations(
    flags: SecurityFlag[],
    patterns: SuspiciousPattern[],
    riskLevel: SecurityAnalysisResult["riskLevel"],
  ): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    if (flags.some((f) => f.type === "ownership_change")) {
      recommendations.push({
        id: "ownership-verification",
        type: "immediate",
        priority: "critical",
        title: "Verify Ownership Transfer",
        description: "Contract ownership has changed",
        action:
          "Immediately verify the legitimacy of the ownership transfer and ensure the new owner is trusted",
        resources: ["Contract documentation", "Multi-signature verification"],
        estimatedEffort: "high",
      });
    }

    if (flags.some((f) => f.type === "code_change")) {
      recommendations.push({
        id: "code-change-investigation",
        type: "immediate",
        priority: "critical",
        title: "Investigate Code Changes",
        description: "Contract code has been modified",
        action:
          "Immediately investigate the code changes and consider pausing operations if unauthorized",
        resources: ["Code audit", "Security team review"],
        estimatedEffort: "high",
      });
    }

    if (flags.some((f) => f.type === "large_transfer")) {
      recommendations.push({
        id: "monitor-large-transfers",
        type: "monitoring",
        priority: "high",
        title: "Monitor Large Transfers",
        description: "Large value transfers detected",
        action:
          "Set up monitoring alerts for large transfers and review transaction patterns",
        resources: ["Monitoring dashboard", "Alert system"],
        estimatedEffort: "medium",
      });
    }

    patterns.forEach((pattern) => {
      if (pattern.type === "flash_loan") {
        recommendations.push({
          id: "flash-loan-monitoring",
          type: "monitoring",
          priority: "medium",
          title: "Flash Loan Activity Monitoring",
          description: "Flash loan patterns detected",
          action:
            "Monitor for arbitrage activities and ensure proper slippage protection",
          resources: ["DeFi monitoring tools"],
          estimatedEffort: "medium",
        });
      }
    });

    if (riskLevel === "critical" || riskLevel === "high") {
      recommendations.push({
        id: "security-audit",
        type: "investigation",
        priority: "high",
        title: "Conduct Security Audit",
        description: "High risk level detected",
        action:
          "Conduct a comprehensive security audit of the affected contracts and transactions",
        resources: ["Security audit firm", "Internal security team"],
        estimatedEffort: "high",
      });
    }

    return recommendations;
  }

  private static detectTracePatterns(
    traceAnalysis: TraceAnalysis,
  ): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    const functionCallCounts = new Map<string, number>();
    traceAnalysis.functionCalls?.forEach((call) => {
      const key = `${call.contractAddress}-${call.name || call.signature}`;
      functionCallCounts.set(key, (functionCallCounts.get(key) || 0) + 1);
    });

    functionCallCounts.forEach((count, key) => {
      if (count > SECURITY_THRESHOLDS.suspiciousPatterns.repeatedCalls) {
        patterns.push({
          id: `repeated-calls-${key}`,
          type: "unusual_activity",
          confidence: 0.7,
          description: `Function called ${count} times in single transaction`,
          indicators: [`Repeated function calls: ${count} times`],
          severity: count > 100 ? "high" : "medium",
          mitigation:
            "Review function logic for potential optimization or security issues",
        });
      }
    });

    return patterns;
  }

  private static detectStateDiffPatterns(
    stateDiffAnalysis: StateDiffAnalysis,
  ): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    if (
      stateDiffAnalysis.storageChanges &&
      stateDiffAnalysis.storageChanges.length >
        SECURITY_THRESHOLDS.suspiciousPatterns.storageWrites
    ) {
      patterns.push({
        id: "excessive-storage-writes",
        type: "unusual_activity",
        confidence: 0.8,
        description: `Excessive storage writes: ${stateDiffAnalysis.storageChanges.length}`,
        indicators: [
          `${stateDiffAnalysis.storageChanges.length} storage changes in single transaction`,
        ],
        severity: "medium",
        mitigation:
          "Review storage access patterns for optimization opportunities",
      });
    }

    return patterns;
  }

  private static detectTokenPatterns(tokenAnalysis: any): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    if (this.hasCircularTransfers(tokenAnalysis.tokenTransfers)) {
      patterns.push({
        id: "circular-transfers",
        type: "unusual_activity",
        confidence: 0.9,
        description: "Circular token transfer pattern detected",
        indicators: ["Tokens transferred in circular pattern"],
        severity: "medium",
        mitigation: "Investigate the purpose of circular transfers",
      });
    }

    return patterns;
  }

  private static isAdminFunction(functionName: string): boolean {
    const adminFunctions = [
      "transferOwnership",
      "renounceOwnership",
      "pause",
      "unpause",
      "mint",
      "burn",
      "setMinter",
      "removeMinter",
      "upgrade",
      "initialize",
      "grantRole",
      "revokeRole",
      "setAdmin",
      "removeAdmin",
    ];

    return adminFunctions.some((fn) =>
      functionName.toLowerCase().includes(fn.toLowerCase()),
    );
  }

  private static getAdminFunctionSeverity(
    functionName: string,
  ): SecurityFlag["severity"] {
    const criticalFunctions = [
      "transferOwnership",
      "renounceOwnership",
      "upgrade",
    ];
    const highFunctions = ["mint", "burn", "pause", "unpause"];

    if (
      criticalFunctions.some((fn) =>
        functionName.toLowerCase().includes(fn.toLowerCase()),
      )
    ) {
      return "critical";
    }
    if (
      highFunctions.some((fn) =>
        functionName.toLowerCase().includes(fn.toLowerCase()),
      )
    ) {
      return "high";
    }
    return "medium";
  }

  private static isOwnershipSlot(slot: string): boolean {
    const ownershipSlots = [
      "0x6",
      "0x0000000000000000000000000000000000000000000000000000000000000006",
    ];
    return ownershipSlots.includes(slot);
  }

  private static isPauseSlot(slot: string): boolean {
    const pauseSlots = [
      "0x7",
      "0x0000000000000000000000000000000000000000000000000000000000000007",
    ];
    return pauseSlots.includes(slot);
  }

  private static detectFlashLoanPattern(data: ProcessedReplayData): boolean {
    if (!data.stateDiffAnalysis?.balanceChanges) return false;

    return data.stateDiffAnalysis.balanceChanges.some((change) => {
      const balanceChange = BigInt(change.toValue) - BigInt(change.fromValue);
      return Math.abs(Number(balanceChange)) > 1000 * 1e18;
    });
  }

  private static detectSandwichAttackPattern(
    data: ProcessedReplayData,
  ): boolean {
    return (
      data.traceAnalysis?.functionCalls?.some(
        (call) =>
          call.name?.toLowerCase().includes("swap") ||
          call.signature?.includes("swap"),
      ) || false
    );
  }

  private static detectAdminAbusePattern(data: ProcessedReplayData): boolean {
    const adminCalls =
      data.traceAnalysis?.functionCalls?.filter((call) =>
        this.isAdminFunction(call.name || call.signature),
      ) || [];

    return adminCalls.length > 2;
  }

  private static hasCircularTransfers(transfers: TokenTransfer[]): boolean {
    if (!transfers || transfers.length < 3) return false;

    const senders = new Set(transfers.map((t) => t.from));
    const receivers = new Set(transfers.map((t) => t.to));

    return Array.from(senders).some((sender) => receivers.has(sender));
  }
}
