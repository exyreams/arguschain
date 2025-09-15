import type { ParsedTransferLog, LogsAnalysisResults } from "./types";

export interface AnalyticsInsight {
  id: string;
  type: "pattern" | "anomaly" | "risk" | "opportunity" | "warning";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  details: string;
  metrics?: Record<string, number>;
  addresses?: string[];
  timeframe?: { start: number; end: number };
  confidence: number; // 0-1
}

export interface AnalyticsReport {
  summary: {
    totalInsights: number;
    criticalIssues: number;
    riskScore: number; // 0-100
    healthScore: number; // 0-100
  };
  insights: AnalyticsInsight[];
  patterns: {
    washTrading: boolean;
    botActivity: boolean;
    whaleActivity: boolean;
    concentrationRisk: boolean;
  };
  recommendations: string[];
}

export class BlockchainAnalyticsEngine {
  private transfers: ParsedTransferLog[];
  private results: LogsAnalysisResults;

  constructor(transfers: ParsedTransferLog[], results: LogsAnalysisResults) {
    this.transfers = transfers;
    this.results = results;
  }

  public generateReport(): AnalyticsReport {
    const insights: AnalyticsInsight[] = [];

    // Run all analysis modules
    insights.push(...this.detectWashTrading());
    insights.push(...this.detectBotActivity());
    insights.push(...this.detectWhaleActivity());
    insights.push(...this.detectConcentrationRisk());
    insights.push(...this.detectVolumeAnomalies());
    insights.push(...this.detectTimingAnomalies());
    insights.push(...this.detectNetworkAnomalies());
    insights.push(...this.assessLiquidityRisk());

    const summary = this.generateSummary(insights);
    const patterns = this.identifyPatterns(insights);
    const recommendations = this.generateRecommendations(insights);

    return {
      summary,
      insights: insights.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      patterns,
      recommendations,
    };
  }

  private detectWashTrading(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Detect circular transfers (A -> B -> A)
    const addressPairs = new Map<string, Set<string>>();

    this.transfers.forEach((transfer) => {
      if (!addressPairs.has(transfer.from)) {
        addressPairs.set(transfer.from, new Set());
      }
      addressPairs.get(transfer.from)!.add(transfer.to);
    });

    let circularCount = 0;
    let suspiciousAddresses: string[] = [];

    addressPairs.forEach((targets, source) => {
      targets.forEach((target) => {
        if (addressPairs.get(target)?.has(source)) {
          circularCount++;
          suspiciousAddresses.push(source, target);
        }
      });
    });

    if (circularCount > 0) {
      const uniqueAddresses = [...new Set(suspiciousAddresses)];
      insights.push({
        id: "wash-trading",
        type: "pattern",
        severity: circularCount > 5 ? "high" : "medium",
        title: "Potential Wash Trading Detected",
        description: `Found ${circularCount} circular transfer patterns between ${uniqueAddresses.length} addresses`,
        details: `Circular transfers can indicate wash trading or artificial volume inflation. These patterns involve addresses sending tokens back and forth to create the appearance of trading activity.`,
        metrics: {
          circularPairs: circularCount,
          suspiciousAddresses: uniqueAddresses.length,
          percentageOfTotal: (circularCount / this.transfers.length) * 100,
        },
        addresses: uniqueAddresses.slice(0, 10), // Limit to first 10
        confidence: circularCount > 10 ? 0.8 : 0.6,
      });
    }

    return insights;
  }

  private detectBotActivity(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Group transfers by address and analyze timing patterns
    const addressActivity = new Map<string, number[]>();

    this.transfers.forEach((transfer) => {
      if (transfer.timestamp) {
        if (!addressActivity.has(transfer.from)) {
          addressActivity.set(transfer.from, []);
        }
        addressActivity.get(transfer.from)!.push(transfer.timestamp);
      }
    });

    let botLikeAddresses: string[] = [];

    addressActivity.forEach((timestamps, address) => {
      if (timestamps.length < 5) return; // Need minimum activity

      timestamps.sort((a, b) => a - b);
      const intervals: number[] = [];

      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }

      // Check for regular intervals (bot-like behavior)
      const avgInterval =
        intervals.reduce((sum, interval) => sum + interval, 0) /
        intervals.length;
      const variance =
        intervals.reduce(
          (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
          0
        ) / intervals.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / avgInterval;

      // Low coefficient of variation indicates regular timing (bot-like)
      if (coefficientOfVariation < 0.2 && timestamps.length > 10) {
        botLikeAddresses.push(address);
      }
    });

    if (botLikeAddresses.length > 0) {
      insights.push({
        id: "bot-activity",
        type: "pattern",
        severity: botLikeAddresses.length > 3 ? "medium" : "low",
        title: "Automated Trading Activity Detected",
        description: `Identified ${botLikeAddresses.length} addresses with highly regular transaction timing patterns`,
        details: `These addresses show consistent timing intervals between transactions, suggesting automated or bot-driven activity. This could indicate algorithmic trading, arbitrage bots, or other automated strategies.`,
        metrics: {
          botLikeAddresses: botLikeAddresses.length,
          percentageOfAddresses:
            (botLikeAddresses.length / this.results.statistics.unique_senders) *
            100,
        },
        addresses: botLikeAddresses.slice(0, 5),
        confidence: 0.7,
      });
    }

    return insights;
  }

