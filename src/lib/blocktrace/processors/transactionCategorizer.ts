import { ethers } from "ethers";
import {
  categorizeTransaction,
  isPYUSDContract,
  detectFunctionSignature,
  formatAddress,
} from "../utils";
import {
  PYUSD_CONTRACTS,
  FUNCTION_SIGNATURES,
  TRANSACTION_CATEGORIES,
  CHART_COLORS,
} from "../constants";
import type {
  ProcessedBlockTrace,
  TransactionCategory,
  PYUSDTransactionDetails,
  NetworkType,
} from "../types";

export interface CategorizedTransaction extends ProcessedBlockTrace {
  categoryDetails: {
    primaryCategory: string;
    subCategory: string;
    confidence: number;
    description: string;
    color: string;
  };
  riskScore: number;
  complexityScore: number;
  relationships: string[];
}

export class TransactionCategorizer {
  private network: NetworkType;
  private knownContracts: Map<string, string> = new Map();
  private functionSignatures: Map<string, string> = new Map();

  constructor(network: NetworkType = "mainnet") {
    this.network = network;
    this.initializeKnownData();
  }

  /**
   * Categorize a batch of transactions
   */
  async categorizeTransactions(
    traces: ProcessedBlockTrace[]
  ): Promise<CategorizedTransaction[]> {
    console.log(`Categorizing ${traces.length} transactions...`);

    const categorized: CategorizedTransaction[] = [];
    const transactionGroups = this.groupTransactionsByHash(traces);

    for (const [txHash, txTraces] of transactionGroups) {
      try {
        const categorizedTx = await this.categorizeTransactionGroup(
          txHash,
          txTraces
        );
        categorized.push(...categorizedTx);
      } catch (error) {
        console.warn(`Failed to categorize transaction ${txHash}:`, error);
        // Add basic categorization for failed transactions
        const basicCategorized = txTraces.map((trace) =>
          this.createBasicCategorization(trace)
        );
        categorized.push(...basicCategorized);
      }
    }

    // Analyze relationships between transactions
    this.analyzeTransactionRelationships(categorized);

    console.log(`Successfully categorized ${categorized.length} transactions`);
    return categorized;
  }

  /**
   * Categorize a single transaction group (all traces for one transaction)
   */
  private async categorizeTransactionGroup(
    txHash: string,
    traces: ProcessedBlockTrace[]
  ): Promise<CategorizedTransaction[]> {
    const categorized: CategorizedTransaction[] = [];

    for (const trace of traces) {
      const categoryDetails = await this.analyzeTraceCategory(trace);
      const riskScore = this.calculateRiskScore(trace);
      const complexityScore = this.calculateComplexityScore(trace, traces);

      const categorizedTx: CategorizedTransaction = {
        ...trace,
        categoryDetails,
        riskScore,
        complexityScore,
        relationships: [], // Will be populated by relationship analysis
      };

      categorized.push(categorizedTx);
    }

    return categorized;
  }

  /**
   * Analyze trace category in detail
   */
  private async analyzeTraceCategory(trace: ProcessedBlockTrace): Promise<{
    primaryCategory: string;
    subCategory: string;
    confidence: number;
    description: string;
    color: string;
  }> {
    // Start with basic categorization
    const basicCategory = trace.category;

    // Enhanced categorization based on trace details
    let primaryCategory = basicCategory.type;
    let subCategory = basicCategory.subtype;
    let confidence = basicCategory.confidence;
    let description = basicCategory.description;

    // PYUSD specific analysis
    if (trace.pyusdDetails) {
      const pyusdAnalysis = this.analyzePYUSDTransaction(trace.pyusdDetails);
      subCategory = pyusdAnalysis.subCategory;
      description = pyusdAnalysis.description;
      confidence = Math.max(confidence, 0.9);
    }

    // Contract interaction analysis
    if (trace.to && trace.input && trace.input.length > 2) {
      const contractAnalysis = await this.analyzeContractInteraction(trace);
      if (contractAnalysis.confidence > confidence) {
        primaryCategory = contractAnalysis.category;
        subCategory = contractAnalysis.subCategory;
        confidence = contractAnalysis.confidence;
        description = contractAnalysis.description;
      }
    }

    // Error analysis
    if (trace.error) {
      const errorAnalysis = this.analyzeTransactionError(trace.error);
      subCategory = `${subCategory}_${errorAnalysis.category}`;
      description = `${description} (${errorAnalysis.description})`;
    }

    // Get color for category
    const color = this.getCategoryColor(primaryCategory);

    return {
      primaryCategory,
      subCategory,
      confidence,
      description,
      color,
    };
  }

