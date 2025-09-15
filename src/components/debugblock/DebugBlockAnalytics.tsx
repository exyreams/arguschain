import React from "react";
import { BlockInfo, ProcessedDebugBlockData } from "@/lib/debugblock/types";
import { DebugBlockUtils } from "@/lib/debugblock";

interface DebugBlockAnalyticsProps {
  blockIdentifier: string;
  data: ProcessedDebugBlockData;
  blockInfo: BlockInfo;
  loading: boolean;
  className?: string;
}

export const DebugBlockAnalytics: React.FC<DebugBlockAnalyticsProps> = ({
  blockIdentifier,
  data,
  blockInfo,
  loading,
  className = "",
}) => {
  if (loading) {
    return (
      <div
        className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-8 ${className}`}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const {
    summary,
    transactions,
    pyusdTransfers,
    internalTransactions,
    functionCategories,
  } = data;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Block Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Block Number:</span>
            <div className="text-white font-mono">
              {blockInfo.number.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Timestamp:</span>
            <div className="text-white">
              {DebugBlockUtils.formatTimestamp(blockInfo.timestamp)}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Transactions:</span>
            <div className="text-white">
              {blockInfo.transactionCount.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Gas Used:</span>
            <div className="text-white">
              {DebugBlockUtils.formatGasValue(parseInt(blockInfo.gasUsed, 16))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Debug Trace Analysis Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-600/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {summary.total_transactions}
            </div>
            <div className="text-sm text-gray-300">Total Transactions</div>
          </div>
          <div className="bg-green-600/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {summary.pyusd_interactions_count}
            </div>
            <div className="text-sm text-gray-300">PYUSD Interactions</div>
          </div>
          <div className="bg-yellow-600/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {DebugBlockUtils.formatGasValue(summary.total_gas_used)}
            </div>
            <div className="text-sm text-gray-300">Total Gas Used</div>
          </div>
          <div className="bg-red-600/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">
              {summary.failed_traces_count}
            </div>
            <div className="text-sm text-gray-300">Failed Traces</div>
          </div>
        </div>
      </div>

      {summary.pyusd_interactions_count > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            PYUSD Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {summary.pyusd_transfer_count}
              </div>
              <div className="text-sm text-gray-300">Transfers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {summary.pyusd_mint_count}
              </div>
              <div className="text-sm text-gray-300">Mints</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {summary.pyusd_burn_count}
              </div>
              <div className="text-sm text-gray-300">Burns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {summary.pyusd_volume_formatted}
              </div>
              <div className="text-sm text-gray-300">Total Volume</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-3">
              Function Categories
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(functionCategories).map(([category, count]) => {
                if (count === 0) return null;
                const percentage =
                  (count / summary.pyusd_interactions_count) * 100;
                return (
                  <div key={category} className="bg-gray-700/50 rounded p-3">
                    <div className="text-sm font-medium text-white capitalize">
                      {category.replace("_", " ")}
                    </div>
                    <div className="text-lg font-bold text-blue-400">
                      {count}
                    </div>
                    <div className="text-xs text-gray-400">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Transaction Details
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-300">Index</th>
                <th className="text-left py-2 text-gray-300">From</th>
                <th className="text-left py-2 text-gray-300">To</th>
                <th className="text-left py-2 text-gray-300">Gas Used</th>
                <th className="text-left py-2 text-gray-300">PYUSD</th>
                <th className="text-left py-2 text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 20).map((tx) => (
                <tr key={tx.tx_index} className="border-b border-gray-700/50">
                  <td className="py-2 text-gray-300">{tx.tx_index}</td>
                  <td className="py-2 text-gray-300 font-mono text-xs">
                    {DebugBlockUtils.shortenAddress(tx.from)}
                  </td>
                  <td className="py-2 text-gray-300 font-mono text-xs">
                    {DebugBlockUtils.shortenAddress(tx.to)}
                  </td>
                  <td className="py-2 text-gray-300">
                    {DebugBlockUtils.formatGasValue(tx.gas_used)}
                  </td>
                  <td className="py-2">
                    {tx.pyusd_interaction ? (
                      <span className="text-green-400 text-xs bg-green-600/20 px-2 py-1 rounded">
                        {tx.pyusd_function || "Yes"}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        tx.failed
                          ? "text-red-400 bg-red-600/20"
                          : "text-green-400 bg-green-600/20"
                      }`}
                    >
                      {tx.failed ? "Failed" : "Success"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length > 20 && (
            <div className="text-center py-4 text-gray-400">
              Showing 20 of {transactions.length} transactions
            </div>
          )}
        </div>
      </div>

      {internalTransactions.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Internal PYUSD Transactions ({internalTransactions.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-300">From</th>
                  <th className="text-left py-2 text-gray-300">To Contract</th>
                  <th className="text-left py-2 text-gray-300">Function</th>
                  <th className="text-left py-2 text-gray-300">Gas Used</th>
                  <th className="text-left py-2 text-gray-300">Depth</th>
                </tr>
              </thead>
              <tbody>
                {internalTransactions.slice(0, 10).map((tx, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-2 text-gray-300 font-mono text-xs">
                      {DebugBlockUtils.shortenAddress(tx.from)}
                    </td>
                    <td className="py-2 text-blue-400">{tx.to_contract}</td>
                    <td className="py-2 text-green-400">{tx.function}</td>
                    <td className="py-2 text-gray-300">
                      {DebugBlockUtils.formatGasValue(tx.gas_used)}
                    </td>
                    <td className="py-2 text-gray-300">{tx.depth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {internalTransactions.length > 10 && (
              <div className="text-center py-4 text-gray-400">
                Showing 10 of {internalTransactions.length} internal
                transactions
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Export Options
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const csvData = DebugBlockUtils.exportToCSV(
                {
                  summary,
                  transactions,
                  pyusd_transfers: pyusdTransfers,
                  internal_transactions: internalTransactions,
                  function_categories: functionCategories,
                },
                { format: "csv" },
              );

              const blob = DebugBlockUtils.createDownloadBlob(
                csvData,
                "text/csv",
              );
              const filename = DebugBlockUtils.generateFilename(
                "debug_block_trace",
                "csv",
                blockIdentifier,
              );
              DebugBlockUtils.triggerDownload(blob, filename);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              const jsonData = DebugBlockUtils.exportToJSON(
                {
                  summary,
                  transactions,
                  pyusd_transfers: pyusdTransfers,
                  internal_transactions: internalTransactions,
                  function_categories: functionCategories,
                },
                { format: "json" },
              );

              const blob = DebugBlockUtils.createDownloadBlob(
                jsonData,
                "application/json",
              );
              const filename = DebugBlockUtils.generateFilename(
                "debug_block_trace",
                "json",
                blockIdentifier,
              );
              DebugBlockUtils.triggerDownload(blob, filename);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={() => {
              const pyusdOnlyData = DebugBlockUtils.exportToCSV(
                {
                  summary,
                  transactions,
                  pyusd_transfers: pyusdTransfers,
                  internal_transactions: internalTransactions,
                  function_categories: functionCategories,
                },
                { format: "csv", filter_pyusd_only: true },
              );

              const blob = DebugBlockUtils.createDownloadBlob(
                pyusdOnlyData,
                "text/csv",
              );
              const filename = DebugBlockUtils.generateFilename(
                "debug_block_trace_pyusd_only",
                "csv",
                blockIdentifier,
              );
              DebugBlockUtils.triggerDownload(blob, filename);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Export PYUSD Only
          </button>
        </div>
      </div>
    </div>
  );
};
