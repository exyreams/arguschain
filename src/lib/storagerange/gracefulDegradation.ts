import { blockchainService } from "@/lib/blockchainService";

const featureCache = new Map<string, boolean>();
const capabilityCache = new Map<string, any>();

export class RPCAvailabilityManager {
  private static checkedMethods = new Set<string>();
  private static availableMethods = new Set<string>();
  private static unavailableMethods = new Set<string>();

  static async checkMethodAvailability(method: string): Promise<boolean> {
    if (this.availableMethods.has(method)) {
      return true;
    }

    if (this.unavailableMethods.has(method)) {
      return false;
    }

    if (this.checkedMethods.has(method)) {
      return false;
    }

    this.checkedMethods.add(method);

    try {
      const testParams = this.getTestParameters(method);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 2000);
      });

      const testPromise = blockchainService.makeRPCCall(method, testParams);

      await Promise.race([testPromise, timeoutPromise]);

      this.availableMethods.add(method);
      return true;
    } catch (error: any) {
      if (
        error.message?.includes("method not found") ||
        error.message?.includes("not supported") ||
        error.message?.includes("unknown method")
      ) {
        this.unavailableMethods.add(method);
        return false;
      }

      return false;
    } finally {
      this.checkedMethods.delete(method);
    }
  }

  private static getTestParameters(method: string): any[] {
    switch (method) {
      case "debug_storageRangeAt":
        return [
          "latest",
          0,
          "0x0000000000000000000000000000000000000000",
          "0x0",
          1,
        ];
      case "debug_traceTransaction":
        return [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ];
      case "debug_traceCall":
        return [{ to: "0x0000000000000000000000000000000000000000" }, "latest"];
      case "eth_getStorageAt":
        return ["0x0000000000000000000000000000000000000000", "0x0", "latest"];
      case "eth_call":
        return [{ to: "0x0000000000000000000000000000000000000000" }, "latest"];
      default:
        return [];
    }
  }

  static getAvailableMethods(): string[] {
    return Array.from(this.availableMethods);
  }

  static getUnavailableMethods(): string[] {
    return Array.from(this.unavailableMethods);
  }

  static clearCache(): void {
    this.availableMethods.clear();
    this.unavailableMethods.clear();
    this.checkedMethods.clear();
  }
}

export class CapabilityDetector {
  static async detectStorageAnalysisCapabilities(): Promise<{
    hasDebugStorageRangeAt: boolean;
    hasEthGetStorageAt: boolean;
    hasDebugTraceTransaction: boolean;
    hasDebugTraceCall: boolean;
    supportsBatchRequests: boolean;
    maxBatchSize: number;
  }> {
    const cacheKey = "storage-analysis-capabilities";

    if (capabilityCache.has(cacheKey)) {
      return capabilityCache.get(cacheKey);
    }

    const capabilities = {
      hasDebugStorageRangeAt:
        await RPCAvailabilityManager.checkMethodAvailability(
          "debug_storageRangeAt",
        ),
      hasEthGetStorageAt:
        await RPCAvailabilityManager.checkMethodAvailability(
          "eth_getStorageAt",
        ),
      hasDebugTraceTransaction:
        await RPCAvailabilityManager.checkMethodAvailability(
          "debug_traceTransaction",
        ),
      hasDebugTraceCall:
        await RPCAvailabilityManager.checkMethodAvailability("debug_traceCall"),
      supportsBatchRequests: await this.testBatchRequestSupport(),
      maxBatchSize: await this.detectMaxBatchSize(),
    };

    capabilityCache.set(cacheKey, capabilities);
    return capabilities;
  }

  private static async testBatchRequestSupport(): Promise<boolean> {
    try {
      const batchRequest = [
        { method: "eth_blockNumber", params: [] },
        { method: "eth_gasPrice", params: [] },
      ];

      await blockchainService.makeBatchRPCCall(batchRequest);
      return true;
    } catch (error) {
      return false;
    }
  }

  private static async detectMaxBatchSize(): Promise<number> {
    let maxSize = 10;

    try {
      for (const testSize of [10, 25, 50, 100]) {
        const batchRequest = Array(testSize)
          .fill(null)
          .map(() => ({
            method: "eth_blockNumber",
            params: [],
          }));

        await blockchainService.makeBatchRPCCall(batchRequest);
        maxSize = testSize;
      }
    } catch (error) {}

    return maxSize;
  }

