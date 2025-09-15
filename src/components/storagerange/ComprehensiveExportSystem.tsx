import React, { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Share2,
} from "lucide-react";
import { StorageSlot } from "@/lib/storagerange";

interface ComprehensiveExportSystemProps {
  data: {
    storageSlots?: StorageSlot[];
    analysisResults?: any[];
    historicalData?: any[];
    comparisonData?: any[];
    securityFindings?: any[];
    tokenMetrics?: any;
  };
  metadata: {
    contractAddress: string;
    blockHash: string;
    analysisDate: Date;
    analysisType: string;
    userNotes?: string;
  };
  onExportComplete?: (result: ExportResult) => void;
  className?: string;
}

interface ExportOptions {
  format: "csv" | "json" | "pdf" | "xlsx" | "google_sheets";
  includeMetadata: boolean;
  includeCharts: boolean;
  includeRawData: boolean;
  includeAnalysis: boolean;
  includeSummary: boolean;
  customFields: string[];
  dateRange?: { start: Date; end: Date };
  filterCriteria?: any;
  compression: boolean;
  password?: string;
}

interface ExportResult {
  success: boolean;
  format: string;
  filename: string;
  size: number;
  downloadUrl?: string;
  shareUrl?: string;
  error?: string;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportOptions["format"];
  options: Partial<ExportOptions>;
  isDefault: boolean;
}

export const ComprehensiveExportSystem: React.FC<
  ComprehensiveExportSystemProps
