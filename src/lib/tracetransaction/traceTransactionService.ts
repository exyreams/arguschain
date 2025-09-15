import { blockchainService } from "../blockchainService";
import {
  extractContractInteractions,
  extractPyusdTransfers,
  generateAnalysisSummary,
  processTraceActions,
} from "./traceProcessor";
import { analyzeTransactionPatterns } from "./patternDetector";
import { generateSecurityAssessment } from "./securityAnalyzer";
import { generateGasAnalysis } from "./gasAnalyzer";
import {
  createCallGraphData,
  createContractInteractionGraphData,
  createFlowGraphData,
} from "./visualizationData";
import type {
  AnalysisOptions,
  RawTraceAction,
  TraceAnalysisResults,
} from "./types";

export class TraceTransactionService {
  private cache = new Map<string, TraceAnalysisResults>();
  private cacheTimeout = 5 * 60 * 1000;

  async analyzeTransaction(
    txHash: string,
    options: AnalysisOptions = {
      includePatternDetection: true,
      includeMevAnalysis: true,
      includeSecurityAnalysis: true,
      includeVisualization: true,
      analysisDepth: "full",
    },
  ): Promise<TraceAnalysisResults> {
    const cacheKey = `${txHash}_${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;

      if (Date.now() - (cached as any).timestamp < this.cacheTimeout) {
        return cached;
      }
    }

    try {
      console.log(`Fetching trace data for transaction: ${txHash}`);
      const rawTraceData = await blockchainService.traceTransactionRaw(txHash);

      if (!rawTraceData || !Array.isArray(rawTraceData)) {
        throw new Error("Invalid trace data received from RPC");
      }

      console.log(`Processing ${rawTraceData.length} trace actions`);
      const processedActions = processTraceActions(
        rawTraceData as RawTraceAction[],
      );

      if (processedActions.length === 0) {
        throw new Error("No valid trace actions found");
      }

      const contractInteractions =
        extractContractInteractions(processedActions);

      const pyusdTransfers = extractPyusdTransfers(processedActions);

      const summary = generateAnalysisSummary(
        processedActions,
        pyusdTransfers,
        contractInteractions,
      );

      let patternAnalysis = {
        pattern: "unknown",
        confidence: 0,
        description: "Pattern analysis disabled",
        indicators: [],
        complexity: 0,
        riskLevel: "low",
        matches: [],
      };

      let mevAnalysis = {
        mevDetected: false,
        mevType: undefined,
        confidence: 0,
        description: undefined,
        indicators: [],
        riskAssessment: "low",
      };

      if (options.includePatternDetection || options.includeMevAnalysis) {
        console.log("Performing pattern and MEV analysis");
        const patterns = analyzeTransactionPatterns(
          processedActions,
          pyusdTransfers,
        );

        if (options.includePatternDetection) {
          patternAnalysis = {
            pattern: patterns.primaryPattern.pattern,
            confidence: patterns.primaryPattern.confidence,
            description: patterns.primaryPattern.description,
            indicators: [],
            complexity: patterns.complexity.score,
            riskLevel:
              patterns.complexity.level === "low"
                ? "low"
                : patterns.complexity.level === "medium"
                  ? "medium"
                  : "high",
            matches: patterns.primaryPattern.matches,
          };
        }

        if (options.includeMevAnalysis) {
          mevAnalysis = {
            mevDetected: patterns.mevAnalysis.mev_detected,
            mevType: patterns.mevAnalysis.type,
            confidence: patterns.mevAnalysis.confidence,
            description: patterns.mevAnalysis.description,
            indicators: patterns.mevAnalysis.indicators,
            riskAssessment: patterns.mevAnalysis.mev_detected
              ? "medium"
              : "low",
          };
        }
      }

      let securityAssessment = {
        overallRisk: "low" as const,
        concerns: [],
        highRiskOperations: [],
        recommendations: [],
      };

      if (options.includeSecurityAnalysis) {
        console.log("Performing security analysis");
        securityAssessment = generateSecurityAssessment(processedActions);
      }

      console.log("Performing gas analysis");
      const gasAnalysis = generateGasAnalysis(processedActions);

      let visualizationData = {};

      if (options.includeVisualization) {
        console.log("Generating visualization data");

        const contractGraph =
          contractInteractions.length > 0
            ? createContractInteractionGraphData(contractInteractions)
            : null;

        const callGraph = createCallGraphData(processedActions);

        const flowGraph =
          pyusdTransfers.length > 0
            ? createFlowGraphData(pyusdTransfers)
            : null;

        visualizationData = {
          contractGraph,
          callGraph,
          flowGraph,
        };
      }

      const results: TraceAnalysisResults = {
        transactionHash: txHash,
        summary,
        processedActions,
        contractInteractions: contractInteractions.map((ci) => ({
          from: ci.from,
          to: ci.to,
          callCount: ci.count,
          totalGas: ci.gas,
          interactionType: "call",
          isPyusdRelated: false,
        })),
        tokenFlows: pyusdTransfers.map((transfer) => ({
          from: transfer.from,
          to: transfer.to,
          amount: transfer.amount,
          formattedAmount: `${transfer.value.toFixed(6)} PYUSD`,
          traceAddress: transfer.trace_addr,
          transferType: "transfer" as const,
          value: transfer.value,
        })),
        patternAnalysis,
        mevAnalysis,
        securityAssessment,
        gasAnalysis,
        visualizationData,
      };

      (results as any).timestamp = Date.now();
      this.cache.set(cacheKey, results);

      console.log(`Analysis complete for ${txHash}`);
      return results;
    } catch (error) {
      console.error(`Error analyzing transaction ${txHash}:`, error);
      throw error;
    }
  }

  validateTransactionHash(txHash: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!txHash || typeof txHash !== "string") {
      return { isValid: false, error: "Transaction hash is required" };
    }

    if (!txHash.startsWith("0x")) {
      return { isValid: false, error: "Transaction hash must start with 0x" };
    }

    if (txHash.length !== 66) {
      return {
        isValid: false,
        error: "Transaction hash must be 66 characters long",
      };
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return { isValid: false, error: "Invalid transaction hash format" };
    }

    return { isValid: true };
  }

  getCachedResults(
    txHash: string,
    options?: AnalysisOptions,
  ): TraceAnalysisResults | null {
    const cacheKey = `${txHash}_${JSON.stringify(options || {})}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - (cached as any).timestamp < this.cacheTimeout) {
      return cached;
    }

    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const traceTransactionService = new TraceTransactionService();
