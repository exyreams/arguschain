import type {
  DistributionBucket,
  ParsedTransferLog,
  TimeSeriesData,
  TopParticipant,
  TransferFlow,
  TransferStatistics,
} from "../types";
import { ANALYSIS_CONFIG } from "@/lib/eventlogs";

export class TransferProcessor {
  static calculateStatistics(
    transfers: ParsedTransferLog[],
  ): TransferStatistics {
    if (transfers.length === 0) {
      return {
        total_transfers: 0,
        total_volume: 0,
        avg_transfer: 0,
        median_transfer: 0,
        max_transfer: 0,
        min_transfer: 0,
        unique_senders: 0,
        unique_receivers: 0,
        blocks_analyzed: 0,
      };
    }

    const values = transfers.map((t) => t.value_pyusd).sort((a, b) => a - b);
    const uniqueSenders = new Set(transfers.map((t) => t.from));
    const uniqueReceivers = new Set(transfers.map((t) => t.to));
    const uniqueBlocks = new Set(transfers.map((t) => t.blockNumber));

    const timestampedTransfers = transfers.filter((t) => t.timestamp);
    let timeRange: TransferStatistics["time_range"];

    if (timestampedTransfers.length > 0) {
      const timestamps = timestampedTransfers
        .map((t) => t.timestamp!)
        .sort((a, b) => a - b);
      const startTime = new Date(timestamps[0] * 1000);
      const endTime = new Date(timestamps[timestamps.length - 1] * 1000);
      const durationMs = endTime.getTime() - startTime.getTime();

      timeRange = {
        start: startTime,
        end: endTime,
        duration_hours: durationMs / (1000 * 60 * 60),
      };
    }

    return {
      total_transfers: transfers.length,
      total_volume: values.reduce((sum, val) => sum + val, 0),
      avg_transfer: values.reduce((sum, val) => sum + val, 0) / values.length,
      median_transfer: values[Math.floor(values.length / 2)],
      max_transfer: Math.max(...values),
      min_transfer: Math.min(...values),
      unique_senders: uniqueSenders.size,
      unique_receivers: uniqueReceivers.size,
      blocks_analyzed: uniqueBlocks.size,
      time_range: timeRange,
    };
  }

