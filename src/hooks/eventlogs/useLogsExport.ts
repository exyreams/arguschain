import { useCallback, useState } from "react";
import type { LogsAnalysisResults } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";

export interface ExportStatus {
  type: "idle" | "exporting" | "success" | "error";
  message?: string;
  progress?: number;
}

export interface ExportOptions {
  filename?: string;
  includeMetadata?: boolean;
  includeRawData?: boolean;
  includeAnalytics?: boolean;
  dateFormat?: "iso" | "locale" | "timestamp";
}

export function useCsvExport() {
  const [status, setStatus] = useState<ExportStatus>({ type: "idle" });

  const exportToCsv = useCallback(
    async (data: LogsAnalysisResults, options: ExportOptions = {}) => {
      setStatus({
        type: "exporting",
        message: "Generating CSV...",
        progress: 0,
      });

      try {
        const {
          filename,
          includeMetadata = true,
          includeRawData = true,
          dateFormat = "iso",
        } = options;

        const timestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:.]/g, "-");
        const blockRange = `${data.query_info.from_block}-${data.query_info.to_block}`;
        const finalFilename =
          filename || `pyusd-logs-${blockRange}-${timestamp}.csv`;

        setStatus({
          type: "exporting",
          message: "Preparing data...",
          progress: 25,
        });

        let csvContent = "";

        if (includeMetadata) {
          const metadataLines = [
            "# PYUSD Transfer Logs Analysis",
            `# Generated: ${new Date().toISOString()}`,
            `# Network: ${data.query_info.network}`,
            `# Block Range: ${data.query_info.from_block} - ${data.query_info.to_block}`,
            `# Contract: ${data.query_info.contract_address}`,
            `# Total Transfers: ${data.statistics.total_transfers}`,
            `# Total Volume: ${formatPyusdValue(data.statistics.total_volume)} PYUSD`,
            `# Unique Senders: ${data.statistics.unique_senders}`,
            `# Unique Receivers: ${data.statistics.unique_receivers}`,
            `# Analysis Duration: ${data.query_info.execution_time_ms}ms`,
            "#",
          ];
          csvContent += metadataLines.join("\n") + "\n";
        }

        setStatus({
          type: "exporting",
          message: "Processing transfers...",
          progress: 50,
        });

        if (includeRawData && data.raw_logs.length > 0) {
          const headers = [
            "Block Number",
            "Transaction Hash",
            "Log Index",
            "From Address",
            "To Address",
            "Value (PYUSD)",
            "Value (Raw)",
            "Timestamp",
            "Date Time",
          ];

          const rows = data.raw_logs.map((log) => [
            log.blockNumber.toString(),
            log.transactionHash,
            log.logIndex.toString(),
            log.from,
            log.to,
            log.value_pyusd.toString(),
            log.value_raw,
            log.timestamp?.toString() || "",
            formatDateTime(log.datetime, dateFormat),
          ]);

          csvContent += headers.join(",") + "\n";
          csvContent += rows
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n");
        }

        setStatus({
          type: "exporting",
          message: "Creating download...",
          progress: 75,
        });

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        setStatus({
          type: "success",
          message: `Exported ${data.raw_logs.length} transfers to CSV`,
          progress: 100,
        });

        setTimeout(() => setStatus({ type: "idle" }), 3000);
      } catch (error) {
        setStatus({
          type: "error",
          message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });

        setTimeout(() => setStatus({ type: "idle" }), 5000);
      }
    },
    []
  );

  return { exportToCsv, status };
}

