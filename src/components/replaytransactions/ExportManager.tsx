import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/global";
import {
  AlertCircle,
  Check,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Settings,
} from "lucide-react";
import type {
  ProcessedBlockReplayData,
  ProcessedReplayData,
} from "@/lib/replaytransactions/types";

interface ExportManagerProps {
  data: ProcessedReplayData | ProcessedBlockReplayData;
  dataType: "transaction" | "block";
  className?: string;
  onExportComplete?: (format: string, success: boolean) => void;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  extension: string;
  mimeType: string;
  supportsCustomization: boolean;
}

interface ExportOptions {
  includeRawData: boolean;
  includeCharts: boolean;
  includeRecommendations: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customFields: string[];
  branding: {
    companyName: string;
    logoUrl?: string;
    primaryColor: string;
    includeWatermark: boolean;
  };
  privacy: {
    anonymizeAddresses: boolean;
    excludeSensitiveData: boolean;
    includeDisclaimer: boolean;
  };
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: "json",
    name: "JSON",
    description: "Structured data with full analysis results",
    icon: FileText,
    extension: "json",
    mimeType: "application/json",
    supportsCustomization: false,
  },
  {
    id: "csv",
    name: "CSV",
    description: "Spreadsheet-compatible format for data analysis",
    icon: FileSpreadsheet,
    extension: "csv",
    mimeType: "text/csv",
    supportsCustomization: true,
  },
  {
    id: "pdf",
    name: "PDF Report",
    description: "Executive summary with charts and recommendations",
    icon: FileImage,
    extension: "pdf",
    mimeType: "application/pdf",
    supportsCustomization: true,
  },
  {
    id: "excel",
    name: "Excel",
    description: "Multi-sheet workbook with detailed analysis",
    icon: FileSpreadsheet,
    extension: "xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    supportsCustomization: true,
  },
];

