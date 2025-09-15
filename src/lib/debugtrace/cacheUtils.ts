import { useCallback, useMemo, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  size: number;
}

interface CacheOptions {
  maxSize?: number;
  maxAge?: number;
  maxEntries?: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private maxAge: number;
  private maxEntries: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024;
    this.maxAge = options.maxAge || 5 * 60 * 1000;
    this.maxEntries = options.maxEntries || 100;
  }

  private calculateSize(data: V): number {
    try {
      return JSON.stringify(data).length * 2;
    } catch {
      return 1000;
    }
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.timestamp > this.maxAge;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    if (this.cache.size <= this.maxEntries) return;

    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const hitsDiff = a[1].hits - b[1].hits;
      if (hitsDiff !== 0) return hitsDiff;
      return a[1].timestamp - b[1].timestamp;
    });

    const toRemove = entries.slice(0, Math.floor(this.maxEntries * 0.2));
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  get(key: K): V | undefined {
    this.evictExpired();

    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }

    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: K, value: V): void {
    this.evictExpired();

    const size = this.calculateSize(value);
    const entry: CacheEntry<V> = {
      data: value,
      timestamp: Date.now(),
      hits: 0,
      size,
    };

    if (size > this.maxSize) {
      console.warn("Cache entry too large, skipping cache");
      return;
    }

    this.cache.set(key, entry);
    this.evictLRU();
  }

  has(key: K): boolean {
    this.evictExpired();
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);

    return {
      entries: this.cache.size,
      totalSize,
      totalHits,
      averageHits: entries.length > 0 ? totalHits / entries.length : 0,
      oldestEntry:
        entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : 0,
    };
  }
}

const analyticsCache = new LRUCache<string, any>({
  maxSize: 100 * 1024 * 1024,
  maxAge: 10 * 60 * 1000,
  maxEntries: 200,
});

const chartDataCache = new LRUCache<string, any>({
  maxSize: 50 * 1024 * 1024,
  maxAge: 5 * 60 * 1000,
  maxEntries: 100,
});

export const generateCacheKey = (prefix: string, ...params: any[]): string => {
  const paramString = params
    .map((p) => (typeof p === "object" ? JSON.stringify(p) : String(p)))
    .join("|");
  return `${prefix}:${paramString}`;
};

export function useMemoizedData<T>(
  computeFunction: () => T,
  dependencies: any[],
  cacheKey?: string,
  useGlobalCache: boolean = true,
): T {
  const localCache = useRef<Map<string, { data: T; deps: any[] }>>(new Map());

  return useMemo(() => {
    const key = cacheKey || `memo:${JSON.stringify(dependencies)}`;

    if (useGlobalCache && analyticsCache.has(key)) {
      const cached = analyticsCache.get(key);
      if (cached) return cached;
    }

    const localCached = localCache.current.get(key);
    if (
      localCached &&
      JSON.stringify(localCached.deps) === JSON.stringify(dependencies)
    ) {
      return localCached.data;
    }

    const result = computeFunction();

    localCache.current.set(key, { data: result, deps: [...dependencies] });
    if (useGlobalCache) {
      analyticsCache.set(key, result);
    }

    return result;
  }, dependencies);
}

export function useMemoizedChartData<T>(
  processFunction: () => T,
  rawData: any,
  processingOptions: any = {},
): T {
  const cacheKey = generateCacheKey("chart", rawData, processingOptions);

  return useMemo(() => {
    const cached = chartDataCache.get(cacheKey);
    if (cached) return cached;

    const processed = processFunction();

    chartDataCache.set(cacheKey, processed);

    return processed;
  }, [rawData, processingOptions]);
}

export function useAsyncCache<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[],
  cacheKey?: string,
) {
  const key = cacheKey || generateCacheKey("async", ...dependencies);

  return useMemo(async () => {
    const cached = analyticsCache.get(key);
    if (cached) return cached;

    const result = await asyncFunction();

    analyticsCache.set(key, result);

    return result;
  }, dependencies);
}

export const CacheManager = {
  clearAll: () => {
    analyticsCache.clear();
    chartDataCache.clear();
  },

  clearAnalytics: () => analyticsCache.clear(),
  clearChartData: () => chartDataCache.clear(),

  getStats: () => ({
    analytics: analyticsCache.getStats(),
    chartData: chartDataCache.getStats(),
  }),

  preload: <T>(
    key: string,
    data: T,
    type: "analytics" | "chart" = "analytics",
  ) => {
    const cache = type === "analytics" ? analyticsCache : chartDataCache;
    cache.set(key, data);
  },

  has: (key: string, type: "analytics" | "chart" = "analytics"): boolean => {
    const cache = type === "analytics" ? analyticsCache : chartDataCache;
    return cache.has(key);
  },

  get: <T>(
    key: string,
    type: "analytics" | "chart" = "analytics",
  ): T | undefined => {
    const cache = type === "analytics" ? analyticsCache : chartDataCache;
    return cache.get(key);
  },
};

export function processDataWithCaching<T, R>(
  data: T,
  processor: (data: T) => R,
  cacheKey: string,
  options: { useCache?: boolean; cacheType?: "analytics" | "chart" } = {},
): R {
  const { useCache = true, cacheType = "analytics" } = options;

  if (!useCache) {
    return processor(data);
  }

  const cached = CacheManager.get<R>(cacheKey, cacheType);
  if (cached) {
    return cached;
  }

  const result = processor(data);
  CacheManager.preload(cacheKey, result, cacheType);

  return result;
}

export function useDebouncedCacheInvalidation(
  keys: string[],
  delay: number = 1000,
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const invalidate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      keys.forEach((key) => {
        analyticsCache.delete(key);
        chartDataCache.delete(key);
      });
    }, delay);
  }, [keys, delay]);

  return invalidate;
}