export function useJsonExport() {
  const [status, setStatus] = useState<ExportStatus>({ type: "idle" });

  const exportToJson = useCallback(
    async (data: LogsAnalysisResults, options: ExportOptions = {}) => {
      setStatus({
        type: "exporting",
        message: "Generating JSON...",
        progress: 0,
      });

      try {
        const {
          filename,
          includeMetadata = true,
          includeRawData = true,
          includeAnalytics = true,
        } = options;

        const timestamp = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:.]/g, "-");
        const blockRange = `${data.query_info.from_block}-${data.query_info.to_block}`;
        const finalFilename =
          filename || `pyusd-logs-${blockRange}-${timestamp}.json`;

        setStatus({
          type: "exporting",
          message: "Structuring data...",
          progress: 25,
        });

        const exportData: any = {};

        if (includeMetadata) {
          exportData.metadata = {
            export_type: "PYUSD Transfer Logs Analysis",
            generated_at: new Date().toISOString(),
            version: "1.0",
            network: data.query_info.network,
            block_range: {
              from: data.query_info.from_block,
              to: data.query_info.to_block,
            },
            contract_address: data.query_info.contract_address,
            analysis_duration_ms: data.query_info.execution_time_ms,
          };
        }

        setStatus({
          type: "exporting",
          message: "Adding analytics...",
          progress: 50,
        });

        if (includeAnalytics) {
          exportData.statistics = data.statistics;
          exportData.network_analysis = data.network_analysis;
          exportData.top_participants = {
            senders: data.top_senders,
            receivers: data.top_receivers,
          };
          exportData.top_flows = data.top_flows;
          exportData.time_series = data.time_series;
          exportData.distribution_buckets = data.distribution_buckets;
        }

        setStatus({
          type: "exporting",
          message: "Adding raw data...",
          progress: 75,
        });

        if (includeRawData) {
          exportData.raw_transfers = data.raw_logs;
        }

        const jsonContent = JSON.stringify(exportData, null, 2);

        setStatus({
          type: "exporting",
          message: "Creating download...",
          progress: 90,
        });

        const blob = new Blob([jsonContent], {
          type: "application/json;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        setStatus({
          type: "success",
          message: "Exported complete analysis data to JSON",
          progress: 100,
        });

        setTimeout(() => setStatus({ type: "idle" }), 3000);
      } catch (error) {
        setStatus({
          type: "error",
          message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });

        setTimeout(() => setStatus({ type: "idle" }), 5000);
      }
    },
    []
  );

  return { exportToJson, status };
}

export function useBatchExport() {
  const [status, setStatus] = useState<ExportStatus>({ type: "idle" });
  const { exportToCsv } = useCsvExport();
  const { exportToJson } = useJsonExport();

  const exportBatch = useCallback(
    async (
      data: LogsAnalysisResults,
      formats: Array<"csv" | "json">,
      options: ExportOptions = {}
    ) => {
      setStatus({
        type: "exporting",
        message: "Starting batch export...",
        progress: 0,
      });

      try {
        const totalFormats = formats.length;
        let completedFormats = 0;

        for (const format of formats) {
          setStatus({
            type: "exporting",
            message: `Exporting ${format.toUpperCase()}...`,
            progress: (completedFormats / totalFormats) * 100,
          });

          if (format === "csv") {
            await exportToCsv(data, options);
          } else if (format === "json") {
            await exportToJson(data, options);
          }

          completedFormats++;
        }

        setStatus({
          type: "success",
          message: `Exported ${totalFormats} files successfully`,
          progress: 100,
        });

        setTimeout(() => setStatus({ type: "idle" }), 3000);
      } catch (error) {
        setStatus({
          type: "error",
          message: `Batch export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });

        setTimeout(() => setStatus({ type: "idle" }), 5000);
      }
    },
    [exportToCsv, exportToJson]
  );

  return { exportBatch, status };
}

export function useExportProgress() {
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    stage: string;
    isActive: boolean;
  }>({
    current: 0,
    total: 0,
    stage: "",
    isActive: false,
  });

  const startProgress = useCallback((total: number, stage: string) => {
    setProgress({
      current: 0,
      total,
      stage,
      isActive: true,
    });
  }, []);

  const updateProgress = useCallback((current: number, stage?: string) => {
    setProgress((prev) => ({
      ...prev,
      current,
      stage: stage || prev.stage,
    }));
  }, []);

  const completeProgress = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      current: prev.total,
      isActive: false,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      current: 0,
      total: 0,
      stage: "",
      isActive: false,
    });
  }, []);

  const progressPercentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return {
    progress,
    progressPercentage,
    startProgress,
    updateProgress,
    completeProgress,
    resetProgress,
  };
}

export function useExportHistory() {
  const [history, setHistory] = useState<
    Array<{
      id: string;
      timestamp: Date;
      format: string;
      filename: string;
      size: number;
      status: "success" | "error";
      error?: string;
    }>
  >([]);

  const addExport = useCallback(
    (exportInfo: {
      format: string;
      filename: string;
      size: number;
      status: "success" | "error";
      error?: string;
    }) => {
      const newExport = {
        id: Date.now().toString(),
        timestamp: new Date(),
        ...exportInfo,
      };

      setHistory((prev) => [newExport, ...prev].slice(0, 50));
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getSuccessfulExports = useCallback(() => {
    return history.filter((exp) => exp.status === "success");
  }, [history]);

  const getFailedExports = useCallback(() => {
    return history.filter((exp) => exp.status === "error");
  }, [history]);

  return {
    history,
    addExport,
    clearHistory,
    getSuccessfulExports,
    getFailedExports,
  };
}

function formatDateTime(
  date: Date | undefined,
  format: "iso" | "locale" | "timestamp"
): string {
  if (!date) return "";

  switch (format) {
    case "iso":
      return date.toISOString();
    case "locale":
      return date.toLocaleString();
    case "timestamp":
      return Math.floor(date.getTime() / 1000).toString();
    default:
      return date.toISOString();
  }
}
