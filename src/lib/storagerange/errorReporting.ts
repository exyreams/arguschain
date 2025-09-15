interface ErrorReport {
  id: string;
  timestamp: number;
  error: {
    message: string;
    stack?: string;
    name: string;
    code?: string | number;
  };
  context: {
    component?: string;
    action?: string;
    userId?: string;
    sessionId: string;
    url: string;
    userAgent: string;
    viewport: {
      width: number;
      height: number;
    };
    network: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
    };
    memory?: {
      used: number;
      total: number;
      limit: number;
    };
  };
  severity: "low" | "medium" | "high" | "critical";
  category: "network" | "rpc" | "ui" | "storage" | "processing" | "unknown";
  tags: string[];
  breadcrumbs: Breadcrumb[];
  userFeedback?: UserFeedback;
  recoveryAttempts: RecoveryAttempt[];
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;
}

interface Breadcrumb {
  timestamp: number;
  category: "navigation" | "user" | "http" | "error" | "info";
  message: string;
  data?: any;
  level: "debug" | "info" | "warning" | "error";
}

interface UserFeedback {
  timestamp: number;
  rating: 1 | 2 | 3 | 4 | 5;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  stepsToReproduce: string[];
  contactInfo?: string;
}

interface RecoveryAttempt {
  timestamp: number;
  method: string;
  success: boolean;
  duration: number;
  error?: string;
}

interface ErrorPattern {
  pattern: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: Set<string>;
  commonContext: any;
  suggestedFix?: string;
}

