import { ethers } from "ethers";
import type {
  LogsQueryConfig,
  ParsedTransferLog,
  PerformanceMetrics,
  RawLogData,
  ValidationResult,
} from "../types";
import {
  BLOCK_PATTERNS,
  ERROR_CODES,
  ERROR_MESSAGES,
  getContractConfig,
  getRpcLimits,
  PYUSD_CONFIG,
  shortenAddress,
} from "@/lib/eventlogs";

export class EthLogsApi {
  private provider: ethers.JsonRpcProvider;
  private network: "mainnet" | "sepolia";
  private contractConfig: typeof PYUSD_CONFIG.ethereum;
  private cache: Map<string, any> = new Map();

  constructor(
    provider: ethers.JsonRpcProvider,
    network: "mainnet" | "sepolia" = "mainnet"
  ) {
    this.provider = provider;
    this.network = network;
    this.contractConfig = getContractConfig(network);
  }

  private validateBlockIdentifier(blockId: string | number): ValidationResult {
    if (typeof blockId === "number") {
      if (blockId < 0) {
        return { isValid: false, error: "Block number cannot be negative" };
      }
      return { isValid: true };
    }

    if (typeof blockId === "string") {
      if (BLOCK_PATTERNS.tags.includes(blockId)) {
        return { isValid: true };
      }

      if (BLOCK_PATTERNS.hex.test(blockId)) {
        const numValue = parseInt(blockId, 16);
        if (numValue < 0) {
          return { isValid: false, error: "Block number cannot be negative" };
        }
        return { isValid: true };
      }

      if (BLOCK_PATTERNS.decimal.test(blockId)) {
        const numValue = parseInt(blockId, 10);
        if (numValue < 0) {
          return { isValid: false, error: "Block number cannot be negative" };
        }
        return { isValid: true };
      }

      return {
        isValid: false,
        error: `Invalid block identifier format: ${blockId}`,
      };
    }

    return {
      isValid: false,
      error: `Invalid block identifier type: ${typeof blockId}`,
    };
  }

  private formatBlockIdentifier(blockId: string | number): string {
    if (typeof blockId === "number") {
      return `0x${blockId.toString(16)}`;
    }

    if (typeof blockId === "string") {
      if (BLOCK_PATTERNS.tags.includes(blockId)) {
        return blockId;
      }

      if (BLOCK_PATTERNS.hex.test(blockId)) {
        return blockId.toLowerCase();
      }

      if (BLOCK_PATTERNS.decimal.test(blockId)) {
        return `0x${parseInt(blockId, 10).toString(16)}`;
      }
    }

    throw new Error(`Cannot format block identifier: ${blockId}`);
  }

  private validateBlockRange(
    fromBlock: string | number,
    toBlock: string | number
  ): ValidationResult {
    try {
      const rpcUrl = this.provider.connection?.url || "";
      const limits = getRpcLimits(rpcUrl);

      let fromNum: number;
      let toNum: number;

      if (typeof fromBlock === "number") {
        fromNum = fromBlock;
      } else if (fromBlock === "latest" || fromBlock === "pending") {
        return {
          isValid: true,
          warnings: ["Cannot validate range with latest/pending blocks"],
        };
      } else if (BLOCK_PATTERNS.hex.test(fromBlock)) {
        fromNum = parseInt(fromBlock, 16);
      } else if (BLOCK_PATTERNS.decimal.test(fromBlock)) {
        fromNum = parseInt(fromBlock, 10);
      } else {
        return {
          isValid: false,
          error: `Invalid fromBlock format: ${fromBlock}`,
        };
      }

      if (typeof toBlock === "number") {
        toNum = toBlock;
      } else if (toBlock === "latest" || toBlock === "pending") {
        return {
          isValid: true,
          warnings: ["Cannot validate range with latest/pending blocks"],
        };
      } else if (BLOCK_PATTERNS.hex.test(toBlock)) {
        toNum = parseInt(toBlock, 16);
      } else if (BLOCK_PATTERNS.decimal.test(toBlock)) {
        toNum = parseInt(toBlock, 10);
      } else {
        return { isValid: false, error: `Invalid toBlock format: ${toBlock}` };
      }

      if (fromNum > toNum) {
        return {
          isValid: false,
          error: "fromBlock cannot be greater than toBlock",
        };
      }

      const range = toNum - fromNum + 1;
      if (range > limits.max_block_range) {
        return {
          isValid: false,
          error: `Block range ${range} exceeds ${limits.name} limit of ${limits.max_block_range} blocks`,
          suggestions: [
            `Reduce the block range to ${limits.max_block_range} blocks or less`,
            "Consider using multiple smaller queries",
            "Use a different RPC provider with higher limits",
          ],
        };
      }

      const warnings: string[] = [];
      if (range > 100) {
        warnings.push("Large block range may result in slow query performance");
      }

      return { isValid: true, warnings };
    } catch (error) {
      return {
        isValid: false,
        error: `Block range validation failed: ${error}`,
      };
    }
  }

