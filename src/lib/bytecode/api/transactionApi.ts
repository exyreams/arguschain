import { ethers } from "ethers";
import { blockchainService } from "@/lib/blockchainService";

export interface TransactionContractData {
  address: string;
  name: string;
  source: "target" | "created" | "event_emitter";
  transactionHash: string;
}

export class TransactionApi {
  private provider: ethers.JsonRpcProvider | null = null;

  constructor() {}

  async initialize(network: string = "mainnet"): Promise<void> {
    await blockchainService.connect(network);
    this.provider = blockchainService.getProvider();

    if (!this.provider) {
      throw new Error(`Failed to initialize provider for network: ${network}`);
    }
  }

  async getContractsFromTransaction(
    txHash: string,
  ): Promise<TransactionContractData[]> {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }

    try {
      if (!txHash || !txHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        throw new Error("Invalid transaction hash format");
      }

      console.log(`Fetching transaction details for ${txHash}...`);

      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);

      if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
      }

      if (!receipt) {
        throw new Error(
          `Transaction receipt for ${txHash} not found. Transaction might be pending.`,
        );
      }

      const contracts: TransactionContractData[] = [];
      const processedAddresses = new Set<string>();

      const checkAndAddContract = async (
        address: string | null,
        source: TransactionContractData["source"],
        namePrefix: string,
      ) => {
        if (!address || processedAddresses.has(address.toLowerCase())) {
          return;
        }

        try {
          const checksumAddress = ethers.getAddress(address);
          const code = await this.provider!.getCode(checksumAddress);

          if (code && code !== "0x") {
            const contractName = `${namePrefix} (${this.shortenAddress(checksumAddress)})`;
            contracts.push({
              address: checksumAddress,
              name: contractName,
              source,
              transactionHash: txHash,
            });
            processedAddresses.add(address.toLowerCase());
          }
        } catch (error) {
          console.warn(`Could not check code for address ${address}:`, error);
        }
      };

      if (tx.to) {
        await checkAndAddContract(tx.to, "target", "Target Contract");
      }

      if (receipt.contractAddress) {
        await checkAndAddContract(
          receipt.contractAddress,
          "created",
          "Created Contract",
        );
      }

      const logAddresses = new Set<string>();
      for (const log of receipt.logs) {
        if (log.address && !logAddresses.has(log.address.toLowerCase())) {
          logAddresses.add(log.address.toLowerCase());
          await checkAndAddContract(
            log.address,
            "event_emitter",
            "Event Emitter",
          );
        }
      }

      console.log(
        `Found ${contracts.length} contract(s) with bytecode in transaction ${txHash}`,
      );

      return contracts;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to extract contracts from transaction ${txHash}: ${error.message}`,
        );
      }
      throw new Error(
        `Failed to extract contracts from transaction ${txHash}: Unknown error`,
      );
    }
  }

  async getTransactionInfo(txHash: string) {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }

    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);

      if (!tx || !receipt) {
        throw new Error(`Transaction ${txHash} not found or not mined`);
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasLimit: tx.gasLimit,
        gasUsed: receipt.gasUsed,
        status: receipt.status,
        contractAddress: receipt.contractAddress,
        logsCount: receipt.logs.length,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get transaction info for ${txHash}: ${error.message}`,
        );
      }
      throw new Error(
        `Failed to get transaction info for ${txHash}: Unknown error`,
      );
    }
  }

  async isTransactionMined(txHash: string): Promise<boolean> {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt !== null;
    } catch {
      return false;
    }
  }

  private shortenAddress(address: string, chars: number = 4): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
  }
}

export const transactionApi = new TransactionApi();
