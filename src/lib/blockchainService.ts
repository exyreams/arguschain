import { ethers } from "ethers";
import { RPC_CONFIG } from "./config";

export class BlockchainService {
  makeRPCCall(method: string, testParams: any[]) {
    throw new Error("Method not implemented.");
  }
  makeBatchRPCCall(batchRequest: { method: string; params: any[] }[]) {
    throw new Error("Method not implemented.");
  }
  private provider: ethers.JsonRpcProvider | null = null;
  private networkConfig:
    | typeof RPC_CONFIG.sepolia
    | typeof RPC_CONFIG.mainnet
    | null = null;
  private connectionPromise: Promise<boolean> | null = null;

  async connect(preferredNetwork?: "sepolia" | "mainnet"): Promise<boolean> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (
      this.isConnected() &&
      (!preferredNetwork ||
        this.networkConfig?.name.toLowerCase().includes(preferredNetwork))
    ) {
      return true;
    }

    this.connectionPromise = this.performConnection(preferredNetwork);
    const result = await this.connectionPromise;
    this.connectionPromise = null;
    return result;
  }

  private async performConnection(
    preferredNetwork?: "sepolia" | "mainnet",
  ): Promise<boolean> {
    let networks = [RPC_CONFIG.mainnet, RPC_CONFIG.sepolia];

    if (preferredNetwork === "sepolia") {
      networks = [RPC_CONFIG.sepolia, RPC_CONFIG.mainnet];
    }

    for (const network of networks) {
      try {
        console.log(`Attempting to connect to ${network.name}...`);
        const testProvider = new ethers.JsonRpcProvider(network.rpcUrl);

        const networkPromise = testProvider.getNetwork();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 8000),
        );

        await Promise.race([networkPromise, timeoutPromise]);

        this.provider = testProvider;
        this.networkConfig = network;
        console.log(`Successfully connected to ${network.name}`);
        return true;
      } catch (error) {
        console.warn(`Failed to connect to ${network.name}:`, error);
        continue;
      }
    }

    console.error("Failed to connect to any available network");
    return false;
  }

  async getCurrentBlock(): Promise<number> {
    if (!this.provider) throw new Error("Not connected");
    return await this.provider.getBlockNumber();
  }

  async getGasPrice(): Promise<number> {
    if (!this.provider) throw new Error("Not connected");
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice
      ? parseFloat(ethers.formatUnits(feeData.gasPrice, "gwei"))
      : 0;
  }

  async getNetworkInfo(): Promise<{ name: string; chainId: number }> {
    if (!this.provider || !this.networkConfig) throw new Error("Not connected");
    const network = await this.provider.getNetwork();
    return {
      name: this.networkConfig.name,
      chainId: Number(network.chainId),
    };
  }

  async getBalance(address: string): Promise<string> {
    if (!this.provider) throw new Error("Not connected");
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getTransactionCount(address: string): Promise<number> {
    if (!this.provider) throw new Error("Not connected");
    return await this.provider.getTransactionCount(address);
  }

  async isListening(): Promise<boolean> {
    if (!this.provider) return false;
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  getProvider(): ethers.JsonRpcProvider | null {
    return this.provider;
  }

  getNetworkConfig() {
    return this.networkConfig;
  }

  private async validateBlockIdentifier(
    blockIdentifier: string | number,
  ): Promise<void> {
    if (
      typeof blockIdentifier === "string" &&
      blockIdentifier.startsWith("0x") &&
      blockIdentifier.length === 66
    ) {
      try {
        const networkInfo = await this.getNetworkInfo();
        console.log(
          `Validating block hash on ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`,
        );
      } catch (error) {
        console.warn("Could not get network info for validation:", error);
      }
    }
  }

  private async getSuggestedAlternatives(): Promise<string[]> {
    const suggestions = [
      'Try using "latest" to get the most recent block',
      "Use a specific block number (e.g., 18500000)",
      "Verify you're connected to the correct network",
    ];

    try {
      const networkInfo = await this.getNetworkInfo();
      const latestBlock = await this.provider?.getBlockNumber();

      if (latestBlock) {
        suggestions.push(`Current latest block number: ${latestBlock}`);
        suggestions.push(`Try a recent block: ${latestBlock - 10}`);
      }

      suggestions.push(
        `Current network: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`,
      );
    } catch (error) {
      console.warn("Could not get network suggestions:", error);
    }

    return suggestions;
  }

  isConnected(): boolean {
    return this.provider !== null && this.networkConfig !== null;
  }

  disconnect(): void {
    this.provider = null;
    this.networkConfig = null;
    this.connectionPromise = null;
    console.log("Disconnected from blockchain network");
  }

  async switchNetwork(network: "sepolia" | "mainnet"): Promise<boolean> {
    console.log(`Switching to ${network}...`);
    this.disconnect();
    return await this.connect(network);
  }

  getCurrentNetworkType(): "sepolia" | "mainnet" | null {
    if (!this.networkConfig) return null;
    return this.networkConfig.name.toLowerCase().includes("sepolia")
      ? "sepolia"
      : "mainnet";
  }

  async traceTransaction(
    txHash: string,
    tracer: "callTracer" | "structLog" = "callTracer",
  ): Promise<any> {
    if (!this.provider) throw new Error("Not connected");

    try {
      const result = await this.provider.send("debug_traceTransaction", [
        txHash,
        { tracer: tracer === "structLog" ? undefined : tracer },
      ]);
      return result;
    } catch (error) {
      console.error(`Failed to trace transaction with ${tracer}:`, error);
      throw error;
    }
  }

  async traceTransactionCallTracer(txHash: string): Promise<any> {
    return this.traceTransaction(txHash, "callTracer");
  }

  async traceTransactionStructLog(txHash: string): Promise<any> {
    return this.traceTransaction(txHash, "structLog");
  }

  async traceTransactionRaw(txHash: string): Promise<any> {
    if (!this.provider) throw new Error("Not connected");

    try {
      const result = await this.provider.send("trace_transaction", [txHash]);
      return result;
    } catch (error) {
      console.error(
        `Failed to trace transaction with trace_transaction:`,
        error,
      );
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<any> {
    if (!this.provider) throw new Error("Not connected");
    return await this.provider.getTransaction(txHash);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    if (!this.provider) throw new Error("Not connected");
    return await this.provider.getTransactionReceipt(txHash);
  }

  async traceBlock(blockIdentifier: string | number): Promise<any> {
    if (!this.provider) throw new Error("Not connected");

    try {
      let blockId: string | number;

      if (typeof blockIdentifier === "number") {
        blockId = blockIdentifier;
      } else if (typeof blockIdentifier === "string") {
        if (
          ["latest", "pending", "earliest"].includes(
            blockIdentifier.toLowerCase(),
          )
        ) {
          blockId = blockIdentifier.toLowerCase();
        } else if (blockIdentifier.startsWith("0x")) {
          if (blockIdentifier.length === 66) {
            const isLikelyTransactionHash =
              await this.isTransactionHash(blockIdentifier);
            if (isLikelyTransactionHash) {
              throw new Error(
                `The identifier "${blockIdentifier}" appears to be a transaction hash, not a block identifier.

For transaction analysis, please use:
1. The Transaction Trace page (/trace-transaction)
2. Or use the transaction hash directly with trace_transaction methods

For block analysis, please provide:
- A block number (e.g., 18500000)
- A block hash (different from transaction hash)
- A block tag ("latest", "pending", "earliest")

Tip: Transaction hashes identify individual transactions, while block hashes identify entire blocks containing multiple transactions.`,
              );
            }

            if (!/^0x[a-fA-F0-9]{64}$/.test(blockIdentifier)) {
              throw new Error(
                `Invalid block hash format: ${blockIdentifier}. Block hash must be 66 characters long and contain only hexadecimal characters.`,
              );
            }

            console.log(
              `Converting block hash ${blockIdentifier} to block number...`,
            );
            try {
              const blockInfo = await this.provider.getBlock(blockIdentifier);
              if (!blockInfo) {
                throw new Error(
                  `Block not found for hash: ${blockIdentifier}. Please verify the block hash is correct and exists on the current network.`,
                );
              }
              blockId = blockInfo.number;
              console.log(
                `Block hash ${blockIdentifier} corresponds to block number ${blockId}`,
              );
            } catch (blockError) {
              const errorMessage =
                blockError instanceof Error
                  ? blockError.message
                  : "Unknown error";
              if (
                errorMessage.includes("could not detect network") ||
                errorMessage.includes("network")
              ) {
                throw new Error(
                  `Network error while resolving block hash ${blockIdentifier}. Please check your network connection and try again.`,
                );
              } else if (
                errorMessage.includes("not found") ||
                errorMessage.includes("null")
              ) {
                const networkInfo = await this.getNetworkInfo().catch(() => ({
                  name: "unknown",
                  chainId: 0,
                }));
                throw new Error(
                  `Block hash ${blockIdentifier} not found on ${networkInfo.name} network (Chain ID: ${networkInfo.chainId}).

Please verify:
1. The block hash is correct and complete (66 characters)
2. You're connected to the right network
3. The block exists and has been mined
4. Try using a block number instead (e.g., "latest" or a specific number)

Tip: You can verify the block hash on a block explorer for your network.`,
                );
              } else {
                throw new Error(
                  `Failed to resolve block hash ${blockIdentifier}: ${errorMessage}`,
                );
              }
            }
          } else {
            const blockNum = parseInt(blockIdentifier, 16);
            if (isNaN(blockNum)) {
              throw new Error(`Invalid hex block number: ${blockIdentifier}`);
            }
            blockId = blockNum;
          }
        } else {
          const blockNum = parseInt(blockIdentifier, 10);
          if (isNaN(blockNum)) {
            throw new Error(`Invalid block identifier: ${blockIdentifier}`);
          }
          blockId = blockNum;
        }
      } else {
        throw new Error(
          `Invalid block identifier type: ${typeof blockIdentifier}`,
        );
      }

      let rpcBlockId: string;
      if (typeof blockId === "number") {
        rpcBlockId = "0x" + blockId.toString(16);
      } else if (
        typeof blockId === "string" &&
        ["latest", "pending", "earliest"].includes(blockId)
      ) {
        rpcBlockId = blockId;
      } else {
        rpcBlockId = String(blockId);
      }

      console.log(
        `Calling trace_block with identifier: ${rpcBlockId} (original: ${blockId})`,
      );

      let blockSize = 0;
      try {
        const blockInfo = await this.provider.getBlock(rpcBlockId, false);
        if (blockInfo && blockInfo.transactions) {
          blockSize = blockInfo.transactions.length;
          if (blockSize > 200) {
            console.warn(
              `Block ${rpcBlockId} contains ${blockSize} transactions. trace_block may take longer than usual.`,
            );
          }
        }
      } catch (error) {
        console.warn(
          `Could not get block info for ${rpcBlockId}, proceeding with trace_block`,
        );
      }

      let timeoutMs = 120000;
      if (blockSize > 500) {
        timeoutMs = 300000;
      } else if (blockSize > 200) {
        timeoutMs = 180000;
      }

      console.log(
        `Starting trace_block with ${timeoutMs / 1000}s timeout (block has ${blockSize} transactions)`,
      );

      const tracePromise = this.provider.send("trace_block", [rpcBlockId]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`trace_block call timed out after ${timeoutMs / 1000} seconds.

Block: ${rpcBlockId} (${blockSize} transactions)

This may indicate:
1. The block is very large and contains many transactions
2. The RPC endpoint is slow or overloaded
3. Network connectivity issues

Suggestions:
• Try a different RPC endpoint
• Analyze a smaller/more recent block  
• Check your network connection
• Consider using a premium RPC service for large blocks`),
            ),
          timeoutMs,
        ),
      );

      const result = await Promise.race([tracePromise, timeoutPromise]);
      console.log(`trace_block completed successfully for block ${rpcBlockId}`);
      return result;
    } catch (error) {
      console.error(`Failed to trace block ${blockIdentifier}:`, error);
      throw error;
    }
  }

  private async isTransactionHash(identifier: string): Promise<boolean> {
    try {
      const tx = await this.provider?.getTransaction(identifier);
      return tx !== null;
    } catch {
      return false;
    }
  }

  async identifyIdentifierType(identifier: string | number): Promise<{
    type:
      | "block_number"
      | "block_hash"
      | "transaction_hash"
      | "block_tag"
      | "invalid";
    suggestion?: string;
  }> {
    if (typeof identifier === "number") {
      return { type: "block_number" };
    }

    if (typeof identifier !== "string") {
      return {
        type: "invalid",
        suggestion: "Identifier must be a string or number",
      };
    }

    const trimmed = identifier.trim();

    if (["latest", "pending", "earliest"].includes(trimmed.toLowerCase())) {
      return { type: "block_tag" };
    }

    if (trimmed.startsWith("0x")) {
      if (trimmed.length === 66) {
        if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
          return { type: "invalid", suggestion: "Invalid hex format" };
        }

        const isTransaction = await this.isTransactionHash(trimmed);
        if (isTransaction) {
          return {
            type: "transaction_hash",
            suggestion:
              "This appears to be a transaction hash. Use trace_transaction instead of trace_block.",
          };
        } else {
          return { type: "block_hash" };
        }
      } else {
        const blockNum = parseInt(trimmed, 16);
        if (isNaN(blockNum) || blockNum < 0) {
          return { type: "invalid", suggestion: "Invalid hex block number" };
        }
        return { type: "block_number" };
      }
    }

    const blockNum = parseInt(trimmed, 10);
    if (isNaN(blockNum) || blockNum < 0) {
      return {
        type: "invalid",
        suggestion: "Block number must be a positive integer",
      };
    }

    return { type: "block_number" };
  }

  async getBlock(
    blockIdentifier: string | number,
    includeTransactions: boolean = false,
  ): Promise<any> {
    if (!this.provider) throw new Error("Not connected");

    try {
      let normalizedBlockId: string | number;

      if (typeof blockIdentifier === "number") {
        normalizedBlockId = blockIdentifier;
      } else if (typeof blockIdentifier === "string") {
        const trimmed = blockIdentifier.trim();

        if (
          ["latest", "pending", "earliest", "safe", "finalized"].includes(
            trimmed.toLowerCase(),
          )
        ) {
          normalizedBlockId = trimmed.toLowerCase();
        } else if (trimmed.startsWith("0x")) {
          if (trimmed.length === 66) {
            normalizedBlockId = trimmed;
          } else {
            const blockNum = parseInt(trimmed, 16);
            if (isNaN(blockNum) || blockNum < 0) {
              throw new Error(`Invalid hex block number: ${trimmed}`);
            }
            normalizedBlockId = blockNum;
          }
        } else {
          const blockNum = parseInt(trimmed, 10);
          if (isNaN(blockNum) || blockNum < 0) {
            throw new Error(`Invalid block number: ${trimmed}`);
          }

          normalizedBlockId = blockNum;
        }
      } else {
        throw new Error(
          `Invalid block identifier type: ${typeof blockIdentifier}`,
        );
      }

      console.log(
        `Calling getBlock with normalized identifier: ${normalizedBlockId} (original: ${blockIdentifier}, type: ${typeof normalizedBlockId})`,
      );

      const result = await this.provider.getBlock(
        normalizedBlockId,
        includeTransactions,
      );

      if (!result) {
        throw new Error(`Block not found: ${blockIdentifier}`);
      }

      return result;
    } catch (error) {
      console.error(`Failed to get block ${blockIdentifier}:`, error);

      if (error instanceof Error) {
        if (error.message.includes("invalid blockTag")) {
          throw new Error(
            `Invalid block identifier format: ${blockIdentifier}. Please use a block number, block hash, or valid block tag (latest, earliest, etc.)`,
          );
        }
        if (error.message.includes("could not detect network")) {
          throw new Error(
            `Network connection issue. Please check your RPC connection and try again.`,
          );
        }
      }

      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();
