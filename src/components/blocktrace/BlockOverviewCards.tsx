import React from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  Flame,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { formatGas } from "@/lib/config";

interface BlockOverviewCardsProps {
  blockData: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalGasUsed: string;
    averageGasPerTx: string;
    pyusdTransactions: number;
    pyusdVolume: string;
    blockNumber?: number;
    timestamp?: number;
    gasLimit?: string;
    baseFeePerGas?: string;
  };
}

export const BlockOverviewCards: React.FC<BlockOverviewCardsProps> = ({
  blockData,
}) => {
  const successRate =
    blockData.totalTransactions > 0
      ? (
          (blockData.successfulTransactions / blockData.totalTransactions) *
          100
        ).toFixed(1)
      : "0";

  const gasUtilization = blockData.gasLimit
    ? (
        (parseFloat(blockData.totalGasUsed.replace(/,/g, "")) /
          parseFloat(blockData.gasLimit.replace(/,/g, ""))) *
        100
      ).toFixed(1)
    : "0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 hover:border-[rgba(0,191,255,0.4)] transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#00bfff]" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              Total Transactions
            </span>
          </div>
          <div className="text-xs text-[#00bfff] bg-[rgba(0,191,255,0.1)] px-2 py-1 rounded">
            {successRate}% success
          </div>
        </div>
        <div className="text-3xl font-bold text-[#00bfff] mb-2">
          {blockData.totalTransactions.toLocaleString()}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[#10b981]" />
            <span className="text-xs text-[#8b9dc3]">
              {blockData.successfulTransactions} successful
            </span>
          </div>
          {blockData.failedTransactions > 0 && (
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-[#ef4444]" />
              <span className="text-xs text-[#ef4444]">
                {blockData.failedTransactions} failed
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(255,107,53,0.2)] rounded-lg p-6 hover:border-[rgba(255,107,53,0.4)] transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#ff6b35]" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              Gas Usage
            </span>
          </div>
          <div className="text-xs text-[#ff6b35] bg-[rgba(255,107,53,0.1)] px-2 py-1 rounded">
            {gasUtilization}% utilized
          </div>
        </div>
        <div className="text-3xl font-bold text-[#ff6b35] mb-2">
          {formatGas(blockData.totalGasUsed)}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#10b981]" />
            <span className="text-xs text-[#8b9dc3]">
              Avg: {formatGas(blockData.averageGasPerTx)}
            </span>
          </div>
          {blockData.baseFeePerGas && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-[#f59e0b]" />
              <span className="text-xs text-[#f59e0b]">
                {parseFloat(blockData.baseFeePerGas).toFixed(1)} gwei
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(139,92,246,0.2)] rounded-lg p-6 hover:border-[rgba(139,92,246,0.4)] transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#8b5cf6]" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              PYUSD Activity
            </span>
          </div>
          {blockData.pyusdTransactions > 0 && (
            <div className="text-xs text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] px-2 py-1 rounded">
              {(
                (blockData.pyusdTransactions / blockData.totalTransactions) *
                100
              ).toFixed(1)}
              %
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-[#8b5cf6] mb-2">
          {blockData.pyusdTransactions}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b9dc3]">
              Volume: ${blockData.pyusdVolume}
            </span>
          </div>
          {blockData.pyusdTransactions === 0 && (
            <span className="text-xs text-[#6b7280]">No activity</span>
          )}
        </div>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(16,185,129,0.2)] rounded-lg p-6 hover:border-[rgba(16,185,129,0.4)] transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#10b981]" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              Block Info
            </span>
          </div>
          {blockData.blockNumber && (
            <div className="text-xs text-[#10b981] bg-[rgba(16,185,129,0.1)] px-2 py-1 rounded">
              #{blockData.blockNumber.toLocaleString()}
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-[#10b981] mb-2">
          {blockData.timestamp
            ? new Date(blockData.timestamp * 1000).toLocaleTimeString()
            : "N/A"}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b9dc3]">
              {blockData.timestamp
                ? new Date(blockData.timestamp * 1000).toLocaleDateString()
                : "Unknown date"}
            </span>
          </div>
          {blockData.gasLimit && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#8b9dc3]">
                Limit: {formatGas(blockData.gasLimit)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
