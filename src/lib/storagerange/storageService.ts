import type {
  MappingResult,
  StorageComparison,
  StorageSlot,
} from "./api/storageApi";
import { createStorageApi, type StorageApi } from "./api/storageApi";
import {
  type ProcessedStorageData,
  storageProcessor,
} from "./processors/storageProcessor";

export interface StorageAnalysisOptions {
  maxSlots?: number;
  includeMappingAnalysis?: boolean;
  includePatternDetection?: boolean;
  includeSecurityAnalysis?: boolean;
}

export interface StorageAnalysisResult {
  contractAddress: string;
  blockHash: string;
  processedData: ProcessedStorageData;
  visualizationData: any;
  rawSlots: StorageSlot[];
  analysisMetadata: {
    timestamp: string;
    slotsAnalyzed: number;
    patternsDetected: number;
    securityFlags: number;
  };
}

export interface MappingAnalysisResult {
  contractAddress: string;
  mappingSlot: number | string;
  blockHash: string;
  results: MappingResult[];
  processedData: {
    summary: { totalKeys: number; nonZeroValues: number; totalValue: number };
    topHolders: MappingResult[];
    distribution: { key: string; value: number; percentage: number }[];
  };
  analysisMetadata: {
    timestamp: string;
    keysAnalyzed: number;
    nonZeroValues: number;
  };
}

export interface StorageComparisonResult {
  contractAddress: string;
  blockHash1: string;
  blockHash2: string;
  comparisons: StorageComparison[];
  processedData: {
    summary: {
      totalSlots: number;
      changedSlots: number;
      supplyChanges: number;
      balanceChanges: number;
    };
    changes: StorageComparison[];
    changesByCategory: { category: string; count: number }[];
  };
  analysisMetadata: {
    timestamp: string;
    slotsCompared: number;
    changesDetected: number;
  };
}

export class StorageService {
  private storageApi: StorageApi | null = null;

  constructor() {
    this.initializeApi();
  }

  private initializeApi(): void {
    this.storageApi = createStorageApi();
  }

  private ensureApi(): StorageApi {
    if (!this.storageApi) {
      this.initializeApi();
      if (!this.storageApi) {
        throw new Error(
          "Storage API not available - blockchain service not connected",
        );
      }
    }
    return this.storageApi;
  }

