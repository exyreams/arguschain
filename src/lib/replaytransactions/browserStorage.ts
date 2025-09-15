interface StorageItem {
  key: string;
  data: any;
  timestamp: number;
  size: number;
  ttl?: number;
  compressed: boolean;
  accessCount: number;
  lastAccessed: number;
}

interface StorageQuota {
  total: number;
  used: number;
  available: number;
  percentage: number;
}

interface StorageStats {
  totalItems: number;
  totalSize: number;
  oldestItem: number;
  newestItem: number;
  compressionRatio: number;
  hitRate: number;
  quota: StorageQuota;
}

interface StorageOptions {
  maxSize?: number;
  maxAge?: number;
  compress?: boolean;
  storage?: "localStorage" | "sessionStorage";
  keyPrefix?: string;
}

class BrowserStorageManager {
  private storage: Storage;
  private keyPrefix: string;
  private maxSize: number;
  private maxAge: number;
  private compress: boolean;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
  };

  constructor(options: StorageOptions = {}) {
    this.storage =
      options.storage === "sessionStorage" ? sessionStorage : localStorage;
    this.keyPrefix = options.keyPrefix || "argus_replay_";
    this.maxSize = options.maxSize || 50 * 1024 * 1024;
    this.maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000;
    this.compress = options.compress !== false;
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

    this.cleanup();
  }

  async set(key: string, data: any, ttl?: number): Promise<boolean> {
    try {
      const fullKey = this.keyPrefix + key;
      const timestamp = Date.now();

      let serializedData = JSON.stringify(data);
      let compressed = false;

      if (this.compress && serializedData.length > 1024) {
        try {
          serializedData = await this.compressData(serializedData);
          compressed = true;
        } catch (error) {
          console.warn("Compression failed, storing uncompressed:", error);
        }
      }

      const item: StorageItem = {
        key: fullKey,
        data: serializedData,
        timestamp,
        size: serializedData.length,
        ttl: ttl || this.maxAge,
        compressed,
        accessCount: 0,
        lastAccessed: timestamp,
      };

      const itemSize = JSON.stringify(item).length;
      if (!(await this.ensureSpace(itemSize))) {
        console.warn("Unable to make space for new item:", key);
        return false;
      }

      this.storage.setItem(fullKey, JSON.stringify(item));
      this.stats.sets++;

      return true;
    } catch (error) {
      console.error("Failed to store item:", key, error);
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const fullKey = this.keyPrefix + key;
      const itemStr = this.storage.getItem(fullKey);

      if (!itemStr) {
        this.stats.misses++;
        return null;
      }

      const item: StorageItem = JSON.parse(itemStr);

      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        this.stats.misses++;
        return null;
      }

      item.accessCount++;
      item.lastAccessed = Date.now();
      this.storage.setItem(fullKey, JSON.stringify(item));

      let data = item.data;
      if (item.compressed) {
        try {
          data = await this.decompressData(data);
        } catch (error) {
          console.error("Decompression failed:", error);
          this.remove(key);
          this.stats.misses++;
          return null;
        }
      }

      this.stats.hits++;
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to retrieve item:", key, error);
      this.stats.misses++;
      return null;
    }
  }

  remove(key: string): boolean {
    try {
      const fullKey = this.keyPrefix + key;
      this.storage.removeItem(fullKey);
      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error("Failed to remove item:", key, error);
      return false;
    }
  }

  has(key: string): boolean {
    try {
      const fullKey = this.keyPrefix + key;
      const itemStr = this.storage.getItem(fullKey);

      if (!itemStr) return false;

      const item: StorageItem = JSON.parse(itemStr);

      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  keys(): string[] {
    const keys: string[] = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        keys.push(key.substring(this.keyPrefix.length));
      }
    }

    return keys;
  }

  clear(): void {
    const keys = this.keys();
    keys.forEach((key) => this.remove(key));
  }

  getStats(): StorageStats {
    const items = this.getAllItems();
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const compressedItems = items.filter((item) => item.compressed);
    const uncompressedSize = items.reduce((sum, item) => {
      return sum + (item.compressed ? item.size * 2 : item.size);
    }, 0);

    const quota = this.getQuotaInfo();
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;

    return {
      totalItems: items.length,
      totalSize,
      oldestItem:
        items.length > 0 ? Math.min(...items.map((i) => i.timestamp)) : 0,
      newestItem:
        items.length > 0 ? Math.max(...items.map((i) => i.timestamp)) : 0,
      compressionRatio: uncompressedSize > 0 ? totalSize / uncompressedSize : 1,
      hitRate,
      quota,
    };
  }

  getQuotaInfo(): StorageQuota {
    try {
      let used = 0;
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          const value = this.storage.getItem(key);
          used += (key.length + (value?.length || 0)) * 2;
        }
      }

      const total = this.maxSize;
      const available = Math.max(0, total - used);
      const percentage = (used / total) * 100;

      return { total, used, available, percentage };
    } catch (error) {
      console.error("Failed to get quota info:", error);
      return {
        total: this.maxSize,
        used: 0,
        available: this.maxSize,
        percentage: 0,
      };
    }
  }

  cleanup(): void {
    const items = this.getAllItems();
    const now = Date.now();
    let removedCount = 0;

    items.forEach((item) => {
      if (item.ttl && now - item.timestamp > item.ttl) {
        this.storage.removeItem(item.key);
        removedCount++;
      }
    });

    const quota = this.getQuotaInfo();
    if (quota.percentage > 80) {
      const activeItems = this.getAllItems()
        .filter((item) => !item.ttl || now - item.timestamp <= item.ttl)
        .sort((a, b) => a.lastAccessed - b.lastAccessed);

      while (quota.percentage > 70 && activeItems.length > 0) {
        const itemToRemove = activeItems.shift();
        if (itemToRemove) {
          this.storage.removeItem(itemToRemove.key);
          removedCount++;
        }
      }
    }

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} items from storage`);
    }
  }

  private async ensureSpace(requiredSize: number): Promise<boolean> {
    const quota = this.getQuotaInfo();

    if (quota.available >= requiredSize) {
      return true;
    }

    this.cleanup();

    const newQuota = this.getQuotaInfo();
    if (newQuota.available >= requiredSize) {
      return true;
    }

    const items = this.getAllItems().sort(
      (a, b) => a.lastAccessed - b.lastAccessed,
    );

    let freedSpace = 0;
    for (const item of items) {
      this.storage.removeItem(item.key);
      freedSpace += JSON.stringify(item).length;

      if (freedSpace >= requiredSize) {
        return true;
      }
    }

    return false;
  }

  private getAllItems(): StorageItem[] {
    const items: StorageItem[] = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        try {
          const itemStr = this.storage.getItem(key);
          if (itemStr) {
            const item: StorageItem = JSON.parse(itemStr);
            items.push(item);
          }
        } catch (error) {
          this.storage.removeItem(key);
        }
      }
    }

    return items;
  }

  private async compressData(data: string): Promise<string> {
    try {
      const compressed = btoa(
        String.fromCharCode(
          ...new Uint8Array(
            await new Response(
              new Blob([data])
                .stream()
                .pipeThrough(new CompressionStream("gzip")),
            ).arrayBuffer(),
          ),
        ),
      );
      return compressed;
    } catch (error) {
      return btoa(data);
    }
  }

  private async decompressData(compressedData: string): Promise<string> {
    try {
      const binaryString = atob(compressedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decompressed = await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).text();

      return decompressed;
    } catch (error) {
      return atob(compressedData);
    }
  }
}

export class ReplayDataStorage extends BrowserStorageManager {
  constructor() {
    super({
      keyPrefix: "argus_replay_data_",
      maxSize: 100 * 1024 * 1024,
      maxAge: 24 * 60 * 60 * 1000,
      compress: true,
      storage: "localStorage",
    });
  }

  async storeTransactionReplay(
    txHash: string,
    replayData: any,
  ): Promise<boolean> {
    return this.set(`tx_${txHash}`, replayData, 24 * 60 * 60 * 1000);
  }

  async getTransactionReplay(txHash: string): Promise<any> {
    return this.get(`tx_${txHash}`);
  }

  async storeBlockReplay(
    blockNumber: number,
    replayData: any,
  ): Promise<boolean> {
    return this.set(
      `block_${blockNumber}`,
      replayData,
      7 * 24 * 60 * 60 * 1000,
    );
  }

  async getBlockReplay(blockNumber: number): Promise<any> {
    return this.get(`block_${blockNumber}`);
  }
}

export class AnalyticsStorage extends BrowserStorageManager {
  constructor() {
    super({
      keyPrefix: "argus_analytics_",
      maxSize: 50 * 1024 * 1024,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      compress: true,
      storage: "localStorage",
    });
  }

  async storeAnalytics(key: string, analytics: any): Promise<boolean> {
    return this.set(key, analytics);
  }

  async getAnalytics(key: string): Promise<any> {
    return this.get(key);
  }
}

export class SessionStorage extends BrowserStorageManager {
  constructor() {
    super({
      keyPrefix: "argus_session_",
      maxSize: 10 * 1024 * 1024,
      maxAge: 60 * 60 * 1000,
      compress: false,
      storage: "sessionStorage",
    });
  }

  async storeSessionData(key: string, data: any): Promise<boolean> {
    return this.set(key, data, 60 * 60 * 1000);
  }

  async getSessionData(key: string): Promise<any> {
    return this.get(key);
  }
}

export class StorageMonitor {
  private static instance: StorageMonitor;
  private storageManagers: BrowserStorageManager[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): StorageMonitor {
    if (!StorageMonitor.instance) {
      StorageMonitor.instance = new StorageMonitor();
    }
    return StorageMonitor.instance;
  }

  registerStorage(storage: BrowserStorageManager): void {
    this.storageManagers.push(storage);
  }

  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performMaintenance();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  getOverallStats(): {
    totalManagers: number;
    totalItems: number;
    totalSize: number;
    averageHitRate: number;
    quotaUsage: number;
  } {
    const stats = this.storageManagers.map((manager) => manager.getStats());

    return {
      totalManagers: this.storageManagers.length,
      totalItems: stats.reduce((sum, stat) => sum + stat.totalItems, 0),
      totalSize: stats.reduce((sum, stat) => sum + stat.totalSize, 0),
      averageHitRate:
        stats.reduce((sum, stat) => sum + stat.hitRate, 0) / stats.length,
      quotaUsage: Math.max(...stats.map((stat) => stat.quota.percentage)),
    };
  }

  private performMaintenance(): void {
    this.storageManagers.forEach((manager) => {
      try {
        manager.cleanup();
      } catch (error) {
        console.error("Storage maintenance failed:", error);
      }
    });

    const overallStats = this.getOverallStats();
    if (overallStats.quotaUsage > 90) {
      console.warn(
        "Storage quota usage is high:",
        overallStats.quotaUsage + "%",
      );
    }
  }
}

export const replayDataStorage = new ReplayDataStorage();
export const analyticsStorage = new AnalyticsStorage();
export const sessionStorage = new SessionStorage();

const monitor = StorageMonitor.getInstance();
monitor.registerStorage(replayDataStorage);
monitor.registerStorage(analyticsStorage);
monitor.registerStorage(sessionStorage);

monitor.startMonitoring();

export { BrowserStorageManager, StorageMonitor };
export type { StorageItem, StorageQuota, StorageStats, StorageOptions };
