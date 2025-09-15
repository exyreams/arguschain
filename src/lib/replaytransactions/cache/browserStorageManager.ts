export interface StorageQuota {
  total: number;
  used: number;
  available: number;
  percentage: number;
}

export interface StorageEntry {
  key: string;
  data: any;
  size: number;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  priority: "low" | "medium" | "high" | "critical";
  compressed: boolean;
  metadata?: Record<string, any>;
}

export interface StorageStatistics {
  totalEntries: number;
  totalSize: number;
  quota: StorageQuota;
  entriesByType: Record<string, number>;
  oldestEntry: number;
  newestEntry: number;
  compressionRatio: number;
  hitRate: number;
  evictionCount: number;
}

export interface StorageConfig {
  maxSize: number;
  compressionThreshold: number;
  evictionPolicy: "lru" | "lfu" | "priority" | "ttl";
  enableCompression: boolean;
  enablePersistence: boolean;
  quotaWarningThreshold: number;
  quotaCriticalThreshold: number;
}

export class BrowserStorageManager {
  private static readonly STORAGE_PREFIX = "argus_replay_";
  private static readonly METADATA_KEY = "argus_storage_metadata";
  private static readonly CONFIG_KEY = "argus_storage_config";

  private static config: StorageConfig = {
    maxSize: 100 * 1024 * 1024,
    compressionThreshold: 50 * 1024,
    evictionPolicy: "lru",
    enableCompression: true,
    enablePersistence: true,
    quotaWarningThreshold: 0.8,
    quotaCriticalThreshold: 0.95,
  };

  private static statistics: StorageStatistics = {
    totalEntries: 0,
    totalSize: 0,
    quota: { total: 0, used: 0, available: 0, percentage: 0 },
    entriesByType: {},
    oldestEntry: Date.now(),
    newestEntry: Date.now(),
    compressionRatio: 0,
    hitRate: 0,
    evictionCount: 0,
  };

  static async initialize(
    customConfig?: Partial<StorageConfig>,
  ): Promise<void> {
    const savedConfig = this.loadConfig();
    this.config = { ...this.config, ...savedConfig, ...customConfig };

    await this.updateQuotaInfo();

    await this.loadMetadata();

    await this.performMaintenanceIfNeeded();

    console.log("BrowserStorageManager initialized", {
      config: this.config,
      quota: this.statistics.quota,
    });
  }