  static async detectBrowserCapabilities(): Promise<{
    hasWebWorkers: boolean;
    hasIndexedDB: boolean;
    hasLocalStorage: boolean;
    hasWebGL: boolean;
    hasCanvas: boolean;
    maxMemory: number;
  }> {
    const cacheKey = "browser-capabilities";

    if (capabilityCache.has(cacheKey)) {
      return capabilityCache.get(cacheKey);
    }

    const capabilities = {
      hasWebWorkers: typeof Worker !== "undefined",
      hasIndexedDB: "indexedDB" in window,
      hasLocalStorage: this.testLocalStorage(),
      hasWebGL: this.testWebGL(),
      hasCanvas: this.testCanvas(),
      maxMemory: this.estimateMaxMemory(),
    };

    capabilityCache.set(cacheKey, capabilities);
    return capabilities;
  }

  private static testLocalStorage(): boolean {
    try {
      const testKey = "__test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  private static testWebGL(): boolean {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      return !!gl;
    } catch (error) {
      return false;
    }
  }

  private static testCanvas(): boolean {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      return !!ctx;
    } catch (error) {
      return false;
    }
  }

  private static estimateMaxMemory(): number {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit || 1024 * 1024 * 1024;
    }

    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    return isMobile ? 512 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
  }
}

export class FallbackImplementations {
  static async getStorageRangeFallback(
    contractAddress: string,
    blockHash: string,
    startSlot: string,
    maxResults: number = 100,
  ): Promise<any> {
    console.log("Fallback getStorageRangeFallback called with:", {
      contractAddress,
      blockHash,
      startSlot,
      maxResults,
    });

    const results: any = {};

    try {
      const startSlotNum = parseInt(startSlot, 16);
      console.log("Start slot number:", startSlotNum);

      for (let i = 0; i < maxResults; i++) {
        const slot = "0x" + (startSlotNum + i).toString(16).padStart(64, "0");

        try {
          const provider = blockchainService.getProvider();
          if (!provider) {
            throw new Error("No provider available");
          }

          const value = await provider.send("eth_getStorageAt", [
            contractAddress,
            slot,
            blockHash,
          ]);

          results[slot] = {
            key: slot,
            value:
              value ||
              "0x0000000000000000000000000000000000000000000000000000000000000000",
          };
        } catch (error) {
          continue;
        }
      }

      return {
        storage: results,
        nextKey:
          maxResults > 0
            ? "0x" + (startSlotNum + maxResults).toString(16).padStart(64, "0")
            : null,
      };
    } catch (error) {
      throw new Error(`Fallback storage range failed: ${error}`);
    }
  }

  static async getBasicStorageAnalysis(
    contractAddress: string,
    blockHash: string,
  ): Promise<any> {
    const knownSlots = [
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000000000000000000000000000002",
      "0x0000000000000000000000000000000000000000000000000000000000000003",
      "0x0000000000000000000000000000000000000000000000000000000000000004",
      "0x0000000000000000000000000000000000000000000000000000000000000005",
    ];

    const storage: any = {};

    for (const slot of knownSlots) {
      try {
        const value = await blockchainService.makeRPCCall("eth_getStorageAt", [
          contractAddress,
          slot,
          blockHash,
        ]);

        if (
          value &&
          value !==
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        ) {
          storage[slot] = {
            key: slot,
            value: value,
            interpretation: this.interpretKnownSlot(slot, value),
          };
        }
      } catch (error) {
        continue;
      }
    }

    return {
      contractAddress,
      blockHash,
      storage,
      analysisType: "basic",
      capabilities:
        await CapabilityDetector.detectStorageAnalysisCapabilities(),
    };
  }

  private static interpretKnownSlot(slot: string, value: string): any {
    switch (slot) {
      case "0x0000000000000000000000000000000000000000000000000000000000000000":
        return {
          type: "totalSupply",
          description: "Total token supply",
          value: parseInt(value, 16),
        };
      case "0x0000000000000000000000000000000000000000000000000000000000000004":
        return {
          type: "owner",
          description: "Contract owner/admin",
          value: "0x" + value.slice(-40),
        };
      case "0x0000000000000000000000000000000000000000000000000000000000000005":
        return {
          type: "paused",
          description: "Paused state",
          value: parseInt(value, 16) !== 0,
        };
      default:
        return {
          type: "unknown",
          description: "Unknown storage slot",
          value: value,
        };
    }
  }

