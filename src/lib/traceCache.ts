import { TransactionAnalysis } from "./transactionTracer";
import { StructLogAnalysis } from "./structLogTracer";

export interface CachedTraceData {
  callTrace: TransactionAnalysis | null;
  structLog: StructLogAnalysis | null;
  timestamp: number;
  network: string;
  traceMethod: string;
  txHash: string;
}

export interface TraceMetadata {
  txHash: string;
  network: string;
  timestamp: number;
  hasCallTrace: boolean;
  hasStructLog: boolean;
  gasUsed?: number;
  status?: "success" | "failed";
}

class TraceCacheManager {
  private readonly CACHE_PREFIX = "arguschain_trace_";
  private readonly METADATA_KEY = "arguschain_trace_metadata";
  private readonly MAX_CACHE_SIZE = 50;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  saveToCache(data: CachedTraceData): void {
    try {
      const cacheKey = this.getCacheKey(data.txHash, data.network);
      const cacheData = {
        ...data,
        timestamp: Date.now(),
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      this.updateMetadata(data);
      this.cleanupOldEntries();
    } catch (error) {
      console.warn("Failed to save trace data to cache:", error);
    }
  }

  loadFromCache(txHash: string, network: string): CachedTraceData | null {
    try {
      const cacheKey = this.getCacheKey(txHash, network);
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const data: CachedTraceData = JSON.parse(cached);

      if (Date.now() - data.timestamp > this.CACHE_DURATION) {
        this.removeFromCache(txHash, network);
        return null;
      }

      return data;
    } catch (error) {
      console.warn("Failed to load trace data from cache:", error);
      return null;
    }
  }

  removeFromCache(txHash: string, network: string): void {
    try {
      const cacheKey = this.getCacheKey(txHash, network);
      localStorage.removeItem(cacheKey);
      this.removeFromMetadata(txHash, network);
    } catch (error) {
      console.warn("Failed to remove trace data from cache:", error);
    }
  }

  getCachedTraces(): TraceMetadata[] {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
      return metadata ? JSON.parse(metadata) : [];
    } catch (error) {
      console.warn("Failed to load trace metadata:", error);
      return [];
    }
  }

  clearAllCache(): void {
    try {
      const metadata = this.getCachedTraces();
      metadata.forEach(({ txHash, network }) => {
        const cacheKey = this.getCacheKey(txHash, network);
        localStorage.removeItem(cacheKey);
      });
      localStorage.removeItem(this.METADATA_KEY);
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }

  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const metadata = this.getCachedTraces();
    const timestamps = metadata.map((m) => m.timestamp).filter(Boolean);

    let totalSize = 0;
    metadata.forEach(({ txHash, network }) => {
      const cacheKey = this.getCacheKey(txHash, network);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        totalSize += cached.length;
      }
    });

    return {
      totalEntries: metadata.length,
      totalSize,
      oldestEntry: timestamps.length
        ? new Date(Math.min(...timestamps))
        : undefined,
      newestEntry: timestamps.length
        ? new Date(Math.max(...timestamps))
        : undefined,
    };
  }

  private getCacheKey(txHash: string, network: string): string {
    return `${this.CACHE_PREFIX}${network}_${txHash}`;
  }

  private updateMetadata(data: CachedTraceData): void {
    try {
      const metadata = this.getCachedTraces();
      const existingIndex = metadata.findIndex(
        (m) => m.txHash === data.txHash && m.network === data.network,
      );

      const newMetadata: TraceMetadata = {
        txHash: data.txHash,
        network: data.network,
        timestamp: data.timestamp,
        hasCallTrace: !!data.callTrace,
        hasStructLog: !!data.structLog,
        gasUsed:
          data.callTrace?.transaction_stats?.total_gas ||
          data.structLog?.summary?.total_gas_cost,
        status:
          data.callTrace?.transaction_stats?.errors > 0 ? "failed" : "success",
      };

      if (existingIndex >= 0) {
        metadata[existingIndex] = newMetadata;
      } else {
        metadata.push(newMetadata);
      }

      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn("Failed to update metadata:", error);
    }
  }

  private removeFromMetadata(txHash: string, network: string): void {
    try {
      const metadata = this.getCachedTraces();
      const filtered = metadata.filter(
        (m) => !(m.txHash === txHash && m.network === network),
      );
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.warn("Failed to remove from metadata:", error);
    }
  }

  private cleanupOldEntries(): void {
    try {
      const metadata = this.getCachedTraces();

      const now = Date.now();
      const validMetadata = metadata.filter((m) => {
        const isValid = now - m.timestamp < this.CACHE_DURATION;
        if (!isValid) {
          const cacheKey = this.getCacheKey(m.txHash, m.network);
          localStorage.removeItem(cacheKey);
        }
        return isValid;
      });

      if (validMetadata.length > this.MAX_CACHE_SIZE) {
        validMetadata.sort((a, b) => b.timestamp - a.timestamp);
        const toRemove = validMetadata.slice(this.MAX_CACHE_SIZE);

        toRemove.forEach((m) => {
          const cacheKey = this.getCacheKey(m.txHash, m.network);
          localStorage.removeItem(cacheKey);
        });

        validMetadata.splice(this.MAX_CACHE_SIZE);
      }

      localStorage.setItem(this.METADATA_KEY, JSON.stringify(validMetadata));
    } catch (error) {
      console.warn("Failed to cleanup old entries:", error);
    }
  }
}

export const traceCacheManager = new TraceCacheManager();

export function useTraceCache() {
  const getCachedTrace = (txHash: string, network: string) => {
    return traceCacheManager.loadFromCache(txHash, network);
  };

  const saveTrace = (data: CachedTraceData) => {
    traceCacheManager.saveToCache(data);
  };

  const clearTrace = (txHash: string, network: string) => {
    traceCacheManager.removeFromCache(txHash, network);
  };

  const getCachedTraces = () => {
    return traceCacheManager.getCachedTraces();
  };

  const clearAllTraces = () => {
    traceCacheManager.clearAllCache();
  };

  const getCacheStats = () => {
    return traceCacheManager.getCacheStats();
  };

  return {
    getCachedTrace,
    saveTrace,
    clearTrace,
    getCachedTraces,
    clearAllTraces,
    getCacheStats,
  };
}
