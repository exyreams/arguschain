import { blockchainService } from "@/lib/blockchainService";
import { BlockInfo } from "../types";
import { PERFORMANCE_CONFIG, RPC_METHODS } from "../constants";

export class EthBlockApi {
  static async getBlockByNumber(
    blockNumber: string | number,
    includeTransactions: boolean = false,
  ): Promise<BlockInfo> {
    try {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }

      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Blockchain provider not available");
      }

      const formattedBlockNumber = this.formatBlockNumber(blockNumber);

      console.log(`Getting block by number: ${formattedBlockNumber}`);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timed out")),
          PERFORMANCE_CONFIG.BLOCK_INFO_TIMEOUT,
        ),
      );

      const blockPromise = provider.send(RPC_METHODS.ETH_GET_BLOCK_BY_NUMBER, [
        formattedBlockNumber,
        includeTransactions,
      ]);

      const block = await Promise.race([blockPromise, timeoutPromise]);

      if (!block) {
        throw new Error(`Block not found: ${blockNumber}`);
      }

      return this.processBlockData(block);
    } catch (error) {
      console.error(`Failed to get block by number ${blockNumber}:`, error);
      throw error;
    }
  }

  static async getBlockByHash(
    blockHash: string,
    includeTransactions: boolean = false,
  ): Promise<BlockInfo> {
    try {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }

      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Blockchain provider not available");
      }

      if (!this.isValidBlockHash(blockHash)) {
        throw new Error(`Invalid block hash format: ${blockHash}`);
      }

      console.log(`Getting block by hash: ${blockHash}`);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timed out")),
          PERFORMANCE_CONFIG.BLOCK_INFO_TIMEOUT,
        ),
      );

      const blockPromise = provider.send(RPC_METHODS.ETH_GET_BLOCK_BY_HASH, [
        blockHash,
        includeTransactions,
      ]);

      const block = await Promise.race([blockPromise, timeoutPromise]);

      if (!block) {
        throw new Error(`Block not found: ${blockHash}`);
      }

      return this.processBlockData(block);
    } catch (error) {
      console.error(`Failed to get block by hash ${blockHash}:`, error);
      throw error;
    }
  }

  static async getCurrentBlockNumber(): Promise<number> {
    try {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }

      return await blockchainService.getCurrentBlock();
    } catch (error) {
      console.error("Failed to get current block number:", error);
      throw error;
    }
  }

  static async getNetworkInfo(): Promise<{ name: string; chainId: number }> {
    try {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }

      return await blockchainService.getNetworkInfo();
    } catch (error) {
      console.error("Failed to get network info:", error);
      throw error;
    }
  }

  static async blockExists(blockIdentifier: string | number): Promise<boolean> {
    try {
      await this.getBlockByNumber(blockIdentifier, false);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getBlockRange(
    startBlock: string | number,
    endBlock: string | number,
  ): Promise<{
    startBlockInfo: BlockInfo;
    endBlockInfo: BlockInfo;
    totalBlocks: number;
    totalTransactions: number;
  }> {
    try {
      const [startBlockInfo, endBlockInfo] = await Promise.all([
        this.getBlockByNumber(startBlock, false),
        this.getBlockByNumber(endBlock, false),
      ]);

      const totalBlocks = endBlockInfo.number - startBlockInfo.number + 1;
      const totalTransactions =
        startBlockInfo.transactionCount + endBlockInfo.transactionCount;

      return {
        startBlockInfo,
        endBlockInfo,
        totalBlocks,
        totalTransactions,
      };
    } catch (error) {
      console.error(
        `Failed to get block range ${startBlock} to ${endBlock}:`,
        error,
      );
      throw error;
    }
  }

  static async getRecentBlocks(count: number = 10): Promise<BlockInfo[]> {
    try {
      const currentBlock = await this.getCurrentBlockNumber();
      const blockPromises: Promise<BlockInfo>[] = [];

      for (let i = 0; i < count; i++) {
        const blockNumber = currentBlock - i;
        if (blockNumber >= 0) {
          blockPromises.push(this.getBlockByNumber(blockNumber, false));
        }
      }

      return await Promise.all(blockPromises);
    } catch (error) {
      console.error(`Failed to get recent blocks:`, error);
      throw error;
    }
  }

  static async searchBlocks(criteria: {
    minTransactions?: number;
    maxTransactions?: number;
    startBlock?: number;
    endBlock?: number;
    limit?: number;
  }): Promise<BlockInfo[]> {
    const {
      minTransactions = 0,
      maxTransactions = Infinity,
      startBlock,
      endBlock,
      limit = 10,
    } = criteria;

    try {
      const currentBlock = await this.getCurrentBlockNumber();
      const searchStart = startBlock || Math.max(0, currentBlock - 1000);
      const searchEnd = endBlock || currentBlock;

      const matchingBlocks: BlockInfo[] = [];
      let searchedBlocks = 0;
      const maxSearchBlocks = 100;

      for (
        let blockNum = searchEnd;
        blockNum >= searchStart &&
        matchingBlocks.length < limit &&
        searchedBlocks < maxSearchBlocks;
        blockNum--
      ) {
        try {
          const blockInfo = await this.getBlockByNumber(blockNum, false);
          searchedBlocks++;

          if (
            blockInfo.transactionCount >= minTransactions &&
            blockInfo.transactionCount <= maxTransactions
          ) {
            matchingBlocks.push(blockInfo);
          }
        } catch (error) {
          console.warn(`Failed to get block ${blockNum} during search:`, error);
          continue;
        }
      }

      return matchingBlocks;
    } catch (error) {
      console.error("Failed to search blocks:", error);
      throw error;
    }
  }

  private static formatBlockNumber(blockNumber: string | number): string {
    if (typeof blockNumber === "number") {
      return "0x" + blockNumber.toString(16);
    }

    const identifier = blockNumber.toString().trim();

    if (
      ["latest", "pending", "earliest", "safe", "finalized"].includes(
        identifier.toLowerCase(),
      )
    ) {
      return identifier.toLowerCase();
    }

    if (identifier.startsWith("0x")) {
      return identifier;
    }

    const blockNum = parseInt(identifier, 10);
    if (!isNaN(blockNum) && blockNum >= 0) {
      return "0x" + blockNum.toString(16);
    }

    throw new Error(`Invalid block number: ${blockNumber}`);
  }

  private static isValidBlockHash(hash: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
  }

  private static processBlockData(block: any): BlockInfo {
    return {
      number: parseInt(block.number, 16),
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: parseInt(block.timestamp, 16),
      gasUsed: block.gasUsed,
      gasLimit: block.gasLimit,
      transactions: block.transactions || [],
      transactionCount: block.transactions ? block.transactions.length : 0,
    };
  }

  static async getBlockStatistics(blockIdentifier: string | number): Promise<{
    blockInfo: BlockInfo;
    averageGasPerTransaction: number;
    gasUtilization: number;
    transactionDensity: "low" | "medium" | "high" | "very_high";
  }> {
    try {
      const blockInfo = await this.getBlockByNumber(blockIdentifier, false);

      const gasUsed = parseInt(blockInfo.gasUsed, 16);
      const gasLimit = parseInt(blockInfo.gasLimit, 16);
      const transactionCount = blockInfo.transactionCount;

      const averageGasPerTransaction =
        transactionCount > 0 ? gasUsed / transactionCount : 0;
      const gasUtilization = (gasUsed / gasLimit) * 100;

      let transactionDensity: "low" | "medium" | "high" | "very_high";
      if (transactionCount < 50) {
        transactionDensity = "low";
      } else if (transactionCount < 200) {
        transactionDensity = "medium";
      } else if (transactionCount < 500) {
        transactionDensity = "high";
      } else {
        transactionDensity = "very_high";
      }

      return {
        blockInfo,
        averageGasPerTransaction,
        gasUtilization,
        transactionDensity,
      };
    } catch (error) {
      console.error(
        `Failed to get block statistics for ${blockIdentifier}:`,
        error,
      );
      throw error;
    }
  }
}
