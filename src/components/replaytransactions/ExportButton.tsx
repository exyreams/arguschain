import React, { useState } from "react";
import { Badge, Button } from "@/components/global";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProcessedBlockReplayData,
  ProcessedReplayData,
} from "@/lib/replaytransactions/types";

interface ReplayExportButtonProps {
  data: ProcessedReplayData | ProcessedBlockReplayData | null;
  analysisType: "transaction" | "block";
  network: string;
  identifier: string; // txHash or blockId
  filename?: string;
  className?: string;
}

export const ExportButton: React.FC<ReplayExportButtonProps> = ({
  data,
  analysisType,
  network,
  identifier,
  filename,
  className,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");

  const handleExport = async (format: "json" | "csv") => {
    if (!data) return;

    setIsExporting(true);
    setExportFormat(format);

    try {
      const timestamp = new Date().toISOString();
      const baseFilename =
        filename || `replay-${analysisType}-${identifier.slice(0, 8)}`;
      const exportFilename = `${baseFilename}-${timestamp.split("T")[0]}.${format}`;

      const exportData = {
        metadata: {
          exportedAt: timestamp,
          analysisType,
          network,
          identifier,
          version: "1.0",
          tool: "Arguschain Replay Analyzer",
        },
        data,
        summary: generateSummary(data, analysisType),
      };

      let blob: Blob;

      if (format === "json") {
        blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
      } else {
        const csvContent = convertToCSV(exportData, analysisType);
        blob = new Blob([csvContent], {
          type: "text/csv",
        });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename;
      a.click();
      URL.revokeObjectURL(url);

      // Show success feedback
      setTimeout(() => {
        setIsExporting(false);
      }, 1000);
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
    }
  };

  const generateSummary = (
    data: ProcessedReplayData | ProcessedBlockReplayData,
    type: "transaction" | "block",
  ) => {
    if (type === "transaction") {
      const txData = data as ProcessedReplayData;
      return {
        transactionHash: txData.transactionHash,
        blockNumber: txData.blockNumber,
        gasUsed: txData.performanceMetrics?.costAnalysis?.totalGasUsed || 0,
        gasEfficiency: txData.performanceMetrics?.gasEfficiency || 0,
        tokenTransfers: txData.tokenAnalysis?.tokenTransfers?.length || 0,
        securityFlags: txData.securityFlags?.length || 0,
        hasTraceAnalysis: !!txData.traceAnalysis,
        hasStateDiff: !!txData.stateDiffAnalysis,
        hasVmTrace: !!txData.vmTraceAnalysis,
      };
    } else {
      const blockData = data as ProcessedBlockReplayData;
      return {
        blockIdentifier: blockData.blockIdentifier,
        network: blockData.network,
        transactionCount: blockData.transactionCount || 0,
        totalGasUsed: blockData.totalGasUsed || 0,
        pyusdVolume: blockData.totalTokenVolume || 0,
        securityIssues: blockData.blockSecurityFlags?.length || 0,
      };
    }
  };

  const convertToCSV = (
    exportData: any,
    type: "transaction" | "block",
  ): string => {
    let csvContent = "";

    // Add metadata
    csvContent += "Metadata\n";
    csvContent += "Field,Value\n";
    Object.entries(exportData.metadata).forEach(([key, value]) => {
      csvContent += `"${key}","${value}"\n`;
    });

    csvContent += "\nSummary\n";
    csvContent += "Field,Value\n";
    Object.entries(exportData.summary).forEach(([key, value]) => {
      csvContent += `"${key}","${value}"\n`;
    });

    if (type === "transaction") {
      const txData = exportData.data as ProcessedReplayData;

      // Token transfers
      if (txData.tokenAnalysis?.tokenTransfers?.length) {
        csvContent += "\nToken Transfers\n";
        csvContent += "From,To,Amount,Token Symbol,Token Address\n";
        txData.tokenAnalysis.tokenTransfers.forEach((transfer) => {
          csvContent += `"${transfer.from}","${transfer.to}","${transfer.formattedAmount}","${transfer.tokenSymbol}","${transfer.tokenAddress}"\n`;
        });
      }

      // Security flags
      if (txData.securityFlags?.length) {
        csvContent += "\nSecurity Flags\n";
        csvContent += "Type,Level,Description\n";
        txData.securityFlags.forEach((flag) => {
          csvContent += `"${flag.type}","${flag.level}","${flag.description}"\n`;
        });
      }

      // Performance metrics
      if (txData.performanceMetrics?.optimizationSuggestions?.length) {
        csvContent += "\nOptimization Suggestions\n";
        csvContent += "Title,Description,Recommendation\n";
        txData.performanceMetrics.optimizationSuggestions.forEach(
          (suggestion) => {
            csvContent += `"${suggestion.title}","${suggestion.description}","${suggestion.recommendation}"\n`;
          },
        );
      }
    } else {
      const blockData = exportData.data as ProcessedBlockReplayData;

      // Block transactions summary
      csvContent += "\nBlock Metrics\n";
      csvContent += "Metric,Value\n";
      csvContent += `"Total Gas Used","${blockData.totalGasUsed || 0}"\n`;
      csvContent += `"Average Gas Per Transaction","${blockData.blockPerformanceMetrics?.averageGasPerTx || 0}"\n`;
      csvContent += `"PYUSD Total Volume","${blockData.totalTokenVolume || 0}"\n`;
      csvContent += `"PYUSD Transfer Count","${blockData.totalTokenTransfers || 0}"\n`;
      csvContent += `"Security Flags","${blockData.blockSecurityFlags?.length || 0}"\n`;
      csvContent += `"Transaction Count","${blockData.transactionCount || 0}"\n`;
      csvContent += `"Total State Changes","${blockData.totalStateChanges || 0}"\n`;

      // Block token analysis
      if (blockData.blockTokenAnalysis) {
        csvContent += "\nToken Analysis\n";
        csvContent += "Metric,Value\n";
        csvContent += `"Token Transaction Count","${blockData.blockTokenAnalysis.tokenTransactionCount || 0}"\n`;
        csvContent += `"Token Transaction Percentage","${blockData.blockTokenAnalysis.tokenTransactionPercentage || 0}%"\n`;
        csvContent += `"Unique Tokens","${blockData.blockTokenAnalysis.uniqueTokens?.length || 0}"\n`;
      }

      // Security flags
      if (blockData.blockSecurityFlags?.length) {
        csvContent += "\nSecurity Flags\n";
        csvContent += "Type,Level,Description\n";
        blockData.blockSecurityFlags.forEach((flag) => {
          csvContent += `"${flag.type}","${flag.level}","${flag.description}"\n`;
        });
      }

      // Transaction summaries
      if (blockData.transactionSummaries?.length) {
        csvContent += "\nTransaction Summaries\n";
        csvContent +=
          "TX Index,TX Hash,Token Interaction,Token Transfers,Token Volume,State Changes,Gas Used,Status\n";
        blockData.transactionSummaries.forEach((tx) => {
          csvContent += `"${tx.txIndex}","${tx.txHash}","${tx.hasTokenInteraction}","${tx.tokenTransfers}","${tx.tokenVolume}","${tx.stateChanges}","${tx.gasUsed}","${tx.status}"\n`;
        });
      }
    }

    return csvContent;
  };

  if (!data) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={cn("opacity-50", className)}
      >
        <Download className="h-4 w-4 mr-2" />
        No Data to Export
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant="outline"
        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] capitalize"
      >
        {analysisType} Analysis
      </Badge>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("json")}
        disabled={isExporting}
        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff]"
      >
        {isExporting && exportFormat === "json" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        JSON
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("csv")}
        disabled={isExporting}
        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff]"
      >
        {isExporting && exportFormat === "csv" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2" />
        )}
        CSV
      </Button>
    </div>
  );
};
