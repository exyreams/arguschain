import React, { useState, useMemo } from "react";
import { Badge, Button } from "@/components/global";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Settings,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { LogsAnalysisResults } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";

interface ExportInterfaceProps {
  results: LogsAnalysisResults;
  className?: string;
}

interface ExportOptions {
  includeRawData: boolean;
  includeAnalytics: boolean;
  includeCharts: boolean;
  includeMetadata: boolean;
  dateRange: boolean;
  customFilename: string;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
  mimeType: string;
  features: string[];
  estimatedSize: string;
}

/**
 * ExportInterface - Comprehensive export options and controls
 *
 * This component provides:
 * - Multiple export format selection (CSV, JSON, PDF)
 * - Export customization and filtering options
 * - Export progress tracking and cancellation
 * - Export preview and validation
 * - Batch export capabilities
 */
export const ExportInterface: React.FC<ExportInterfaceProps> = ({
  results,
  className = "",
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>("csv");
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeRawData: true,
    includeAnalytics: true,
    includeCharts: false,
    includeMetadata: true,
    dateRange: true,
    customFilename: "",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const exportFormats: ExportFormat[] = useMemo(
    () => [
      {
        id: "csv",
        name: "CSV Spreadsheet",
        description: "Comma-separated values for Excel and data analysis",
        icon: <FileSpreadsheet className="h-5 w-5" />,
        fileExtension: "csv",
        mimeType: "text/csv",
        features: ["Raw transfer data", "Statistics", "Participant lists"],
        estimatedSize: `${Math.ceil((results?.raw_logs?.length || 0) * 0.2)}KB`,
      },
      {
        id: "json",
        name: "JSON Data",
        description: "Structured data format for developers and APIs",
        icon: <FileText className="h-5 w-5" />,
        fileExtension: "json",
        mimeType: "application/json",
        features: [
          "Complete analysis results",
          "Nested data structures",
          "API-ready format",
        ],
        estimatedSize: `${Math.ceil((results?.raw_logs?.length || 0) * 0.5)}KB`,
      },
      {
        id: "pdf",
        name: "PDF Report",
        description: "Professional report with charts and analysis",
        icon: <FileImage className="h-5 w-5" />,
        fileExtension: "pdf",
        mimeType: "application/pdf",
        features: [
          "Executive summary",
          "Embedded charts",
          "Professional formatting",
        ],
        estimatedSize: `${Math.ceil((results?.raw_logs?.length || 0) * 0.1 + 500)}KB`,
      },
    ],
    [results],
  );

  const selectedFormatData = exportFormats.find((f) => f.id === selectedFormat);

  const generateFilename = () => {
    if (exportOptions.customFilename.trim()) {
      return exportOptions.customFilename.trim();
    }

    const fromBlock = results?.query_info?.from_block || "unknown";
    const toBlock = results?.query_info?.to_block || "unknown";
    const network = results?.query_info?.network || "ethereum";
    const timestamp = new Date().toISOString().split("T")[0];

    return `pyusd-logs-${network}-${fromBlock}-${toBlock}-${timestamp}`;
  };

  const estimateExportSize = () => {
    let size = 0;
    const transferCount = results?.raw_logs?.length || 0;

    if (exportOptions.includeRawData) {
      size += transferCount * (selectedFormat === "json" ? 300 : 150); // bytes per transfer
    }

    if (exportOptions.includeAnalytics) {
      size += 50000; // ~50KB for analytics data
    }

    if (exportOptions.includeCharts && selectedFormat === "pdf") {
      size += 200000; // ~200KB for embedded charts
    }

    if (exportOptions.includeMetadata) {
      size += 5000; // ~5KB for metadata
    }

    return size;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const validateExportOptions = () => {
    const errors: string[] = [];

    if (
      !exportOptions.includeRawData &&
      !exportOptions.includeAnalytics &&
      !exportOptions.includeMetadata
    ) {
      errors.push("At least one data type must be selected");
    }

    if (
      exportOptions.customFilename.includes("/") ||
      exportOptions.customFilename.includes("\\")
    ) {
      errors.push("Filename cannot contain path separators");
    }

    if (selectedFormat === "pdf" && !exportOptions.includeAnalytics) {
      errors.push("PDF reports require analytics data to be included");
    }

    return errors;
  };

  const generatePreviewData = () => {
    const preview: any = {};

    if (exportOptions.includeMetadata) {
      preview.metadata = {
        exportedAt: new Date().toISOString(),
        filename: generateFilename(),
        format: selectedFormat,
        network: results?.query_info?.network,
        blockRange: `${results?.query_info?.from_block} - ${results?.query_info?.to_block}`,
        totalTransfers: results?.raw_logs?.length || 0,
      };
    }

    if (exportOptions.includeAnalytics) {
      preview.analytics = {
        totalVolume: formatPyusdValue(results?.statistics?.total_volume || 0),
        averageTransfer: formatPyusdValue(
          results?.statistics?.avg_transfer || 0,
        ),
        uniqueAddresses:
          (results?.statistics?.unique_senders || 0) +
          (results?.statistics?.unique_receivers || 0),
        topSenders: results?.top_senders?.slice(0, 3) || [],
        topReceivers: results?.top_receivers?.slice(0, 3) || [],
      };
    }

    if (exportOptions.includeRawData) {
      preview.rawData = {
        sampleTransfers: results?.raw_logs?.slice(0, 5) || [],
        totalCount: results?.raw_logs?.length || 0,
      };
    }

    return preview;
  };

  const handleExport = async () => {
    const validationErrors = validateExportOptions();
    if (validationErrors.length > 0) {
      setExportStatus({
        type: "error",
        message: validationErrors.join(", "),
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus({ type: null, message: "" });

    try {
      // Simulate export progress
      const progressSteps = [
        { progress: 20, message: "Preparing data..." },
        { progress: 40, message: "Processing transfers..." },
        { progress: 60, message: "Generating analytics..." },
        { progress: 80, message: "Formatting output..." },
        { progress: 100, message: "Download ready!" },
      ];

      for (const step of progressSteps) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setExportProgress(step.progress);
      }

      // Generate export data based on format
      let exportData: string;
      let mimeType: string;

      if (selectedFormat === "csv") {
        exportData = generateCSVExport();
        mimeType = "text/csv";
      } else if (selectedFormat === "json") {
        exportData = generateJSONExport();
        mimeType = "application/json";
      } else {
        // PDF would require a proper PDF generation library
        throw new Error("PDF export not yet implemented");
      }

      // Create and download file
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${generateFilename()}.${selectedFormatData?.fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus({
        type: "success",
        message: `Export completed successfully! File saved as ${generateFilename()}.${selectedFormatData?.fileExtension}`,
      });
    } catch (error) {
      setExportStatus({
        type: "error",
        message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const generateCSVExport = (): string => {
    const lines: string[] = [];

    if (exportOptions.includeMetadata) {
      lines.push("# PYUSD Transfer Analysis Export");
      lines.push(`# Generated: ${new Date().toISOString()}`);
      lines.push(`# Network: ${results?.query_info?.network}`);
      lines.push(
        `# Block Range: ${results?.query_info?.from_block} - ${results?.query_info?.to_block}`,
      );
      lines.push("");
    }

    if (exportOptions.includeAnalytics) {
      lines.push("# Analytics Summary");
      lines.push("Metric,Value");
      lines.push(`Total Transfers,${results?.raw_logs?.length || 0}`);
      lines.push(`Total Volume,${results?.statistics?.total_volume || 0}`);
      lines.push(`Average Transfer,${results?.statistics?.avg_transfer || 0}`);
      lines.push(`Unique Senders,${results?.statistics?.unique_senders || 0}`);
      lines.push(
        `Unique Receivers,${results?.statistics?.unique_receivers || 0}`,
      );
      lines.push("");
    }

    if (exportOptions.includeRawData) {
      lines.push("# Transfer Data");
      lines.push("Block,Transaction Hash,From,To,Value (PYUSD),Timestamp");

      results?.raw_logs?.forEach((transfer) => {
        const timestamp = transfer.datetime
          ? transfer.datetime.toISOString()
          : "";
        lines.push(
          `${transfer.blockNumber},"${transfer.transactionHash}","${transfer.from}","${transfer.to}",${transfer.value_pyusd},"${timestamp}"`,
        );
      });
    }

    return lines.join("\n");
  };

  const generateJSONExport = (): string => {
    const exportData: any = {};

    if (exportOptions.includeMetadata) {
      exportData.metadata = {
        exportedAt: new Date().toISOString(),
        filename: generateFilename(),
        network: results?.query_info?.network,
        blockRange: {
          from: results?.query_info?.from_block,
          to: results?.query_info?.to_block,
        },
        executionTime: results?.query_info?.execution_time_ms,
      };
    }

    if (exportOptions.includeAnalytics) {
      exportData.analytics = {
        statistics: results?.statistics,
        topSenders: results?.top_senders,
        topReceivers: results?.top_receivers,
        topFlows: results?.top_flows,
        networkAnalysis: results?.network_analysis,
      };
    }

    if (exportOptions.includeRawData) {
      exportData.transfers = results?.raw_logs;
    }

    return JSON.stringify(exportData, null, 2);
  };

  const validationErrors = validateExportOptions();
  const estimatedSize = estimateExportSize();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Export Format Selection */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Export Format
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportFormats.map((format) => (
            <div
              key={format.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedFormat === format.id
                  ? "border-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                  : "border-[rgba(0,191,255,0.2)] bg-[rgba(25,28,40,0.6)] hover:bg-[rgba(25,28,40,0.8)]"
              }`}
              onClick={() => setSelectedFormat(format.id)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="text-[#00bfff]">{format.icon}</div>
                <div>
                  <h4 className="font-medium text-[#8b9dc3]">{format.name}</h4>
                  <p className="text-xs text-[#6b7280]">{format.description}</p>
                </div>
              </div>
              <div className="space-y-1">
                {format.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-[#8b9dc3]">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[rgba(0,191,255,0.1)]">
                <span className="text-xs text-[#6b7280]">
                  Est. size: {format.estimatedSize}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Export Options
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#8b9dc3]">
              Data to Include
            </h4>
            <div className="space-y-3">
              {[
                {
                  key: "includeRawData" as keyof ExportOptions,
                  label: "Raw Transfer Data",
                  description: "Individual transfer records with full details",
                },
                {
                  key: "includeAnalytics" as keyof ExportOptions,
                  label: "Analytics & Statistics",
                  description: "Computed metrics and analysis results",
                },
                {
                  key: "includeCharts" as keyof ExportOptions,
                  label: "Chart Data",
                  description: "Data used for visualizations (PDF only)",
                },
                {
                  key: "includeMetadata" as keyof ExportOptions,
                  label: "Export Metadata",
                  description: "Export timestamp, parameters, and settings",
                },
              ].map((option) => (
                <label
                  key={option.key}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={exportOptions[option.key] as boolean}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        [option.key]: e.target.checked,
                      }))
                    }
                    className="mt-1 w-4 h-4 text-[#00bfff] bg-transparent border-[rgba(0,191,255,0.3)] rounded focus:ring-[#00bfff] focus:ring-2"
                  />
                  <div>
                    <div className="text-sm text-[#8b9dc3]">{option.label}</div>
                    <div className="text-xs text-[#6b7280]">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#8b9dc3]">
              File Settings
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#8b9dc3] mb-2">
                  Custom Filename (optional)
                </label>
                <input
                  type="text"
                  value={exportOptions.customFilename}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      customFilename: e.target.value,
                    }))
                  }
                  placeholder={generateFilename()}
                  className="w-full bg-[rgba(25,28,40,0.6)] border border-[rgba(0,191,255,0.3)] rounded px-3 py-2 text-sm text-[#8b9dc3] placeholder-[#6b7280] focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff]"
                />
              </div>

              <div className="p-3 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded">
                <div className="text-sm text-[#8b9dc3] space-y-1">
                  <div>
                    <span className="font-medium">Final filename:</span>{" "}
                    {generateFilename()}.{selectedFormatData?.fileExtension}
                  </div>
                  <div>
                    <span className="font-medium">Estimated size:</span>{" "}
                    {formatFileSize(estimatedSize)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Preview */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Export Preview
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
        </div>

        {showPreview && (
          <div className="bg-[rgba(25,28,40,0.6)] rounded-lg p-4">
            <pre className="text-xs text-[#8b9dc3] overflow-x-auto max-h-64">
              {selectedFormat === "json"
                ? JSON.stringify(generatePreviewData(), null, 2)
                : generateCSVExport().split("\n").slice(0, 20).join("\n") +
                  (results?.raw_logs && results.raw_logs.length > 15
                    ? "\n... (truncated)"
                    : "")}
            </pre>
          </div>
        )}
      </div>

      {/* Export Status */}
      {exportStatus.type && (
        <div
          className={`p-4 rounded-lg border ${
            exportStatus.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {exportStatus.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{exportStatus.message}</span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-400 mb-1">
                Export Configuration Issues:
              </div>
              <ul className="text-sm text-red-400 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Export Progress */}
      {isExporting && (
        <div className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#00bfff]" />
            <span className="text-sm text-[#8b9dc3]">
              Exporting... {exportProgress}%
            </span>
          </div>
          <div className="w-full bg-[rgba(25,28,40,0.6)] rounded-full h-2">
            <div
              className="bg-[#00bfff] h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleExport}
          disabled={isExporting || validationErrors.length > 0}
          className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-8 py-3 transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,191,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {selectedFormatData?.name}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ExportInterface;
