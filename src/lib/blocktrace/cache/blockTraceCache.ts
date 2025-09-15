import {
  generateCacheKey,
  estimateMemoryUsage,
  safeJsonParse,
  safeJsonStringify,
} from "../utils";
import { CACHE_CONFIG } from "../constants";
import type {
  CacheEntry,
  CacheMetrics,
  CacheConfig,
  BlockAnalysis,
} from "../types";

export class BlockTraceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
  };
  private hitCount = 0;
  private missCount = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || CACHE_CONFIG.MAX_CACHE_SIZE,
      ttlMs: config.ttlMs || CACHE_CONFIG.DEFAULT_TTL,
      enablePersistence: config.enablePersistence ?? true,
    };
  }

  /**
   * Initialize the cache (load from storage if persistence is enabled)
   */
  async initialize(): Promise<void> {
    if (this.config.enablePersistence) {
      await this.loadFromStorage();
    }
    console.log(`BlockTraceCache initialized with ${this.cache.size} entries`);
  }

  /**
   * Get an item from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      this.updateMetrics();
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.evictionCount++;
      this.missCount++;
      this.updateMetrics();
      return null;
    }

    // Update access count and hit metrics
    entry.accessCount++;
    this.hitCount++;
    this.updateMetrics();

    return entry.data as T;
  }

  /**
   * Set an item in the cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const actualTtl = ttl || this.config.ttlMs;
    const size = estimateMemoryUsage(data);

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + actualTtl,
      size,
      accessCount: 0,
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      await this.evictEntries();
    }

    this.cache.set(key, entry);
    this.updateMetrics();

    // Persist to storage if enabled
    if (this.config.enablePersistence) {
      await this.saveToStorage();
    }
  }

  /**
   * Delete an item from the cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMetrics();
      if (this.config.enablePersistence) {
        await this.saveToStorage();
      }
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.metrics.evictionCount = 0;
    this.updateMetrics();

    if (this.config.enablePersistence) {
      await this.clearStorage();
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.evictionCount++;
      this.updateMetrics();
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheMetrics & {
    config: CacheConfig;
    entries: Array<{
      key: string;
      size: number;
      accessCount: number;
      age: number;
      ttl: number;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: entry.size,
      accessCount: entry.accessCount,
      age: Date.now() - entry.timestamp,
      ttl: entry.expiresAt - Date.now(),
    }));

    return {
      ...this.metrics,
      config: this.config,
      entries,
    };
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in bytes
   */
  getSize(): number {
    return Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.metrics.evictionCount += evicted;
      this.updateMetrics();

      if (this.config.enablePersistence) {
        await this.saveToStorage();
      }
    }

    return evicted;
  }

  /**
   * Warm the cache with frequently accessed data
   */
  async warmCache(
    entries: Array<{ key: string; data: any; ttl?: number }>
  ): Promise<void> {
    console.log(`Warming cache with ${entries.length} entries...`);

    for (const entry of entries) {
      await this.set(entry.key, entry.data, entry.ttl);
    }

    console.log(`Cache warmed successfully`);
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  async destroy(): Promise<void> {
    await this.clear();
    console.log("BlockTraceCache destroyed");
  }

  /**
   * Private helper methods
   */
  private async evictEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries());

    // Sort by access count (LRU) and age
    entries.sort(([, a], [, b]) => {
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.timestamp - b.timestamp;
    });

    // Remove 20% of entries
    const toRemove = Math.floor(this.config.maxSize * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
      this.metrics.evictionCount++;
    }

    this.updateMetrics();
  }

  private updateMetrics(): void {
    this.metrics.totalEntries = this.cache.size;
    this.metrics.totalSize = this.getSize();

    const total = this.hitCount + this.missCount;
    if (total > 0) {
      this.metrics.hitRate = (this.hitCount / total) * 100;
      this.metrics.missRate = (this.missCount / total) * 100;
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem("blocktrace_cache");
      if (stored) {
        const data = safeJsonParse(stored, { entries: [], metrics: {} });

        // Restore cache entries
        data.entries?.forEach((entry: any) => {
          // Only restore non-expired entries
          if (Date.now() < entry.expiresAt) {
            this.cache.set(entry.key, {
              key: entry.key,
              data: entry.data,
              timestamp: entry.timestamp,
              expiresAt: entry.expiresAt,
              size: entry.size,
              accessCount: entry.accessCount,
            });
          }
        });

        // Restore metrics
        if (data.metrics) {
          this.hitCount = data.metrics.hitCount || 0;
          this.missCount = data.metrics.missCount || 0;
          this.metrics.evictionCount = data.metrics.evictionCount || 0;
        }

        this.updateMetrics();
        console.log(`Loaded ${this.cache.size} entries from storage`);
      }
    } catch (error) {
      console.warn("Failed to load cache from storage:", error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        entries: Array.from(this.cache.values()),
        metrics: {
          hitCount: this.hitCount,
          missCount: this.missCount,
          evictionCount: this.metrics.evictionCount,
        },
        timestamp: Date.now(),
      };

      localStorage.setItem("blocktrace_cache", safeJsonStringify(data));
    } catch (error) {
      console.warn("Failed to save cache to storage:", error);
    }
  }

  private async clearStorage(): Promise<void> {
    try {
      localStorage.removeItem("blocktrace_cache");
    } catch (error) {
      console.warn("Failed to clear cache storage:", error);
    }
  }

  /**
   * Static utility methods
   */
  static generateBlockCacheKey(
    blockIdentifier: string | number,
    network: string = "mainnet"
  ): string {
    return generateCacheKey("block_trace", network, String(blockIdentifier));
  }

  static generateAnalysisCacheKey(
    blockIdentifier: string | number,
    analysisType: string = "full"
  ): string {
    return generateCacheKey(
      "block_analysis",
      analysisType,
      String(blockIdentifier)
    );
  }

  static generateGasCacheKey(blockIdentifier: string | number): string {
    return generateCacheKey("gas_analysis", String(blockIdentifier));
  }

  static generateTokenFlowCacheKey(blockIdentifier: string | number): string {
    return generateCacheKey("token_flow", String(blockIdentifier));
  }

  /**
   * Create a cache instance with specific configuration
   */
  static create(config: Partial<CacheConfig> = {}): BlockTraceCache {
    return new BlockTraceCache(config);
  }

  /**
   * Create a memory-only cache (no persistence)
   */
  static createMemoryOnly(maxSize: number = 50): BlockTraceCache {
    return new BlockTraceCache({
      maxSize,
      enablePersistence: false,
      ttlMs: CACHE_CONFIG.DEFAULT_TTL,
    });
  }

  /**
   * Create a persistent cache with custom TTL
   */
  static createPersistent(
    ttlMs: number = CACHE_CONFIG.ANALYSIS_TTL
  ): BlockTraceCache {
    return new BlockTraceCache({
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
      enablePersistence: true,
      ttlMs,
    });
  }
}
