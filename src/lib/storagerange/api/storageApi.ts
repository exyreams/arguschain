import { ethers } from "ethers";
import { blockchainService } from "@/lib/blockchainService";

export interface StorageRangeParams {
  blockHash: string;
  txIndex: number;
  contractAddress: string;
  startKey: string;
  limit: number;
}

export interface StorageEntry {
  key: string;
  value: string;
}

export interface StorageRangeResult {
  storage: Record<string, StorageEntry>;
  nextKey?: string;
  complete: boolean;
}

export interface StorageSlot {
  slot: string;
  slotInt?: number;
  value: string;
  decodedValue?: string;
  interpretation?: string;
  type?: "uint256" | "address" | "bool" | "string" | "bytes" | "mapping";
  category?:
    | "supply"
    | "balances"
    | "allowances"
    | "proxy"
    | "access_control"
    | "metadata"
    | "control"
    | "unknown";
}

export interface MappingAnalysisParams {
  contractAddress: string;
  mappingSlot: number | string;
  keys: (string | number)[];
  blockHash: string;
  txIndex?: number;
}

export interface MappingResult {
  key: string | number;
  keyDisplay: string;
  keyType: "address" | "uint256" | "bytes32";
  keyContext?: string;
  calculatedSlot: string;
  value: string;
  decodedValue: string;
  valueInt?: number;
}

export interface StorageComparisonParams {
  contractAddress: string;
  blockHash1: string;
  blockHash2: string;
  txIndex1?: number;
  txIndex2?: number;
  slotCount?: number;
  startSlot?: string;
}

export interface StorageComparison {
  slot: string;
  valueBlock1: string;
  valueBlock2: string;
  changed: boolean;
  diff?: string;
  numericDiff?: number;
  isBalanceChange?: boolean;
  isSupplyChange?: boolean;
}

