import type { LogsAnalysisResults, LogsQueryConfig } from "../types";

interface CachedLogsEntry {
  key: string;
  data: LogsAnalysisResults;
  timestamp: number;
  ttl: number;
  network: string;
  blockRange: string;
  size: number;
  compressed?: boolean;
}

interface LogsCacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
}

class LogsCache {
  private cache = new Map<string, CachedLogsEntry>();
  private readonly maxSize = 50 * 1024 * 1024;
  private readonly maxEntries = 100;
  private readonly defaultTTL = 5 * 60 * 1000;
  private readonly blockDataTTL = 30 * 60 * 1000;
  private readonly recentDataTTL = 2 * 60 * 1000;

  private hits = 0;
  private misses = 0;

  private generateKey(config: LogsQueryConfig): string {
    const { from_block, to_block, network, contract_address, analysis_depth } =
      config;
    return `logs:${network}:${from_block}-${to_block}:${contract_address || "default"}:${analysis_depth || "full"}`;
  }

  private getTTL(fromBlock: string | number, toBlock: string | number): number {
    if (
      fromBlock === "latest" ||
      toBlock === "latest" ||
      fromBlock === "pending" ||
      toBlock === "pending"
    ) {
      return this.recentDataTTL;
    }

    try {
      const fromNum =
        typeof fromBlock === "number"
          ? fromBlock
          : fromBlock.startsWith("0x")
            ? parseInt(fromBlock, 16)
            : parseInt(fromBlock, 10);
      const toNum =
        typeof toBlock === "number"
          ? toBlock
          : toBlock.startsWith("0x")
            ? parseInt(toBlock, 16)
            : parseInt(toBlock, 10);

      const currentBlock = Date.now() / 1000 / 12;
      if (toNum < currentBlock - 1000) {
        return this.blockDataTTL;
      }
    } catch (error) {}

    return this.defaultTTL;
  }

  private compressData(data: LogsAnalysisResults): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.warn("Failed to compress logs data:", error);
      return JSON.stringify(data);
    }
  }

  private decompressData(compressed: string): LogsAnalysisResults {
    try {
      return JSON.parse(compressed);
    } catch (error) {
      console.error("Failed to decompress logs data:", error);
      throw new Error("Cache data corruption detected");
    }
  }

  private calculateSize(data: LogsAnalysisResults): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));
  }

  private enforceLimits(): void {
    this.cleanExpired();

    while (
      this.cache.size > this.maxEntries ||
      this.getTotalSize() > this.maxSize
    ) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private getTotalSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  set(config: LogsQueryConfig, data: LogsAnalysisResults): void {
    const key = this.generateKey(config);
    const ttl = this.getTTL(config.from_block, config.to_block);
    const size = this.calculateSize(data);

    const entry: CachedLogsEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      network: typeof config.network === "string" ? config.network : "mainnet",
      blockRange: `${config.from_block}-${config.to_block}`,
      size,
    };

    this.cache.set(key, entry);
    this.enforceLimits();

    this.persistToStorage();
  }

  get(config: LogsQueryConfig): LogsAnalysisResults | null {
    const key = this.generateKey(config);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  has(config: LogsQueryConfig): boolean {
    const key = this.generateKey(config);
    const entry = this.cache.get(key);

    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(config: LogsQueryConfig): void {
    const key = this.generateKey(config);
    this.cache.delete(key);
    this.persistToStorage();
  }

  clearAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.persistToStorage();
  }

  getAllEntries(): CachedLogsEntry[] {
    this.cleanExpired();
    return Array.from(this.cache.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  getStats(): LogsCacheStats {
    this.cleanExpired();
    const entries = Array.from(this.cache.values());

    return {
      totalEntries: entries.length,
      totalSize: this.getTotalSize(),
      oldestEntry:
        entries.length > 0
          ? new Date(Math.min(...entries.map((e) => e.timestamp)))
          : null,
      newestEntry:
        entries.length > 0
          ? new Date(Math.max(...entries.map((e) => e.timestamp)))
          : null,
      hitRate:
        this.hits + this.misses > 0
          ? (this.hits / (this.hits + this.misses)) * 100
          : 0,
      totalHits: this.hits,
      totalMisses: this.misses,
    };
  }

  private persistToStorage(): void {
    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        stats: { hits: this.hits, misses: this.misses },
        timestamp: Date.now(),
      };

      localStorage.setItem("arguschain_logs_cache", JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to persist logs cache to localStorage:", error);
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("arguschain_logs_cache");
      if (!stored) return;

      const cacheData = JSON.parse(stored);
      const now = Date.now();

      for (const [key, entry] of cacheData.entries) {
        if (now - entry.timestamp <= entry.ttl) {
          this.cache.set(key, entry);
        }
      }

      if (cacheData.stats) {
        this.hits = cacheData.stats.hits || 0;
        this.misses = cacheData.stats.misses || 0;
      }

      this.enforceLimits();
    } catch (error) {
      console.warn("Failed to load logs cache from localStorage:", error);

      localStorage.removeItem("arguschain_logs_cache");
    }
  }

  invalidateNetwork(network: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.network === network) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    this.persistToStorage();
  }

  preloadCommonQueries(): void {}
}

export const logsCache = new LogsCache();

logsCache.loadFromStorage();

export function useLogsCache() {
  return {
    get: (config: LogsQueryConfig) => logsCache.get(config),
    set: (config: LogsQueryConfig, data: LogsAnalysisResults) =>
      logsCache.set(config, data),
    has: (config: LogsQueryConfig) => logsCache.has(config),
    clear: (config: LogsQueryConfig) => logsCache.clear(config),
    clearAll: () => logsCache.clearAll(),
    getAllEntries: () => logsCache.getAllEntries(),
    getStats: () => logsCache.getStats(),
    invalidateNetwork: (network: string) =>
      logsCache.invalidateNetwork(network),
  };
}