  /**
   * Analyze PYUSD transaction details
   */
  private analyzePYUSDTransaction(pyusdDetails: PYUSDTransactionDetails): {
    subCategory: string;
    description: string;
  } {
    const { type, amount, success } = pyusdDetails;

    let subCategory = type;
    let description = `PYUSD ${type}`;

    // Add amount information
    if (amount > 0n) {
      description += ` of ${pyusdDetails.amountFormatted}`;
    }

    // Add success status
    if (!success) {
      subCategory += "_failed";
      description += " (failed)";
    }

    // Categorize by amount size
    const amountNum = Number(amount) / 1e6; // Convert to PYUSD units
    if (amountNum > 100000) {
      subCategory += "_large";
      description += " - Large amount";
    } else if (amountNum > 10000) {
      subCategory += "_medium";
      description += " - Medium amount";
    } else if (amountNum > 0) {
      subCategory += "_small";
      description += " - Small amount";
    }

    return { subCategory, description };
  }

  /**
   * Analyze contract interaction
   */
  private async analyzeContractInteraction(
    trace: ProcessedBlockTrace
  ): Promise<{
    category: string;
    subCategory: string;
    confidence: number;
    description: string;
  }> {
    const functionName = detectFunctionSignature(trace.input);

    // Check if it's a known contract
    const contractName = this.knownContracts.get(trace.to?.toLowerCase() || "");

    // DeFi pattern detection
    if (this.isDeFiInteraction(functionName, trace.to)) {
      return {
        category: "defi_interaction",
        subCategory: functionName || "unknown",
        confidence: 0.8,
        description: `DeFi interaction: ${functionName || "unknown function"}${contractName ? ` on ${contractName}` : ""}`,
      };
    }

    // Token transfer pattern detection
    if (this.isTokenTransfer(functionName)) {
      return {
        category: "token_transfer",
        subCategory: functionName || "unknown",
        confidence: 0.7,
        description: `Token ${functionName || "interaction"}${contractName ? ` on ${contractName}` : ""}`,
      };
    }

    // Generic contract call
    return {
      category: "contract_call",
      subCategory: functionName || "unknown",
      confidence: 0.6,
      description: `Contract call: ${functionName || "unknown function"}${contractName ? ` on ${contractName}` : ""}`,
    };
  }

  /**
   * Analyze transaction error
   */
  private analyzeTransactionError(error: string): {
    category: string;
    description: string;
  } {
    const errorLower = error.toLowerCase();

    if (errorLower.includes("out of gas") || errorLower.includes("gas")) {
      return {
        category: "gas_error",
        description: "Out of gas",
      };
    }

    if (errorLower.includes("revert")) {
      return {
        category: "revert",
        description: "Transaction reverted",
      };
    }

    if (errorLower.includes("insufficient")) {
      return {
        category: "insufficient_funds",
        description: "Insufficient funds",
      };
    }

    if (errorLower.includes("nonce")) {
      return {
        category: "nonce_error",
        description: "Nonce error",
      };
    }

    return {
      category: "unknown_error",
      description: "Unknown error",
    };
  }

