import type { BatchResult, ComparisonResult, SimulationResult } from "./types";

interface CachedSimulation {
  result: SimulationResult;
  timestamp: number;
  network: string;
  blockNumber: string | number;
}

interface CachedComparison {
  results: ComparisonResult[];
  timestamp: number;
  network: string;
  functionName: string;
  fromAddress: string;
}

interface CachedBatch {
  result: BatchResult;
  timestamp: number;
  network: string;
  fromAddress: string;
}

export class SimulationCache {
  private static readonly CACHE_DURATION = 5 * 60 * 1000;
  private static readonly MAX_CACHE_SIZE = 100;

  private simulationCache = new Map<string, CachedSimulation>();
  private comparisonCache = new Map<string, CachedComparison>();
  private batchCache = new Map<string, CachedBatch>();

  private getSimulationKey(
    functionName: string,
    fromAddress: string,
    parameters: any[],
    network: string,
    blockNumber: string | number,
  ): string {
    const paramStr = JSON.stringify(parameters);
    return `sim:${functionName}:${fromAddress}:${paramStr}:${network}:${blockNumber}`;
  }

  private getComparisonKey(
    functionName: string,
    fromAddress: string,
    parameterSets: any[][],
    network: string,
  ): string {
    const paramStr = JSON.stringify(parameterSets);
    return `comp:${functionName}:${fromAddress}:${paramStr}:${network}`;
  }

  private getBatchKey(
    fromAddress: string,
    operations: any[],
    network: string,
  ): string {
    const opsStr = JSON.stringify(operations);
    return `batch:${fromAddress}:${opsStr}:${network}`;
  }

  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < SimulationCache.CACHE_DURATION;
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.simulationCache.entries()) {
      if (now - entry.timestamp > SimulationCache.CACHE_DURATION) {
        this.simulationCache.delete(key);
      }
    }

    for (const [key, entry] of this.comparisonCache.entries()) {
      if (now - entry.timestamp > SimulationCache.CACHE_DURATION) {
        this.comparisonCache.delete(key);
      }
    }

    for (const [key, entry] of this.batchCache.entries()) {
      if (now - entry.timestamp > SimulationCache.CACHE_DURATION) {
        this.batchCache.delete(key);
      }
    }
  }

  private enforceSizeLimit(): void {
    if (this.simulationCache.size > SimulationCache.MAX_CACHE_SIZE) {
      const entries = Array.from(this.simulationCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(
        0,
        entries.length - SimulationCache.MAX_CACHE_SIZE,
      );
      toRemove.forEach(([key]) => this.simulationCache.delete(key));
    }

    if (this.comparisonCache.size > SimulationCache.MAX_CACHE_SIZE) {
      const entries = Array.from(this.comparisonCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(
        0,
        entries.length - SimulationCache.MAX_CACHE_SIZE,
      );
      toRemove.forEach(([key]) => this.comparisonCache.delete(key));
    }

    if (this.batchCache.size > SimulationCache.MAX_CACHE_SIZE) {
      const entries = Array.from(this.batchCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(
        0,
        entries.length - SimulationCache.MAX_CACHE_SIZE,
      );
      toRemove.forEach(([key]) => this.batchCache.delete(key));
    }
  }

  cacheSimulation(
    functionName: string,
    fromAddress: string,
    parameters: any[],
    network: string,
    blockNumber: string | number,
    result: SimulationResult,
  ): void {
    const key = this.getSimulationKey(
      functionName,
      fromAddress,
      parameters,
      network,
      blockNumber,
    );

    this.simulationCache.set(key, {
      result,
      timestamp: Date.now(),
      network,
      blockNumber,
    });

    this.cleanup();
    this.enforceSizeLimit();
  }

  getCachedSimulation(
    functionName: string,
    fromAddress: string,
    parameters: any[],
    network: string,
    blockNumber: string | number,
  ): SimulationResult | null {
    const key = this.getSimulationKey(
      functionName,
      fromAddress,
      parameters,
      network,
      blockNumber,
    );
    const cached = this.simulationCache.get(key);

    if (cached && this.isValid(cached.timestamp)) {
      return cached.result;
    }

    if (cached) {
      this.simulationCache.delete(key);
    }

    return null;
  }

  cacheComparison(
    functionName: string,
    fromAddress: string,
    parameterSets: any[][],
    network: string,
    results: ComparisonResult[],
  ): void {
    const key = this.getComparisonKey(
      functionName,
      fromAddress,
      parameterSets,
      network,
    );

    this.comparisonCache.set(key, {
      results,
      timestamp: Date.now(),
      network,
      functionName,
      fromAddress,
    });

    this.cleanup();
    this.enforceSizeLimit();
  }

  getCachedComparison(
    functionName: string,
    fromAddress: string,
    parameterSets: any[][],
    network: string,
  ): ComparisonResult[] | null {
    const key = this.getComparisonKey(
      functionName,
      fromAddress,
      parameterSets,
      network,
    );
    const cached = this.comparisonCache.get(key);

    if (cached && this.isValid(cached.timestamp)) {
      return cached.results;
    }

    if (cached) {
      this.comparisonCache.delete(key);
    }

    return null;
  }

  cacheBatch(
    fromAddress: string,
    operations: any[],
    network: string,
    result: BatchResult,
  ): void {
    const key = this.getBatchKey(fromAddress, operations, network);

    this.batchCache.set(key, {
      result,
      timestamp: Date.now(),
      network,
      fromAddress,
    });

    this.cleanup();
    this.enforceSizeLimit();
  }

  getCachedBatch(
    fromAddress: string,
    operations: any[],
    network: string,
  ): BatchResult | null {
    const key = this.getBatchKey(fromAddress, operations, network);
    const cached = this.batchCache.get(key);

    if (cached && this.isValid(cached.timestamp)) {
      return cached.result;
    }

    if (cached) {
      this.batchCache.delete(key);
    }

    return null;
  }

  clearAll(): void {
    this.simulationCache.clear();
    this.comparisonCache.clear();
    this.batchCache.clear();
  }

  clearNetwork(network: string): void {
    for (const [key, entry] of this.simulationCache.entries()) {
      if (entry.network === network) {
        this.simulationCache.delete(key);
      }
    }

    for (const [key, entry] of this.comparisonCache.entries()) {
      if (entry.network === network) {
        this.comparisonCache.delete(key);
      }
    }

    for (const [key, entry] of this.batchCache.entries()) {
      if (entry.network === network) {
        this.batchCache.delete(key);
      }
    }
  }

  getStats(): {
    simulationCount: number;
    comparisonCount: number;
    batchCount: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const allTimestamps: number[] = [];

    this.simulationCache.forEach((entry) =>
      allTimestamps.push(entry.timestamp),
    );
    this.comparisonCache.forEach((entry) =>
      allTimestamps.push(entry.timestamp),
    );
    this.batchCache.forEach((entry) => allTimestamps.push(entry.timestamp));

    return {
      simulationCount: this.simulationCache.size,
      comparisonCount: this.comparisonCache.size,
      batchCount: this.batchCache.size,
      totalSize:
        this.simulationCache.size +
        this.comparisonCache.size +
        this.batchCache.size,
      oldestEntry: allTimestamps.length > 0 ? Math.min(...allTimestamps) : null,
      newestEntry: allTimestamps.length > 0 ? Math.max(...allTimestamps) : null,
    };
  }
}

export const simulationCache = new SimulationCache();
