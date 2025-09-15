export class PerformanceMonitorService {
  private static readonly STORAGE_KEY = "arguschain_performance_data";
  private static readonly MAX_PERFORMANCE_RECORDS = 1000;

  private static performanceData: PerformanceRecord[] = [];
  private static currentSession: SessionData = {
    startTime: Date.now(),
    analysisCount: 0,
    totalAnalysisTime: 0,
    averageAnalysisTime: 0,
    memoryUsage: [],
    errors: [],
  };

  static initialize(): void {
    this.loadPerformanceData();
    this.startMemoryMonitoring();
    this.setupPerformanceObserver();
  }

  static recordAnalysis(
    record: Omit<PerformanceRecord, "id" | "timestamp">,
  ): void {
    const performanceRecord: PerformanceRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...record,
    };

    this.performanceData.unshift(performanceRecord);

    if (this.performanceData.length > this.MAX_PERFORMANCE_RECORDS) {
      this.performanceData.splice(this.MAX_PERFORMANCE_RECORDS);
    }

    this.currentSession.analysisCount++;
    this.currentSession.totalAnalysisTime += record.analysisTime;
    this.currentSession.averageAnalysisTime =
      this.currentSession.totalAnalysisTime / this.currentSession.analysisCount;

    this.savePerformanceData();
  }

  static recordError(error: ErrorRecord): void {
    this.currentSession.errors.push({
      ...error,
      timestamp: Date.now(),
    });

    this.savePerformanceData();
  }

  static getPerformanceStats(): PerformanceStats {
    const recentRecords = this.performanceData.slice(0, 100);

    if (recentRecords.length === 0) {
      return {
        totalAnalyses: 0,
        averageAnalysisTime: 0,
        medianAnalysisTime: 0,
        fastestAnalysis: 0,
        slowestAnalysis: 0,
        successRate: 100,
        errorRate: 0,
        memoryUsage: {
          current: this.getCurrentMemoryUsage(),
          average: 0,
          peak: 0,
        },
        performanceTrend: "stable",
        recommendations: [],
      };
    }

    const analysisTimes = recentRecords.map((r) => r.analysisTime);
    const successfulAnalyses = recentRecords.filter((r) => r.success);

    const stats: PerformanceStats = {
      totalAnalyses: recentRecords.length,
      averageAnalysisTime:
        analysisTimes.reduce((a, b) => a + b, 0) / analysisTimes.length,
      medianAnalysisTime: this.calculateMedian(analysisTimes),
      fastestAnalysis: Math.min(...analysisTimes),
      slowestAnalysis: Math.max(...analysisTimes),
      successRate: (successfulAnalyses.length / recentRecords.length) * 100,
      errorRate:
        ((recentRecords.length - successfulAnalyses.length) /
          recentRecords.length) *
        100,
      memoryUsage: this.getMemoryStats(),
      performanceTrend: this.calculatePerformanceTrend(),
      recommendations: this.generateRecommendations(recentRecords),
    };

    return stats;
  }

  static getSessionData(): SessionData {
    return {
      ...this.currentSession,
      memoryUsage: [...this.currentSession.memoryUsage],
      errors: [...this.currentSession.errors],
    };
  }

  static getPerformanceHistory(
    timeRange: TimeRange = "24h",
  ): PerformanceRecord[] {
    const now = Date.now();
    const timeRanges = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - timeRanges[timeRange];
    return this.performanceData.filter((record) => record.timestamp >= cutoff);
  }

  static getMetricsByCategory(): CategoryMetrics {
    const recentRecords = this.performanceData.slice(0, 200);

    const categories = {
      traceProcessing: recentRecords.filter(
        (r) => r.category === "trace_processing",
      ),
      patternDetection: recentRecords.filter(
        (r) => r.category === "pattern_detection",
      ),
      securityAnalysis: recentRecords.filter(
        (r) => r.category === "security_analysis",
      ),
      gasAnalysis: recentRecords.filter((r) => r.category === "gas_analysis"),
      visualization: recentRecords.filter(
        (r) => r.category === "visualization",
      ),
    };

    const result: CategoryMetrics = {};

    Object.entries(categories).forEach(([category, records]) => {
      if (records.length > 0) {
        const times = records.map((r) => r.analysisTime);
        result[category as keyof CategoryMetrics] = {
          count: records.length,
          averageTime: times.reduce((a, b) => a + b, 0) / times.length,
          medianTime: this.calculateMedian(times),
          successRate:
            (records.filter((r) => r.success).length / records.length) * 100,
        };
      }
    });

    return result;
  }

  static clearPerformanceData(): void {
    this.performanceData = [];
    this.currentSession = {
      startTime: Date.now(),
      analysisCount: 0,
      totalAnalysisTime: 0,
      averageAnalysisTime: 0,
      memoryUsage: [],
      errors: [],
    };
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static exportPerformanceData(format: "json" | "csv"): string {
    if (format === "json") {
      return JSON.stringify(
        {
          performanceData: this.performanceData,
          sessionData: this.currentSession,
          exportTimestamp: Date.now(),
        },
        null,
        2,
      );
    } else {
      return this.convertToCSV();
    }
  }

  private static loadPerformanceData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.performanceData = data.performanceData || [];
        this.currentSession = data.sessionData || this.currentSession;
      }
    } catch (error) {
      console.error("Failed to load performance data:", error);
    }
  }

  private static savePerformanceData(): void {
    try {
      const data = {
        performanceData: this.performanceData,
        sessionData: this.currentSession,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save performance data:", error);
    }
  }

  private static startMemoryMonitoring(): void {
    if ("memory" in performance) {
      setInterval(() => {
        const memoryInfo = this.getCurrentMemoryUsage();
        this.currentSession.memoryUsage.push({
          timestamp: Date.now(),
          ...memoryInfo,
        });

        if (this.currentSession.memoryUsage.length > 100) {
          this.currentSession.memoryUsage.splice(0, 1);
        }
      }, 30000);
    }
  }

  private static setupPerformanceObserver(): void {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name.includes("trace-analysis")) {
              console.log("Performance entry:", entry);
            }
          });
        });
        observer.observe({ entryTypes: ["measure", "navigation"] });
      } catch (error) {
        console.warn("Performance Observer not supported:", error);
      }
    }
  }

  private static getCurrentMemoryUsage(): MemoryInfo {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };
  }

  private static getMemoryStats(): MemoryStats {
    const memoryReadings = this.currentSession.memoryUsage;

    if (memoryReadings.length === 0) {
      const current = this.getCurrentMemoryUsage();
      return {
        current: current.usedJSHeapSize,
        average: current.usedJSHeapSize,
        peak: current.usedJSHeapSize,
      };
    }

    const usedMemory = memoryReadings.map((m) => m.usedJSHeapSize);
    return {
      current: usedMemory[usedMemory.length - 1] || 0,
      average: usedMemory.reduce((a, b) => a + b, 0) / usedMemory.length,
      peak: Math.max(...usedMemory),
    };
  }

  private static calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private static calculatePerformanceTrend():
    | "improving"
    | "stable"
    | "degrading" {
    const recentRecords = this.performanceData.slice(0, 50);
    if (recentRecords.length < 10) return "stable";

    const firstHalf = recentRecords.slice(25, 50);
    const secondHalf = recentRecords.slice(0, 25);

    const firstAvg =
      firstHalf.reduce((sum, r) => sum + r.analysisTime, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, r) => sum + r.analysisTime, 0) /
      secondHalf.length;

    const improvement = (firstAvg - secondAvg) / firstAvg;

    if (improvement > 0.1) return "improving";
    if (improvement < -0.1) return "degrading";
    return "stable";
  }

  private static generateRecommendations(
    records: PerformanceRecord[],
  ): string[] {
    const recommendations: string[] = [];

    const avgTime =
      records.reduce((sum, r) => sum + r.analysisTime, 0) / records.length;
    const errorRate =
      (records.filter((r) => !r.success).length / records.length) * 100;
    const memoryStats = this.getMemoryStats();

    if (avgTime > 5000) {
      recommendations.push(
        "Analysis times are above average. Consider optimizing trace processing.",
      );
    }

    if (errorRate > 5) {
      recommendations.push(
        "Error rate is elevated. Check network connectivity and RPC endpoints.",
      );
    }

    if (memoryStats.current > 100 * 1024 * 1024) {
      recommendations.push(
        "Memory usage is high. Consider clearing analysis history or refreshing the page.",
      );
    }

    const categoryMetrics = this.getMetricsByCategory();

    if (
      categoryMetrics.visualization &&
      categoryMetrics.visualization.averageTime > 2000
    ) {
      recommendations.push(
        "Visualization rendering is slow. Consider reducing chart complexity for large datasets.",
      );
    }

    if (
      categoryMetrics.traceProcessing &&
      categoryMetrics.traceProcessing.averageTime > 3000
    ) {
      recommendations.push(
        "Trace processing is slow. This may indicate complex transactions or network issues.",
      );
    }

    return recommendations;
  }

  private static convertToCSV(): string {
    const headers = [
      "Timestamp",
      "Transaction Hash",
      "Category",
      "Analysis Time (ms)",
      "Success",
      "Actions Count",
      "Gas Used",
      "Memory Used (MB)",
      "Error Message",
    ];

    const rows = this.performanceData.map((record) => [
      new Date(record.timestamp).toISOString(),
      record.transactionHash,
      record.category,
      record.analysisTime,
      record.success,
      record.actionsCount || 0,
      record.gasUsed || 0,
      record.memoryUsed ? (record.memoryUsed / (1024 * 1024)).toFixed(2) : "0",
      record.errorMessage || "",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export interface PerformanceRecord {
  id: string;
  timestamp: number;
  transactionHash: string;
  category:
    | "trace_processing"
    | "pattern_detection"
    | "security_analysis"
    | "gas_analysis"
    | "visualization";
  analysisTime: number;
  success: boolean;
  actionsCount?: number;
  gasUsed?: number;
  memoryUsed?: number;
  errorMessage?: string;
}

export interface SessionData {
  startTime: number;
  analysisCount: number;
  totalAnalysisTime: number;
  averageAnalysisTime: number;
  memoryUsage: MemoryReading[];
  errors: ErrorRecord[];
}

export interface MemoryReading {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface ErrorRecord {
  timestamp?: number;
  type: string;
  message: string;
  stack?: string;
  transactionHash?: string;
}

export interface PerformanceStats {
  totalAnalyses: number;
  averageAnalysisTime: number;
  medianAnalysisTime: number;
  fastestAnalysis: number;
  slowestAnalysis: number;
  successRate: number;
  errorRate: number;
  memoryUsage: MemoryStats;
  performanceTrend: "improving" | "stable" | "degrading";
  recommendations: string[];
}

export interface MemoryStats {
  current: number;
  average: number;
  peak: number;
}

export interface CategoryMetrics {
  traceProcessing?: CategoryMetric;
  patternDetection?: CategoryMetric;
  securityAnalysis?: CategoryMetric;
  gasAnalysis?: CategoryMetric;
  visualization?: CategoryMetric;
}

export interface CategoryMetric {
  count: number;
  averageTime: number;
  medianTime: number;
  successRate: number;
}

export type TimeRange = "1h" | "24h" | "7d" | "30d";