  static async store(
    key: string,
    data: any,
    options: {
      ttl?: number;
      priority?: StorageEntry["priority"];
      compress?: boolean;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<boolean> {
    try {
      const fullKey = this.STORAGE_PREFIX + key;
      const timestamp = Date.now();
      const ttl = options.ttl || 24 * 60 * 60 * 1000;
      const priority = options.priority || "medium";

      let serializedData = JSON.stringify(data);
      let compressed = false;
      let size = new Blob([serializedData]).size;

      if (
        (options.compress ?? this.config.enableCompression) &&
        size > this.config.compressionThreshold
      ) {
        serializedData = await this.compressData(serializedData);
        compressed = true;
        size = new Blob([serializedData]).size;
      }

      await this.ensureSpace(size);

      const entry: StorageEntry = {
        key: fullKey,
        data: serializedData,
        size,
        timestamp,
        ttl,
        accessCount: 0,
        lastAccessed: timestamp,
        priority,
        compressed,
        metadata: options.metadata,
      };

      localStorage.setItem(fullKey, JSON.stringify(entry));

      await this.updateMetadata(key, entry);

      this.statistics.totalEntries++;
      this.statistics.totalSize += size;
      this.statistics.newestEntry = timestamp;

      return true;
    } catch (error) {
      console.error("Failed to store data:", error);
      return false;
    }
  }

  static async retrieve(key: string): Promise<any | null> {
    try {
      const fullKey = this.STORAGE_PREFIX + key;
      const stored = localStorage.getItem(fullKey);

      if (!stored) {
        return null;
      }

      const entry: StorageEntry = JSON.parse(stored);

      if (this.isExpired(entry)) {
        await this.remove(key);
        return null;
      }

      entry.accessCount++;
      entry.lastAccessed = Date.now();
      localStorage.setItem(fullKey, JSON.stringify(entry));

      let data = entry.data;
      if (entry.compressed) {
        data = await this.decompressData(data);
      }

      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to retrieve data:", error);
      return null;
    }
  }

  static async remove(key: string): Promise<boolean> {
    try {
      const fullKey = this.STORAGE_PREFIX + key;
      const stored = localStorage.getItem(fullKey);

      if (stored) {
        const entry: StorageEntry = JSON.parse(stored);
        localStorage.removeItem(fullKey);

        this.statistics.totalEntries--;
        this.statistics.totalSize -= entry.size;

        await this.removeFromMetadata(key);

        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to remove data:", error);
      return false;
    }
  }

  static exists(key: string): boolean {
    const fullKey = this.STORAGE_PREFIX + key;
    return localStorage.getItem(fullKey) !== null;
  }

  static async getStatistics(): Promise<StorageStatistics> {
    await this.updateQuotaInfo();
    await this.calculateStatistics();
    return { ...this.statistics };
  }

  static async getQuotaInfo(): Promise<StorageQuota> {
    await this.updateQuotaInfo();
    return { ...this.statistics.quota };
  }

  static async cleanup(): Promise<{
    removedEntries: number;
    freedSpace: number;
  }> {
    let removedEntries = 0;
    let freedSpace = 0;

    const keys = this.getAllStorageKeys();

    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: StorageEntry = JSON.parse(stored);

          if (this.isExpired(entry)) {
            localStorage.removeItem(key);
            removedEntries++;
            freedSpace += entry.size;
            this.statistics.totalEntries--;
            this.statistics.totalSize -= entry.size;
          }
        }
      } catch (error) {
        localStorage.removeItem(key);
        removedEntries++;
      }
    }

    await this.updateMetadata();
    return { removedEntries, freedSpace };
  }

