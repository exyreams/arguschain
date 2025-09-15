import { LRUCache } from "lru-cache";

interface CacheConfig {
  maxSize: number;
  ttl: number;
  staleWhileRevalidate: number;
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  size: number;
  compressed: boolean;
  metadata: {
    contractAddress?: string;
    blockHash?: string;
    analysisType?: string;
    version: number;
  };
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstLimit: number;
  backoffMultiplier: number;
}

interface BatchConfig {
  maxBatchSize: number;
  batchTimeout: number;
  priorityLevels: number;
  retryAttempts: number;
}

interface PerformanceMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  requestsPerSecond: number;
  errorRate: number;
  backgroundTasksActive: number;
}

class MultiLevelCache {
  private l1Cache: LRUCache<string, CacheEntry<any>>;
  private l2Cache: Map<string, CacheEntry<any>>;
  private diskCache: Map<string, string>;
  private config: CacheConfig;
  private metrics: {
    hits: number;
    misses: number;
    evictions: number;
    compressions: number;
  };

  constructor(config: CacheConfig) {
    this.config = config;
    this.l1Cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttl,
      allowStale: true,
      updateAgeOnGet: true,
    });
    this.l2Cache = new Map();
    this.diskCache = new Map();
    this.metrics = { hits: 0, misses: 0, evictions: 0, compressions: 0 };

    if (config.persistToDisk && typeof window !== "undefined") {
      this.loadFromDisk();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry) {
      l1Entry.accessCount++;
      this.metrics.hits++;
      return l1Entry.data;
    }

    const l2Entry = this.l2Cache.get(key);
    if (l2Entry) {
      const decompressed = l2Entry.compressed
        ? await this.decompress(l2Entry.data)
        : l2Entry.data;

      this.l1Cache.set(key, { ...l2Entry, data: decompressed });
      this.metrics.hits++;
      return decompressed;
    }

    if (this.config.persistToDisk) {
      const diskEntry = this.diskCache.get(key);
      if (diskEntry) {
        const parsed = JSON.parse(diskEntry);
        const decompressed = parsed.compressed
          ? await this.decompress(parsed.data)
          : parsed.data;

        this.l1Cache.set(key, parsed);
        this.metrics.hits++;
        return decompressed;
      }
    }

    this.metrics.misses++;
    return null;
  }

  async set<T>(
    key: string,
    data: T,
    metadata: CacheEntry<T>["metadata"] = { version: 1 },
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      size: this.estimateSize(data),
      compressed: false,
      metadata,
    };

    this.l1Cache.set(key, entry);

    if (entry.size > 10000 && this.config.compressionEnabled) {
      const compressed = await this.compress(data);
      const compressedEntry = {
        ...entry,
        data: compressed,
        compressed: true,
        size: this.estimateSize(compressed),
      };
      this.l2Cache.set(key, compressedEntry);
      this.metrics.compressions++;
    }

    if (this.config.persistToDisk) {
      this.diskCache.set(key, JSON.stringify(entry));
      this.saveToDisk();
    }
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);

    for (const key of this.l1Cache.keys()) {
      if (regex.test(key)) {
        this.l1Cache.delete(key);
      }
    }

    for (const key of this.l2Cache.keys()) {
      if (regex.test(key)) {
        this.l2Cache.delete(key);
      }
    }

    for (const key of this.diskCache.keys()) {
      if (regex.test(key)) {
        this.diskCache.delete(key);
      }
    }
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      l1Size: this.l1Cache.size,
      l2Size: this.l2Cache.size,
      diskSize: this.diskCache.size,
      compressionRatio:
        this.metrics.compressions / Math.max(1, this.l2Cache.size),
      ...this.metrics,
    };
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2;
  }

  private async compress(data: any): Promise<string> {
    return JSON.stringify(data);
  }

  private async decompress(data: string): Promise<any> {
    return JSON.parse(data);
  }

  private loadFromDisk(): void {
    try {
      const stored = localStorage.getItem("storage-cache");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.diskCache = new Map(parsed);
      }
    } catch (error) {
      console.warn("Failed to load cache from disk:", error);
    }
  }

  private saveToDisk(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.diskCache.entries()));
      localStorage.setItem("storage-cache", serialized);
    } catch (error) {
      console.warn("Failed to save cache to disk:", error);
    }
  }
}