  async fetchLogs(config: LogsQueryConfig): Promise<{
    logs: RawLogData[];
    performance: PerformanceMetrics;
  }> {
    const startTime = Date.now();
    let rpcCalls = 0;

    try {
      const fromValidation = this.validateBlockIdentifier(config.from_block);
      if (!fromValidation.isValid) {
        throw new Error(`Invalid fromBlock: ${fromValidation.error}`);
      }

      const toValidation = this.validateBlockIdentifier(config.to_block);
      if (!toValidation.isValid) {
        throw new Error(`Invalid toBlock: ${toValidation.error}`);
      }

      const rangeValidation = this.validateBlockRange(
        config.from_block,
        config.to_block
      );
      if (!rangeValidation.isValid) {
        throw new Error(`Invalid block range: ${rangeValidation.error}`);
      }

      const fromBlock = this.formatBlockIdentifier(config.from_block);
      const toBlock = this.formatBlockIdentifier(config.to_block);
      const contractAddress =
        config.contract_address || this.contractConfig.address;

      const logFilter = {
        fromBlock,
        toBlock,
        address: contractAddress,
        topics: [this.contractConfig.transfer_event_topic],
      };

      console.log("Fetching logs with filter:", logFilter);

      rpcCalls++;
      const logs = await this.provider.getLogs(logFilter);

      const endTime = Date.now();
      const performance: PerformanceMetrics = {
        query_start_time: startTime,
        query_end_time: endTime,
        execution_time_ms: endTime - startTime,
        logs_fetched: logs.length,
        logs_parsed: 0,
        blocks_queried: this.calculateBlocksQueried(fromBlock, toBlock),
        rpc_calls_made: rpcCalls,
      };

      const rawLogs: RawLogData[] = logs.map((log) => ({
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
        address: log.address,
        topics: log.topics,
        data: log.data,
        removed: log.removed || false,
      }));

      return { logs: rawLogs, performance };
    } catch (error) {
      const endTime = Date.now();
      const performance: PerformanceMetrics = {
        query_start_time: startTime,
        query_end_time: endTime,
        execution_time_ms: endTime - startTime,
        logs_fetched: 0,
        logs_parsed: 0,
        blocks_queried: 0,
        rpc_calls_made: rpcCalls,
      };

      if (error instanceof Error) {
        if (error.message.includes("filter not found")) {
          throw new Error(
            `${ERROR_MESSAGES[ERROR_CODES.RPC_ERROR]}: Filter expired or not found. Try reducing the block range.`
          );
        } else if (error.message.includes("block range is too large")) {
          throw new Error(
            `${ERROR_MESSAGES[ERROR_CODES.INVALID_BLOCK_RANGE]}: ${error.message}`
          );
        } else if (error.message.includes("timeout")) {
          throw new Error(
            `${ERROR_MESSAGES[ERROR_CODES.TIMEOUT_ERROR]}: ${error.message}`
          );
        } else if (error.message.includes("rate limit")) {
          throw new Error(
            `${ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_ERROR]}: ${error.message}`
          );
        }
      }

      throw new Error(`${ERROR_MESSAGES[ERROR_CODES.RPC_ERROR]}: ${error}`);
    }
  }

