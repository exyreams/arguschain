import React, { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Eye,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge, Button } from "@/components/global";
import { formatGas, shortenAddress } from "@/lib/config";

interface OverviewSectionProps {
  blockData: {
    blockNumber: number;
    blockHash: string;
    timestamp: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageGasPerTx: string;
    totalGasUsed: string;
    pyusdVolume: string;
    pyusdTransactions?: number;
    gasLimit?: string;
    baseFeePerGas?: string;
    difficulty?: string;
    size?: number;
    miner?: string;
  };
  selectedNetwork: "mainnet" | "sepolia";
  analysisMetrics?: {
    executionTime: number;
    cacheHitRate: number;
    processingSteps: number;
    dataQuality: "excellent" | "good" | "fair" | "poor";
  };
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  blockData,
  selectedNetwork,
  analysisMetrics,
}) => {
  const blockInsights = useMemo(() => {
    const insights = [];
    const successRate =
      (blockData.successfulTransactions / blockData.totalTransactions) * 100;

    if (successRate < 90) {
      insights.push({
        type: "warning",
        message: `Lower than average success rate (${successRate.toFixed(1)}%)`,
        icon: AlertTriangle,
        color: "text-[#f59e0b]",
      });
    } else if (successRate >= 98) {
      insights.push({
        type: "success",
        message: `Excellent success rate (${successRate.toFixed(1)}%)`,
        icon: CheckCircle,
        color: "text-[#10b981]",
      });
    }

    if (blockData.pyusdTransactions && blockData.pyusdTransactions > 0) {
      const pyusdPercentage =
        (blockData.pyusdTransactions / blockData.totalTransactions) * 100;
      insights.push({
        type: "info",
        message: `${pyusdPercentage.toFixed(1)}% of transactions are PYUSD-related`,
        icon: Target,
        color: "text-[#8b5cf6]",
      });
    }

    const avgGas = parseInt(blockData.averageGasPerTx.replace(/,/g, ""));
    if (avgGas > 200000) {
      insights.push({
        type: "info",
        message: "High average gas usage indicates complex transactions",
        icon: Zap,
        color: "text-[#00bfff]",
      });
    }

    return insights;
  }, [blockData]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getNetworkColor = (network: string) => {
    return network === "mainnet"
      ? "text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]"
      : "text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]";
  };

  const getDataQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "text-[#10b981] bg-[rgba(16,185,129,0.1)]";
      case "good":
        return "text-[#00bfff] bg-[rgba(0,191,255,0.1)]";
      case "fair":
        return "text-[#f59e0b] bg-[rgba(245,158,11,0.1)]";
      case "poor":
        return "text-[#ef4444] bg-[rgba(239,68,68,0.1)]";
      default:
        return "text-[#8b9dc3] bg-[rgba(139,157,195,0.1)]";
    }
  };

  return (
    <div className="space-y-6">
      {blockInsights.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Block Insights
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blockInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]"
              >
                <insight.icon className={`h-4 w-4 mt-0.5 ${insight.color}`} />
                <span className="text-sm text-[#8b9dc3]">
                  {insight.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#00bfff]" />
              <h3 className="text-lg font-semibold text-[#00bfff]">
                Block Information
              </h3>
            </div>
            <Badge className={`text-xs ${getNetworkColor(selectedNetwork)}`}>
              {selectedNetwork === "mainnet" ? "Mainnet" : "Sepolia Testnet"}
            </Badge>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <span className="text-[#8b9dc3]">Block Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#00bfff] text-lg">
                  #{blockData.blockNumber.toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(blockData.blockNumber.toString())
                  }
                  className="h-6 w-6 p-0 text-[#8b9dc3] hover:text-[#00bfff]"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <span className="text-[#8b9dc3]">Block Hash:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#8b9dc3]">
                  {shortenAddress(blockData.blockHash)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(blockData.blockHash)}
                  className="h-6 w-6 p-0 text-[#8b9dc3] hover:text-[#00bfff]"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#8b9dc3] hover:text-[#00bfff]"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <span className="text-[#8b9dc3]">Timestamp:</span>
              <div className="text-right">
                <div className="text-[#8b9dc3]">
                  {new Date(blockData.timestamp * 1000).toLocaleString()}
                </div>
                <div className="text-xs text-[#6b7280]">
                  {Math.floor(
                    (Date.now() - blockData.timestamp * 1000) / 1000 / 60,
                  )}{" "}
                  minutes ago
                </div>
              </div>
            </div>

            {blockData.miner && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
                <span className="text-[#8b9dc3]">Miner:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#8b9dc3]">
                    {shortenAddress(blockData.miner)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(blockData.miner)}
                    className="h-6 w-6 p-0 text-[#8b9dc3] hover:text-[#00bfff]"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {blockData.size && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
                <span className="text-[#8b9dc3]">Block Size:</span>
                <span className="text-[#8b9dc3]">
                  {(blockData.size / 1024).toFixed(2)} KB
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Transaction Statistics
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <span className="text-[#8b9dc3]">Success Rate:</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-[rgba(0,191,255,0.2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#10b981] rounded-full transition-all duration-500"
                    style={{
                      width: `${(blockData.successfulTransactions / blockData.totalTransactions) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[#10b981] font-medium">
                  {(
                    (blockData.successfulTransactions /
                      blockData.totalTransactions) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <span className="text-[#8b9dc3]">Gas Utilization:</span>
              <div className="text-right">
                <div className="font-mono text-[#ff6b35]">
                  {formatGas(blockData.totalGasUsed)}
                </div>
                <div className="text-xs text-[#8b9dc3]">
                  Avg: {formatGas(blockData.averageGasPerTx)}
                </div>
              </div>
            </div>

            {blockData.baseFeePerGas && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
                <span className="text-[#8b9dc3]">Base Fee:</span>
                <span className="text-[#f59e0b] font-medium">
                  {parseFloat(blockData.baseFeePerGas).toFixed(2)} gwei
                </span>
              </div>
            )}

            <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <span className="text-[#8b9dc3]">PYUSD Activity:</span>
              <div className="text-right">
                <div className="text-[#8b5cf6] font-medium">
                  ${blockData.pyusdVolume}
                </div>
                {blockData.pyusdTransactions && (
                  <div className="text-xs text-[#8b9dc3]">
                    {blockData.pyusdTransactions} transactions
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <span className="text-[#8b9dc3]">Failed Transactions:</span>
              <div className="flex items-center gap-2">
                <span className="text-[#ef4444] font-medium">
                  {blockData.failedTransactions}
                </span>
                <span className="text-xs text-[#8b9dc3]">
                  (
                  {(
                    (blockData.failedTransactions /
                      blockData.totalTransactions) *
                    100
                  ).toFixed(1)}
                  %)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {analysisMetrics && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Analysis Performance
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3]">Execution Time</span>
              </div>
              <div className="text-xl font-bold text-[#00bfff]">
                {analysisMetrics.executionTime.toFixed(2)}s
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-[#10b981]" />
                <span className="text-sm text-[#8b9dc3]">Cache Hit Rate</span>
              </div>
              <div className="text-xl font-bold text-[#10b981]">
                {(analysisMetrics.cacheHitRate * 100).toFixed(1)}%
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-[#8b5cf6]" />
                <span className="text-sm text-[#8b9dc3]">Processing Steps</span>
              </div>
              <div className="text-xl font-bold text-[#8b5cf6]">
                {analysisMetrics.processingSteps}
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-[#f59e0b]" />
                <span className="text-sm text-[#8b9dc3]">Data Quality</span>
              </div>
              <div
                className={`text-xl font-bold capitalize ${getDataQualityColor(analysisMetrics.dataQuality).split(" ")[0]}`}
              >
                {analysisMetrics.dataQuality}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
