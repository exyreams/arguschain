import { useMemo } from "react";
import {
  type LogsAnalysisResults,
  type ParsedTransferLog,
  TransferProcessor,
} from "@/lib/eventlogs";

export function useTransferAnalytics(transfers: ParsedTransferLog[]) {
  return useMemo(() => {
    if (!transfers || transfers.length === 0) {
      return {
        statistics: null,
        topSenders: [],
        topReceivers: [],
        topFlows: [],
        timeSeries: [],
        distributionBuckets: [],
        networkAnalysis: null,
      };
    }

    const statistics = TransferProcessor.calculateStatistics(transfers);
    const topSenders = TransferProcessor.getTopSenders(transfers);
    const topReceivers = TransferProcessor.getTopReceivers(transfers);
    const topFlows = TransferProcessor.getTopFlows(transfers);
    const timeSeries = TransferProcessor.generateTimeSeries(transfers);
    const distributionBuckets =
      TransferProcessor.createDistributionBuckets(transfers);
    const networkAnalysis = TransferProcessor.analyzeNetwork(transfers);

    return {
      statistics,
      topSenders,
      topReceivers,
      topFlows,
      timeSeries,
      distributionBuckets,
      networkAnalysis,
    };
  }, [transfers]);
}

export function useAdvancedStatistics(transfers: ParsedTransferLog[]) {
  return useMemo(() => {
    if (!transfers || transfers.length === 0) {
      return null;
    }

    const values = transfers.map((t) => t.value_pyusd).sort((a, b) => a - b);
    const n = values.length;

    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    const median =
      n % 2 === 0
        ? (values[n / 2 - 1] + values[n / 2]) / 2
        : values[Math.floor(n / 2)];

    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter((v) => v < lowerBound || v > upperBound);

    const skewness =
      values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) /
      n;

    const kurtosis =
      values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) /
        n -
      3;

    const percentiles = {
      p5: values[Math.floor(n * 0.05)],
      p10: values[Math.floor(n * 0.1)],
      p25: q1,
      p50: median,
      p75: q3,
      p90: values[Math.floor(n * 0.9)],
      p95: values[Math.floor(n * 0.95)],
      p99: values[Math.floor(n * 0.99)],
    };

    const giniCoefficient = calculateGiniCoefficient(values);
    const concentrationRatio = calculateConcentrationRatio(transfers);

    return {
      basic: {
        count: n,
        sum,
        mean,
        median,
        min: values[0],
        max: values[n - 1],
        range: values[n - 1] - values[0],
      },
      dispersion: {
        variance,
        stdDev,
        coefficientOfVariation: stdDev / mean,
        iqr,
        outlierCount: outliers.length,
        outlierPercentage: (outliers.length / n) * 100,
      },
      distribution: {
        skewness,
        kurtosis,
        isNormalDistribution:
          Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 0.5,
        isRightSkewed: skewness > 0.5,
        isLeftSkewed: skewness < -0.5,
        isHeavyTailed: kurtosis > 0.5,
      },
      percentiles,
      concentration: {
        giniCoefficient,
        concentrationRatio,
        isHighlyConcentrated: giniCoefficient > 0.7,
      },
      outliers: {
        values: outliers,
        lowerBound,
        upperBound,
        count: outliers.length,
        percentage: (outliers.length / n) * 100,
      },
    };
  }, [transfers]);
}

