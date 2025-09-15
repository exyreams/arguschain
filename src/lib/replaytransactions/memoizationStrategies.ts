import { useCallback, useEffect, useMemo, useRef } from "react";

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  dependencies?: string[];
  ttl?: number;
}

interface CacheConfig {
  maxSize: number;
  maxEntries: number;
  defaultTTL: number;
  cleanupInterval: number;
  evictionStrategy: "lru" | "lfu" | "ttl" | "size-aware";
}

class AdvancedMemoCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private currentSize = 0;
  private cleanupTimer?: NodeJS.Timeout;
  private hitCount = 0;
  private missCount = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100 * 1024 * 1024,
      maxEntries: 1000,
      defaultTTL: 5 * 60 * 1000,
      cleanupInterval: 60 * 1000,
      evictionStrategy: "lru",
      ...config,
    };

    this.startCleanupTimer();
  }

  set(
    key: string,
    value: T,
    options: { ttl?: number; dependencies?: string[] } = {},
  ): void {
    const size = this.calculateSize(value);
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      dependencies: options.dependencies,
      ttl: options.ttl || this.config.defaultTTL,
    };

    this.ensureCapacity(size);

    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
    }

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return undefined;
    }

    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.missCount++;
      return undefined;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;

    return entry.value;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  invalidateByDependency(dependency: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.dependencies?.includes(dependency)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));
  }

  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.currentSize,
      entries: this.cache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      memoryUsage: (this.currentSize / (1024 * 1024)).toFixed(2) + " MB",
    };
  }

  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1000;
    }
  }

  private ensureCapacity(newEntrySize: number): void {
    while (
      this.currentSize + newEntrySize > this.config.maxSize ||
      this.cache.size >= this.config.maxEntries
    ) {
      this.evictEntry();
    }
  }

  private evictEntry(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;

    switch (this.config.evictionStrategy) {
      case "lru":
        keyToEvict = this.findLRUKey();
        break;
      case "lfu":
        keyToEvict = this.findLFUKey();
        break;
      case "ttl":
        keyToEvict = this.findOldestKey();
        break;
      case "size-aware":
        keyToEvict = this.findLargestKey();
        break;
      default:
        keyToEvict = this.cache.keys().next().value;
    }

    this.delete(keyToEvict);
  }

  private findLRUKey(): string {
    let oldestKey = "";
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  private findLFUKey(): string {
    let leastUsedKey = "";
    let leastCount = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    });

    return leastUsedKey;
  }

  private findOldestKey(): string {
    let oldestKey = "";
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  private findLargestKey(): string {
    let largestKey = "";
    let largestSize = 0;

    this.cache.forEach((entry, key) => {
      if (entry.size > largestSize) {
        largestSize = entry.size;
        largestKey = key;
      }
    });

    return largestKey;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

const replayDataCache = new AdvancedMemoCache({
  maxSize: 200 * 1024 * 1024,
  maxEntries: 500,
  defaultTTL: 10 * 60 * 1000,
  evictionStrategy: "size-aware",
});

const analyticsCache = new AdvancedMemoCache({
  maxSize: 50 * 1024 * 1024,
  maxEntries: 1000,
  defaultTTL: 5 * 60 * 1000,
  evictionStrategy: "lru",
});

const computationCache = new AdvancedMemoCache({
  maxSize: 100 * 1024 * 1024,
  maxEntries: 2000,
  defaultTTL: 15 * 60 * 1000,
  evictionStrategy: "lfu",
});

export function useAdvancedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options: {
    key?: string;
    ttl?: number;
    cache?: AdvancedMemoCache<T>;
    dependencies?: string[];
  } = {},
): T {
  const {
    key = JSON.stringify(deps),
    ttl,
    cache = computationCache,
    dependencies,
  } = options;

  return useMemo(() => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();

    cache.set(key, value, { ttl, dependencies });

    return value;
  }, deps);
}

export function useAdvancedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options: {
    cacheResults?: boolean;
    maxCacheSize?: number;
    ttl?: number;
  } = {},
): T {
  const {
    cacheResults = true,
    maxCacheSize = 100,
    ttl = 5 * 60 * 1000,
  } = options;

  const resultCache = useRef(
    new Map<string, { value: any; timestamp: number }>(),
  );

  return useCallback((...args: Parameters<T>) => {
    if (!cacheResults) {
      return callback(...args);
    }

    const cacheKey = JSON.stringify(args);
    const cached = resultCache.current.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }

    const result = callback(...args);

    if (resultCache.current.size >= maxCacheSize) {
      const firstKey = resultCache.current.keys().next().value;
      resultCache.current.delete(firstKey);
    }

    resultCache.current.set(cacheKey, {
      value: result,
      timestamp: Date.now(),
    });

    return result;
  }, deps) as T;
}

