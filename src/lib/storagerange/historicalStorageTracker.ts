import { ethers } from "ethers";

export interface HistoricalStorageData {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  datetime: Date;
  slot: string;
  valueHex: string;
  valueInt: number;
  formattedValue: string;
  valueType: "uint256" | "address" | "bool" | "string" | "bytes" | "unknown";
}

export interface HistoricalChangeEvent {
  blockNumber: number;
  timestamp: number;
  changeType: "increase" | "decrease" | "set" | "clear";
  magnitude: number;
  description: string;
  previousValue: string;
  newValue: string;
}

export interface HistoricalStatistics {
  minValue: number;
  maxValue: number;
  averageValue: number;
  volatility: number;
  totalChanges: number;
  changeFrequency: number;
  trend: "increasing" | "decreasing" | "stable" | "volatile";
  trendStrength: number;
}

export interface HistoricalAnalysis {
  slot: string;
  dataPoints: HistoricalStorageData[];
  changeEvents: HistoricalChangeEvent[];
  statistics: HistoricalStatistics;
  interpretation: string;
  category:
    | "supply"
    | "balance"
    | "proxy"
    | "access_control"
    | "metadata"
    | "unknown";
}

export interface HistoricalTrackingRequest {
  contractAddress: string;
  slot: string;
  blockNumbers: number[];
  includeTimestamps?: boolean;
  formatValues?: boolean;
}

export class HistoricalStorageTracker {
  private provider: ethers.JsonRpcProvider;
  private cache: Map<string, HistoricalStorageData> = new Map();

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  async trackStorageHistory(
    request: HistoricalTrackingRequest,
  ): Promise<HistoricalAnalysis> {
    const {
      contractAddress,
      slot,
      blockNumbers,
      includeTimestamps = true,
      formatValues = true,
    } = request;

    const dataPoints = await this.retrieveHistoricalData(
      contractAddress,
      slot,
      blockNumbers,
      includeTimestamps,
      formatValues,
    );

    const changeEvents = this.detectChangeEvents(dataPoints);

    const statistics = this.calculateStatistics(dataPoints, changeEvents);

    const category = this.categorizeSlot(slot, dataPoints);
    const interpretation = this.generateInterpretation(
      slot,
      dataPoints,
      statistics,
      category,
    );

    return {
      slot,
      dataPoints,
      changeEvents,
      statistics,
      interpretation,
      category,
    };
  }

  private async retrieveHistoricalData(
    contractAddress: string,
    slot: string,
    blockNumbers: number[],
    includeTimestamps: boolean,
    formatValues: boolean,
  ): Promise<HistoricalStorageData[]> {
    const dataPoints: HistoricalStorageData[] = [];

    for (const blockNumber of blockNumbers.sort((a, b) => a - b)) {
      try {
        const cacheKey = `${contractAddress}-${slot}-${blockNumber}`;

        if (this.cache.has(cacheKey)) {
          dataPoints.push(this.cache.get(cacheKey)!);
          continue;
        }

        const block = await this.provider.getBlock(blockNumber);
        if (!block) {
          console.warn(`Block ${blockNumber} not found`);
          continue;
        }

        const valueHex = await this.provider.getStorage(
          contractAddress,
          slot,
          blockNumber,
        );
        const valueInt = parseInt(valueHex, 16);

        let formattedValue = valueHex;
        let valueType: HistoricalStorageData["valueType"] = "unknown";

        if (formatValues) {
          const formatted = this.formatStorageValue(valueHex, slot);
          formattedValue = formatted.value;
          valueType = formatted.type;
        }

        const dataPoint: HistoricalStorageData = {
          blockNumber,
          blockHash: block.hash,
          timestamp: block.timestamp,
          datetime: new Date(block.timestamp * 1000),
          slot,
          valueHex,
          valueInt,
          formattedValue,
          valueType,
        };

        this.cache.set(cacheKey, dataPoint);
        dataPoints.push(dataPoint);

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error(
          `Error retrieving storage for block ${blockNumber}:`,
          error,
        );
      }
    }

    return dataPoints;
  }