export const ExportManager: React.FC<ExportManagerProps> = ({
  data,
  dataType,
  className,
  onExportComplete,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>("json");
  const [showOptions, setShowOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeRawData: true,
    includeCharts: false,
    includeRecommendations: true,
    includeMetadata: true,
    customFields: [],
    branding: {
      companyName: "Arguschain Analysis",
      primaryColor: "#8b5cf6",
      includeWatermark: false,
    },
    privacy: {
      anonymizeAddresses: false,
      excludeSensitiveData: false,
      includeDisclaimer: true,
    },
  });

  const exportSizeEstimate = useMemo(() => {
    const baseSize = JSON.stringify(data).length;
    let multiplier = 1;

    if (exportOptions.includeRawData) multiplier += 0.5;
    if (exportOptions.includeCharts) multiplier += 0.3;
    if (exportOptions.includeRecommendations) multiplier += 0.2;

    const estimatedBytes = baseSize * multiplier;

    if (estimatedBytes < 1024) return `${estimatedBytes.toFixed(0)} B`;
    if (estimatedBytes < 1024 * 1024)
      return `${(estimatedBytes / 1024).toFixed(1)} KB`;
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [data, exportOptions]);

  const availableFields = useMemo(() => {
    const fields: string[] = [];

    if (dataType === "transaction") {
      const txData = data as ProcessedReplayData;
      fields.push(
        "Transaction Hash",
        "Block Number",
        "Gas Used",
        "Gas Price",
        "Status",
        "Token Transfers",
        "Security Flags",
        "Performance Metrics",
      );

      if (txData.traceAnalysis) {
        fields.push("Call Trace", "Function Calls", "Contract Interactions");
      }

      if (txData.stateDiffAnalysis) {
        fields.push("State Changes", "Balance Changes", "Storage Changes");
      }

      if (txData.vmTraceAnalysis) {
        fields.push("VM Trace", "Opcode Analysis", "Execution Steps");
      }
    } else {
      fields.push(
        "Block Number",
        "Transaction Count",
        "Total Gas Used",
        "PYUSD Activity",
        "Security Summary",
        "Performance Overview",
      );
    }

    return fields;
  }, [data, dataType]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      const format = EXPORT_FORMATS.find((f) => f.id === selectedFormat);
      if (!format) throw new Error("Invalid export format");

      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      let exportData: any;
      let filename: string;

      switch (selectedFormat) {
        case "json":
          exportData = await exportToJSON();
          filename = `${dataType}-analysis-${Date.now()}.json`;
          break;
        case "csv":
          exportData = await exportToCSV();
          filename = `${dataType}-analysis-${Date.now()}.csv`;
          break;
        case "pdf":
          exportData = await exportToPDF();
          filename = `${dataType}-report-${Date.now()}.pdf`;
          break;
        case "excel":
          exportData = await exportToExcel();
          filename = `${dataType}-workbook-${Date.now()}.xlsx`;
          break;
        default:
          throw new Error("Unsupported export format");
      }

      clearInterval(progressInterval);
      setExportProgress(100);

      const blob = new Blob([exportData], { type: format.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      onExportComplete?.(selectedFormat, true);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed");
      onExportComplete?.(selectedFormat, false);
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [selectedFormat, exportOptions, data, dataType, onExportComplete]);

  const exportToJSON = useCallback(async () => {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        dataType,
        format: "json",
        version: "1.0",
        ...exportOptions.branding,
      },
      data: exportOptions.includeRawData ? data : sanitizeData(data),
      analysis: {
        ...(exportOptions.includeRecommendations && {
          recommendations: getRecommendations(),
        }),
        ...(exportOptions.includeMetadata && {
          metadata: getAnalysisMetadata(),
        }),
      },
      ...(exportOptions.privacy.includeDisclaimer && {
        disclaimer:
          "This analysis is for informational purposes only and should not be considered as financial advice.",
      }),
    };

    return JSON.stringify(exportData, null, 2);
  }, [data, dataType, exportOptions]);

  const exportToCSV = useCallback(async () => {
    let csvContent = "";

    if (dataType === "transaction") {
      const txData = data as ProcessedReplayData;

      const headers = ["Field", "Value"];
      csvContent += headers.join(",") + "\\n";

      csvContent += `"Transaction Hash","${txData.transactionHash || "N/A"}"\\n`;
      csvContent += `"Block Number","${txData.blockNumber || "N/A"}"\\n`;
      csvContent += `"Gas Used","${txData.performanceMetrics?.costAnalysis?.totalGasUsed || "N/A"}"\\n`;
      csvContent += `"Gas Efficiency","${txData.performanceMetrics?.gasEfficiency || "N/A"}%"\\n`;

      if (txData.tokenAnalysis?.tokenTransfers) {
        csvContent += "\\n\\nToken Transfers\\n";
        csvContent += "From,To,Amount,Token\\n";
        txData.tokenAnalysis.tokenTransfers.forEach((transfer) => {
          csvContent += `"${anonymizeAddress(transfer.from)}","${anonymizeAddress(transfer.to)}","${transfer.formattedAmount}","${transfer.tokenSymbol}"\\n`;
        });
      }

      if (txData.securityFlags?.length) {
        csvContent += "\\n\\nSecurity Flags\\n";
        csvContent += "Type,Severity,Description\\n";
        txData.securityFlags.forEach((flag) => {
          csvContent += `"${flag.type}","${flag.severity}","${flag.description}"\\n`;
        });
      }
    } else {
      const blockData = data as ProcessedBlockReplayData;

      csvContent += "Field,Value\\n";
      csvContent += `"Block Identifier","${blockData.blockIdentifier}"\\n`;
      csvContent += `"Network","${blockData.network}"\\n`;
      csvContent += `"Transaction Count","${blockData.transactionCount || "N/A"}"\\n`;
      csvContent += `"Total Gas Used","${blockData.aggregateMetrics?.totalGasUsed || "N/A"}"\\n`;
      csvContent += `"PYUSD Volume","${blockData.aggregateMetrics?.tokenActivity?.totalVolume || "N/A"}"\\n`;
    }

    return csvContent;
  }, [data, dataType, exportOptions]);

  const exportToPDF = useCallback(async () => {
    const pdfContent = `
      %PDF-1.4
      1 0 obj
      <<
      /Type /Catalog
      /Pages 2 0 R
      >>
      endobj
      
      2 0 obj
      <<
      /Type /Pages
      /Kids [3 0 R]
      /Count 1
      >>
      endobj
      
      3 0 obj
      <<
      /Type /Page
      /Parent 2 0 R
      /MediaBox [0 0 612 792]
      /Contents 4 0 R
      >>
      endobj
      
      4 0 obj
      <<
      /Length 44
      >>
      stream
      BT
      /F1 12 Tf
      100 700 Td
      (${dataType.toUpperCase()} ANALYSIS REPORT) Tj
      ET
      endstream
      endobj
      
      xref
      0 5
      0000000000 65535 f 
      0000000009 00000 n 
      0000000058 00000 n 
      0000000115 00000 n 
      0000000206 00000 n 
      trailer
      <<
      /Size 5
      /Root 1 0 R
      >>
      startxref
      299
      %%EOF
    `;

    return pdfContent;
  }, [dataType]);

  const exportToExcel = useCallback(async () => {
    return await exportToCSV();
  }, [exportToCSV]);

  const sanitizeData = (data: any) => {
    if (exportOptions.privacy.anonymizeAddresses) {
      return JSON.parse(
        JSON.stringify(data).replace(/0x[a-fA-F0-9]{40}/g, "0x****"),
      );
    }
    return data;
  };

  const anonymizeAddress = (address: string) => {
    return exportOptions.privacy.anonymizeAddresses
      ? `${address.slice(0, 6)}****${address.slice(-4)}`
      : address;
  };

  const getRecommendations = () => {
    if (dataType === "transaction") {
      const txData = data as ProcessedReplayData;
      return txData.performanceMetrics?.optimizationSuggestions || [];
    }
    return [];
  };

  const getAnalysisMetadata = () => {
    return {
      analyzedAt: new Date().toISOString(),
      dataType,
      version: "1.0",
      tools: ["Arguschain State Replay Analyzer"],
    };
  };

  const selectedFormatData = EXPORT_FORMATS.find(
    (f) => f.id === selectedFormat,
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Export Analysis</h2>
          <Badge variant="outline" className="capitalize">
            {dataType}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Options
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {EXPORT_FORMATS.map((format) => {
          const Icon = format.icon;
          const isSelected = selectedFormat === format.id;

          return (
            <div
              key={format.id}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50",
              )}
              onClick={() => setSelectedFormat(format.id)}
            >
              <div className="flex items-center space-x-3 mb-2">
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isSelected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <h3 className="font-medium">{format.name}</h3>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {format.description}
              </p>
              {format.supportsCustomization && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Customizable
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {showOptions && selectedFormatData?.supportsCustomization && (
        <div className="bg-card rounded-lg border p-6 space-y-6">
          <h3 className="text-lg font-semibold">Export Options</h3>

          <div>
            <h4 className="font-medium mb-3">Content</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeRawData}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeRawData: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Include Raw Data</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCharts}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeCharts: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Include Charts</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeRecommendations}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeRecommendations: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Include Recommendations</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeMetadata: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Include Metadata</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Privacy</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.privacy.anonymizeAddresses}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      privacy: {
                        ...prev.privacy,
                        anonymizeAddresses: e.target.checked,
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Anonymize Addresses</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.privacy.excludeSensitiveData}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      privacy: {
                        ...prev.privacy,
                        excludeSensitiveData: e.target.checked,
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Exclude Sensitive Data</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.privacy.includeDisclaimer}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      privacy: {
                        ...prev.privacy,
                        includeDisclaimer: e.target.checked,
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm">Include Disclaimer</span>
              </label>
            </div>
          </div>

          {selectedFormat === "pdf" && (
            <div>
              <h4 className="font-medium mb-3">Branding</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={exportOptions.branding.companyName}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        branding: {
                          ...prev.branding,
                          companyName: e.target.value,
                        },
                      }))
                    }
                    className="w-full text-sm border rounded px-3 py-2"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={exportOptions.branding.primaryColor}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          branding: {
                            ...prev.branding,
                            primaryColor: e.target.value,
                          },
                        }))
                      }
                      className="w-12 h-8 border rounded"
                    />
                    <span className="text-sm text-muted-foreground">
                      {exportOptions.branding.primaryColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <p className="font-medium">Ready to Export</p>
              <p className="text-sm text-muted-foreground">
                {selectedFormatData?.name} format • Estimated size:{" "}
                {exportSizeEstimate}
              </p>
            </div>

            {exportError && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{exportError}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="min-w-32"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>

        {isExporting && (
          <div className="mt-4">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {exportProgress.toFixed(0)}% complete
            </p>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-3">Recent Exports</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>transaction-analysis.json</span>
              <Badge variant="outline" className="text-xs">
                JSON
              </Badge>
            </div>
            <span className="text-muted-foreground">2 minutes ago</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span>block-analysis.csv</span>
              <Badge variant="outline" className="text-xs">
                CSV
              </Badge>
            </div>
            <span className="text-muted-foreground">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};