export function useAsyncMemo<T>(
  asyncFactory: () => Promise<T>,
  deps: React.DependencyList,
  options: {
    key?: string;
    ttl?: number;
    cache?: AdvancedMemoCache<T>;
    defaultValue?: T;
  } = {},
): { data: T | undefined; loading: boolean; error: Error | null } {
  const {
    key = JSON.stringify(deps),
    ttl,
    cache = computationCache,
    defaultValue,
  } = options;

  const [state, setState] = React.useState<{
    data: T | undefined;
    loading: boolean;
    error: Error | null;
  }>({
    data: defaultValue,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    asyncFactory()
      .then((result) => {
        cache.set(key, result, { ttl });
        setState({ data: result, loading: false, error: null });
      })
      .catch((error) => {
        setState((prev) => ({ ...prev, loading: false, error }));
      });
  }, deps);

  return state;
}

export function withMemoization<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    propsComparator?: (prevProps: P, nextProps: P) => boolean;
    cacheSize?: number;
  } = {},
): React.ComponentType<P> {
  const { propsComparator, cacheSize = 10 } = options;

  const MemoizedComponent = React.memo(Component, propsComparator);

  const instanceCache = new AdvancedMemoCache({
    maxEntries: cacheSize,
    defaultTTL: 2 * 60 * 1000,
    evictionStrategy: "lru",
  });

  return React.forwardRef<any, P>((props, ref) => {
    return React.createElement(MemoizedComponent, {
      ...props,
      ref,
      __cache: instanceCache,
    });
  });
}

export function useReplayDataMemo<T>(
  processor: (data: any) => T,
  replayData: any,
  options: {
    transactionHash?: string;
    blockNumber?: number;
    tracerTypes?: string[];
  } = {},
): T {
  const { transactionHash, blockNumber, tracerTypes = [] } = options;

  const cacheKey = useMemo(() => {
    return JSON.stringify({
      hash: transactionHash,
      block: blockNumber,
      tracers: tracerTypes.sort(),
      dataHash: replayData ? JSON.stringify(replayData).slice(0, 100) : null,
    });
  }, [transactionHash, blockNumber, tracerTypes, replayData]);

  return useAdvancedMemo(() => processor(replayData), [replayData, cacheKey], {
    key: `replay_${cacheKey}`,
    cache: replayDataCache,
    ttl: 30 * 60 * 1000,
    dependencies: [transactionHash, blockNumber?.toString()].filter(
      Boolean,
    ) as string[],
  });
}

export function useAnalyticsMemo<T>(
  analyzer: (data: any[]) => T,
  data: any[],
  options: {
    analysisType?: string;
    filters?: any;
  } = {},
): T {
  const { analysisType = "default", filters } = options;

  const cacheKey = useMemo(() => {
    return JSON.stringify({
      type: analysisType,
      filters,
      dataLength: data.length,
      dataHash:
        data.length > 0 ? JSON.stringify(data.slice(0, 3)).slice(0, 50) : null,
    });
  }, [analysisType, filters, data]);

  return useAdvancedMemo(() => analyzer(data), [data, cacheKey], {
    key: `analytics_${cacheKey}`,
    cache: analyticsCache,
    ttl: 10 * 60 * 1000,
    dependencies: [analysisType],
  });
}

export function useMemoizationStats() {
  const [stats, setStats] = React.useState({
    replayData: replayDataCache.getStats(),
    analytics: analyticsCache.getStats(),
    computation: computationCache.getStats(),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        replayData: replayDataCache.getStats(),
        analytics: analyticsCache.getStats(),
        computation: computationCache.getStats(),
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const clearAllCaches = useCallback(() => {
    replayDataCache.clear();
    analyticsCache.clear();
    computationCache.clear();
  }, []);

  const invalidateByTransaction = useCallback((transactionHash: string) => {
    replayDataCache.invalidateByDependency(transactionHash);
    analyticsCache.invalidateByDependency(transactionHash);
    computationCache.invalidateByDependency(transactionHash);
  }, []);

  return {
    stats,
    clearAllCaches,
    invalidateByTransaction,
    totalMemoryUsage: Object.values(stats).reduce(
      (sum, stat) => sum + parseFloat(stat.memoryUsage),
      0,
    ),
    averageHitRate:
      Object.values(stats).reduce((sum, stat) => sum + stat.hitRate, 0) / 3,
  };
}

export function useMemoizationCleanup() {
  useEffect(() => {
    return () => {};
  }, []);
}

export { replayDataCache, analyticsCache, computationCache, AdvancedMemoCache };