  private detectChangeEvents(
    dataPoints: HistoricalStorageData[],
  ): HistoricalChangeEvent[] {
    const events: HistoricalChangeEvent[] = [];

    for (let i = 1; i < dataPoints.length; i++) {
      const previous = dataPoints[i - 1];
      const current = dataPoints[i];

      if (previous.valueHex !== current.valueHex) {
        const previousInt = previous.valueInt;
        const currentInt = current.valueInt;
        const magnitude = Math.abs(currentInt - previousInt);

        let changeType: HistoricalChangeEvent["changeType"];
        let description: string;

        if (previousInt === 0 && currentInt > 0) {
          changeType = "set";
          description = `Value set from 0 to ${current.formattedValue}`;
        } else if (previousInt > 0 && currentInt === 0) {
          changeType = "clear";
          description = `Value cleared from ${previous.formattedValue} to 0`;
        } else if (currentInt > previousInt) {
          changeType = "increase";
          description = `Value increased by ${(magnitude / 1e6).toFixed(2)} (${(((currentInt - previousInt) / previousInt) * 100).toFixed(2)}%)`;
        } else {
          changeType = "decrease";
          description = `Value decreased by ${(magnitude / 1e6).toFixed(2)} (${(((previousInt - currentInt) / previousInt) * 100).toFixed(2)}%)`;
        }

        events.push({
          blockNumber: current.blockNumber,
          timestamp: current.timestamp,
          changeType,
          magnitude,
          description,
          previousValue: previous.formattedValue,
          newValue: current.formattedValue,
        });
      }
    }

    return events;
  }

  private calculateStatistics(
    dataPoints: HistoricalStorageData[],
    changeEvents: HistoricalChangeEvent[],
  ): HistoricalStatistics {
    if (dataPoints.length === 0) {
      return {
        minValue: 0,
        maxValue: 0,
        averageValue: 0,
        volatility: 0,
        totalChanges: 0,
        changeFrequency: 0,
        trend: "stable",
        trendStrength: 0,
      };
    }

    const values = dataPoints.map((dp) => dp.valueInt);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const averageValue =
      values.reduce((sum, val) => sum + val, 0) / values.length;

    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) /
      values.length;
    const volatility = Math.sqrt(variance);

    const blockRange =
      dataPoints.length > 1
        ? dataPoints[dataPoints.length - 1].blockNumber -
          dataPoints[0].blockNumber
        : 1;
    const changeFrequency = changeEvents.length / blockRange;

    const { trend, trendStrength } = this.calculateTrend(dataPoints);