> = ({ data, metadata, onExportComplete, className = "" }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "csv",
    includeMetadata: true,
    includeCharts: false,
    includeRawData: true,
    includeAnalysis: true,
    includeSummary: true,
    customFields: [],
    compression: false,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportHistory, setExportHistory] = useState<ExportResult[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customFilename, setCustomFilename] = useState("");

  const exportTemplates: ExportTemplate[] = useMemo(
    () => [
      {
        id: "basic-csv",
        name: "Basic CSV Export",
        description: "Simple CSV export with storage slots and basic metadata",
        format: "csv",
        options: {
          includeMetadata: true,
          includeRawData: true,
          includeAnalysis: false,
          includeCharts: false,
        },
        isDefault: true,
      },
      {
        id: "comprehensive-json",
        name: "Comprehensive JSON",
        description: "Complete JSON export with all data and analysis results",
        format: "json",
        options: {
          includeMetadata: true,
          includeRawData: true,
          includeAnalysis: true,
          includeSummary: true,
          includeCharts: false,
        },
        isDefault: false,
      },
      {
        id: "executive-pdf",
        name: "Executive PDF Report",
        description:
          "Professional PDF report with charts and executive summary",
        format: "pdf",
        options: {
          includeMetadata: true,
          includeRawData: false,
          includeAnalysis: true,
          includeSummary: true,
          includeCharts: true,
        },
        isDefault: false,
      },
      {
        id: "analysis-xlsx",
        name: "Analysis Spreadsheet",
        description:
          "Excel spreadsheet with multiple sheets for different data types",
        format: "xlsx",
        options: {
          includeMetadata: true,
          includeRawData: true,
          includeAnalysis: true,
          includeSummary: true,
          includeCharts: true,
        },
        isDefault: false,
      },
    ],
    [],
  );

  const estimatedSize = useMemo(() => {
    let size = 0;

    if (exportOptions.includeRawData && data.storageSlots) {
      size += data.storageSlots.length * 200;
    }

    if (exportOptions.includeAnalysis && data.analysisResults) {
      size += data.analysisResults.length * 500;
    }

    if (exportOptions.includeCharts) {
      size += 50000;
    }

    if (exportOptions.compression) {
      size *= 0.3;
    }

    return size;
  }, [exportOptions, data]);

  const generateFilename = useCallback(() => {
    if (customFilename.trim()) {
      return customFilename;
    }

    const date = new Date().toISOString().split("T")[0];
    const contract = metadata.contractAddress.slice(0, 8);
    const type = metadata.analysisType.toLowerCase().replace(/\s+/g, "_");
    const extension =
      exportOptions.format === "google_sheets"
        ? "gsheet"
        : exportOptions.format;

    return `storage_analysis_${type}_${contract}_${date}.${extension}`;
  }, [customFilename, metadata, exportOptions.format]);

  const exportToCSV = useCallback(
    async (options: ExportOptions): Promise<string> => {
      const rows: string[] = [];

      if (options.includeMetadata) {
        rows.push("# Storage Analysis Export");
        rows.push(`# Contract: ${metadata.contractAddress}`);
        rows.push(`# Block Hash: ${metadata.blockHash}`);
        rows.push(`# Analysis Date: ${metadata.analysisDate.toISOString()}`);
        rows.push(`# Analysis Type: ${metadata.analysisType}`);
        if (metadata.userNotes) {
          rows.push(`# Notes: ${metadata.userNotes}`);
        }
        rows.push("");
      }

      if (options.includeRawData && data.storageSlots) {
        rows.push(
          "Slot,Slot Display,Raw Value,Decoded Value,Interpretation,Category,Type,Security Relevant,PYUSD Related",
        );

        data.storageSlots.forEach((slot) => {
          const row = [
            slot.slotHex,
            slot.slotDisplay,
            slot.rawValue,
            slot.decodedValue,
            slot.interpretation || "",
            slot.category,
            slot.type || "",
            slot.securityRelevant ? "Yes" : "No",
            slot.isPYUSDRelated ? "Yes" : "No",
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(",");

          rows.push(row);
        });
      }

      if (options.includeAnalysis && data.analysisResults) {
        rows.push("");
        rows.push("# Analysis Results");
        rows.push("Type,Timestamp,Result,Confidence,Notes");

        data.analysisResults.forEach((result) => {
          const row = [
            result.type || "",
            result.timestamp || "",
            JSON.stringify(result.data || {}),
            result.confidence || "",
            result.notes || "",
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(",");

          rows.push(row);
        });
      }

      return rows.join("\n");
    },
    [data, metadata],
  );

  const exportToJSON = useCallback(
    async (options: ExportOptions): Promise<string> => {
      const exportData: any = {};

      if (options.includeMetadata) {
        exportData.metadata = {
          contractAddress: metadata.contractAddress,
          blockHash: metadata.blockHash,
          analysisDate: metadata.analysisDate.toISOString(),
          analysisType: metadata.analysisType,
          userNotes: metadata.userNotes,
          exportDate: new Date().toISOString(),
          exportOptions: options,
        };
      }

      if (options.includeRawData) {
        exportData.storageSlots = data.storageSlots || [];
        exportData.historicalData = data.historicalData || [];
        exportData.comparisonData = data.comparisonData || [];
      }

      if (options.includeAnalysis) {
        exportData.analysisResults = data.analysisResults || [];
        exportData.securityFindings = data.securityFindings || [];
        exportData.tokenMetrics = data.tokenMetrics || {};
      }

      if (options.includeSummary) {
        exportData.summary = {
          totalSlots: data.storageSlots?.length || 0,
          categoryCounts:
            data.storageSlots?.reduce(
              (acc, slot) => {
                acc[slot.category] = (acc[slot.category] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ) || {},
          securityRelevantCount:
            data.storageSlots?.filter((s) => s.securityRelevant).length || 0,
          pyusdRelatedCount:
            data.storageSlots?.filter((s) => s.isPYUSDRelated).length || 0,
        };
      }

      return JSON.stringify(exportData, null, 2);
    },
    [data, metadata],
  );

  const exportToPDF = useCallback(
    async (options: ExportOptions): Promise<string> => {
      const pdfContent = {
        title: "Storage Analysis Report",
        metadata: options.includeMetadata ? metadata : undefined,
        summary: options.includeSummary
          ? {
              totalSlots: data.storageSlots?.length || 0,
              analysisDate: metadata.analysisDate.toISOString(),
            }
          : undefined,
        data: options.includeRawData ? data : undefined,
      };

      return JSON.stringify(pdfContent, null, 2);
    },
    [data, metadata],
  );

  const executeExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      let content: string;
      let mimeType: string;

      setExportProgress(25);

      switch (exportOptions.format) {
        case "csv":
          content = await exportToCSV(exportOptions);
          mimeType = "text/csv";
          break;
        case "json":
          content = await exportToJSON(exportOptions);
          mimeType = "application/json";
          break;
        case "pdf":
          content = await exportToPDF(exportOptions);
          mimeType = "application/pdf";
          break;
        case "xlsx":
          content = await exportToJSON(exportOptions);
          mimeType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          break;
        case "google_sheets":
          content = await exportToCSV(exportOptions);
          mimeType = "text/csv";
          break;
        default:
          throw new Error(`Unsupported format: ${exportOptions.format}`);
      }

      setExportProgress(75);

      const filename = generateFilename();
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);

      setExportProgress(100);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const result: ExportResult = {
        success: true,
        format: exportOptions.format,
        filename,
        size: blob.size,
        downloadUrl: url,
      };

      setExportHistory((prev) => [result, ...prev.slice(0, 9)]);
      onExportComplete?.(result);
    } catch (error) {
      const result: ExportResult = {
        success: false,
        format: exportOptions.format,
        filename: generateFilename(),
        size: 0,
        error: error instanceof Error ? error.message : "Export failed",
      };

      setExportHistory((prev) => [result, ...prev.slice(0, 9)]);
      onExportComplete?.(result);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [
    exportOptions,
    exportToCSV,
    exportToJSON,
    exportToPDF,
    generateFilename,
    onExportComplete,
  ]);

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = exportTemplates.find((t) => t.id === templateId);
      if (template) {
        setExportOptions((prev) => ({
          ...prev,
          format: template.format,
          ...template.options,
        }));
        setSelectedTemplate(templateId);
      }
    },
    [exportTemplates],
  );

  const updateExportOption = useCallback(
    <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
      setExportOptions((prev) => ({ ...prev, [key]: value }));
      setSelectedTemplate("");
    },
    [],
  );

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Download className="h-5 w-5 text-[#00bfff]" />
        <h3 className="text-lg font-semibold text-[#00bfff]">Export System</h3>
        <Badge
          variant="outline"
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
        >
          {Math.round(estimatedSize / 1024)}KB
        </Badge>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-[#00bfff] mb-3">Export Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exportTemplates.map((template) => (
              <Button
                key={template.id}
                variant={
                  selectedTemplate === template.id ? "default" : "outline"
                }
                onClick={() => applyTemplate(template.id)}
                className="justify-start h-auto p-3 border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <div className="text-left">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-[#8b9dc3] mt-1">
                    {template.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-[#00bfff]">Export Configuration</h4>

            <div>
              <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                Export Format
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) =>
                  updateExportOption("format", e.target.value as any)
                }
                className="w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded-md px-3 py-2 text-sm"
              >
                <option value="csv">CSV (Comma Separated Values)</option>
                <option value="json">JSON (JavaScript Object Notation)</option>
                <option value="pdf">PDF (Portable Document Format)</option>
                <option value="xlsx">XLSX (Excel Spreadsheet)</option>
                <option value="google_sheets">Google Sheets</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                Custom Filename (optional)
              </label>
              <Input
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder={generateFilename()}
                className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
              />
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium text-[#8b9dc3]">
                Include Options
              </h5>

              {[
                { key: "includeMetadata", label: "Metadata & Contract Info" },
                { key: "includeRawData", label: "Raw Storage Data" },
                { key: "includeAnalysis", label: "Analysis Results" },
                { key: "includeSummary", label: "Executive Summary" },
                { key: "includeCharts", label: "Charts & Visualizations" },
                { key: "compression", label: "Compress Output" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      exportOptions[key as keyof ExportOptions] as boolean
                    }
                    onChange={(e) =>
                      updateExportOption(key as any, e.target.checked)
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />
                  <span className="text-[#8b9dc3] text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-[#00bfff]">Export Preview</h4>

            <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-[#00bfff]" />
                <span className="font-medium text-[#00bfff]">
                  {generateFilename()}
                </span>
              </div>

              <div className="space-y-1 text-sm text-[#8b9dc3]">
                <div>Format: {exportOptions.format.toUpperCase()}</div>
                <div>Estimated Size: {Math.round(estimatedSize / 1024)}KB</div>
                <div>
                  Includes:{" "}
                  {[
                    exportOptions.includeMetadata && "Metadata",
                    exportOptions.includeRawData && "Raw Data",
                    exportOptions.includeAnalysis && "Analysis",
                    exportOptions.includeSummary && "Summary",
                    exportOptions.includeCharts && "Charts",
                  ]
                    .filter(Boolean)
                    .join(", ") || "None"}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
              <h5 className="font-medium text-[#00bfff] mb-2">Data Summary</h5>
              <div className="grid grid-cols-2 gap-2 text-sm text-[#8b9dc3]">
                <div>Storage Slots: {data.storageSlots?.length || 0}</div>
                <div>Analysis Results: {data.analysisResults?.length || 0}</div>
                <div>Historical Points: {data.historicalData?.length || 0}</div>
                <div>
                  Security Findings: {data.securityFindings?.length || 0}
                </div>
              </div>
            </div>

            {exportOptions.format === "pdf" && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-[#8b9dc3]">
                  PDF Options
                </h5>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.password !== undefined}
                    onChange={(e) =>
                      updateExportOption(
                        "password",
                        e.target.checked ? "" : undefined,
                      )
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />
                  <span className="text-[#8b9dc3] text-sm">
                    Password Protection
                  </span>
                </label>
                {exportOptions.password !== undefined && (
                  <Input
                    type="password"
                    value={exportOptions.password}
                    onChange={(e) =>
                      updateExportOption("password", e.target.value)
                    }
                    placeholder="Enter password..."
                    className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExporting && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3]">
                  Exporting... {exportProgress}%
                </span>
              </div>
            )}
          </div>

          <Button
            onClick={executeExport}
            disabled={isExporting}
            className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export {exportOptions.format.toUpperCase()}
          </Button>
        </div>

        {exportHistory.length > 0 && (
          <div>
            <h4 className="font-medium text-[#00bfff] mb-3">Export History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {exportHistory.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    )}
                    <div>
                      <div className="font-medium text-[#00bfff] text-sm">
                        {result.filename}
                      </div>
                      <div className="text-xs text-[#8b9dc3]">
                        {result.format.toUpperCase()} •{" "}
                        {Math.round(result.size / 1024)}KB
                        {result.error && ` • ${result.error}`}
                      </div>
                    </div>
                  </div>

                  {result.success && result.shareUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(result.shareUrl!)
                      }
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