  async parseTransferLogs(
    rawLogs: RawLogData[],
    includeTimestamps: boolean = true
  ): Promise<{
    transfers: ParsedTransferLog[];
    performance: Partial<PerformanceMetrics>;
  }> {
    const startTime = Date.now();
    const transfers: ParsedTransferLog[] = [];
    const timestampCache = new Map<number, number>();
    let rpcCalls = 0;

    try {
      for (const log of rawLogs) {
        try {
          if (!log.topics || log.topics.length !== 3) {
            console.warn(
              `Skipping log with ${log.topics?.length || 0} topics (expected 3 for Transfer)`
            );
            continue;
          }

          const fromTopic = log.topics[1];
          const toTopic = log.topics[2];

          const fromAddr = ethers.getAddress("0x" + fromTopic.slice(-40));
          const toAddr = ethers.getAddress("0x" + toTopic.slice(-40));

          const valueRaw = log.data;
          const valueBigInt = BigInt(valueRaw);
          const valuePyusd =
            Number(valueBigInt) / Math.pow(10, this.contractConfig.decimals);

          let timestamp: number | undefined;
          if (includeTimestamps) {
            if (!timestampCache.has(log.blockNumber)) {
              try {
                rpcCalls++;
                const block = await this.provider.getBlock(log.blockNumber);
                timestamp = block?.timestamp;
                if (timestamp) {
                  timestampCache.set(log.blockNumber, timestamp);
                }
              } catch (error) {
                console.warn(
                  `Failed to get timestamp for block ${log.blockNumber}:`,
                  error
                );
              }
            } else {
              timestamp = timestampCache.get(log.blockNumber);
            }
          }

          const transfer: ParsedTransferLog = {
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.logIndex,
            from: fromAddr,
            from_short: shortenAddress(fromAddr),
            to: toAddr,
            to_short: shortenAddress(toAddr),
            value_pyusd: valuePyusd,
            value_raw: valueBigInt.toString(),
            timestamp,
            datetime: timestamp ? new Date(timestamp * 1000) : undefined,
          };

          transfers.push(transfer);
        } catch (parseError) {
          console.warn(
            `Failed to parse log ${log.logIndex} in tx ${log.transactionHash}:`,
            parseError
          );
        }
      }

      const endTime = Date.now();
      const performance: Partial<PerformanceMetrics> = {
        execution_time_ms: endTime - startTime,
        logs_parsed: transfers.length,
        rpc_calls_made: rpcCalls,
      };

      return { transfers, performance };
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES[ERROR_CODES.PARSING_ERROR]}: ${error}`);
    }
  }

  private calculateBlocksQueried(fromBlock: string, toBlock: string): number {
    try {
      if (fromBlock === toBlock) return 1;
      if (fromBlock === "latest" || toBlock === "latest") return 1;

      const fromNum = fromBlock.startsWith("0x")
        ? parseInt(fromBlock, 16)
        : parseInt(fromBlock, 10);
      const toNum = toBlock.startsWith("0x")
        ? parseInt(toBlock, 16)
        : parseInt(toBlock, 10);

      return Math.max(1, toNum - fromNum + 1);
    } catch {
      return 1;
    }
  }

  getNetworkInfo() {
    return {
      network: this.network,
      contract: this.contractConfig,
      provider_url: this.provider.connection?.url || "unknown",
    };
  }

  /**
   * Get current block number from the network
   */
  async getCurrentBlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      throw new Error(`Failed to get current block number: ${error}`);
    }
  }

  /**
   * Get block information including timestamp
   */
  async getBlockInfo(blockNumber: string | number): Promise<{
    number: number;
    timestamp: number;
    datetime: Date;
    hash: string;
    transactionCount: number;
  }> {
    try {
      const cacheKey = `block_${blockNumber}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const block = await this.provider.getBlock(blockNumber);
      if (!block) {
        throw new Error(`Block ${blockNumber} not found`);
      }

      const blockInfo = {
        number: block.number,
        timestamp: block.timestamp,
        datetime: new Date(block.timestamp * 1000),
        hash: block.hash,
        transactionCount: block.transactions.length,
      };

      // Cache for 5 minutes
      this.cache.set(cacheKey, blockInfo);
      setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

      return blockInfo;
    } catch (error) {
      throw new Error(`Failed to get block info: ${error}`);
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionDetails(txHash: string): Promise<{
    hash: string;
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    from: string;
    to: string | null;
    value: string;
    gasPrice: string;
    gasLimit: string;
    gasUsed?: string;
    status?: number;
    timestamp?: number;
    datetime?: Date;
  }> {
    try {
      const cacheKey = `tx_${txHash}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash).catch(() => null),
      ]);

      if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
      }

      let blockInfo;
      try {
        blockInfo = await this.getBlockInfo(tx.blockNumber!);
      } catch {
        blockInfo = null;
      }

      const txDetails = {
        hash: tx.hash,
        blockNumber: tx.blockNumber!,
        blockHash: tx.blockHash!,
        transactionIndex: tx.index!,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        gasPrice: tx.gasPrice?.toString() || "0",
        gasLimit: tx.gasLimit.toString(),
        gasUsed: receipt?.gasUsed?.toString(),
        status: receipt?.status,
        timestamp: blockInfo?.timestamp,
        datetime: blockInfo?.datetime,
      };

      // Cache for 10 minutes
      this.cache.set(cacheKey, txDetails);
      setTimeout(() => this.cache.delete(cacheKey), 10 * 60 * 1000);

      return txDetails;
    } catch (error) {
      throw new Error(`Failed to get transaction details: ${error}`);
    }
  }

  /**
   * Get contract information and metadata
   */
  async getContractInfo(contractAddress: string): Promise<{
    address: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
    isContract: boolean;
    bytecodeSize?: number;
  }> {
    try {
      const cacheKey = `contract_${contractAddress.toLowerCase()}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const code = await this.provider.getCode(contractAddress);
      const isContract = code !== "0x";

      const contractInfo: any = {
        address: contractAddress,
        isContract,
        bytecodeSize: isContract ? (code.length - 2) / 2 : 0, // Remove 0x and divide by 2
      };

      if (isContract) {
        // Try to get ERC-20 token info if it's a token contract
        try {
          const contract = new ethers.Contract(
            contractAddress,
            [
              "function name() view returns (string)",
              "function symbol() view returns (string)",
              "function decimals() view returns (uint8)",
              "function totalSupply() view returns (uint256)",
            ],
            this.provider
          );

          const [name, symbol, decimals, totalSupply] =
            await Promise.allSettled([
              contract.name(),
              contract.symbol(),
              contract.decimals(),
              contract.totalSupply(),
            ]);

          if (name.status === "fulfilled") contractInfo.name = name.value;
          if (symbol.status === "fulfilled") contractInfo.symbol = symbol.value;
          if (decimals.status === "fulfilled")
            contractInfo.decimals = decimals.value;
          if (totalSupply.status === "fulfilled")
            contractInfo.totalSupply = totalSupply.value.toString();
        } catch {
          // Not an ERC-20 token or methods not available
        }
      }

      // Cache for 1 hour
      this.cache.set(cacheKey, contractInfo);
      setTimeout(() => this.cache.delete(cacheKey), 60 * 60 * 1000);

      return contractInfo;
    } catch (error) {
      throw new Error(`Failed to get contract info: ${error}`);
    }
  }

  /**
   * Get address balance and transaction count
   */
  async getAddressInfo(address: string): Promise<{
    address: string;
    balance: string;
    balanceEth: string;
    transactionCount: number;
    isContract: boolean;
  }> {
    try {
      const cacheKey = `address_${address.toLowerCase()}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const [balance, transactionCount, code] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getTransactionCount(address),
        this.provider.getCode(address),
      ]);

      const addressInfo = {
        address,
        balance: balance.toString(),
        balanceEth: ethers.formatEther(balance),
        transactionCount,
        isContract: code !== "0x",
      };

      // Cache for 2 minutes (balances change frequently)
      this.cache.set(cacheKey, addressInfo);
      setTimeout(() => this.cache.delete(cacheKey), 2 * 60 * 1000);

      return addressInfo;
    } catch (error) {
      throw new Error(`Failed to get address info: ${error}`);
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: {
    to: string;
    from?: string;
    data?: string;
    value?: string;
  }): Promise<{
    gasEstimate: string;
    gasPrice: string;
    estimatedCost: string;
    estimatedCostEth: string;
  }> {
    try {
      const [gasEstimate, gasPrice] = await Promise.all([
        this.provider.estimateGas(transaction),
        this.provider.getFeeData(),
      ]);

      const currentGasPrice =
        gasPrice.gasPrice || ethers.parseUnits("20", "gwei");
      const estimatedCost = gasEstimate * currentGasPrice;

      return {
        gasEstimate: gasEstimate.toString(),
        gasPrice: currentGasPrice.toString(),
        estimatedCost: estimatedCost.toString(),
        estimatedCostEth: ethers.formatEther(estimatedCost),
      };
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error}`);
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{
    currentBlock: number;
    gasPrice: string;
    gasPriceGwei: string;
    networkId: number;
    isListening: boolean;
    peerCount?: number;
    syncing: boolean;
  }> {
    try {
      const cacheKey = "network_stats";
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const [blockNumber, feeData, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.provider.getNetwork(),
      ]);

      const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");

      const stats = {
        currentBlock: blockNumber,
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(gasPrice, "gwei"),
        networkId: Number(network.chainId),
        isListening: true,
        syncing: false, // Most RPC providers are always synced
      };

      // Cache for 30 seconds
      this.cache.set(cacheKey, stats);
      setTimeout(() => this.cache.delete(cacheKey), 30 * 1000);

      return stats;
    } catch (error) {
      throw new Error(`Failed to get network stats: ${error}`);
    }
  }

  /**
   * Search for events across multiple blocks with filters
   */
  async searchEvents(params: {
    contractAddress?: string;
    topics?: (string | null)[];
    fromBlock: string | number;
    toBlock: string | number;
    maxResults?: number;
  }): Promise<{
    events: Array<{
      address: string;
      topics: string[];
      data: string;
      blockNumber: number;
      transactionHash: string;
      logIndex: number;
      removed: boolean;
    }>;
    totalFound: number;
    performance: PerformanceMetrics;
  }> {
    const startTime = Date.now();

    try {
      const filter: any = {
        fromBlock: this.formatBlockIdentifier(params.fromBlock),
        toBlock: this.formatBlockIdentifier(params.toBlock),
      };

      if (params.contractAddress) {
        filter.address = params.contractAddress;
      }

      if (params.topics) {
        filter.topics = params.topics;
      }

      const logs = await this.provider.getLogs(filter);
      const maxResults = params.maxResults || 1000;
      const limitedLogs = logs.slice(0, maxResults);

      const events = limitedLogs.map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
        removed: log.removed || false,
      }));

      const endTime = Date.now();
      const performance: PerformanceMetrics = {
        execution_time_ms: endTime - startTime,
        logs_fetched: events.length,
        logs_parsed: events.length,
        blocks_queried: this.calculateBlocksQueried(
          filter.fromBlock,
          filter.toBlock
        ),
        rpc_calls_made: 1,
        cache_hits: 0,
        cache_misses: 1,
      };

      return {
        events,
        totalFound: logs.length,
        performance,
      };
    } catch (error) {
      throw new Error(`Failed to search events: ${error}`);
    }
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
