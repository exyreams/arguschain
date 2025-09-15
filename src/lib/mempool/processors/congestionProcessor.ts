import type { CongestionAnalysis, GasRecommendations, TxPoolStatus } from "../types";
import { CONGESTION_COLORS, CONGESTION_THRESHOLDS, ETHEREUM_CONSTANTS, GAS_MULTIPLIERS } from "../constants";

export class CongestionProcessor {
  static analyzeCongestion(txPoolStatus: TxPoolStatus): CongestionAnalysis {
    const { pending } = txPoolStatus;

    let level: CongestionAnalysis["level"];
    let factor: number;
    let description: string;
    let color: string;
    let recommendations: string[];

    if (pending < CONGESTION_THRESHOLDS.LOW) {
      level = "low";
      factor = 0.2;
      color = CONGESTION_COLORS.low;
      description =
        "Network is not congested. Transactions should confirm quickly with standard gas prices.";
      recommendations = [
        "Use standard gas prices for optimal cost",
        "Transactions should confirm within 1-2 blocks",
        "Good time for non-urgent transactions",
      ];
    } else if (pending < CONGESTION_THRESHOLDS.MODERATE) {
      level = "moderate";
      factor = 0.5;
      color = CONGESTION_COLORS.moderate;
      description =
        "Some network congestion. Consider using slightly higher gas prices for faster confirmation.";
      recommendations = [
        "Consider using fast gas prices for important transactions",
        "Standard gas prices may take 3-5 blocks to confirm",
        "Monitor congestion if making multiple transactions",
      ];
    } else if (pending < CONGESTION_THRESHOLDS.HIGH) {
      level = "high";
      factor = 0.8;
      color = CONGESTION_COLORS.high;
      description =
        "Network is congested. Higher gas prices recommended for reasonable confirmation times.";
      recommendations = [
        "Use fast or rapid gas prices for timely confirmation",
        "Standard gas prices may take 10+ blocks",
        "Consider delaying non-urgent transactions",
        "Monitor mempool before submitting large transactions",
      ];
    } else {
      level = "extreme";
      factor = 1.0;
      color = CONGESTION_COLORS.extreme;
      description =
        "Network is extremely congested. High gas prices required for timely confirmation.";
      recommendations = [
        "Use rapid gas prices for any urgent transactions",
        "Standard gas prices may take hours to confirm",
        "Strongly consider delaying non-critical transactions",
        "Monitor network conditions closely",
        "Consider using Layer 2 solutions for cost savings",
      ];
    }

    const estimatedConfirmationTime = this.estimateConfirmationTime(pending);

    return {
      level,
      factor,
      description,
      color,
      recommendations,
      estimatedConfirmationTime,
    };
  }

  static estimateConfirmationTime(pendingCount: number): string {
    const blocksToWait = Math.max(
      1,
      pendingCount / ETHEREUM_CONSTANTS.AVERAGE_TX_PER_BLOCK,
    );

    const waitTimeSeconds =
      blocksToWait * ETHEREUM_CONSTANTS.AVERAGE_BLOCK_TIME;

    if (waitTimeSeconds < 60) {
      return `~${Math.round(waitTimeSeconds)} seconds`;
    } else if (waitTimeSeconds < 3600) {
      return `~${Math.round(waitTimeSeconds / 60)} minutes`;
    } else {
      return `~${(waitTimeSeconds / 3600).toFixed(1)} hours`;
    }
  }