  static async optimize(): Promise<{
    optimizedEntries: number;
    spaceSaved: number;
  }> {
    let optimizedEntries = 0;
    let spaceSaved = 0;

    if (!this.config.enableCompression) {
      return { optimizedEntries, spaceSaved };
    }

    const keys = this.getAllStorageKeys();

    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: StorageEntry = JSON.parse(stored);

          if (
            !entry.compressed &&
            entry.size > this.config.compressionThreshold
          ) {
            const originalSize = entry.size;
            const compressedData = await this.compressData(entry.data);
            const newSize = new Blob([compressedData]).size;

            if (newSize < originalSize * 0.8) {
              entry.data = compressedData;
              entry.compressed = true;
              entry.size = newSize;

              localStorage.setItem(key, JSON.stringify(entry));

              optimizedEntries++;
              spaceSaved += originalSize - newSize;
              this.statistics.totalSize -= originalSize - newSize;
            }
          }
        }
      } catch (error) {
        console.error("Failed to optimize entry:", error);
      }
    }

    return { optimizedEntries, spaceSaved };
  }

  static async clear(): Promise<void> {
    const keys = this.getAllStorageKeys();

    for (const key of keys) {
      localStorage.removeItem(key);
    }

    localStorage.removeItem(this.METADATA_KEY);

    this.statistics = {
      totalEntries: 0,
      totalSize: 0,
      quota: { total: 0, used: 0, available: 0, percentage: 0 },
      entriesByType: {},
      oldestEntry: Date.now(),
      newestEntry: Date.now(),
      compressionRatio: 0,
      hitRate: 0,
      evictionCount: 0,
    };
  }

  static async exportData(): Promise<{
    entries: Array<{ key: string; data: any; metadata: any }>;
    statistics: StorageStatistics;
    config: StorageConfig;
  }> {
    const entries: Array<{ key: string; data: any; metadata: any }> = [];
    const keys = this.getAllStorageKeys();

    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: StorageEntry = JSON.parse(stored);
          let data = entry.data;

          if (entry.compressed) {
            data = await this.decompressData(data);
          }

          entries.push({
            key: key.replace(this.STORAGE_PREFIX, ""),
            data: JSON.parse(data),
            metadata: {
              timestamp: entry.timestamp,
              ttl: entry.ttl,
              accessCount: entry.accessCount,
              priority: entry.priority,
              size: entry.size,
            },
          });
        }
      } catch (error) {
        console.error("Failed to export entry:", error);
      }
    }

    return {
      entries,
      statistics: await this.getStatistics(),
      config: this.config,
    };
  }

  static async importData(data: {
    entries: Array<{ key: string; data: any; metadata: any }>;
    config?: Partial<StorageConfig>;
  }): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;

    if (data.config) {
      this.config = { ...this.config, ...data.config };
      this.saveConfig();
    }

    for (const entry of data.entries) {
      try {
        const success = await this.store(entry.key, entry.data, {
          ttl: entry.metadata.ttl,
          priority: entry.metadata.priority,
          metadata: entry.metadata,
        });

        if (success) {
          imported++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error("Failed to import entry:", error);
        failed++;
      }
    }

    return { imported, failed };
  }

  static async getEntriesByPriority(): Promise<{
    critical: StorageEntry[];
    high: StorageEntry[];
    medium: StorageEntry[];
    low: StorageEntry[];
  }> {
    const entries = {
      critical: [] as StorageEntry[],
      high: [] as StorageEntry[],
      medium: [] as StorageEntry[],
      low: [] as StorageEntry[],
    };

    const keys = this.getAllStorageKeys();

    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: StorageEntry = JSON.parse(stored);
          entries[entry.priority].push(entry);
        }
      } catch (error) {
        console.error("Failed to parse entry:", error);
      }
    }

    return entries;
  }

  static async monitorUsage(): Promise<{
    status: "ok" | "warning" | "critical";
    message: string;
    recommendations: string[];
  }> {
    await this.updateQuotaInfo();
    const quota = this.statistics.quota;
    const recommendations: string[] = [];

    if (quota.percentage >= this.config.quotaCriticalThreshold) {
      recommendations.push("Immediately clean up expired entries");
      recommendations.push("Consider increasing storage quota");
      recommendations.push("Enable compression for large entries");

      return {
        status: "critical",
        message: `Storage usage critical: ${quota.percentage.toFixed(1)}% used`,
        recommendations,
      };
    }

    if (quota.percentage >= this.config.quotaWarningThreshold) {
      recommendations.push("Clean up expired entries");
      recommendations.push("Optimize storage compression");
      recommendations.push("Review data retention policies");

      return {
        status: "warning",
        message: `Storage usage high: ${quota.percentage.toFixed(1)}% used`,
        recommendations,
      };
    }

    return {
      status: "ok",
      message: `Storage usage normal: ${quota.percentage.toFixed(1)}% used`,
      recommendations: [],
    };
  }

  private static async updateQuotaInfo(): Promise<void> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const total = estimate.quota || 0;
        const used = estimate.usage || 0;
        const available = total - used;
        const percentage = total > 0 ? (used / total) * 100 : 0;

        this.statistics.quota = {
          total,
          used,
          available,
          percentage,
        };
      } else {
        const used = this.calculateLocalStorageUsage();
        const total = 10 * 1024 * 1024;
        const available = total - used;
        const percentage = (used / total) * 100;

        this.statistics.quota = {
          total,
          used,
          available,
          percentage,
        };
      }
    } catch (error) {
      console.error("Failed to update quota info:", error);
    }
  }

  private static calculateLocalStorageUsage(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  private static async calculateStatistics(): Promise<void> {
    const keys = this.getAllStorageKeys();
    let totalSize = 0;
    let totalEntries = 0;
    let compressedEntries = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;
    const entriesByType: Record<string, number> = {};

    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: StorageEntry = JSON.parse(stored);
          totalSize += entry.size;
          totalEntries++;

          if (entry.compressed) compressedEntries++;
          if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
          if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;

          const type = entry.priority;
          entriesByType[type] = (entriesByType[type] || 0) + 1;
        }
      } catch (error) {
        console.error("Failed to calculate statistics for entry:", error);
      }
    }

    this.statistics.totalEntries = totalEntries;
    this.statistics.totalSize = totalSize;
    this.statistics.compressionRatio =
      totalEntries > 0 ? compressedEntries / totalEntries : 0;
    this.statistics.oldestEntry = oldestEntry;
    this.statistics.newestEntry = newestEntry;
    this.statistics.entriesByType = entriesByType;
  }

  private static getAllStorageKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private static isExpired(entry: StorageEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private static async ensureSpace(requiredSize: number): Promise<void> {
    await this.updateQuotaInfo();

    if (this.statistics.quota.available < requiredSize) {
      await this.evictEntries(requiredSize);
    }
  }

  private static async evictEntries(requiredSpace: number): Promise<void> {
    const keys = this.getAllStorageKeys();
    const entries: Array<{ key: string; entry: StorageEntry }> = [];

    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: StorageEntry = JSON.parse(stored);
          entries.push({ key, entry });
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    }

    entries.sort((a, b) => {
      switch (this.config.evictionPolicy) {
        case "lru":
          return a.entry.lastAccessed - b.entry.lastAccessed;
        case "lfu":
          return a.entry.accessCount - b.entry.accessCount;
        case "priority":
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          return (
            priorityOrder[a.entry.priority] - priorityOrder[b.entry.priority]
          );
        case "ttl":
          return (
            a.entry.timestamp + a.entry.ttl - (b.entry.timestamp + b.entry.ttl)
          );
        default:
          return a.entry.lastAccessed - b.entry.lastAccessed;
      }
    });

    let freedSpace = 0;
    for (const { key, entry } of entries) {
      if (freedSpace >= requiredSpace) break;

      if (entry.priority === "critical" && freedSpace < requiredSpace * 0.8) {
        continue;
      }

      localStorage.removeItem(key);
      freedSpace += entry.size;
      this.statistics.totalEntries--;
      this.statistics.totalSize -= entry.size;
      this.statistics.evictionCount++;
    }
  }

  private static async compressData(data: string): Promise<string> {
    try {
      return btoa(data);
    } catch (error) {
      console.error("Compression failed:", error);
      return data;
    }
  }

  private static async decompressData(data: string): Promise<string> {
    try {
      return atob(data);
    } catch (error) {
      console.error("Decompression failed:", error);
      return data;
    }
  }

  private static async performMaintenanceIfNeeded(): Promise<void> {
    const usage = await this.monitorUsage();

    if (usage.status === "critical") {
      console.warn("Storage critical, performing emergency cleanup");
      await this.cleanup();
    } else if (usage.status === "warning") {
      console.log("Storage usage high, performing maintenance");
      await this.cleanup();
      await this.optimize();
    }
  }

  private static loadConfig(): Partial<StorageConfig> {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Failed to load config:", error);
      return {};
    }
  }

  private static saveConfig(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error("Failed to save config:", error);
    }
  }

  private static async loadMetadata(): Promise<void> {
    try {
      const saved = localStorage.getItem(this.METADATA_KEY);
      if (saved) {
        const metadata = JSON.parse(saved);
        this.statistics = { ...this.statistics, ...metadata };
      }
    } catch (error) {
      console.error("Failed to load metadata:", error);
    }
  }

  private static async updateMetadata(
    key?: string,
    entry?: StorageEntry,
  ): Promise<void> {
    try {
      if (key && entry) {
      }

      localStorage.setItem(this.METADATA_KEY, JSON.stringify(this.statistics));
    } catch (error) {
      console.error("Failed to update metadata:", error);
    }
  }

  private static async removeFromMetadata(key: string): Promise<void> {
    await this.updateMetadata();
  }
}