class RPCOptimizer {
  private rateLimiter: Map<string, { count: number; resetTime: number }>;
  private requestQueue: Map<
    string,
    Array<{ resolve: Function; reject: Function; params: any }>
  >;
  private batchTimers: Map<string, NodeJS.Timeout>;
  private config: {
    rateLimit: RateLimitConfig;
    batch: BatchConfig;
  };

  constructor(rateLimitConfig: RateLimitConfig, batchConfig: BatchConfig) {
    this.rateLimiter = new Map();
    this.requestQueue = new Map();
    this.batchTimers = new Map();
    this.config = { rateLimit: rateLimitConfig, batch: batchConfig };
  }

  async makeRequest<T>(
    method: string,
    params: any[],
    priority: number = 1,
  ): Promise<T> {
    if (!this.checkRateLimit(method)) {
      throw new Error(`Rate limit exceeded for ${method}`);
    }

    return new Promise((resolve, reject) => {
      if (!this.requestQueue.has(method)) {
        this.requestQueue.set(method, []);
      }

      const queue = this.requestQueue.get(method)!;
      queue.push({ resolve, reject, params });

      queue.sort((a, b) => b.params.priority - a.params.priority);

      if (!this.batchTimers.has(method)) {
        const timer = setTimeout(() => {
          this.processBatch(method);
        }, this.config.batch.batchTimeout);
        this.batchTimers.set(method, timer);
      }

      if (queue.length >= this.config.batch.maxBatchSize) {
        this.processBatch(method);
      }
    });
  }

  private checkRateLimit(method: string): boolean {
    const now = Date.now();
    const limit = this.rateLimiter.get(method);

    if (!limit || now > limit.resetTime) {
      this.rateLimiter.set(method, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs,
      });
      return true;
    }

    if (limit.count < this.config.rateLimit.maxRequests) {
      limit.count++;
      return true;
    }

    return false;
  }

  private async processBatch(method: string): Promise<void> {
    const queue = this.requestQueue.get(method);
    if (!queue || queue.length === 0) return;

    const timer = this.batchTimers.get(method);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(method);
    }

    const batch = queue.splice(0, this.config.batch.maxBatchSize);

    try {
      const results = await this.executeBatchRequest(
        method,
        batch.map((b) => b.params),
      );

      batch.forEach((request, index) => {
        request.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach((request) => {
        request.reject(error);
      });
    }

    if (queue.length > 0) {
      const timer = setTimeout(() => {
        this.processBatch(method);
      }, this.config.batch.batchTimeout);
      this.batchTimers.set(method, timer);
    }
  }

  private async executeBatchRequest(
    method: string,
    paramsList: any[],
  ): Promise<any[]> {
    return paramsList.map((params, index) => ({
      id: index,
      result: `Mock result for ${method} with params ${JSON.stringify(params)}`,
    }));
  }
}

class BackgroundProcessor {
  private taskQueue: Array<{
    id: string;
    task: () => Promise<any>;
    priority: number;
    retries: number;
    maxRetries: number;
  }>;
  private activeWorkers: number;
  private maxWorkers: number;
  private isProcessing: boolean;

  constructor(maxWorkers: number = 3) {
    this.taskQueue = [];
    this.activeWorkers = 0;
    this.maxWorkers = maxWorkers;
    this.isProcessing = false;
  }

  addTask<T>(
    id: string,
    task: () => Promise<T>,
    priority: number = 1,
    maxRetries: number = 3,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        id,
        task: async () => {
          try {
            const result = await task();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        priority,
        retries: 0,
        maxRetries,
      });

      this.taskQueue.sort((a, b) => b.priority - a.priority);

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeWorkers >= this.maxWorkers) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const task = this.taskQueue.shift();
      if (!task) break;

      this.activeWorkers++;

      this.processTask(task).finally(() => {
        this.activeWorkers--;

        if (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
          setImmediate(() => this.processQueue());
        }
      });
    }

    this.isProcessing = false;
  }

  private async processTask(
    taskItem: (typeof this.taskQueue)[0],
  ): Promise<void> {
    try {
      await taskItem.task();
    } catch (error) {
      taskItem.retries++;

      if (taskItem.retries < taskItem.maxRetries) {
        setTimeout(
          () => {
            this.taskQueue.unshift(taskItem);
            this.taskQueue.sort((a, b) => b.priority - a.priority);
          },
          Math.pow(2, taskItem.retries) * 1000,
        );
      } else {
        console.error(
          `Task ${taskItem.id} failed after ${taskItem.maxRetries} retries:`,
          error,
        );
      }
    }
  }

  getStatus() {
    return {
      queueLength: this.taskQueue.length,
      activeWorkers: this.activeWorkers,
      maxWorkers: this.maxWorkers,
      isProcessing: this.isProcessing,
    };
  }
}

