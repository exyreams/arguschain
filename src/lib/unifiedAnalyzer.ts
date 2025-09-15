import { blockchainService } from "./blockchainService";

export interface UnifiedAnalysisResult {
  type: "transaction" | "block";
  identifier: string | number;
  data: any;
  metadata: {
    network: string;
    timestamp: number;
    processingTime: number;
  };
}

export interface AnalysisOptions {
  network?: "mainnet" | "sepolia";
  includeAdvancedAnalytics?: boolean;
  timeout?: number;
}

export class UnifiedAnalyzer {
  static async analyze(
    identifier: string | number,
    options: AnalysisOptions = {}
  ): Promise<UnifiedAnalysisResult> {
    const startTime = Date.now();

    await blockchainService.connect(options.network || "mainnet");

    if (!blockchainService.isConnected()) {
      throw new Error("Failed to connect to blockchain network");
    }

    const identifierInfo =
      await blockchainService.identifyIdentifierType(identifier);

    let result: UnifiedAnalysisResult;

    switch (identifierInfo.type) {
      case "transaction_hash":
        result = await this.analyzeTransaction(identifier as string, options);
        break;

      case "block_number":
      case "block_hash":
      case "block_tag":
        result = await this.analyzeBlock(identifier, options);
        break;

      default:
        throw new Error(
          `Invalid identifier: ${identifier}. ${identifierInfo.suggestion || "Please provide a valid transaction hash or block identifier."}`
        );
    }

    const networkInfo = await blockchainService.getNetworkInfo();
    result.metadata = {
      network: networkInfo.name,
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
    };

    return result;
  }

  private static async analyzeTransaction(
    txHash: string,
    options: AnalysisOptions
  ): Promise<UnifiedAnalysisResult> {
    try {
      const [transaction, receipt, callTrace, structLog] = await Promise.all([
        blockchainService.getTransaction(txHash),
        blockchainService.getTransactionReceipt(txHash),
        blockchainService.traceTransactionCallTracer(txHash).catch(() => null),
        blockchainService.traceTransactionStructLog(txHash).catch(() => null),
      ]);

      return {
        type: "transaction",
        identifier: txHash,
        data: {
          transaction,
          receipt,
          callTrace,
          structLog,
          analysis: {
            gasUsed: receipt?.gasUsed || 0,
            status: receipt?.status === 1 ? "success" : "failed",
            blockNumber: transaction?.blockNumber,
            transactionIndex: transaction?.transactionIndex,
          },
        },
        metadata: {
          network: "",
          timestamp: 0,
          processingTime: 0,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to analyze transaction ${txHash}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private static async analyzeBlock(
    blockIdentifier: string | number,
    options: AnalysisOptions
  ): Promise<UnifiedAnalysisResult> {
    throw new Error(
      "Block analysis functionality has been temporarily disabled for maintenance. Please use transaction analysis instead."
    );
  }

  static getSuggestions(): {
    category: string;
    examples: { label: string; value: string; description: string }[];
  }[] {
    return [
      {
        category: "Block Analysis",
        examples: [
          {
            label: "Latest Block",
            value: "latest",
            description: "Analyze the most recent block",
          },
          {
            label: "Specific Block",
            value: "18500000",
            description: "Analyze a specific block by number",
          },
          {
            label: "Recent Block",
            value: "latest-10",
            description: "Analyze a recent block (10 blocks ago)",
          },
        ],
      },
      {
        category: "Transaction Analysis",
        examples: [
          {
            label: "Failed Transaction",
            value: "0x...",
            description: "Analyze why a transaction failed",
          },
          {
            label: "High Gas Transaction",
            value: "0x...",
            description: "Analyze gas usage patterns",
          },
          {
            label: "DeFi Transaction",
            value: "0x...",
            description: "Analyze complex DeFi interactions",
          },
        ],
      },
    ];
  }
}
