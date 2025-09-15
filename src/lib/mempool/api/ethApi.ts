import { ethers } from "ethers";
import { blockchainService } from "@/lib/blockchainService";
import { DEFAULTS } from "../constants";

export class EthApi {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor(provider?: ethers.JsonRpcProvider) {
    this.provider = provider || blockchainService.getProvider();
  }

  async getLatestBlock(): Promise<ethers.Block | null> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const block = await this.provider.getBlock("latest");
      return block;
    } catch (error) {
      console.error("Failed to get latest block:", error);
      return null;
    }
  }

  async getGasPrice(): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const feeData = await this.provider.getFeeData();

      if (feeData.gasPrice) {
        return parseFloat(ethers.formatUnits(feeData.gasPrice, "gwei"));
      }

      return DEFAULTS.BASE_FEE_GWEI;
    } catch (error) {
      console.error("Failed to get gas price:", error);
      return DEFAULTS.BASE_FEE_GWEI;
    }
  }

  async getBaseFee(): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const block = await this.getLatestBlock();

      if (block && block.baseFeePerGas) {
        return parseFloat(ethers.formatUnits(block.baseFeePerGas, "gwei"));
      }

      return DEFAULTS.BASE_FEE_GWEI;
    } catch (error) {
      console.error("Failed to get base fee:", error);
      return DEFAULTS.BASE_FEE_GWEI;
    }
  }

  async getChainId(): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const network = await this.provider.getNetwork();
      return Number(network.chainId);
    } catch (error) {
      console.error("Failed to get chain ID:", error);
      return 1;
    }
  }

  async getBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error("Failed to get block number:", error);
      return 0;
    }
  }

  async getNetworkInfo(): Promise<{
    chainId: number;
    blockNumber: number;
    baseFee: number;
    gasPrice: number;
    blockTime: number;
  }> {
    const [chainId, blockNumber, baseFee, gasPrice, latestBlock] =
      await Promise.allSettled([
        this.getChainId(),
        this.getBlockNumber(),
        this.getBaseFee(),
        this.getGasPrice(),
        this.getLatestBlock(),
      ]);

    let blockTime = DEFAULTS.BASE_FEE_GWEI;
    if (latestBlock.status === "fulfilled" && latestBlock.value) {
      const currentTime = Math.floor(Date.now() / 1000);
      blockTime = currentTime - latestBlock.value.timestamp;
    }

    return {
      chainId: chainId.status === "fulfilled" ? chainId.value : 1,
      blockNumber: blockNumber.status === "fulfilled" ? blockNumber.value : 0,
      baseFee:
        baseFee.status === "fulfilled" ? baseFee.value : DEFAULTS.BASE_FEE_GWEI,
      gasPrice:
        gasPrice.status === "fulfilled"
          ? gasPrice.value
          : DEFAULTS.BASE_FEE_GWEI,
      blockTime,
    };
  }

  async checkConnection(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      console.error("Provider connection check failed:", error);
      return false;
    }
  }

  async getTransactionCount(address: string): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      return await this.provider.getTransactionCount(address);
    } catch (error) {
      console.error(`Failed to get transaction count for ${address}:`, error);
      return 0;
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Failed to get balance for ${address}:`, error);
      return "0";
    }
  }

  async estimateGas(transaction: {
    to?: string;
    from?: string;
    value?: string;
    data?: string;
  }): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      return Number(gasEstimate);
    } catch (error) {
      console.error("Failed to estimate gas:", error);
      return 21000;
    }
  }
}
