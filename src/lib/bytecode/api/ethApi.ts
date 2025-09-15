import { ethers } from "ethers";
import { blockchainService } from "@/lib/blockchainService";

export interface BytecodeApiConfig {
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
}

export class EthApi {
  private provider: ethers.JsonRpcProvider | null = null;
  private config: BytecodeApiConfig;

  constructor(config: BytecodeApiConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      cacheEnabled: true,
      ...config,
    };
  }

  /**
   * Initialize with blockchain service provider
   */
  async initialize(network: string = "mainnet"): Promise<void> {
    await blockchainService.connect(network);
    this.provider = blockchainService.getProvider();

    if (!this.provider) {
      throw new Error(`Failed to initialize provider for network: ${network}`);
    }
  }

  /**
   * Get contract bytecode using eth_getCode
   */
  async getCode(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<string> {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }

    try {
      const checksumAddress = ethers.getAddress(address);
      const code = await this.provider.getCode(checksumAddress, blockTag);

      if (code === "0x") {
        throw new Error(
          `No bytecode found at address ${address}. This might be an EOA or destroyed contract.`,
        );
      }

      return code;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get code for ${address}: ${error.message}`);
      }
      throw new Error(`Failed to get code for ${address}: Unknown error`);
    }
  }

  /**
   * Get multiple contract codes in parallel
   */
  async getMultipleCodes(
    addresses: string[],
    blockTag: string | number = "latest",
  ): Promise<Record<string, string | null>> {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }

    const results: Record<string, string | null> = {};

    const promises = addresses.map(async (address) => {
      try {
        const code = await this.getCode(address, blockTag);
        return { address, code };
      } catch (error) {
        console.warn(`Failed to get code for ${address}:`, error);
        return { address, code: null };
      }
    });

    const settled = await Promise.allSettled(promises);

    settled.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        results[result.value.address] = result.value.code;
      }
    });

    return results;
  }

  async getCodeSize(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<number> {
    const code = await this.getCode(address, blockTag);
    return (code.length - 2) / 2;
  }

  async isContract(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<boolean> {
    try {
      const code = await this.getCode(address, blockTag);
      return code !== "0x";
    } catch {
      return false;
    }
  }

  async getContractInfo(address: string, blockTag: string | number = "latest") {
    const checksumAddress = ethers.getAddress(address);
    const code = await this.getCode(checksumAddress, blockTag);
    const size = (code.length - 2) / 2;

    return {
      address: checksumAddress,
      bytecode: code,
      size,
      blockTag,
      timestamp: Date.now(),
    };
  }
}

export const ethApi = new EthApi();
