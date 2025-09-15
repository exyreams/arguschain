import {
  BlockTransactionSummary,
  GasDistributionData,
  PyusdInternalTransaction,
} from "../types";
import { GasAnalysisResult } from "@/lib/debugblock";

export interface PlotlyChartData {
  data: any[];
  layout: any;
  config: any;
}

export interface GasVisualizationData {
  distributionHistogram: PlotlyChartData;
  categoryComparison: PlotlyChartData;
  gasEfficiencyScatter: PlotlyChartData;
  costAnalysisBar: PlotlyChartData;
  timeSeriesGas: PlotlyChartData;
  heatmapAnalysis: PlotlyChartData;
}

export interface GasReportData {
  executiveSummary: string;
  keyFindings: string[];
  detailedMetrics: Array<{
    category: string;
    metrics: Array<{ name: string; value: string; change?: string }>;
  }>;
  optimizationOpportunities: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
  }>;
  riskAssessment: Array<{
    risk: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }>;
}

export class GasVisualizationProcessor {
  static generateVisualizationData(
    analysis: GasAnalysisResult,
    transactions: BlockTransactionSummary[],
    internalTransactions: PyusdInternalTransaction[],
  ): GasVisualizationData {
    return {
      distributionHistogram: this.createGasDistributionHistogram(
        analysis.gasDistribution,
      ),
      categoryComparison: this.createCategoryComparisonChart(
        analysis.gasUsageByCategory,
      ),
      gasEfficiencyScatter: this.createGasEfficiencyScatter(transactions),
      costAnalysisBar: this.createCostAnalysisChart(analysis.costAnalysis),
      timeSeriesGas: this.createTimeSeriesChart(transactions),
      heatmapAnalysis: this.createGasHeatmap(
        transactions,
        internalTransactions,
      ),
    };
  }