  /**
   * Calculate risk score for a transaction
   */
  private calculateRiskScore(trace: ProcessedBlockTrace): number {
    let riskScore = 0;

    // Failed transactions increase risk
    if (!trace.success) {
      riskScore += 30;
    }

    // High gas usage increases risk
    const gasUsedNum = Number(trace.gasUsed);
    if (gasUsedNum > 500000) {
      riskScore += 20;
    } else if (gasUsedNum > 200000) {
      riskScore += 10;
    }

    // High value transfers increase risk
    if (trace.valueEth > 100) {
      riskScore += 25;
    } else if (trace.valueEth > 10) {
      riskScore += 15;
    } else if (trace.valueEth > 1) {
      riskScore += 5;
    }

    // Contract creation increases risk
    if (trace.type === "create") {
      riskScore += 15;
    }

    // Deep call stack increases risk
    if (trace.depth > 5) {
      riskScore += 10;
    } else if (trace.depth > 3) {
      riskScore += 5;
    }

    // Unknown function calls increase risk
    const functionName = detectFunctionSignature(trace.input);
    if (!functionName && trace.input.length > 2) {
      riskScore += 10;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Calculate complexity score for a transaction
   */
  private calculateComplexityScore(
    trace: ProcessedBlockTrace,
    allTraces: ProcessedBlockTrace[]
  ): number {
    let complexityScore = 0;

    // Base complexity from call depth
    complexityScore += trace.depth * 5;

    // Complexity from number of traces in transaction
    const txTraces = allTraces.filter(
      (t) => t.transactionHash === trace.transactionHash
    );
    complexityScore += Math.min(txTraces.length * 2, 30);

    // Complexity from gas usage
    const gasUsedNum = Number(trace.gasUsed);
    if (gasUsedNum > 1000000) {
      complexityScore += 25;
    } else if (gasUsedNum > 500000) {
      complexityScore += 15;
    } else if (gasUsedNum > 200000) {
      complexityScore += 10;
    }

    // Complexity from input data size
    if (trace.input.length > 1000) {
      complexityScore += 15;
    } else if (trace.input.length > 200) {
      complexityScore += 10;
    } else if (trace.input.length > 10) {
      complexityScore += 5;
    }

    // PYUSD transactions add complexity
    if (trace.pyusdDetails) {
      complexityScore += 10;
    }

    return Math.min(complexityScore, 100);
  }

  /**
   * Analyze relationships between transactions
   */
  private analyzeTransactionRelationships(
    transactions: CategorizedTransaction[]
  ): void {
    const addressMap = new Map<string, CategorizedTransaction[]>();

    // Group transactions by addresses
    transactions.forEach((tx) => {
      // Add to from address group
      if (!addressMap.has(tx.from)) {
        addressMap.set(tx.from, []);
      }
      addressMap.get(tx.from)!.push(tx);

      // Add to to address group
      if (tx.to) {
        if (!addressMap.has(tx.to)) {
          addressMap.set(tx.to, []);
        }
        addressMap.get(tx.to)!.push(tx);
      }
    });

    // Find relationships
    transactions.forEach((tx) => {
      const relationships: string[] = [];

      // Find transactions from same sender
      const fromSame = addressMap.get(tx.from) || [];
      if (fromSame.length > 1) {
        relationships.push(`part_of_${fromSame.length}_tx_batch`);
      }

      // Find transactions to same recipient
      if (tx.to) {
        const toSame = addressMap.get(tx.to) || [];
        if (toSame.length > 1) {
          relationships.push(
            `one_of_${toSame.length}_to_${formatAddress(tx.to)}`
          );
        }
      }

      // Find PYUSD related transactions
      if (tx.pyusdDetails) {
        const pyusdTxs = transactions.filter((t) => t.pyusdDetails);
        if (pyusdTxs.length > 1) {
          relationships.push(`pyusd_batch_${pyusdTxs.length}`);
        }
      }

      tx.relationships = relationships;
    });
  }

  /**
   * Helper methods
   */
  private groupTransactionsByHash(
    traces: ProcessedBlockTrace[]
  ): Map<string, ProcessedBlockTrace[]> {
    const groups = new Map<string, ProcessedBlockTrace[]>();

    traces.forEach((trace) => {
      if (!groups.has(trace.transactionHash)) {
        groups.set(trace.transactionHash, []);
      }
      groups.get(trace.transactionHash)!.push(trace);
    });

    return groups;
  }

  private createBasicCategorization(
    trace: ProcessedBlockTrace
  ): CategorizedTransaction {
    return {
      ...trace,
      categoryDetails: {
        primaryCategory: trace.category.type,
        subCategory: trace.category.subtype,
        confidence: trace.category.confidence,
        description: trace.category.description,
        color: this.getCategoryColor(trace.category.type),
      },
      riskScore: 0,
      complexityScore: 0,
      relationships: [],
    };
  }

  private isDeFiInteraction(
    functionName: string | null,
    contractAddress?: string
  ): boolean {
    if (!functionName) return false;

    const defiPatterns = [
      "swap",
      "deposit",
      "withdraw",
      "stake",
      "unstake",
      "claim",
      "harvest",
      "addLiquidity",
      "removeLiquidity",
      "borrow",
      "repay",
      "liquidate",
    ];

    return defiPatterns.some((pattern) =>
      functionName.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isTokenTransfer(functionName: string | null): boolean {
    if (!functionName) return false;

    const tokenPatterns = [
      "transfer",
      "transferFrom",
      "approve",
      "mint",
      "burn",
    ];
    return tokenPatterns.includes(functionName.toLowerCase());
  }

  private getCategoryColor(category: string): string {
    return (
      CHART_COLORS.TRANSACTION_TYPES[
        category as keyof typeof CHART_COLORS.TRANSACTION_TYPES
      ] || CHART_COLORS.CATEGORIES[0]
    );
  }

  private initializeKnownData(): void {
    // Initialize known contracts (this could be loaded from a database)
    this.knownContracts.set(
      PYUSD_CONTRACTS[this.network].toLowerCase(),
      "PYUSD Token"
    );

    // Initialize function signatures
    Object.entries(FUNCTION_SIGNATURES).forEach(([name, sig]) => {
      this.functionSignatures.set(sig.toLowerCase(), name);
    });
  }

  /**
   * Get categorization statistics
   */
  getCategorizationStatistics(transactions: CategorizedTransaction[]): {
    totalTransactions: number;
    categoryDistribution: Record<string, number>;
    riskDistribution: { low: number; medium: number; high: number };
    complexityDistribution: { low: number; medium: number; high: number };
    pyusdTransactions: number;
    failedTransactions: number;
  } {
    const stats = {
      totalTransactions: transactions.length,
      categoryDistribution: {} as Record<string, number>,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      complexityDistribution: { low: 0, medium: 0, high: 0 },
      pyusdTransactions: 0,
      failedTransactions: 0,
    };

    transactions.forEach((tx) => {
      // Category distribution
      const category = tx.categoryDetails.primaryCategory;
      stats.categoryDistribution[category] =
        (stats.categoryDistribution[category] || 0) + 1;

      // Risk distribution
      if (tx.riskScore < 30) {
        stats.riskDistribution.low++;
      } else if (tx.riskScore < 70) {
        stats.riskDistribution.medium++;
      } else {
        stats.riskDistribution.high++;
      }

      // Complexity distribution
      if (tx.complexityScore < 30) {
        stats.complexityDistribution.low++;
      } else if (tx.complexityScore < 70) {
        stats.complexityDistribution.medium++;
      } else {
        stats.complexityDistribution.high++;
      }

      // PYUSD transactions
      if (tx.pyusdDetails) {
        stats.pyusdTransactions++;
      }

      // Failed transactions
      if (!tx.success) {
        stats.failedTransactions++;
      }
    });

    return stats;
  }
}
