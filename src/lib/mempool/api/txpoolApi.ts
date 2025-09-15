import { ethers } from "ethers";
import { blockchainService } from "@/lib/blockchainService";
import type { TransactionData, TxPoolContent, TxPoolStatus } from "../types";
import { DEFAULTS } from "../constants";

export class TxPoolApi {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor(provider?: ethers.JsonRpcProvider) {
    this.provider = provider || blockchainService.getProvider();
  }

  async getTxPoolStatus(network: string = "mainnet"): Promise<TxPoolStatus> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const result = await this.provider.send("txpool_status", []);

      if (!result) {
        throw new Error("No data returned from txpool_status");
      }

      const pending = parseInt(result.pending || "0x0", 16);
      const queued = parseInt(result.queued || "0x0", 16);

      return {
        pending,
        queued,
        total: pending + queued,
        timestamp: Date.now(),
        network,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("method not found")) {
          throw new Error(
            "txpool_status method not available on this RPC endpoint. " +
              "This method requires a debug-enabled Ethereum node.",
          );
        }
        if (error.message.includes("rate limit")) {
          throw new Error(
            "Rate limit exceeded. Transaction pool queries are expensive operations.",
          );
        }
        throw new Error(
          `Failed to get transaction pool status: ${error.message}`,
        );
      }
      throw new Error(
        "Unknown error occurred while fetching transaction pool status",
      );
    }
  }

  async getTxPoolContent(network: string = "mainnet"): Promise<TxPoolContent> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const result = await this.provider.send("txpool_content", []);

      if (!result) {
        throw new Error("No data returned from txpool_content");
      }

      const content: TxPoolContent = {
        pending: result.pending || {},
        queued: result.queued || {},
      };

      this.validateTxPoolContent(content);

      return content;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("method not found")) {
          throw new Error(
            "txpool_content method not available on this RPC endpoint. " +
              "This method is often restricted due to its high cost and resource usage.",
          );
        }
        if (error.message.includes("rate limit")) {
          throw new Error(
            "Rate limit exceeded. txpool_content is an extremely expensive operation " +
              "and may be rate-limited or blocked on many RPC endpoints.",
          );
        }
        if (error.message.includes("too many requests")) {
          throw new Error(
            "Too many requests. Please wait before making another txpool_content request.",
          );
        }
        throw new Error(
          `Failed to get transaction pool content: ${error.message}`,
        );
      }
      throw new Error(
        "Unknown error occurred while fetching transaction pool content",
      );
    }
  }

  async getCurrentBaseFee(network: string = "mainnet"): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const latestBlock = await this.provider.getBlock("latest");

      if (!latestBlock || !latestBlock.baseFeePerGas) {
        return DEFAULTS.BASE_FEE_GWEI;
      }

      const baseFeeGwei = parseFloat(
        ethers.formatUnits(latestBlock.baseFeePerGas, "gwei"),
      );
      return baseFeeGwei;
    } catch (error) {
      console.warn(`Could not get current base fee for ${network}:`, error);
      return DEFAULTS.BASE_FEE_GWEI;
    }
  }

  async getGasPrice(network: string = "mainnet"): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const gasPrice = await this.provider.getFeeData();

      if (gasPrice.gasPrice) {
        return parseFloat(ethers.formatUnits(gasPrice.gasPrice, "gwei"));
      }

      return DEFAULTS.BASE_FEE_GWEI;
    } catch (error) {
      console.warn(`Could not get gas price for ${network}:`, error);
      return DEFAULTS.BASE_FEE_GWEI;
    }
  }

  private validateTxPoolContent(content: TxPoolContent): void {
    if (!content.pending || typeof content.pending !== "object") {
      throw new Error(
        "Invalid txpool_content response: missing or invalid pending transactions",
      );
    }

    if (!content.queued || typeof content.queued !== "object") {
      throw new Error(
        "Invalid txpool_content response: missing or invalid queued transactions",
      );
    }

    const sampleTransactions = this.getSampleTransactions(content, 5);
    for (const tx of sampleTransactions) {
      this.validateTransactionData(tx);
    }
  }

  private getSampleTransactions(
    content: TxPoolContent,
    maxSamples: number,
  ): TransactionData[] {
    const transactions: TransactionData[] = [];
    let count = 0;

    for (const sender in content.pending) {
      if (count >= maxSamples) break;
      for (const nonce in content.pending[sender]) {
        if (count >= maxSamples) break;
        transactions.push(content.pending[sender][nonce]);
        count++;
      }
    }

    return transactions;
  }

  private validateTransactionData(tx: TransactionData): void {
    if (!tx.hash || typeof tx.hash !== "string") {
      throw new Error("Invalid transaction data: missing or invalid hash");
    }

    if (!tx.from || typeof tx.from !== "string") {
      throw new Error(
        "Invalid transaction data: missing or invalid from address",
      );
    }

    if (tx.to !== null && typeof tx.to !== "string") {
      throw new Error("Invalid transaction data: invalid to address");
    }

    if (!tx.gasPrice || typeof tx.gasPrice !== "string") {
      throw new Error("Invalid transaction data: missing or invalid gasPrice");
    }
  }

  async checkTxPoolMethodsAvailability(): Promise<{
    txpool_status: boolean;
    txpool_content: boolean;
    errors: string[];
  }> {
    const result = {
      txpool_status: false,
      txpool_content: false,
      errors: [] as string[],
    };

    if (!this.provider) {
      result.errors.push("Provider not available");
      return result;
    }

    try {
      await this.provider.send("txpool_status", []);
      result.txpool_status = true;
    } catch (error) {
      result.errors.push(
        `txpool_status not available: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000),
      );

      const contentPromise = this.provider.send("txpool_content", []);

      await Promise.race([contentPromise, timeoutPromise]);
      result.txpool_content = true;
    } catch (error) {
      result.errors.push(
        `txpool_content not available: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return result;
  }
}