  private static createGasDistributionHistogram(
    gasDistribution: GasDistributionData[],
  ): PlotlyChartData {
    const pyusdGas = gasDistribution
      .filter((d) => d.interaction_type === "PYUSD Transaction")
      .map((d) => d.gas_used);

    const otherGas = gasDistribution
      .filter((d) => d.interaction_type === "Other Transaction")
      .map((d) => d.gas_used);

    const data = [
      {
        x: pyusdGas,
        type: "histogram",
        name: "PYUSD Transactions",
        opacity: 0.7,
        marker: { color: "#4CAF50" },
        nbinsx: 30,
      },
      {
        x: otherGas,
        type: "histogram",
        name: "Other Transactions",
        opacity: 0.7,
        marker: { color: "#2196F3" },
        nbinsx: 30,
      },
    ];

    const layout = {
      title: {
        text: "Gas Usage Distribution",
        font: { size: 16, family: "Arial, sans-serif" },
      },
      xaxis: {
        title: "Gas Used",
        type: "log",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      yaxis: {
        title: "Number of Transactions",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      barmode: "overlay",
      showlegend: true,
      legend: { x: 0.7, y: 0.9 },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Arial, sans-serif", size: 12 },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["pan2d", "lasso2d"],
      displaylogo: false,
    };

    return { data, layout, config };
  }

  private static createCategoryComparisonChart(
    gasUsageByCategory: Map<
      string,
      { totalGas: number; avgGas: number; count: number }
    >,
  ): PlotlyChartData {
    const categories = Array.from(gasUsageByCategory.keys());
    const avgGasValues = categories.map(
      (cat) => gasUsageByCategory.get(cat)!.avgGas,
    );
    const totalGasValues = categories.map(
      (cat) => gasUsageByCategory.get(cat)!.totalGas,
    );
    const counts = categories.map((cat) => gasUsageByCategory.get(cat)!.count);

    const data = [
      {
        x: categories,
        y: avgGasValues,
        type: "bar",
        name: "Average Gas per Transaction",
        marker: { color: "#FF9800" },
        yaxis: "y",
      },
      {
        x: categories,
        y: totalGasValues,
        type: "bar",
        name: "Total Gas Used",
        marker: { color: "#9C27B0" },
        yaxis: "y2",
      },
    ];

    const layout = {
      title: {
        text: "Gas Usage by Transaction Category",
        font: { size: 16, family: "Arial, sans-serif" },
      },
      xaxis: {
        title: "Transaction Category",
        tickangle: -45,
      },
      yaxis: {
        title: "Average Gas per Transaction",
        side: "left",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      yaxis2: {
        title: "Total Gas Used",
        side: "right",
        overlaying: "y",
        showgrid: false,
      },
      showlegend: true,
      legend: { x: 0.02, y: 0.98 },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Arial, sans-serif", size: 12 },
      margin: { b: 120 },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    };

    return { data, layout, config };
  }

  private static createGasEfficiencyScatter(
    transactions: BlockTransactionSummary[],
  ): PlotlyChartData {
    const pyusdTxs = transactions.filter((tx) => tx.pyusd_interaction);
    const otherTxs = transactions.filter((tx) => !tx.pyusd_interaction);

    const data = [
      {
        x: pyusdTxs.map((tx) => tx.transfer_value || 0),
        y: pyusdTxs.map((tx) => tx.gas_used),
        mode: "markers",
        type: "scatter",
        name: "PYUSD Transactions",
        marker: {
          color: pyusdTxs.map((tx) => (tx.failed ? "#F44336" : "#4CAF50")),
          size: 8,
          opacity: 0.7,
        },
        text: pyusdTxs.map((tx) => `${tx.tx_hash.slice(0, 10)}...`),
        hovertemplate:
          "<b>%{text}</b><br>Value: %{x}<br>Gas: %{y}<extra></extra>",
      },
      {
        x: Array(otherTxs.length).fill(0),
        y: otherTxs.map((tx) => tx.gas_used),
        mode: "markers",
        type: "scatter",
        name: "Other Transactions",
        marker: {
          color: otherTxs.map((tx) => (tx.failed ? "#F44336" : "#2196F3")),
          size: 6,
          opacity: 0.5,
        },
        text: otherTxs.map((tx) => `${tx.tx_hash.slice(0, 10)}...`),
        hovertemplate: "<b>%{text}</b><br>Gas: %{y}<extra></extra>",
      },
    ];

    const layout = {
      title: {
        text: "Gas Efficiency vs Transaction Value",
        font: { size: 16, family: "Arial, sans-serif" },
      },
      xaxis: {
        title: "Transaction Value (PYUSD)",
        type: "log",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      yaxis: {
        title: "Gas Used",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      showlegend: true,
      legend: { x: 0.02, y: 0.98 },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Arial, sans-serif", size: 12 },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    };

    return { data, layout, config };
  }

  private static createCostAnalysisChart(costAnalysis: {
    totalCostWei: bigint;
    totalCostEth: number;
    averageCostPerTransaction: number;
    pyusdTransactionsCost: number;
    regularTransactionsCost: number;
  }): PlotlyChartData {
    const data = [
      {
        x: ["PYUSD Transactions", "Regular Transactions"],
        y: [
          costAnalysis.pyusdTransactionsCost,
          costAnalysis.regularTransactionsCost,
        ],
        type: "bar",
        marker: {
          color: ["#4CAF50", "#2196F3"],
        },
        text: [
          `${costAnalysis.pyusdTransactionsCost.toFixed(6)} ETH`,
          `${costAnalysis.regularTransactionsCost.toFixed(6)} ETH`,
        ],
        textposition: "auto",
      },
    ];

    const layout = {
      title: {
        text: "Transaction Cost Analysis",
        font: { size: 16, family: "Arial, sans-serif" },
      },
      xaxis: {
        title: "Transaction Type",
      },
      yaxis: {
        title: "Total Cost (ETH)",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      showlegend: false,
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Arial, sans-serif", size: 12 },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    };

    return { data, layout, config };
  }

  private static createTimeSeriesChart(
    transactions: BlockTransactionSummary[],
  ): PlotlyChartData {
    const indices = transactions.map((_, i) => i);
    const gasValues = transactions.map((tx) => tx.gas_used);
    const pyusdMask = transactions.map((tx) => tx.pyusd_interaction);

    const data = [
      {
        x: indices,
        y: gasValues,
        mode: "lines+markers",
        type: "scatter",
        name: "Gas Usage",
        line: { color: "#2196F3", width: 2 },
        marker: {
          color: pyusdMask.map((isPyusd) => (isPyusd ? "#4CAF50" : "#2196F3")),
          size: 6,
        },
      },
    ];

    const layout = {
      title: {
        text: "Gas Usage Over Transaction Sequence",
        font: { size: 16, family: "Arial, sans-serif" },
      },
      xaxis: {
        title: "Transaction Index",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      yaxis: {
        title: "Gas Used",
        showgrid: true,
        gridcolor: "#E0E0E0",
      },
      showlegend: false,
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Arial, sans-serif", size: 12 },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    };

    return { data, layout, config };
  }

  private static createGasHeatmap(
    transactions: BlockTransactionSummary[],
    internalTransactions: PyusdInternalTransaction[],
  ): PlotlyChartData {
    const functionTypes = [
      ...new Set(
        transactions
          .filter((tx) => tx.pyusd_function)
          .map((tx) => tx.pyusd_function!),
      ),
    ];

    const statusTypes = ["Success", "Failed"];

    const heatmapData: number[][] = [];
    const hoverText: string[][] = [];

    for (const status of statusTypes) {
      const row: number[] = [];
      const hoverRow: string[] = [];

      for (const func of functionTypes) {
        const txs = transactions.filter(
          (tx) =>
            tx.pyusd_function === func &&
            (status === "Success" ? !tx.failed : tx.failed),
        );

        const avgGas =
          txs.length > 0
            ? txs.reduce((sum, tx) => sum + tx.gas_used, 0) / txs.length
            : 0;

        row.push(avgGas);
        hoverRow.push(
          `${func} (${status})<br>Avg Gas: ${avgGas.toFixed(0)}<br>Count: ${txs.length}`,
        );
      }

      heatmapData.push(row);
      hoverText.push(hoverRow);
    }

    const data = [
      {
        z: heatmapData,
        x: functionTypes,
        y: statusTypes,
        type: "heatmap",
        colorscale: "Viridis",
        text: hoverText,
        hovertemplate: "%{text}<extra></extra>",
        showscale: true,
        colorbar: {
          title: "Average Gas Used",
        },
      },
    ];

    const layout = {
      title: {
        text: "Gas Usage Heatmap by Function and Status",
        font: { size: 16, family: "Arial, sans-serif" },
      },
      xaxis: {
        title: "PYUSD Function",
        tickangle: -45,
      },
      yaxis: {
        title: "Transaction Status",
      },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Arial, sans-serif", size: 12 },
      margin: { b: 120 },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
    };

    return { data, layout, config };
  }

  static generateGasReport(
    analysis: GasAnalysisResult,
    transactions: BlockTransactionSummary[],
    blockIdentifier: string,
  ): GasReportData {
    const executiveSummary = this.generateExecutiveSummary(
      analysis,
      transactions,
      blockIdentifier,
    );
    const keyFindings = this.generateKeyFindings(analysis, transactions);
    const detailedMetrics = this.generateDetailedMetrics(analysis);
    const optimizationOpportunities = this.generateOptimizationOpportunities(
      analysis,
      transactions,
    );
    const riskAssessment = this.generateRiskAssessment(analysis, transactions);

    return {
      executiveSummary,
      keyFindings,
      detailedMetrics,
      optimizationOpportunities,
      riskAssessment,
    };
  }

  private static generateExecutiveSummary(
    analysis: GasAnalysisResult,
    transactions: BlockTransactionSummary[],
    blockIdentifier: string,
  ): string {
    const pyusdTxCount = transactions.filter(
      (tx) => tx.pyusd_interaction,
    ).length;
    const pyusdPercentage = (pyusdTxCount / transactions.length) * 100;

    return (
      `Block ${blockIdentifier} analysis reveals ${transactions.length} total transactions ` +
      `consuming ${analysis.totalGasUsed.toLocaleString()} gas units. ` +
      `PYUSD-related transactions account for ${pyusdTxCount} (${pyusdPercentage.toFixed(1)}%) ` +
      `of all transactions, with a total cost of ${analysis.costAnalysis.totalCostEth.toFixed(6)} ETH. ` +
      `Average gas efficiency stands at ${analysis.gasEfficiency.toFixed(0)} gas per successful transaction.`
    );
  }

  private static generateKeyFindings(
    analysis: GasAnalysisResult,
    transactions: BlockTransactionSummary[],
  ): string[] {
    const findings: string[] = [];

    const highGasCount = analysis.highGasTransactions.length;
    if (highGasCount > 0) {
      findings.push(
        `${highGasCount} transactions used significantly above-average gas`,
      );
    }

    const pyusdTxs = transactions.filter((tx) => tx.pyusd_interaction);
    const pyusdAvgGas =
      pyusdTxs.length > 0
        ? pyusdTxs.reduce((sum, tx) => sum + tx.gas_used, 0) / pyusdTxs.length
        : 0;

    if (pyusdAvgGas > analysis.averageGasPerTransaction * 1.2) {
      findings.push("PYUSD transactions consume 20% more gas than average");
    }

    if (analysis.costAnalysis.totalCostEth > 0.1) {
      findings.push(
        `High transaction costs detected: ${analysis.costAnalysis.totalCostEth.toFixed(4)} ETH total`,
      );
    }

    const failedTxs = transactions.filter((tx) => tx.failed);
    if (failedTxs.length > 0) {
      const wastedGas = failedTxs.reduce((sum, tx) => sum + tx.gas_used, 0);
      findings.push(
        `${failedTxs.length} failed transactions wasted ${wastedGas.toLocaleString()} gas`,
      );
    }

    return findings;
  }

  private static generateDetailedMetrics(analysis: GasAnalysisResult): Array<{
    category: string;
    metrics: Array<{ name: string; value: string; change?: string }>;
  }> {
    return [
      {
        category: "Gas Usage",
        metrics: [
          {
            name: "Total Gas Used",
            value: analysis.totalGasUsed.toLocaleString(),
          },
          {
            name: "Average Gas/Tx",
            value: analysis.averageGasPerTransaction.toFixed(0),
          },
          {
            name: "Gas Efficiency Score",
            value: analysis.gasEfficiency.toFixed(0),
          },
          {
            name: "High Gas Transactions",
            value: analysis.highGasTransactions.length.toString(),
          },
        ],
      },
      {
        category: "Cost Analysis",
        metrics: [
          {
            name: "Total Cost (ETH)",
            value: analysis.costAnalysis.totalCostEth.toFixed(6),
          },
          {
            name: "Average Cost/Tx (ETH)",
            value: analysis.costAnalysis.averageCostPerTransaction.toFixed(8),
          },
          {
            name: "PYUSD Tx Cost (ETH)",
            value: analysis.costAnalysis.pyusdTransactionsCost.toFixed(6),
          },
          {
            name: "Regular Tx Cost (ETH)",
            value: analysis.costAnalysis.regularTransactionsCost.toFixed(6),
          },
        ],
      },
    ];
  }

  private static generateOptimizationOpportunities(
    analysis: GasAnalysisResult,
    transactions: BlockTransactionSummary[],
  ): Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
  }> {
    const opportunities: Array<{
      title: string;
      description: string;
      impact: "high" | "medium" | "low";
      effort: "high" | "medium" | "low";
    }> = [];

    if (analysis.highGasTransactions.length > 0) {
      opportunities.push({
        title: "Optimize High Gas Transactions",
        description: `${analysis.highGasTransactions.length} transactions use excessive gas. Review contract logic and optimize storage operations.`,
        impact: "high",
        effort: "medium",
      });
    }

    const failedTxs = transactions.filter((tx) => tx.failed);
    if (failedTxs.length > 0) {
      opportunities.push({
        title: "Reduce Transaction Failures",
        description: `${failedTxs.length} failed transactions waste gas. Implement better error handling and pre-execution validation.`,
        impact: "medium",
        effort: "low",
      });
    }

    const pyusdTransfers = transactions.filter((tx) => tx.is_pyusd_transfer);
    if (pyusdTransfers.length > 10) {
      opportunities.push({
        title: "Implement Batch Transfers",
        description: `${pyusdTransfers.length} individual PYUSD transfers could be batched to reduce gas costs.`,
        impact: "medium",
        effort: "medium",
      });
    }

    return opportunities;
  }

  private static generateRiskAssessment(
    analysis: GasAnalysisResult,
    transactions: BlockTransactionSummary[],
  ): Array<{
    risk: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }> {
    const risks: Array<{
      risk: string;
      severity: "high" | "medium" | "low";
      mitigation: string;
    }> = [];

    if (analysis.costAnalysis.totalCostEth > 1) {
      risks.push({
        risk: "High Transaction Costs",
        severity: "high",
        mitigation:
          "Implement gas optimization strategies and consider layer 2 solutions",
      });
    }

    if (analysis.gasEfficiency > 300000) {
      risks.push({
        risk: "Poor Gas Efficiency",
        severity: "medium",
        mitigation:
          "Review contract architecture and optimize storage patterns",
      });
    }

    const failureRate =
      (transactions.filter((tx) => tx.failed).length / transactions.length) *
      100;
    if (failureRate > 10) {
      risks.push({
        risk: "High Transaction Failure Rate",
        severity: "high",
        mitigation:
          "Implement comprehensive pre-execution validation and error handling",
      });
    }

    return risks;
  }

  static exportGasAnalysis(
    analysis: GasAnalysisResult,
    transactions: BlockTransactionSummary[],
    format: "csv" | "json" | "xlsx",
  ): string | object {
    const exportData = {
      summary: {
        totalGasUsed: analysis.totalGasUsed,
        averageGasPerTransaction: analysis.averageGasPerTransaction,
        gasEfficiency: analysis.gasEfficiency,
        totalCostEth: analysis.costAnalysis.totalCostEth,
      },
      transactions: transactions.map((tx) => ({
        hash: tx.tx_hash,
        gasUsed: tx.gas_used,
        failed: tx.failed,
        pyusdInteraction: tx.pyusd_interaction,
        pyusdFunction: tx.pyusd_function,
        transferValue: tx.transfer_value,
      })),
      categoryStats: Object.fromEntries(analysis.gasUsageByCategory),
      optimizationSuggestions: analysis.gasOptimizationSuggestions,
    };

    switch (format) {
      case "json":
        return exportData;
      case "csv":
        const csvHeader =
          "Hash,GasUsed,Failed,PyusdInteraction,PyusdFunction,TransferValue\n";
        const csvRows = exportData.transactions
          .map(
            (tx) =>
              `${tx.hash},${tx.gasUsed},${tx.failed},${tx.pyusdInteraction},${tx.pyusdFunction || ""},${tx.transferValue}`,
          )
          .join("\n");
        return csvHeader + csvRows;
      default:
        return JSON.stringify(exportData, null, 2);
    }
  }
}