  private detectWhaleActivity(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    const totalVolume = this.results.statistics.total_volume;
    const whaleThreshold = totalVolume * 0.05; // 5% of total volume

    const whaleTransfers = this.transfers.filter(
      (transfer) => transfer.value_pyusd > whaleThreshold
    );

    if (whaleTransfers.length > 0) {
      const whaleAddresses = new Set([
        ...whaleTransfers.map((t) => t.from),
        ...whaleTransfers.map((t) => t.to),
      ]);

      const whaleVolume = whaleTransfers.reduce(
        (sum, t) => sum + t.value_pyusd,
        0
      );

      insights.push({
        id: "whale-activity",
        type: "pattern",
        severity: whaleVolume > totalVolume * 0.3 ? "high" : "medium",
        title: "Significant Whale Activity Detected",
        description: `${whaleTransfers.length} large transfers involving ${whaleAddresses.size} whale addresses`,
        details: `Large transfers (>5% of total volume each) can significantly impact market dynamics. These whale movements represent ${((whaleVolume / totalVolume) * 100).toFixed(1)}% of total volume.`,
        metrics: {
          whaleTransfers: whaleTransfers.length,
          whaleAddresses: whaleAddresses.size,
          whaleVolume: whaleVolume,
          percentageOfVolume: (whaleVolume / totalVolume) * 100,
          averageWhaleTransfer: whaleVolume / whaleTransfers.length,
        },
        addresses: Array.from(whaleAddresses).slice(0, 5),
        confidence: 0.9,
      });
    }

    return insights;
  }

  private detectConcentrationRisk(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Analyze volume concentration among top addresses
    const top5Volume = this.results.top_senders
      .slice(0, 5)
      .reduce((sum, sender) => sum + sender.total_value, 0);

    const concentrationRatio =
      (top5Volume / this.results.statistics.total_volume) * 100;

    if (concentrationRatio > 70) {
      insights.push({
        id: "concentration-risk",
        type: "risk",
        severity: concentrationRatio > 90 ? "critical" : "high",
        title: "High Volume Concentration Risk",
        description: `Top 5 addresses control ${concentrationRatio.toFixed(1)}% of total volume`,
        details: `High concentration of trading volume among few addresses creates systemic risk. If these major players exit or change behavior, it could significantly impact the token's liquidity and price stability.`,
        metrics: {
          concentrationRatio: concentrationRatio,
          top5Volume: top5Volume,
          totalAddresses:
            this.results.statistics.unique_senders +
            this.results.statistics.unique_receivers,
        },
        addresses: this.results.top_senders.slice(0, 5).map((s) => s.address),
        confidence: 0.95,
      });
    }

    return insights;
  }

  private detectVolumeAnomalies(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    const values = this.transfers
      .map((t) => t.value_pyusd)
      .sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = this.transfers.filter((t) => t.value_pyusd > upperBound);

    if (outliers.length > values.length * 0.05) {
      // More than 5% outliers
      insights.push({
        id: "volume-anomalies",
        type: "anomaly",
        severity: "medium",
        title: "Unusual Volume Distribution Detected",
        description: `${outliers.length} transfers (${((outliers.length / values.length) * 100).toFixed(1)}%) are statistical outliers`,
        details: `A high number of outlier transactions suggests unusual trading patterns or potential market manipulation. Normal distributions typically have <5% outliers.`,
        metrics: {
          outlierCount: outliers.length,
          outlierPercentage: (outliers.length / values.length) * 100,
          outlierThreshold: upperBound,
          maxOutlier: Math.max(...outliers.map((t) => t.value_pyusd)),
        },
        confidence: 0.8,
      });
    }

    return insights;
  }

  private detectTimingAnomalies(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    if (!this.transfers.some((t) => t.timestamp)) {
      return insights; // No timestamp data
    }

    // Analyze transaction timing distribution
    const timestamps = this.transfers
      .filter((t) => t.timestamp)
      .map((t) => t.timestamp!)
      .sort((a, b) => a - b);

    if (timestamps.length < 10) return insights;

    // Check for unusual clustering
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const shortIntervals = intervals.filter(
      (interval) => interval < avgInterval * 0.1
    ).length;

    if (shortIntervals > intervals.length * 0.2) {
      // More than 20% very short intervals
      insights.push({
        id: "timing-anomalies",
        type: "anomaly",
        severity: "medium",
        title: "Unusual Transaction Timing Patterns",
        description: `${shortIntervals} transactions occurred in rapid succession`,
        details: `Clusters of transactions with very short time intervals may indicate coordinated activity, flash loan attacks, or MEV (Maximum Extractable Value) operations.`,
        metrics: {
          rapidTransactions: shortIntervals,
          percentageRapid: (shortIntervals / intervals.length) * 100,
          averageInterval: avgInterval,
        },
        confidence: 0.7,
      });
    }

    return insights;
  }