    return {
      minValue,
      maxValue,
      averageValue,
      volatility,
      totalChanges: changeEvents.length,
      changeFrequency,
      trend,
      trendStrength,
    };
  }

  private calculateTrend(dataPoints: HistoricalStorageData[]): {
    trend: HistoricalStatistics["trend"];
    trendStrength: number;
  } {
    if (dataPoints.length < 2) {
      return { trend: "stable", trendStrength: 0 };
    }

    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map((dp) => dp.valueInt);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssRes = y.reduce((sum, val, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const rSquared = 1 - ssRes / ssTotal;

    let trend: HistoricalStatistics["trend"];
    const slopeThreshold = (averageValue) => Math.abs(averageValue) * 0.01;
    const avgValue = sumY / n;

    if (Math.abs(slope) < slopeThreshold(avgValue)) {
      trend = "stable";
    } else if (slope > 0) {
      trend = "increasing";
    } else {
      trend = "decreasing";
    }

    const volatilityThreshold = 0.3;
    const coefficientOfVariation = Math.sqrt(ssTotal / n) / Math.abs(yMean);
    if (coefficientOfVariation > volatilityThreshold) {
      trend = "volatile";
    }

    return {
      trend,
      trendStrength: Math.max(0, Math.min(1, rSquared)),
    };
  }

  private formatStorageValue(
    valueHex: string,
    slot: string,
  ): { value: string; type: HistoricalStorageData["valueType"] } {
    const valueInt = parseInt(valueHex, 16);

    if (
      valueHex.length === 66 &&
      valueHex.startsWith("0x000000000000000000000000") &&
      valueInt > 0
    ) {
      const address = "0x" + valueHex.slice(26);
      return { value: address, type: "address" };
    }

    if (valueInt === 0 || valueInt === 1) {
      return { value: valueInt === 1 ? "true" : "false", type: "bool" };
    }

    if (valueInt > 1000000 && valueInt < 1e30) {
      const formatted = (valueInt / 1e6).toFixed(2);
      return { value: `${formatted} tokens`, type: "uint256" };
    }

    return { value: valueHex, type: "unknown" };
  }

  private categorizeSlot(
    slot: string,
    dataPoints: HistoricalStorageData[],
  ): HistoricalAnalysis["category"] {
    const slotInt = parseInt(slot, 16);

    if (slotInt === 2) return "supply";
    if (slotInt >= 3 && slotInt <= 10) return "metadata";

    if (
      slot ===
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    ) {
      return "proxy";
    }
    if (
      slot ===
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"
    ) {
      return "proxy";
    }

    const hasLargeValues = dataPoints.some((dp) => dp.valueInt > 1000000);
    const hasAddressValues = dataPoints.some(
      (dp) => dp.valueType === "address",
    );
    const hasBooleanValues = dataPoints.some((dp) => dp.valueType === "bool");

    if (hasLargeValues && !hasAddressValues) return "supply";
    if (hasAddressValues) return "access_control";
    if (hasBooleanValues) return "metadata";

    return "unknown";
  }

  private generateInterpretation(
    slot: string,
    dataPoints: HistoricalStorageData[],
    statistics: HistoricalStatistics,
    category: HistoricalAnalysis["category"],
  ): string {
    if (dataPoints.length === 0) {
      return "No historical data available for analysis.";
    }

    const firstValue = dataPoints[0];
    const lastValue = dataPoints[dataPoints.length - 1];
    const blockRange = lastValue.blockNumber - firstValue.blockNumber;

    let interpretation = `Storage slot ${slot.slice(0, 10)}... tracked across ${dataPoints.length} blocks (${blockRange} block range). `;

    switch (category) {
      case "supply":
        interpretation += `This appears to be a token supply slot. `;
        break;
      case "balance":
        interpretation += `This appears to be a balance mapping slot. `;
        break;
      case "proxy":
        interpretation += `This is a proxy configuration slot. `;
        break;
      case "access_control":
        interpretation += `This appears to be an access control slot. `;
        break;
      case "metadata":
        interpretation += `This appears to be a metadata slot. `;
        break;
      default:
        interpretation += `This is a general storage slot. `;
    }

    switch (statistics.trend) {
      case "increasing":
        interpretation += `The value shows an increasing trend (strength: ${(statistics.trendStrength * 100).toFixed(1)}%). `;
        break;
      case "decreasing":
        interpretation += `The value shows a decreasing trend (strength: ${(statistics.trendStrength * 100).toFixed(1)}%). `;
        break;
      case "volatile":
        interpretation += `The value is highly volatile with frequent changes. `;
        break;
      case "stable":
        interpretation += `The value remains relatively stable over time. `;
        break;
    }

    if (statistics.totalChanges > 0) {
      interpretation += `${statistics.totalChanges} changes detected with an average frequency of ${statistics.changeFrequency.toFixed(4)} changes per block. `;
    } else {
      interpretation += `No changes detected during the tracked period. `;
    }

    if (statistics.maxValue !== statistics.minValue) {
      interpretation += `Value range: ${(statistics.minValue / 1e6).toFixed(2)} to ${(statistics.maxValue / 1e6).toFixed(2)} tokens.`;
    }

    return interpretation;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
