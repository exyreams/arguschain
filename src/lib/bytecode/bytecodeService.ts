import { ethApi } from "./api";
import {
  type BytecodeAnalysis,
  BytecodeProcessor,
  type ContractComparison,
} from "./processors";
import { bytecodeCache } from "./bytecodeCache";

export interface BytecodeServiceConfig {
  network?: string;
  useCache?: boolean;
  timeout?: number;
}

export class BytecodeService {
  private processor: BytecodeProcessor;
  private config: BytecodeServiceConfig;

  constructor(config: BytecodeServiceConfig = {}) {
    this.processor = new BytecodeProcessor();
    this.config = {
      network: "mainnet",
      useCache: true,
      timeout: 30000,
      ...config,
    };
  }

  async initialize(network?: string): Promise<void> {
    const targetNetwork = network || this.config.network || "mainnet";
    await ethApi.initialize(targetNetwork);
  }

  async analyzeContract(
    address: string,
    contractName?: string,
    blockTag: string | number = "latest",
  ): Promise<BytecodeAnalysis> {
    if (this.config.useCache) {
      const cached = bytecodeCache.get(address, blockTag.toString());
      if (cached) {
        return cached;
      }
    }

    try {
      const bytecode = await ethApi.getCode(address, blockTag);

      const analysis = this.processor.analyzeBytecode(
        bytecode,
        address,
        contractName,
      );

      if (this.config.useCache) {
        bytecodeCache.set(address, blockTag.toString(), analysis);
      }

      return analysis;
    } catch (error) {
      throw new Error(
        `Failed to analyze contract ${address}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async analyzeMultipleContracts(
    contracts: Array<{ address: string; name?: string }>,
    blockTag: string | number = "latest",
  ): Promise<ContractComparison> {
    const analyses: BytecodeAnalysis[] = [];

    for (const contract of contracts) {
      try {
        const analysis = await this.analyzeContract(
          contract.address,
          contract.name,
          blockTag,
        );
        analyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze contract ${contract.address}:`, error);
      }
    }

    if (analyses.length === 0) {
      throw new Error("No contracts could be analyzed successfully");
    }

    return this.processor.compareContracts(analyses);
  }

  async analyzeFromTransaction(txHash: string): Promise<ContractComparison> {
    const { transactionApi } = await import("./api");

    try {
      await transactionApi.initialize(this.config.network || "mainnet");

      const contractsData =
        await transactionApi.getContractsFromTransaction(txHash);

      if (contractsData.length === 0) {
        throw new Error(
          `No contracts with bytecode found in transaction ${txHash}`,
        );
      }

      const contracts = contractsData.map((contract) => ({
        address: contract.address,
        name: contract.name,
      }));

      return await this.analyzeMultipleContracts(contracts);
    } catch (error) {
      throw new Error(
        `Failed to analyze contracts from transaction ${txHash}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getContractSize(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<number> {
    return await ethApi.getCodeSize(address, blockTag);
  }

  async isContract(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<boolean> {
    return await ethApi.isContract(address, blockTag);
  }

  clearCache(): void {
    bytecodeCache.clear();
  }

  getCacheStats() {
    return bytecodeCache.getStats();
  }
}

export const bytecodeService = new BytecodeService();