export function useTimeAnalytics(transfers: ParsedTransferLog[]) {
  return useMemo(() => {
    const timestampedTransfers = transfers.filter(
      (t) => t.timestamp && t.datetime
    );

    if (timestampedTransfers.length === 0) {
      return null;
    }

    const sortedTransfers = [...timestampedTransfers].sort(
      (a, b) => a.timestamp! - b.timestamp!
    );

    const startTime = new Date(sortedTransfers[0].timestamp! * 1000);
    const endTime = new Date(
      sortedTransfers[sortedTransfers.length - 1].timestamp! * 1000
    );
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Map<string, number>();

    sortedTransfers.forEach((transfer) => {
      const date = new Date(transfer.timestamp! * 1000);
      const hour = date.getHours();
      const day = date.toDateString();

      hourlyActivity[hour]++;
      dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1);
    });

    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const peakDay = Array.from(dailyActivity.entries()).reduce(
      (max, [day, count]) => (count > max.count ? { day, count } : max),
      { day: "", count: 0 }
    );

    const avgTransactionsPerHour =
      sortedTransfers.length / Math.max(durationHours, 1);
    const avgVolumePerHour =
      sortedTransfers.reduce((sum, t) => sum + t.value_pyusd, 0) /
      Math.max(durationHours, 1);

    const timePoints = sortedTransfers.map((_, i) => i);
    const volumes = sortedTransfers.map((t) => t.value_pyusd);
    const trend = calculateLinearTrend(timePoints, volumes);

    return {
      timeRange: {
        start: startTime,
        end: endTime,
        durationMs,
        durationHours,
      },
      activity: {
        hourlyPattern: hourlyActivity,
        dailyPattern: Array.from(dailyActivity.entries()),
        peakHour,
        peakDay: peakDay.day,
        avgTransactionsPerHour,
        avgVolumePerHour,
      },
      trend: {
        slope: trend.slope,
        direction:
          trend.slope > 0
            ? "increasing"
            : trend.slope < 0
              ? "decreasing"
              : "stable",
        correlation: trend.correlation,
        isSignificant: Math.abs(trend.correlation) > 0.3,
      },
    };
  }, [transfers]);
}

export function useNetworkAnalytics(transfers: ParsedTransferLog[]) {
  return useMemo(() => {
    if (!transfers || transfers.length === 0) {
      return null;
    }

    const addressConnections = new Map<string, Set<string>>();
    const addressVolumes = new Map<
      string,
      { sent: number; received: number }
    >();
    const addressTransactions = new Map<
      string,
      { sent: number; received: number }
    >();

    transfers.forEach((transfer) => {
      if (!addressConnections.has(transfer.from)) {
        addressConnections.set(transfer.from, new Set());
      }
      if (!addressConnections.has(transfer.to)) {
        addressConnections.set(transfer.to, new Set());
      }
      addressConnections.get(transfer.from)!.add(transfer.to);
      addressConnections.get(transfer.to)!.add(transfer.from);

      const fromVolume = addressVolumes.get(transfer.from) || {
        sent: 0,
        received: 0,
      };
      const toVolume = addressVolumes.get(transfer.to) || {
        sent: 0,
        received: 0,
      };
      fromVolume.sent += transfer.value_pyusd;
      toVolume.received += transfer.value_pyusd;
      addressVolumes.set(transfer.from, fromVolume);
      addressVolumes.set(transfer.to, toVolume);

      const fromTxs = addressTransactions.get(transfer.from) || {
        sent: 0,
        received: 0,
      };
      const toTxs = addressTransactions.get(transfer.to) || {
        sent: 0,
        received: 0,
      };
      fromTxs.sent++;
      toTxs.received++;
      addressTransactions.set(transfer.from, fromTxs);
      addressTransactions.set(transfer.to, toTxs);
    });

    const allAddresses = Array.from(addressConnections.keys());
    const connectionCounts = allAddresses.map(
      (addr) => addressConnections.get(addr)!.size
    );

    const avgConnections =
      connectionCounts.reduce((sum, count) => sum + count, 0) /
      connectionCounts.length;
    const hubThreshold = Math.max(5, avgConnections * 2);
    const hubs = allAddresses.filter(
      (addr) => addressConnections.get(addr)!.size >= hubThreshold
    );

    const totalVolume = Array.from(addressVolumes.values()).reduce(
      (sum, vol) => sum + vol.sent + vol.received,
      0
    );
    const whaleThreshold = totalVolume * 0.05;
    const whales = allAddresses.filter((addr) => {
      const vol = addressVolumes.get(addr)!;
      return vol.sent + vol.received >= whaleThreshold;
    });

    const maxPossibleConnections =
      (allAddresses.length * (allAddresses.length - 1)) / 2;
    const actualConnections = transfers.length;
    const networkDensity = actualConnections / maxPossibleConnections;

    return {
      overview: {
        totalAddresses: allAddresses.length,
        totalConnections: actualConnections,
        networkDensity,
        avgConnectionsPerAddress: avgConnections,
      },
      hubs: {
        addresses: hubs,
        count: hubs.length,
        threshold: hubThreshold,
      },
      whales: {
        addresses: whales,
        count: whales.length,
        threshold: whaleThreshold,
      },
      connectivity: {
        mostConnected: allAddresses.reduce((max, addr) =>
          addressConnections.get(addr)!.size > addressConnections.get(max)!.size
            ? addr
            : max
        ),
        leastConnected: allAddresses.reduce((min, addr) =>
          addressConnections.get(addr)!.size < addressConnections.get(min)!.size
            ? addr
            : min
        ),
        connectionDistribution: connectionCounts,
      },
    };
  }, [transfers]);
}