export class ErrorReportingSystem {
  private static instance: ErrorReportingSystem;
  private reports: Map<string, ErrorReport> = new Map();
  private patterns: Map<string, ErrorPattern> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private maxReports = 1000;
  private maxBreadcrumbs = 100;
  private isInitialized = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeErrorReporting();
  }

  static getInstance(): ErrorReportingSystem {
    if (!this.instance) {
      this.instance = new ErrorReportingSystem();
    }
    return this.instance;
  }

  private initializeErrorReporting(): void {
    if (this.isInitialized) return;

    window.addEventListener("error", (event) => {
      this.reportError(event.error || new Error(event.message), {
        component: "global",
        action: "unhandled_error",
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.reportError(new Error(event.reason), {
        component: "global",
        action: "unhandled_promise_rejection",
      });
    });

    this.setupNetworkMonitoring();

    this.setupPerformanceMonitoring();

    this.loadReportsFromStorage();

    this.isInitialized = true;
  }

  private setupNetworkMonitoring(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();

      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          this.addBreadcrumb({
            category: "http",
            message: `HTTP ${response.status}: ${args[0]}`,
            level: "warning",
            data: {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
            },
          });
        }

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        this.reportError(error as Error, {
          component: "network",
          action: "fetch_request",
        });

        this.addBreadcrumb({
          category: "http",
          message: `Network error: ${args[0]}`,
          level: "error",
          data: {
            url: args[0],
            duration,
            error: (error as Error).message,
          },
        });

        throw error;
      }
    };
  }

  private setupPerformanceMonitoring(): void {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.addBreadcrumb({
                category: "info",
                message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
                level: "warning",
                data: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                },
              });
            }
          }
        });

        observer.observe({ entryTypes: ["longtask"] });
      } catch (error) {}
    }
  }

  reportError(
    error: Error,
    context: {
      component?: string;
      action?: string;
      userId?: string;
      additionalData?: any;
    } = {},
  ): string {
    const reportId = this.generateReportId();
    const timestamp = Date.now();

    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);

    const report: ErrorReport = {
      id: reportId,
      timestamp,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: (error as any).code,
      },
      context: {
        ...context,
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        network: this.getNetworkInfo(),
        memory: this.getMemoryInfo(),
      },
      severity,
      category,
      tags: this.generateTags(error, context),
      breadcrumbs: [...this.breadcrumbs],
      recoveryAttempts: [],
      resolved: false,
    };

    this.reports.set(reportId, report);

    this.updateErrorPatterns(report);

    this.addBreadcrumb({
      category: "error",
      message: `Error reported: ${error.message}`,
      level: "error",
      data: {
        reportId,
        category,
        severity,
      },
    });

    this.saveReportsToStorage();

    console.error(`Error Report ${reportId}:`, report);

    return reportId;
  }

  addRecoveryAttempt(
    reportId: string,
    method: string,
    success: boolean,
    duration: number,
    error?: string,
  ): void {
    const report = this.reports.get(reportId);
    if (!report) return;

    const attempt: RecoveryAttempt = {
      timestamp: Date.now(),
      method,
      success,
      duration,
      error,
    };

    report.recoveryAttempts.push(attempt);

    if (success) {
      report.resolved = true;
      report.resolvedAt = Date.now();
      report.resolution = method;
    }

    this.saveReportsToStorage();
  }

  addUserFeedback(reportId: string, feedback: UserFeedback): void {
    const report = this.reports.get(reportId);
    if (!report) return;

    report.userFeedback = feedback;
    this.saveReportsToStorage();
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  private categorizeError(error: Error): ErrorReport["category"] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout")
    ) {
      return "network";
    }

    if (
      message.includes("rpc") ||
      message.includes("blockchain") ||
      message.includes("web3")
    ) {
      return "rpc";
    }

    if (
      message.includes("storage") ||
      message.includes("slot") ||
      message.includes("contract")
    ) {
      return "storage";
    }

    if (
      message.includes("worker") ||
      message.includes("processing") ||
      message.includes("queue")
    ) {
      return "processing";
    }

    if (
      stack.includes("react") ||
      stack.includes("component") ||
      message.includes("render")
    ) {
      return "ui";
    }

    return "unknown";
  }

  private determineSeverity(
    error: Error,
    category: ErrorReport["category"],
  ): ErrorReport["severity"] {
    const message = error.message.toLowerCase();

    if (
      message.includes("out of memory") ||
      message.includes("security") ||
      message.includes("cors") ||
      (category === "processing" && message.includes("worker"))
    ) {
      return "critical";
    }

    if (
      category === "rpc" ||
      category === "network" ||
      message.includes("timeout") ||
      message.includes("failed to fetch")
    ) {
      return "high";
    }

    if (
      category === "storage" ||
      category === "ui" ||
      message.includes("validation")
    ) {
      return "medium";
    }

    return "low";
  }

  private generateTags(error: Error, context: any): string[] {
    const tags: string[] = [];

    if (navigator.userAgent.includes("Chrome")) tags.push("chrome");
    if (navigator.userAgent.includes("Firefox")) tags.push("firefox");
    if (navigator.userAgent.includes("Safari")) tags.push("safari");
    if (navigator.userAgent.includes("Mobile")) tags.push("mobile");

    if (context.component) tags.push(`component:${context.component}`);
    if (context.action) tags.push(`action:${context.action}`);

    if (error.message.includes("timeout")) tags.push("timeout");
    if (error.message.includes("permission")) tags.push("permission");
    if (error.message.includes("not found")) tags.push("not-found");

    return tags;
  }

  private updateErrorPatterns(report: ErrorReport): void {
    const patternKey = this.generatePatternKey(report);

    let pattern = this.patterns.get(patternKey);
    if (!pattern) {
      pattern = {
        pattern: patternKey,
        count: 0,
        firstSeen: report.timestamp,
        lastSeen: report.timestamp,
        affectedUsers: new Set(),
        commonContext: {},
      };
      this.patterns.set(patternKey, pattern);
    }

    pattern.count++;
    pattern.lastSeen = report.timestamp;

    if (report.context.userId) {
      pattern.affectedUsers.add(report.context.userId);
    }

    this.updateCommonContext(pattern, report);

    if (pattern.count >= 5) {
      pattern.suggestedFix = this.generateSuggestedFix(pattern);
    }
  }

  private generatePatternKey(report: ErrorReport): string {
    const errorType = report.error.name;
    const errorMessage = report.error.message.replace(/\d+/g, "N");
    const component = report.context.component || "unknown";

    return `${errorType}:${component}:${errorMessage.substring(0, 50)}`;
  }

  private updateCommonContext(
    pattern: ErrorPattern,
    report: ErrorReport,
  ): void {
    const context = report.context;

    if (!pattern.commonContext.userAgents) {
      pattern.commonContext.userAgents = new Set();
    }
    pattern.commonContext.userAgents.add(context.userAgent);

    if (!pattern.commonContext.urls) {
      pattern.commonContext.urls = new Set();
    }
    pattern.commonContext.urls.add(context.url);

    if (!pattern.commonContext.components) {
      pattern.commonContext.components = new Set();
    }
    if (context.component) {
      pattern.commonContext.components.add(context.component);
    }
  }

  private generateSuggestedFix(pattern: ErrorPattern): string {
    const patternLower = pattern.pattern.toLowerCase();

    if (patternLower.includes("network") || patternLower.includes("fetch")) {
      return "Implement retry mechanism with exponential backoff for network requests";
    }

    if (patternLower.includes("rpc") || patternLower.includes("blockchain")) {
      return "Add fallback RPC endpoints and graceful degradation for blockchain calls";
    }

    if (patternLower.includes("timeout")) {
      return "Increase timeout values or implement request cancellation";
    }

    if (patternLower.includes("memory") || patternLower.includes("worker")) {
      return "Optimize memory usage and implement data chunking for large datasets";
    }

    if (patternLower.includes("storage") || patternLower.includes("contract")) {
      return "Add input validation and fallback analysis methods";
    }

    return "Review error pattern and implement appropriate error handling";
  }

  private getNetworkInfo(): any {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }

    return {};
  }

  private getMemoryInfo(): any {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    return {};
  }

  private generateReportId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveReportsToStorage(): void {
    try {
      const reportsArray = Array.from(this.reports.entries()).slice(-100);
      const patternsArray = Array.from(this.patterns.entries()).map(
        ([key, pattern]) => [
          key,
          {
            ...pattern,
            affectedUsers: Array.from(pattern.affectedUsers),
            commonContext: {
              ...pattern.commonContext,
              userAgents: pattern.commonContext.userAgents
                ? Array.from(pattern.commonContext.userAgents)
                : [],
              urls: pattern.commonContext.urls
                ? Array.from(pattern.commonContext.urls)
                : [],
              components: pattern.commonContext.components
                ? Array.from(pattern.commonContext.components)
                : [],
            },
          },
        ],
      );

      localStorage.setItem("error-reports", JSON.stringify(reportsArray));
      localStorage.setItem("error-patterns", JSON.stringify(patternsArray));
      localStorage.setItem(
        "error-breadcrumbs",
        JSON.stringify(this.breadcrumbs.slice(-50)),
      );
    } catch (error) {
      console.warn("Failed to save error reports to storage:", error);
    }
  }

  private loadReportsFromStorage(): void {
    try {
      const reportsData = localStorage.getItem("error-reports");
      if (reportsData) {
        const reportsArray = JSON.parse(reportsData);
        this.reports = new Map(reportsArray);
      }

      const patternsData = localStorage.getItem("error-patterns");
      if (patternsData) {
        const patternsArray = JSON.parse(patternsData);
        this.patterns = new Map(
          patternsArray.map(([key, pattern]: [string, any]) => [
            key,
            {
              ...pattern,
              affectedUsers: new Set(pattern.affectedUsers),
              commonContext: {
                ...pattern.commonContext,
                userAgents: new Set(pattern.commonContext.userAgents || []),
                urls: new Set(pattern.commonContext.urls || []),
                components: new Set(pattern.commonContext.components || []),
              },
            },
          ]),
        );
      }

      const breadcrumbsData = localStorage.getItem("error-breadcrumbs");
      if (breadcrumbsData) {
        this.breadcrumbs = JSON.parse(breadcrumbsData);
      }
    } catch (error) {
      console.warn("Failed to load error reports from storage:", error);
    }
  }

  getReport(reportId: string): ErrorReport | undefined {
    return this.reports.get(reportId);
  }

  getAllReports(): ErrorReport[] {
    return Array.from(this.reports.values());
  }

  getReportsByCategory(category: ErrorReport["category"]): ErrorReport[] {
    return Array.from(this.reports.values()).filter(
      (report) => report.category === category,
    );
  }

  getReportsBySeverity(severity: ErrorReport["severity"]): ErrorReport[] {
    return Array.from(this.reports.values()).filter(
      (report) => report.severity === severity,
    );
  }

  getUnresolvedReports(): ErrorReport[] {
    return Array.from(this.reports.values()).filter(
      (report) => !report.resolved,
    );
  }

  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.count - a.count);
  }

  getTopErrorPatterns(limit: number = 10): ErrorPattern[] {
    return this.getErrorPatterns().slice(0, limit);
  }

  getRecoverySuccessRate(): number {
    const reports = Array.from(this.reports.values());
    const reportsWithAttempts = reports.filter(
      (report) => report.recoveryAttempts.length > 0,
    );

    if (reportsWithAttempts.length === 0) return 0;

    const successfulRecoveries = reportsWithAttempts.filter(
      (report) => report.resolved,
    ).length;
    return successfulRecoveries / reportsWithAttempts.length;
  }

  getErrorStatistics(): {
    totalErrors: number;
    resolvedErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverySuccessRate: number;
    topPatterns: ErrorPattern[];
  } {
    const reports = Array.from(this.reports.values());

    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    reports.forEach((report) => {
      errorsByCategory[report.category] =
        (errorsByCategory[report.category] || 0) + 1;
      errorsBySeverity[report.severity] =
        (errorsBySeverity[report.severity] || 0) + 1;
    });

    return {
      totalErrors: reports.length,
      resolvedErrors: reports.filter((report) => report.resolved).length,
      errorsByCategory,
      errorsBySeverity,
      recoverySuccessRate: this.getRecoverySuccessRate(),
      topPatterns: this.getTopErrorPatterns(5),
    };
  }

  clearReports(): void {
    this.reports.clear();
    this.patterns.clear();
    this.breadcrumbs = [];

    try {
      localStorage.removeItem("error-reports");
      localStorage.removeItem("error-patterns");
      localStorage.removeItem("error-breadcrumbs");
    } catch (error) {
      console.warn("Failed to clear error reports from storage:", error);
    }
  }
}

export const errorReporting = ErrorReportingSystem.getInstance();

export function reportError(error: Error, context?: any): string {
  return errorReporting.reportError(error, context);
}

export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
  errorReporting.addBreadcrumb(breadcrumb);
}

export function addRecoveryAttempt(
  reportId: string,
  method: string,
  success: boolean,
  duration: number,
  error?: string,
): void {
  errorReporting.addRecoveryAttempt(reportId, method, success, duration, error);
}

export type {
  ErrorReport,
  Breadcrumb,
  UserFeedback,
  RecoveryAttempt,
  ErrorPattern,
};
