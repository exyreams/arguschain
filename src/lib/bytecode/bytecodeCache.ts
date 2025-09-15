import { LRUCache } from "@/lib/debugtrace/cacheUtils";
import type { BytecodeAnalysis } from "./processors";

interface CachedBytecodeData {
  address: string;
  blockTag: string;
  analysis: BytecodeAnalysis;
  timestamp: number;
}

export class BytecodeCache {
  private cache: LRUCache<string, CachedBytecodeData>;
  private readonly CACHE_KEY_PREFIX = "bytecode_";

  constructor() {
    this.cache = new LRUCache<string, CachedBytecodeData>({
      maxSize: 50 * 1024 * 1024,
      maxAge: 30 * 60 * 1000,
      maxEntries: 1000,
    });
  }

  private getCacheKey(address: string, blockTag: string): string {
    return `${this.CACHE_KEY_PREFIX}${address.toLowerCase()}_${blockTag}`;
  }

  get(address: string, blockTag: string): BytecodeAnalysis | null {
    const key = this.getCacheKey(address, blockTag);
    const cached = this.cache.get(key);

    if (cached) {
      return cached.analysis;
    }

    return null;
  }

  set(address: string, blockTag: string, analysis: BytecodeAnalysis): void {
    const key = this.getCacheKey(address, blockTag);
    const data: CachedBytecodeData = {
      address: address.toLowerCase(),
      blockTag,
      analysis,
      timestamp: Date.now(),
    };

    this.cache.set(key, data);
  }

  remove(address: string, blockTag: string): void {
    const key = this.getCacheKey(address, blockTag);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }

  getAllCached(): CachedBytecodeData[] {
    const stats = this.cache.getStats();
    const cached: CachedBytecodeData[] = [];

    return cached;
  }
}

export const bytecodeCache = new BytecodeCache();