export function useComparativeAnalytics(
  currentResults: LogsAnalysisResults | null,
  previousResults: LogsAnalysisResults | null
) {
  return useMemo(() => {
    if (!currentResults || !previousResults) {
      return null;
    }

    const current = currentResults.statistics;
    const previous = previousResults.statistics;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      volume: {
        current: current.total_volume,
        previous: previous.total_volume,
        change: calculateChange(current.total_volume, previous.total_volume),
        trend:
          current.total_volume > previous.total_volume
            ? "up"
            : current.total_volume < previous.total_volume
              ? "down"
              : "stable",
      },
      transfers: {
        current: current.total_transfers,
        previous: previous.total_transfers,
        change: calculateChange(
          current.total_transfers,
          previous.total_transfers
        ),
        trend:
          current.total_transfers > previous.total_transfers
            ? "up"
            : current.total_transfers < previous.total_transfers
              ? "down"
              : "stable",
      },
      avgTransfer: {
        current: current.avg_transfer,
        previous: previous.avg_transfer,
        change: calculateChange(current.avg_transfer, previous.avg_transfer),
        trend:
          current.avg_transfer > previous.avg_transfer
            ? "up"
            : current.avg_transfer < previous.avg_transfer
              ? "down"
              : "stable",
      },
      participants: {
        current: current.unique_senders + current.unique_receivers,
        previous: previous.unique_senders + previous.unique_receivers,
        change: calculateChange(
          current.unique_senders + current.unique_receivers,
          previous.unique_senders + previous.unique_receivers
        ),
      },
    };
  }, [currentResults, previousResults]);
}

function calculateGiniCoefficient(values: number[]): number {
  const n = values.length;
  const sortedValues = [...values].sort((a, b) => a - b);
  const sum = sortedValues.reduce((acc, val) => acc + val, 0);

  if (sum === 0) return 0;

  let gini = 0;
  for (let i = 0; i < n; i++) {
    gini += (2 * (i + 1) - n - 1) * sortedValues[i];
  }

  return gini / (n * sum);
}

function calculateConcentrationRatio(transfers: ParsedTransferLog[]): number {
  const addressVolumes = new Map<string, number>();

  transfers.forEach((transfer) => {
    addressVolumes.set(
      transfer.from,
      (addressVolumes.get(transfer.from) || 0) + transfer.value_pyusd
    );
  });

  const volumes = Array.from(addressVolumes.values()).sort((a, b) => b - a);
  const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
  const top10PercentCount = Math.ceil(volumes.length * 0.1);
  const top10PercentVolume = volumes
    .slice(0, top10PercentCount)
    .reduce((sum, vol) => sum + vol, 0);

  return totalVolume > 0 ? (top10PercentVolume / totalVolume) * 100 : 0;
}

function calculateLinearTrend(
  x: number[],
  y: number[]
): { slope: number; correlation: number } {
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const correlation =
    (n * sumXY - sumX * sumY) /
    Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  return { slope, correlation };
}
