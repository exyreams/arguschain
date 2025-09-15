import { ethers } from "ethers";

export class EthApi {
  private provider: ethers.JsonRpcProvider;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  async call(
    params: {
      to: string;
      data: string;
      from?: string;
      gas?: string;
      gasPrice?: string;
      value?: string;
    },
    blockTag: string | number = "latest",
  ): Promise<string> {
    try {
      const result = await this.provider.call(params, blockTag);
      return result;
    } catch (error) {
      throw new Error(
        `eth_call failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async estimateGas(params: {
    to: string;
    data: string;
    from?: string;
    value?: string;
  }): Promise<number> {
    try {
      const gasEstimate = await this.provider.estimateGas(params);
      return Number(gasEstimate);
    } catch (error) {
      throw new Error(
        `Gas estimation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getGasPrice(): Promise<bigint> {
    try {
      const gasPrice = await this.provider.getFeeData();
      return gasPrice.gasPrice || BigInt(0);
    } catch (error) {
      throw new Error(
        `Failed to get gas price: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getBlock(
    blockTag: string | number = "latest",
  ): Promise<ethers.Block | null> {
    try {
      const block = await this.provider.getBlock(blockTag);
      return block;
    } catch (error) {
      throw new Error(
        `Failed to get block: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getTransactionReceipt(
    txHash: string,
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      throw new Error(
        `Failed to get transaction receipt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getBalance(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<bigint> {
    try {
      const balance = await this.provider.getBalance(address, blockTag);
      return balance;
    } catch (error) {
      throw new Error(
        `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getTransactionCount(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<number> {
    try {
      const nonce = await this.provider.getTransactionCount(address, blockTag);
      return nonce;
    } catch (error) {
      throw new Error(
        `Failed to get transaction count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getNetwork(): Promise<ethers.Network> {
    try {
      const network = await this.provider.getNetwork();
      return network;
    } catch (error) {
      throw new Error(
        `Failed to get network: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async makeRpcRequest(method: string, params: any[]): Promise<any> {
    try {
      const result = await this.provider.send(method, params);
      return result;
    } catch (error) {
      throw new Error(
        `RPC request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.provider.getNetwork();
      return true;
    } catch {
      return false;
    }
  }
}