  private detectNetworkAnomalies(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Analyze network structure for anomalies
    const hubAddresses = this.results.network_analysis.hub_addresses;

    if (hubAddresses.length > 0) {
      // Calculate connection counts for each hub address
      const addressConnections = new Map<string, number>();

      this.transfers.forEach((transfer) => {
        if (hubAddresses.includes(transfer.from)) {
          addressConnections.set(
            transfer.from,
            (addressConnections.get(transfer.from) || 0) + 1
          );
        }
        if (hubAddresses.includes(transfer.to)) {
          addressConnections.set(
            transfer.to,
            (addressConnections.get(transfer.to) || 0) + 1
          );
        }
      });

      const superHubs = Array.from(addressConnections.entries())
        .filter(([address, connections]) => connections > 20)
        .sort((a, b) => b[1] - a[1]);

      if (superHubs.length > 0) {
        insights.push({
          id: "network-anomalies",
          type: "pattern",
          severity: superHubs.length > 2 ? "high" : "medium",
          title: "Highly Connected Network Hubs Detected",
          description: `${superHubs.length} addresses have >20 connections each`,
          details: `Hub addresses with many connections could indicate exchange wallets, mixing services, or potential centralization points. These create single points of failure in the network.`,
          metrics: {
            superHubs: superHubs.length,
            maxConnections: Math.max(
              ...superHubs.map(([, connections]) => connections)
            ),
            averageConnections:
              superHubs.reduce((sum, [, connections]) => sum + connections, 0) /
              superHubs.length,
            totalHubAddresses: hubAddresses.length,
          },
          addresses: superHubs.slice(0, 3).map(([address]) => address),
          confidence: 0.8,
        });
      }
    }

    return insights;
  }

  private assessLiquidityRisk(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Calculate liquidity metrics
    const uniqueAddresses =
      this.results.statistics.unique_senders +
      this.results.statistics.unique_receivers;
    const avgTransactionSize = this.results.statistics.avg_transfer;
    const medianTransactionSize = this.results.statistics.median_transfer;

    // Low liquidity indicators
    const liquidityScore = Math.min(
      100,
      (uniqueAddresses / 100) * 50 + (this.transfers.length / 1000) * 50
    );

    if (liquidityScore < 30) {
      insights.push({
        id: "liquidity-risk",
        type: "risk",
        severity: liquidityScore < 15 ? "high" : "medium",
        title: "Low Liquidity Risk Detected",
        description: `Liquidity score: ${liquidityScore.toFixed(1)}/100`,
        details: `Low liquidity increases price volatility and makes large trades difficult to execute without significant price impact. This is based on the number of active addresses and transaction frequency.`,
        metrics: {
          liquidityScore: liquidityScore,
          uniqueAddresses: uniqueAddresses,
          transactionCount: this.transfers.length,
          avgTransactionSize: avgTransactionSize,
          medianTransactionSize: medianTransactionSize,
        },
        confidence: 0.85,
      });
    }

    return insights;
  }

  private generateSummary(insights: AnalyticsInsight[]) {
    const criticalIssues = insights.filter(
      (i) => i.severity === "critical"
    ).length;
    const highIssues = insights.filter((i) => i.severity === "high").length;

    // Calculate risk score (0-100)
    const riskScore = Math.min(
      100,
      criticalIssues * 25 +
        highIssues * 15 +
        insights.filter((i) => i.severity === "medium").length * 8 +
        insights.filter((i) => i.severity === "low").length * 3
    );

    // Health score is inverse of risk
    const healthScore = Math.max(0, 100 - riskScore);

    return {
      totalInsights: insights.length,
      criticalIssues,
      riskScore,
      healthScore,
    };
  }

  private identifyPatterns(insights: AnalyticsInsight[]) {
    return {
      washTrading: insights.some((i) => i.id === "wash-trading"),
      botActivity: insights.some((i) => i.id === "bot-activity"),
      whaleActivity: insights.some((i) => i.id === "whale-activity"),
      concentrationRisk: insights.some((i) => i.id === "concentration-risk"),
    };
  }

  private generateRecommendations(insights: AnalyticsInsight[]): string[] {
    const recommendations: string[] = [];

    if (insights.some((i) => i.id === "wash-trading")) {
      recommendations.push(
        "Investigate circular transfer patterns for potential wash trading"
      );
      recommendations.push(
        "Implement transaction monitoring for artificial volume detection"
      );
    }

    if (insights.some((i) => i.id === "concentration-risk")) {
      recommendations.push(
        "Diversify liquidity sources to reduce concentration risk"
      );
      recommendations.push("Monitor whale addresses for large movements");
    }

    if (insights.some((i) => i.id === "liquidity-risk")) {
      recommendations.push(
        "Increase marketing efforts to attract more participants"
      );
      recommendations.push(
        "Consider liquidity mining programs to improve market depth"
      );
    }

    if (insights.some((i) => i.id === "bot-activity")) {
      recommendations.push("Monitor automated trading for market manipulation");
      recommendations.push(
        "Consider implementing trading limits or cooling periods"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Transaction patterns appear normal - continue monitoring"
      );
      recommendations.push("Consider implementing regular analytics reviews");
    }

    return recommendations;
  }
}