  static generateGasRecommendations(
    baseFee: number,
    congestionAnalysis: CongestionAnalysis,
  ): GasRecommendations {
    const { factor } = congestionAnalysis;

    let multipliers = { ...GAS_MULTIPLIERS };

    if (factor > 0.7) {
      multipliers.standard = GAS_MULTIPLIERS.highCongestion.standard;
      multipliers.fast = GAS_MULTIPLIERS.highCongestion.fast;
      multipliers.rapid = GAS_MULTIPLIERS.highCongestion.rapid;
    } else if (factor > 0.4) {
      multipliers.standard = GAS_MULTIPLIERS.moderateCongestion.standard;
      multipliers.fast = GAS_MULTIPLIERS.moderateCongestion.fast;
      multipliers.rapid = GAS_MULTIPLIERS.moderateCongestion.rapid;
    }

    return {
      slow: {
        gasPrice: Math.round(baseFee * multipliers.slow * 100) / 100,
        expectedConfirmation: "Within ~5 minutes",
        description: "Economical option for non-urgent transactions",
        icon: "🐢",
      },
      standard: {
        gasPrice: Math.round(baseFee * multipliers.standard * 100) / 100,
        expectedConfirmation: "Within ~2 minutes",
        description: "Balanced option for most transactions",
        icon: "🚶",
      },
      fast: {
        gasPrice: Math.round(baseFee * multipliers.fast * 100) / 100,
        expectedConfirmation: "Within ~30 seconds",
        description: "Priority option for important transactions",
        icon: "🏃",
      },
      rapid: {
        gasPrice: Math.round(baseFee * multipliers.rapid * 100) / 100,
        expectedConfirmation: "Next block (~12 seconds)",
        description: "Urgent option for time-critical transactions",
        icon: "🚀",
      },
    };
  }

  static compareNetworkCongestion(networkStatuses: TxPoolStatus[]): {
    mostCongested: string;
    leastCongested: string;
    averagePending: number;
    totalTransactions: number;
    congestedNetworks: string[];
  } {
    if (networkStatuses.length === 0) {
      throw new Error("No network statuses provided for comparison");
    }

    let mostCongested = networkStatuses[0];
    let leastCongested = networkStatuses[0];
    let totalPending = 0;
    let totalTransactions = 0;
    const congestedNetworks: string[] = [];

    for (const status of networkStatuses) {
      totalPending += status.pending;
      totalTransactions += status.total;

      if (status.pending > mostCongested.pending) {
        mostCongested = status;
      }

      if (status.pending < leastCongested.pending) {
        leastCongested = status;
      }

      if (status.pending > CONGESTION_THRESHOLDS.MODERATE) {
        congestedNetworks.push(status.network);
      }
    }

    return {
      mostCongested: mostCongested.network,
      leastCongested: leastCongested.network,
      averagePending: Math.round(totalPending / networkStatuses.length),
      totalTransactions,
      congestedNetworks,
    };
  }

  static analyzeCongestionTrend(
    currentStatus: TxPoolStatus,
    previousStatuses: TxPoolStatus[],
  ): {
    trend: "increasing" | "decreasing" | "stable";
    changePercentage: number;
    recommendation: string;
  } {
    if (previousStatuses.length === 0) {
      return {
        trend: "stable",
        changePercentage: 0,
        recommendation: "Insufficient data for trend analysis",
      };
    }

    const avgPreviousPending =
      previousStatuses.reduce((sum, status) => sum + status.pending, 0) /
      previousStatuses.length;

    const changePercentage =
      ((currentStatus.pending - avgPreviousPending) / avgPreviousPending) * 100;

    let trend: "increasing" | "decreasing" | "stable";
    let recommendation: string;

    if (changePercentage > 10) {
      trend = "increasing";
      recommendation =
        "Network congestion is increasing. Consider using higher gas prices or delaying non-urgent transactions.";
    } else if (changePercentage < -10) {
      trend = "decreasing";
      recommendation =
        "Network congestion is decreasing. Good time for pending transactions with standard gas prices.";
    } else {
      trend = "stable";
      recommendation =
        "Network congestion is stable. Current gas price recommendations should remain effective.";
    }

    return {
      trend,
      changePercentage: Math.round(changePercentage * 100) / 100,
      recommendation,
    };
  }

  static calculateOptimalGasPrice(
    baseFee: number,
    congestionFactor: number,
    targetConfirmationBlocks: number,
  ): number {
    let multiplier = 1.0;

    if (targetConfirmationBlocks <= 1) {
      multiplier = 1.5;
    } else if (targetConfirmationBlocks <= 3) {
      multiplier = 1.25;
    } else if (targetConfirmationBlocks <= 5) {
      multiplier = 1.1;
    } else {
      multiplier = 1.0;
    }

    const congestionMultiplier = 1 + congestionFactor * 0.5;

    return Math.round(baseFee * multiplier * congestionMultiplier * 100) / 100;
  }
}
