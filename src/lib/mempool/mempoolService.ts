import { EthApi, TxPoolApi } from "./api";
import { CongestionProcessor, PyusdProcessor } from "./processors";
import { RecentTransactionProcessor } from "@/lib/mempool/processors";
import { blockchainService } from "@/lib/blockchainService";
import type {
  MempoolError,
  NetworkComparison,
  NetworkConditions,
  PyusdAnalysis,
} from "./types";
import { DEFAULTS } from "./constants";

export class MempoolService {
  private txPoolApi: TxPoolApi;
  private ethApi: EthApi;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.txPoolApi = new TxPoolApi();
    this.ethApi = new EthApi();
  }

  private async ensureConnection(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeConnection();
    return this.initializationPromise;
  }

  private async initializeConnection(): Promise<void> {
    try {
      // Check if already connected
      if (blockchainService.isConnected()) {
        return;
      }

      // Try to connect to blockchain service
      const connected = await blockchainService.connect();
      if (!connected) {
        throw new Error("Failed to connect to any blockchain network");
      }

      console.log("Blockchain service connected successfully");
    } catch (error) {
      console.error("Failed to initialize blockchain connection:", error);
      throw error;
    }
  }

  async getNetworkConditions(
    network: string = "mainnet"
  ): Promise<NetworkConditions> {
    try {
      // Ensure blockchain connection is established
      await this.ensureConnection();

      const [txPoolStatus, baseFee] = await Promise.allSettled([
        this.txPoolApi.getTxPoolStatus(network),
        this.ethApi.getBaseFee(),
      ]);

      if (txPoolStatus.status === "rejected") {
        throw new Error(
          `Failed to get transaction pool status: ${txPoolStatus.reason}`
        );
      }

      const currentBaseFee =
        baseFee.status === "fulfilled" ? baseFee.value : DEFAULTS.BASE_FEE_GWEI;

      const congestionAnalysis = CongestionProcessor.analyzeCongestion(
        txPoolStatus.value
      );

      const gasRecommendations = CongestionProcessor.generateGasRecommendations(
        currentBaseFee,
        congestionAnalysis
      );

      return {
        network,
        txPoolStatus: txPoolStatus.value,
        congestionAnalysis,
        baseFee: currentBaseFee,
        gasRecommendations,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      throw this.handleError(error, "getNetworkConditions");
    }
  }

  async compareNetworks(
    networks: string[] = ["mainnet", "sepolia"]
  ): Promise<NetworkComparison> {
    try {
      const networkPromises = networks.map((network) =>
        this.getNetworkConditions(network).catch((error) => {
          console.warn(`Failed to get conditions for ${network}:`, error);
          return null;
        })
      );

      const results = await Promise.all(networkPromises);

      const validNetworks = results.filter(
        (result): result is NetworkConditions => result !== null
      );

      if (validNetworks.length === 0) {
        throw new Error("Failed to get conditions for any network");
      }

      const txPoolStatuses = validNetworks.map(
        (network) => network.txPoolStatus
      );

      const comparisonMetrics =
        CongestionProcessor.compareNetworkCongestion(txPoolStatuses);

      return {
        networks: validNetworks,
        comparison: {
          ...comparisonMetrics,
          recommendations: this.generateNetworkRecommendations(validNetworks),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      throw this.handleError(error, "compareNetworks");
    }
  }

  async analyzePyusdTransactions(
    network: string = "mainnet",
    pendingOnly: boolean = true
  ): Promise<PyusdAnalysis> {
    try {
      // Ensure blockchain connection is established
      await this.ensureConnection();

      try {
        const txPoolContent = await this.txPoolApi.getTxPoolContent(network);

        const pyusdAnalysis = PyusdProcessor.analyzePyusdTransactions(
          txPoolContent,
          network,
          pendingOnly
        );

        return pyusdAnalysis;
      } catch (txPoolError) {
        console.warn(
          "txpool_content not available, falling back to recent transaction analysis:",
          txPoolError
        );

        const recentAnalysis =
          await RecentTransactionProcessor.analyzeRecentPyusdTransactions(
            network,
            5
          );

        return recentAnalysis;
      }
    } catch (error) {
      throw this.handleError(error, "analyzePyusdTransactions");
    }
  }

  async checkMethodAvailability(): Promise<{
    txpool_status: boolean;
    txpool_content: boolean;
    errors: string[];
    recommendations: string[];
  }> {
    try {
      // Ensure blockchain connection is established
      await this.ensureConnection();

      const availability =
        await this.txPoolApi.checkTxPoolMethodsAvailability();

      const recommendations: string[] = [];

      if (!availability.txpool_status) {
        recommendations.push(
          "txpool_status is not available. Consider using a debug-enabled RPC endpoint."
        );
      }

      if (!availability.txpool_content) {
        recommendations.push(
          "txpool_content is not available. This method is often restricted due to high cost."
        );
      }

      if (availability.txpool_status && !availability.txpool_content) {
        recommendations.push(
          "Basic mempool monitoring is available, but detailed transaction analysis is limited."
        );
      }

      return {
        ...availability,
        recommendations,
      };
    } catch (error) {
      throw this.handleError(error, "checkMethodAvailability");
    }
  }

  async getNetworkInfo(network: string = "mainnet"): Promise<{
    chainId: number;
    blockNumber: number;
    baseFee: number;
    gasPrice: number;
    blockTime: number;
    isConnected: boolean;
  }> {
    try {
      // Ensure blockchain connection is established
      await this.ensureConnection();

      const [networkInfo, isConnected] = await Promise.all([
        this.ethApi.getNetworkInfo(),
        this.ethApi.checkConnection(),
      ]);

      return {
        ...networkInfo,
        isConnected,
      };
    } catch (error) {
      throw this.handleError(error, "getNetworkInfo");
    }
  }

  private generateNetworkRecommendations(
    networks: NetworkConditions[]
  ): string[] {
    const recommendations: string[] = [];

    const leastCongested = networks.reduce((min, network) =>
      network.txPoolStatus.pending < min.txPoolStatus.pending ? network : min
    );

    const mostCongested = networks.reduce((max, network) =>
      network.txPoolStatus.pending > max.txPoolStatus.pending ? network : max
    );

    if (networks.length > 1) {
      recommendations.push(
        `${leastCongested.network} has the lowest congestion (${leastCongested.txPoolStatus.pending.toLocaleString()} pending transactions)`
      );

      if (
        mostCongested.congestionAnalysis.level === "high" ||
        mostCongested.congestionAnalysis.level === "extreme"
      ) {
        recommendations.push(
          `Avoid ${mostCongested.network} for non-urgent transactions due to high congestion`
        );
      }

      const congestionDifference =
        mostCongested.txPoolStatus.pending -
        leastCongested.txPoolStatus.pending;
      if (congestionDifference > 5000) {
        recommendations.push(
          "Consider using less congested networks for cost-sensitive transactions"
        );
      }
    }

    const averageCongestion =
      networks.reduce(
        (sum, network) => sum + network.congestionAnalysis.factor,
        0
      ) / networks.length;

    if (averageCongestion > 0.7) {
      recommendations.push(
        "High congestion across networks - consider delaying non-urgent transactions"
      );
    } else if (averageCongestion < 0.3) {
      recommendations.push(
        "Low congestion across networks - good time for batch transactions"
      );
    }

    return recommendations;
  }

  private handleError(error: unknown, operation: string): MempoolError {
    if (error instanceof Error) {
      let type: MempoolError["type"] = "network_error";
      let recoverable = true;

      if (
        error.message.includes("method not found") ||
        error.message.includes("not available")
      ) {
        type = "rpc_error";
        recoverable = false;
      } else if (
        error.message.includes("rate limit") ||
        error.message.includes("too many requests")
      ) {
        type = "rate_limit";
        recoverable = true;
      } else if (
        error.message.includes("invalid") ||
        error.message.includes("validation")
      ) {
        type = "validation_error";
        recoverable = false;
      }

      return {
        type,
        message: error.message,
        details: `Error in ${operation}`,
        recoverable,
        retryAction: recoverable
          ? () => this[operation as keyof this]
          : undefined,
      };
    }

    return {
      type: "network_error",
      message: "Unknown error occurred",
      details: `Unknown error in ${operation}`,
      recoverable: true,
    };
  }
}