  async analyzeContractStorage(
    contractAddress: string,
    blockIdentifier: string | number,
    options: StorageAnalysisOptions = {},
  ): Promise<StorageAnalysisResult> {
    const api = this.ensureApi();
    const {
      maxSlots = 50,
      includeMappingAnalysis = true,
      includePatternDetection = true,
      includeSecurityAnalysis = true,
    } = options;

    console.log("StorageService.analyzeContractStorage called with:", {
      contractAddress,
      blockIdentifier,
      options,
    });

    try {
      let blockHash: string;
      if (
        typeof blockIdentifier === "string" &&
        blockIdentifier.startsWith("0x") &&
        blockIdentifier.length === 66
      ) {
        blockHash = blockIdentifier;
      } else {
        const hash = await api.getBlockHash(blockIdentifier);
        if (!hash) {
          throw new Error(
            `Could not resolve block hash for identifier: ${blockIdentifier}`,
          );
        }
        blockHash = hash;
      }

      if (
        !contractAddress ||
        contractAddress.length !== 42 ||
        !contractAddress.startsWith("0x")
      ) {
        throw new Error(`Invalid contract address format: ${contractAddress}`);
      }

      try {
        const provider = api.provider;
        const code = await provider.getCode(contractAddress, blockHash);
        console.log("Contract code length:", code.length);
        if (code === "0x") {
          console.warn(
            "Contract has no code - might be an EOA or non-existent contract",
          );
        }
      } catch (codeError) {
        console.warn("Could not check contract code:", codeError);
      }

      console.log("Resolved block hash:", blockHash);

      const storageResult = await api.getStorageRangePaginated(
        {
          blockHash,
          txIndex: 0,
          contractAddress,
        },
        maxSlots,
      );

      console.log("Storage result:", storageResult);

      if (!storageResult) {
        throw new Error("Failed to retrieve storage range");
      }

      if (
        !storageResult.storage ||
        Object.keys(storageResult.storage).length === 0
      ) {
        console.warn("Storage result is empty:", storageResult);
      }

      const processedData = storageProcessor.processStorageRange(
        storageResult,
        contractAddress,
        blockHash,
      );

      const visualizationData =
        storageProcessor.generateVisualizationData(processedData);

      const analysisMetadata = {
        timestamp: new Date().toISOString(),
        slotsAnalyzed: processedData.slots.length,
        patternsDetected: processedData.patterns.detailedPatterns.length,
        securityFlags: processedData.securityFlags.length,
      };

      return {
        contractAddress,
        blockHash,
        processedData,
        visualizationData,
        rawSlots: processedData.slots,
        analysisMetadata,
      };
    } catch (error) {
      console.error("Error in analyzeContractStorage:", error);
      throw new Error(
        `Storage analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async analyzeMappingStorage(
    contractAddress: string,
    mappingSlot: number | string,
    keys: (string | number)[],
    blockIdentifier: string | number,
  ): Promise<MappingAnalysisResult> {
    const api = this.ensureApi();

    try {
      let blockHash: string;
      if (
        typeof blockIdentifier === "string" &&
        blockIdentifier.startsWith("0x") &&
        blockIdentifier.length === 66
      ) {
        blockHash = blockIdentifier;
      } else {
        const hash = await api.getBlockHash(blockIdentifier);
        if (!hash) {
          throw new Error(
            `Could not resolve block hash for identifier: ${blockIdentifier}`,
          );
        }
        blockHash = hash;
      }

      const results = await api.analyzeMappingStorage({
        contractAddress,
        mappingSlot,
        keys,
        blockHash,
        txIndex: 0,
      });

      const processedData = storageProcessor.processMappingResults(
        results,
        mappingSlot,
      );

      const analysisMetadata = {
        timestamp: new Date().toISOString(),
        keysAnalyzed: results.length,
        nonZeroValues: processedData.summary.nonZeroValues,
      };

      return {
        contractAddress,
        mappingSlot,
        blockHash,
        results,
        processedData,
        analysisMetadata,
      };
    } catch (error) {
      console.error("Error in analyzeMappingStorage:", error);
      throw new Error(
        `Mapping analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async compareStorageBetweenBlocks(
    contractAddress: string,
    blockIdentifier1: string | number,
    blockIdentifier2: string | number,
    options: { slotCount?: number; startSlot?: string } = {},
  ): Promise<StorageComparisonResult> {
    const api = this.ensureApi();
    const { slotCount = 20, startSlot = "0x0" } = options;

    try {
      const [blockHash1, blockHash2] = await Promise.all([
        typeof blockIdentifier1 === "string" &&
        blockIdentifier1.startsWith("0x") &&
        blockIdentifier1.length === 66
          ? blockIdentifier1
          : api.getBlockHash(blockIdentifier1),
        typeof blockIdentifier2 === "string" &&
        blockIdentifier2.startsWith("0x") &&
        blockIdentifier2.length === 66
          ? blockIdentifier2
          : api.getBlockHash(blockIdentifier2),
      ]);

      if (!blockHash1 || !blockHash2) {
        throw new Error("Could not resolve block hashes for comparison");
      }

      const comparisons = await api.compareStorage({
        contractAddress,
        blockHash1,
        blockHash2,
        txIndex1: 0,
        txIndex2: 0,
        slotCount,
        startSlot,
      });

      const processedData =
        storageProcessor.processStorageComparison(comparisons);

      const analysisMetadata = {
        timestamp: new Date().toISOString(),
        slotsCompared: comparisons.length,
        changesDetected: processedData.summary.changedSlots,
      };

      return {
        contractAddress,
        blockHash1,
        blockHash2,
        comparisons,
        processedData,
        analysisMetadata,
      };
    } catch (error) {
      console.error("Error in compareStorageBetweenBlocks:", error);
      throw new Error(
        `Storage comparison failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async analyzeERC20Storage(
    tokenAddress: string,
    blockIdentifier: string | number,
    accountsToCheck: string[] = [],
  ): Promise<{
    baseAnalysis: StorageAnalysisResult;
    balanceAnalysis?: MappingAnalysisResult;
  }> {
    try {
      const baseAnalysis = await this.analyzeContractStorage(
        tokenAddress,
        blockIdentifier,
        {
          maxSlots: 20,
          includePatternDetection: true,
          includeSecurityAnalysis: true,
        },
      );

      let balanceAnalysis: MappingAnalysisResult | undefined;

      if (accountsToCheck.length > 0) {
        balanceAnalysis = await this.analyzeMappingStorage(
          tokenAddress,
          4,
          accountsToCheck,
          blockIdentifier,
        );
      }

      return {
        baseAnalysis,
        balanceAnalysis,
      };
    } catch (error) {
      console.error("Error in analyzeERC20Storage:", error);
      throw new Error(
        `ERC20 storage analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async trackStorageHistory(
    contractAddress: string,
    slotToTrack: string,
    blockNumbers: number[],
  ): Promise<{
    slot: string;
    history: Array<{
      blockNumber: number;
      blockHash: string;
      value: string;
      decodedValue?: string;
      timestamp?: number;
    }>;
  }> {
    const api = this.ensureApi();

    try {
      const history = [];

      for (const blockNumber of blockNumbers) {
        try {
          const blockHash = await api.getBlockHash(blockNumber);
          if (!blockHash) continue;

          const storageResult = await api.getStorageRange({
            blockHash,
            txIndex: 0,
            contractAddress,
            startKey: slotToTrack,
            limit: 1,
          });

          if (storageResult?.storage?.[slotToTrack]) {
            const value = storageResult.storage[slotToTrack].value;

            let decodedValue: string | undefined;
            try {
              const valueInt = BigInt(value);
              if (slotToTrack === "0x0") {
                decodedValue = `${Number(valueInt) / 1e6} tokens`;
              } else if (
                slotToTrack ===
                "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb"
              ) {
                decodedValue = valueInt === 1n ? "Paused" : "Active";
              } else if (valueInt < 1000000000000n) {
                decodedValue = valueInt.toString();
              }
            } catch {}

            history.push({
              blockNumber,
              blockHash,
              value,
              decodedValue,
            });
          }
        } catch (error) {
          console.warn(`Error reading block ${blockNumber}:`, error);
        }
      }

      return {
        slot: slotToTrack,
        history,
      };
    } catch (error) {
      console.error("Error in trackStorageHistory:", error);
      throw new Error(
        `Storage history tracking failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  getCommonERC20Addresses(): string[] {
    return [
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "0xA0b86a33E6441b8C4505B7C0c6b0b8e6C6C8b8e6",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
      "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    ];
  }

  refreshConnection(): void {
    this.initializeApi();
  }
}

export const storageService = new StorageService();