  static createFallbackChart(
    data: any[],
    type: "pie" | "bar" | "line",
    width: number = 400,
    height: number = 300,
  ): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context not available");
    }

    ctx.fillStyle = "#8b9dc3";
    ctx.strokeStyle = "#00bfff";
    ctx.lineWidth = 2;
    ctx.font = "12px Arial";

    switch (type) {
      case "pie":
        this.drawPieChart(ctx, data, width, height);
        break;
      case "bar":
        this.drawBarChart(ctx, data, width, height);
        break;
      case "line":
        this.drawLineChart(ctx, data, width, height);
        break;
    }

    return canvas;
  }

  private static drawPieChart(
    ctx: CanvasRenderingContext2D,
    data: any[],
    width: number,
    height: number,
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    let currentAngle = 0;

    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(
        centerX,
        centerY,
        radius,
        currentAngle,
        currentAngle + sliceAngle,
      );
      ctx.closePath();

      const hue = (index * 360) / data.length;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.fill();
      ctx.stroke();

      currentAngle += sliceAngle;
    });
  }

  private static drawBarChart(
    ctx: CanvasRenderingContext2D,
    data: any[],
    width: number,
    height: number,
  ): void {
    const margin = 40;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;

    const maxValue = Math.max(...data.map((item) => item.value || 0));
    const barWidth = chartWidth / data.length;

    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = margin + index * barWidth;
      const y = height - margin - barHeight;

      ctx.fillStyle = "#00bfff";
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);

      ctx.fillStyle = "#8b9dc3";
      ctx.fillText(item.name || `Item ${index}`, x, height - margin + 15);
    });
  }

  private static drawLineChart(
    ctx: CanvasRenderingContext2D,
    data: any[],
    width: number,
    height: number,
  ): void {
    const margin = 40;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;

    const maxValue = Math.max(...data.map((item) => item.value || 0));
    const stepX = chartWidth / (data.length - 1);

    ctx.beginPath();
    data.forEach((item, index) => {
      const x = margin + index * stepX;
      const y = height - margin - (item.value / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = "#00bfff";
    ctx.stroke();
  }
}

export class ProgressiveEnhancementManager {
  private static enhancements = new Map<string, () => void>();

  static registerEnhancement(feature: string, enhancement: () => void): void {
    this.enhancements.set(feature, enhancement);
  }

  static async applyEnhancements(): Promise<void> {
    const capabilities = await CapabilityDetector.detectBrowserCapabilities();
    const storageCapabilities =
      await CapabilityDetector.detectStorageAnalysisCapabilities();

    if (capabilities.hasWebWorkers && this.enhancements.has("web-workers")) {
      this.enhancements.get("web-workers")?.();
    }

    if (capabilities.hasWebGL && this.enhancements.has("webgl-charts")) {
      this.enhancements.get("webgl-charts")?.();
    }

    if (
      storageCapabilities.hasDebugStorageRangeAt &&
      this.enhancements.has("advanced-storage")
    ) {
      this.enhancements.get("advanced-storage")?.();
    }

    if (
      capabilities.maxMemory > 1024 * 1024 * 1024 &&
      this.enhancements.has("large-datasets")
    ) {
      this.enhancements.get("large-datasets")?.();
    }
  }

  static getRecommendedMode(): "full" | "enhanced" | "basic" {
    const capabilities = capabilityCache.get("browser-capabilities");
    const storageCapabilities = capabilityCache.get(
      "storage-analysis-capabilities",
    );

    if (!capabilities || !storageCapabilities) {
      return "basic";
    }

    if (
      capabilities.hasWebWorkers &&
      capabilities.maxMemory > 1024 * 1024 * 1024 &&
      storageCapabilities.hasDebugStorageRangeAt
    ) {
      return "full";
    }

    if (capabilities.hasCanvas && storageCapabilities.hasEthGetStorageAt) {
      return "enhanced";
    }

    return "basic";
  }
}

export async function initializeGracefulDegradation(): Promise<void> {
  await CapabilityDetector.detectBrowserCapabilities();
  await CapabilityDetector.detectStorageAnalysisCapabilities();

  await ProgressiveEnhancementManager.applyEnhancements();

  console.log("Graceful degradation initialized");
  console.log(
    "Recommended mode:",
    ProgressiveEnhancementManager.getRecommendedMode(),
  );
}