  static getTopSenders(
    transfers: ParsedTransferLog[],
    limit: number = ANALYSIS_CONFIG.top_participants_limit,
  ): TopParticipant[] {
    const senderStats = new Map<
      string,
      { total_value: number; transactions: number; address_short: string }
    >();

    transfers.forEach((transfer) => {
      const existing = senderStats.get(transfer.from) || {
        total_value: 0,
        transactions: 0,
        address_short: transfer.from_short,
      };

      existing.total_value += transfer.value_pyusd;
      existing.transactions += 1;
      senderStats.set(transfer.from, existing);
    });

    const totalVolume = transfers.reduce((sum, t) => sum + t.value_pyusd, 0);

    const topSenders: TopParticipant[] = Array.from(senderStats.entries())
      .map(([address, stats]) => ({
        address,
        address_short: stats.address_short,
        total_value: stats.total_value,
        transactions: stats.transactions,
        percentage_of_volume:
          totalVolume > 0 ? (stats.total_value / totalVolume) * 100 : 0,
      }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, limit);

    return topSenders;
  }

  static getTopReceivers(
    transfers: ParsedTransferLog[],
    limit: number = ANALYSIS_CONFIG.top_participants_limit,
  ): TopParticipant[] {
    const receiverStats = new Map<
      string,
      { total_value: number; transactions: number; address_short: string }
    >();

    transfers.forEach((transfer) => {
      const existing = receiverStats.get(transfer.to) || {
        total_value: 0,
        transactions: 0,
        address_short: transfer.to_short,
      };

      existing.total_value += transfer.value_pyusd;
      existing.transactions += 1;
      receiverStats.set(transfer.to, existing);
    });

    const totalVolume = transfers.reduce((sum, t) => sum + t.value_pyusd, 0);

    const topReceivers: TopParticipant[] = Array.from(receiverStats.entries())
      .map(([address, stats]) => ({
        address,
        address_short: stats.address_short,
        total_value: stats.total_value,
        transactions: stats.transactions,
        percentage_of_volume:
          totalVolume > 0 ? (stats.total_value / totalVolume) * 100 : 0,
      }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, limit);

    return topReceivers;
  }

  static getTopFlows(
    transfers: ParsedTransferLog[],
    limit: number = ANALYSIS_CONFIG.top_flows_limit,
  ): TransferFlow[] {
    const flowStats = new Map<
      string,
      {
        from: string;
        to: string;
        from_short: string;
        to_short: string;
        total_value: number;
        transaction_count: number;
      }
    >();

    transfers.forEach((transfer) => {
      const flowKey = `${transfer.from}->${transfer.to}`;
      const existing = flowStats.get(flowKey) || {
        from: transfer.from,
        to: transfer.to,
        from_short: transfer.from_short,
        to_short: transfer.to_short,
        total_value: 0,
        transaction_count: 0,
      };

      existing.total_value += transfer.value_pyusd;
      existing.transaction_count += 1;
      flowStats.set(flowKey, existing);
    });

    const totalVolume = transfers.reduce((sum, t) => sum + t.value_pyusd, 0);

    const topFlows: TransferFlow[] = Array.from(flowStats.values())
      .map((flow) => ({
        from: flow.from,
        from_short: flow.from_short,
        to: flow.to,
        to_short: flow.to_short,
        total_value: flow.total_value,
        transaction_count: flow.transaction_count,
        percentage_of_volume:
          totalVolume > 0 ? (flow.total_value / totalVolume) * 100 : 0,
      }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, limit);

    return topFlows;
  }

  static generateTimeSeries(transfers: ParsedTransferLog[]): TimeSeriesData[] {
    const timestampedTransfers = transfers.filter(
      (t) => t.timestamp && t.datetime,
    );

    if (timestampedTransfers.length === 0) {
      return [];
    }

    const hourlyData = new Map<
      string,
      {
        timestamp: number;
        datetime: Date;
        volume: number;
        transaction_count: number;
        participants: Set<string>;
      }
    >();

    timestampedTransfers.forEach((transfer) => {
      const hour = new Date(transfer.datetime!);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();

      const existing = hourlyData.get(hourKey) || {
        timestamp: Math.floor(hour.getTime() / 1000),
        datetime: hour,
        volume: 0,
        transaction_count: 0,
        participants: new Set<string>(),
      };

      existing.volume += transfer.value_pyusd;
      existing.transaction_count += 1;
      existing.participants.add(transfer.from);
      existing.participants.add(transfer.to);

      hourlyData.set(hourKey, existing);
    });

    const timeSeries: TimeSeriesData[] = Array.from(hourlyData.values())
      .map((data) => ({
        timestamp: data.timestamp,
        datetime: data.datetime,
        hour: data.datetime,
        volume: data.volume,
        transaction_count: data.transaction_count,
        unique_participants: data.participants.size,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return timeSeries;
  }

  static createDistributionBuckets(
    transfers: ParsedTransferLog[],
    bucketCount: number = ANALYSIS_CONFIG.distribution_buckets,
  ): DistributionBucket[] {
    if (transfers.length === 0) return [];

    const values = transfers.map((t) => t.value_pyusd).sort((a, b) => a - b);
    const minValue = values[0];
    const maxValue = values[values.length - 1];

    if (minValue === maxValue) {
      return [
        {
          min_value: minValue,
          max_value: maxValue,
          count: values.length,
          percentage: 100,
          cumulative_percentage: 100,
        },
      ];
    }

    const bucketSize = (maxValue - minValue) / bucketCount;
    const buckets: DistributionBucket[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = minValue + i * bucketSize;
      const bucketMax =
        i === bucketCount - 1 ? maxValue : minValue + (i + 1) * bucketSize;

      const count = values.filter(
        (v) => v >= bucketMin && v <= bucketMax,
      ).length;
      const percentage = (count / values.length) * 100;

      buckets.push({
        min_value: bucketMin,
        max_value: bucketMax,
        count,
        percentage,
        cumulative_percentage: 0,
      });
    }

    let cumulative = 0;
    buckets.forEach((bucket) => {
      cumulative += bucket.percentage;
      bucket.cumulative_percentage = cumulative;
    });

    return buckets;
  }

  static analyzeNetwork(transfers: ParsedTransferLog[]) {
    const allAddresses = new Set<string>();
    const senders = new Set<string>();
    const receivers = new Set<string>();
    const addressConnections = new Map<string, Set<string>>();

    transfers.forEach((transfer) => {
      allAddresses.add(transfer.from);
      allAddresses.add(transfer.to);
      senders.add(transfer.from);
      receivers.add(transfer.to);

      if (!addressConnections.has(transfer.from)) {
        addressConnections.set(transfer.from, new Set());
      }
      if (!addressConnections.has(transfer.to)) {
        addressConnections.set(transfer.to, new Set());
      }

      addressConnections.get(transfer.from)!.add(transfer.to);
      addressConnections.get(transfer.to)!.add(transfer.from);
    });

    const bidirectionalAddresses = new Set<string>();
    senders.forEach((sender) => {
      if (receivers.has(sender)) {
        bidirectionalAddresses.add(sender);
      }
    });

    const hubThreshold = Math.max(5, Math.floor(allAddresses.size * 0.1));
    const hubAddresses = Array.from(addressConnections.entries())
      .filter(([_, connections]) => connections.size >= hubThreshold)
      .sort(([_, a], [__, b]) => b.size - a.size)
      .slice(0, 10)
      .map(([address, _]) => address);

    return {
      total_unique_addresses: allAddresses.size,
      sender_only_addresses: senders.size - bidirectionalAddresses.size,
      receiver_only_addresses: receivers.size - bidirectionalAddresses.size,
      bidirectional_addresses: bidirectionalAddresses.size,
      hub_addresses: hubAddresses,
    };
  }
}