class PerformanceMonitor {
  private metrics: {
    requestTimes: number[];
    errorCounts: Map<string, number>;
    cacheStats: any;
    memoryUsage: number[];
    startTime: number;
  };

  constructor() {
    this.metrics = {
      requestTimes: [],
      errorCounts: new Map(),
      cacheStats: {},
      memoryUsage: [],
      startTime: Date.now(),
    };

    if (typeof window !== "undefined" && (performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage.push(memory.usedJSHeapSize);

        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage.shift();
        }
      }, 5000);
    }
  }

  recordRequest(duration: number): void {
    this.metrics.requestTimes.push(duration);

    if (this.metrics.requestTimes.length > 1000) {
      this.metrics.requestTimes.shift();
    }
  }

  recordError(type: string): void {
    const current = this.metrics.errorCounts.get(type) || 0;
    this.metrics.errorCounts.set(type, current + 1);
  }

  updateCacheStats(stats: any): void {
    this.metrics.cacheStats = stats;
  }

  getMetrics(): PerformanceMetrics {
    const requestTimes = this.metrics.requestTimes;
    const totalRequests = requestTimes.length;
    const totalErrors = Array.from(this.metrics.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    const uptime = Date.now() - this.metrics.startTime;

    return {
      cacheHitRate: this.metrics.cacheStats.hitRate || 0,
      averageResponseTime:
        totalRequests > 0
          ? requestTimes.reduce((sum, time) => sum + time, 0) / totalRequests
          : 0,
      memoryUsage:
        this.metrics.memoryUsage.length > 0
          ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] /
            (1024 * 1024)
          : 0,
      requestsPerSecond: totalRequests / (uptime / 1000),
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      backgroundTasksActive: 0,
    };
  }
}

export class CachingOptimizationSystem {
  private cache: MultiLevelCache;
  private rpcOptimizer: RPCOptimizer;
  private backgroundProcessor: BackgroundProcessor;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.cache = new MultiLevelCache({
      maxSize: 1000,
      ttl: 5 * 60 * 1000,
      staleWhileRevalidate: 60 * 1000,
      compressionEnabled: true,
      persistToDisk: true,
    });

    this.rpcOptimizer = new RPCOptimizer(
      {
        maxRequests: 100,
        windowMs: 60 * 1000,
        burstLimit: 10,
        backoffMultiplier: 2,
      },
      {
        maxBatchSize: 10,
        batchTimeout: 100,
        priorityLevels: 3,
        retryAttempts: 3,
      },
    );

    this.backgroundProcessor = new BackgroundProcessor(3);
    this.performanceMonitor = new PerformanceMonitor();

    setInterval(() => {
      this.performanceMonitor.updateCacheStats(this.cache.getMetrics());
    }, 10000);
  }

  async getCached<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const result = await this.cache.get<T>(key);
      this.performanceMonitor.recordRequest(Date.now() - startTime);
      return result;
    } catch (error) {
      this.performanceMonitor.recordError("cache_get");
      throw error;
    }
  }

  async setCached<T>(key: string, data: T, metadata?: any): Promise<void> {
    const startTime = Date.now();
    try {
      await this.cache.set(key, data, metadata);
      this.performanceMonitor.recordRequest(Date.now() - startTime);
    } catch (error) {
      this.performanceMonitor.recordError("cache_set");
      throw error;
    }
  }

  async makeOptimizedRPCCall<T>(
    method: string,
    params: any[],
    priority?: number,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await this.rpcOptimizer.makeRequest<T>(
        method,
        params,
        priority,
      );
      this.performanceMonitor.recordRequest(Date.now() - startTime);
      return result;
    } catch (error) {
      this.performanceMonitor.recordError("rpc_call");
      throw error;
    }
  }

  async addBackgroundTask<T>(
    id: string,
    task: () => Promise<T>,
    priority?: number,
  ): Promise<T> {
    return this.backgroundProcessor.addTask(id, task, priority);
  }

  invalidateCache(pattern: string): void {
    this.cache.invalidate(pattern);
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  getSystemStatus() {
    return {
      cache: this.cache.getMetrics(),
      backgroundProcessor: this.backgroundProcessor.getStatus(),
      performance: this.performanceMonitor.getMetrics(),
    };
  }
}

export const cachingSystem = new CachingOptimizationSystem();