export class StorageApi {
  private provider: ethers.JsonRpcProvider;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  async getStorageRange(
    params: StorageRangeParams,
  ): Promise<StorageRangeResult | null> {
    try {
      if (
        !params.contractAddress ||
        params.contractAddress.length !== 42 ||
        !params.contractAddress.startsWith("0x")
      ) {
        throw new Error(
          `Invalid contract address: ${params.contractAddress} (expected 42 characters starting with 0x)`,
        );
      }
      if (
        !params.blockHash ||
        params.blockHash.length !== 66 ||
        !params.blockHash.startsWith("0x")
      ) {
        throw new Error(
          `Invalid block hash: ${params.blockHash} (expected 66 characters starting with 0x)`,
        );
      }
      if (
        !params.startKey ||
        params.startKey.length !== 66 ||
        !params.startKey.startsWith("0x")
      ) {
        throw new Error(
          `Invalid start key: ${params.startKey} (expected 66 characters starting with 0x)`,
        );
      }

      console.log("debug_storageRangeAt params:", {
        blockHash: params.blockHash,
        txIndex: params.txIndex,
        contractAddress: params.contractAddress,
        startKey: params.startKey,
        limit: params.limit,
      });

      console.log("Calling debug_storageRangeAt with params:", [
        params.blockHash,
        params.txIndex,
        params.contractAddress,
        params.startKey,
        params.limit,
      ]);

      const result = await this.provider.send("debug_storageRangeAt", [
        params.blockHash,
        params.txIndex,
        params.contractAddress,
        params.startKey,
        params.limit,
      ]);

      console.log("debug_storageRangeAt result:", result);

      if (!result || typeof result !== "object") {
        throw new Error("Invalid response from debug_storageRangeAt");
      }

      return {
        storage: result.storage || {},
        nextKey: result.nextKey,
        complete: !result.nextKey,
      };
    } catch (error) {
      console.error("Error in getStorageRange, trying fallback:", error);

      console.log("Trying fallback implementation...");
      try {
        const { FallbackImplementations } = await import(
          "../gracefulDegradation"
        );
        const fallbackResult =
          await FallbackImplementations.getStorageRangeFallback(
            params.contractAddress,
            params.blockHash,
            params.startKey,
            params.limit,
          );

        console.log("Fallback result:", fallbackResult);

        if (fallbackResult && typeof fallbackResult === "object") {
          return {
            storage: fallbackResult.storage || fallbackResult,
            nextKey: fallbackResult.nextKey || null,
            complete: true,
          };
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }

      return null;
    }
  }

  async getStorageRangePaginated(
    params: Omit<StorageRangeParams, "startKey" | "limit">,
    maxSlots: number = 100,
  ): Promise<StorageRangeResult | null> {
    try {
      let allStorage: Record<string, StorageEntry> = {};
      let nextKey =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      let slotsRetrieved = 0;
      const batchSize = 20;

      while (nextKey && slotsRetrieved < maxSlots) {
        const remainingSlots = maxSlots - slotsRetrieved;
        const currentBatchSize = Math.min(batchSize, remainingSlots);

        const result = await this.getStorageRange({
          ...params,
          startKey: nextKey,
          limit: currentBatchSize,
        });

        if (!result || !result.storage) {
          break;
        }

        allStorage = { ...allStorage, ...result.storage };
        slotsRetrieved += Object.keys(result.storage).length;

        nextKey = result.nextKey || null;

        if (result.complete || !nextKey) {
          break;
        }
      }

      return {
        storage: allStorage,
        nextKey: nextKey,
        complete: !nextKey || slotsRetrieved >= maxSlots,
      };
    } catch (error) {
      console.error("Error in getStorageRangePaginated:", error);
      return null;
    }
  }

  async analyzeMappingStorage(
    params: MappingAnalysisParams,
  ): Promise<MappingResult[]> {
    try {
      const results: MappingResult[] = [];

      const mappingSlotHex =
        typeof params.mappingSlot === "number"
          ? `0x${params.mappingSlot.toString(16).padStart(64, "0")}`
          : params.mappingSlot;

      for (const key of params.keys) {
        let paddedKey: string;
        let keyDisplay: string;
        let keyType: "address" | "uint256" | "bytes32";
        let keyContext: string | undefined;

        if (
          typeof key === "string" &&
          key.startsWith("0x") &&
          key.length === 42
        ) {
          paddedKey = `0x${key.slice(2).toLowerCase().padStart(64, "0")}`;
          keyDisplay = key;
          keyType = "address";
          keyContext = this.getAddressContext(key, params.mappingSlot);
        } else if (
          typeof key === "number" ||
          (typeof key === "string" && /^\d+$/.test(key))
        ) {
          const numKey = typeof key === "number" ? key : parseInt(key);
          paddedKey = `0x${numKey.toString(16).padStart(64, "0")}`;
          keyDisplay = numKey.toString();
          keyType = "uint256";
          keyContext = "Index";
        } else {
          paddedKey = typeof key === "string" ? key : key.toString();
          keyDisplay = paddedKey;
          keyType = "bytes32";
        }

        const concatHex = paddedKey.slice(2) + mappingSlotHex.slice(2);
        const calculatedSlot = ethers.keccak256("0x" + concatHex);

        const storageResult = await this.getStorageRange({
          blockHash: params.blockHash,
          txIndex: params.txIndex || 0,
          contractAddress: params.contractAddress,
          startKey: calculatedSlot,
          limit: 1,
        });

        let value = "0x0";
        let decodedValue = "0";
        let valueInt: number | undefined;

        if (storageResult?.storage?.[calculatedSlot]) {
          value = storageResult.storage[calculatedSlot].value;

          try {
            valueInt = parseInt(value, 16);

            if (params.mappingSlot === 0 || params.mappingSlot === 4) {
              decodedValue = this.formatTokenAmount(valueInt, 6);
            } else {
              decodedValue = valueInt.toString();
            }
          } catch {
            decodedValue = value;
          }
        }

        results.push({
          key,
          keyDisplay,
          keyType,
          keyContext,
          calculatedSlot,
          value,
          decodedValue,
          valueInt,
        });
      }

      return results;
    } catch (error) {
      console.error("Error in analyzeMappingStorage:", error);
      return [];
    }
  }

  async compareStorage(
    params: StorageComparisonParams,
  ): Promise<StorageComparison[]> {
    try {
      const [storage1, storage2] = await Promise.all([
        this.getStorageRange({
          blockHash: params.blockHash1,
          txIndex: params.txIndex1 || 0,
          contractAddress: params.contractAddress,
          startKey: params.startSlot || "0x0",
          limit: params.slotCount || 20,
        }),
        this.getStorageRange({
          blockHash: params.blockHash2,
          txIndex: params.txIndex2 || 0,
          contractAddress: params.contractAddress,
          startKey: params.startSlot || "0x0",
          limit: params.slotCount || 20,
        }),
      ]);

      if (!storage1 || !storage2) {
        throw new Error("Failed to retrieve storage for comparison");
      }

      const allSlots = new Set([
        ...Object.keys(storage1.storage),
        ...Object.keys(storage2.storage),
      ]);

      const comparisons: StorageComparison[] = [];

      for (const slot of allSlots) {
        const value1 = storage1.storage[slot]?.value || "0x0";
        const value2 = storage2.storage[slot]?.value || "0x0";
        const changed = value1 !== value2;

        let diff: string | undefined;
        let numericDiff: number | undefined;
        let isBalanceChange = false;
        let isSupplyChange = false;

        if (changed) {
          try {
            const int1 = parseInt(value1, 16);
            const int2 = parseInt(value2, 16);
            numericDiff = int2 - int1;

            if (Math.abs(numericDiff) < 1e12) {
              diff = `${numericDiff > 0 ? "+" : ""}${numericDiff}`;

              if (slot.length === 66 && Math.abs(numericDiff) < 1e9) {
                isBalanceChange = true;
              }

              if (slot === "0x0" || parseInt(slot, 16) === 0) {
                isSupplyChange = true;
              }
            } else {
              diff = "Changed";
            }
          } catch {
            diff = "Changed";
          }
        } else {
          diff = "No change";
        }

        comparisons.push({
          slot,
          valueBlock1: value1,
          valueBlock2: value2,
          changed,
          diff,
          numericDiff,
          isBalanceChange,
          isSupplyChange,
        });
      }

      return comparisons.sort((a, b) => {
        if (a.changed !== b.changed) return a.changed ? -1 : 1;
        if (a.isSupplyChange !== b.isSupplyChange)
          return a.isSupplyChange ? -1 : 1;
        if (a.isBalanceChange !== b.isBalanceChange)
          return a.isBalanceChange ? -1 : 1;
        return 0;
      });
    } catch (error) {
      console.error("Error in compareStorage:", error);
      return [];
    }
  }

  async getBlockHash(blockIdentifier: string | number): Promise<string | null> {
    try {
      const block = await this.provider.getBlock(blockIdentifier);
      return block?.hash || null;
    } catch (error) {
      console.error("Error getting block hash:", error);
      return null;
    }
  }

  private getAddressContext(
    address: string,
    mappingSlot: number | string,
  ): string {
    if (mappingSlot === 0 || mappingSlot === 4) {
      return "Token Holder";
    } else if (mappingSlot === 1 || mappingSlot === 5) {
      return "Token Owner";
    }
    return "Account";
  }

  private formatTokenAmount(value: number, decimals: number): string {
    const formatted = (value / Math.pow(10, decimals)).toFixed(6);
    return `${formatted} tokens`;
  }
}

export const createStorageApi = (): StorageApi | null => {
  const provider = blockchainService.getProvider();
  if (!provider) {
    return null;
  }
  return new StorageApi(provider);
};
