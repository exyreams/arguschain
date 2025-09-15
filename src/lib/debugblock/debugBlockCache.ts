import { DebugBlockCacheEntry, ProcessedDebugBlockData } from "./types";
import { CACHE_CONFIG } from "./constants";

export class DebugBlockCache {
  private cache = new Map<string, DebugBlockCacheEntry>();
  private accessOrder = new Map<string, number>();
  private hitCount = 0;
  private missCount = 0;

  get(key: string): ProcessedDebugBlockData | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.missCount++;
      return null;
    }

    this.accessOrder.set(key, Date.now());
    this.hitCount++;

    console.log(`Cache hit for key: ${key}`);
    return entry.analysis;
  }

  set(key: string, data: ProcessedDebugBlockData): void {
    const now = Date.now();
    const entry: DebugBlockCacheEntry = {
      blockIdentifier: key,
      traceData: [],
      analysis: data,
      timestamp: now,
      expiresAt: now + CACHE_CONFIG.DEBUG_BLOCK_TRACE_TTL,
    };

    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_ENTRIES) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, now);

    console.log(`Cached data for key: ${key}, cache size: ${this.cache.size}`);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.hitCount = 0;
    this.missCount = 0;
    console.log("Debug block cache cleared");
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: string[];
  } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate =
      totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_CACHE_ENTRIES,
      hitRate: Math.round(hitRate * 100) / 100,
      entries: Array.from(this.cache.keys()),
    };
  }

  private evictLRU(): void {
    if (this.accessOrder.size === 0) return;

    let oldestKey = "";
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      console.log(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  getMemoryUsage(): {
    estimatedSizeBytes: number;
    entriesCount: number;
    averageSizePerEntry: number;
  } {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      const entrySize = JSON.stringify(entry.analysis).length * 2 + 100;
      totalSize += entrySize;
    }

    const entriesCount = this.cache.size;
    const averageSizePerEntry = entriesCount > 0 ? totalSize / entriesCount : 0;

    return {
      estimatedSizeBytes: totalSize,
      entriesCount,
      averageSizePerEntry: Math.round(averageSizePerEntry),
    };
  }

  pruneToSize(targetSize: number): void {
    if (this.cache.size <= targetSize) return;

    const entriesToRemove = this.cache.size - targetSize;
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, entriesToRemove);

    for (const [key] of sortedEntries) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    console.log(
      `Pruned cache to ${targetSize} entries (removed ${entriesToRemove})`,
    );
  }

  getEntriesByAge(): Array<{
    key: string;
    age: number;
    expiresIn: number;
    blockIdentifier: string;
  }> {
    const now = Date.now();
    const entries: Array<{
      key: string;
      age: number;
      expiresIn: number;
      blockIdentifier: string;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        age: now - entry.timestamp,
        expiresIn: entry.expiresAt - now,
        blockIdentifier: entry.blockIdentifier,
      });
    }

    return entries.sort((a, b) => b.age - a.age);
  }

  async warmCache(
    blockNumbers: number[],
    dataFetcher: (blockNumber: number) => Promise<ProcessedDebugBlockData>,
  ): Promise<void> {
    console.log(`Warming cache with ${blockNumbers.length} blocks`);

    const promises = blockNumbers.map(async (blockNumber) => {
      const key = `debug_block_${blockNumber}`;

      if (!this.has(key)) {
        try {
          const data = await dataFetcher(blockNumber);
          this.set(key, data);
        } catch (error) {
          console.warn(`Failed to warm cache for block ${blockNumber}:`, error);
        }
      }
    });

    await Promise.all(promises);
    console.log(`Cache warming completed. Cache size: ${this.cache.size}`);
  }

  export(): Array<{
    key: string;
    data: ProcessedDebugBlockData;
    timestamp: number;
    expiresAt: number;
  }> {
    const exportData: Array<{
      key: string;
      data: ProcessedDebugBlockData;
      timestamp: number;
      expiresAt: number;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      exportData.push({
        key,
        data: entry.analysis,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
      });
    }

    return exportData;
  }

  import(
    data: Array<{
      key: string;
      data: ProcessedDebugBlockData;
      timestamp: number;
      expiresAt: number;
    }>,
  ): void {
    const now = Date.now();
    let importedCount = 0;

    for (const item of data) {
      if (item.expiresAt > now) {
        const entry: DebugBlockCacheEntry = {
          blockIdentifier: item.key,
          traceData: [],
          analysis: item.data,
          timestamp: item.timestamp,
          expiresAt: item.expiresAt,
        };

        this.cache.set(item.key, entry);
        this.accessOrder.set(item.key, item.timestamp);
        importedCount++;
      }
    }

    console.log(`Imported ${importedCount}/${data.length} cache entries`);
  }
}
