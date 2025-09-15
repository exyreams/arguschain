import React, { useState } from "react";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import type { LogsAnalysisResults, ParsedTransferLog } from "@/lib/eventlogs";
import { TransferDistributionChart } from "./TransferDistributionChart";
import { VolumeTimelineChart } from "./VolumeTimelineChart";
import { TransferNetworkDiagram } from "./TransferNetworkDiagram";
import {
  Activity,
  BarChart3,
  DollarSign,
  Download,
  Eye,
  Grid3X3,
  Maximize2,
  Network,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

interface LogsChartDashboardProps {
  transfers: ParsedTransferLog[];
  results: LogsAnalysisResults;
  className?: string;
}

export function LogsChartDashboard({
  transfers,
  results,
  className = "",
}: LogsChartDashboardProps) {
  const [selectedLayout, setSelectedLayout] = useState<"grid" | "focus">(
    "grid",
  );
  const [focusedChart, setFocusedChart] = useState<string | null>(null);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#00bfff] mb-2">
            Event Analytics Dashboard
          </h2>
          <p className="text-[#8b9dc3]">
            Comprehensive visualization of {transfers.length.toLocaleString()}{" "}
            transfer events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[rgba(0,191,255,0.1)] text-[#00bfff] border-0">
            {results.statistics.blocks_analyzed} blocks
          </Badge>
          <Badge className="bg-[rgba(0,191,255,0.1)] text-[#00bfff] border-0">
            {results.statistics.unique_senders +
              results.statistics.unique_receivers}{" "}
            addresses
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelectedLayout(selectedLayout === "grid" ? "focus" : "grid")
            }
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {selectedLayout === "grid" ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Grid3X3 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[rgba(0,191,255,0.1)] rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-[#00bfff]" />
            </div>
            <div>
              <div className="text-sm text-[#8b9dc3]">Total Transfers</div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {results.statistics.total_transfers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[rgba(34,197,94,0.1)] rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-sm text-[#8b9dc3]">Total Volume</div>
              <div className="text-2xl font-bold text-green-400">
                {results.statistics.total_volume.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[rgba(168,85,247,0.1)] rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-[#8b9dc3]">Unique Addresses</div>
              <div className="text-2xl font-bold text-purple-400">
                {(
                  results.statistics.unique_senders +
                  results.statistics.unique_receivers
                ).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[rgba(251,191,36,0.1)] rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-sm text-[#8b9dc3]">Avg Transfer</div>
              <div className="text-2xl font-bold text-yellow-400">
                {results.statistics.avg_transfer.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedLayout === "grid" ? (
        <div className="space-y-8">
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[rgba(0,191,255,0.1)] rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-[#00bfff]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Volume Distribution
                  </h3>
                  <p className="text-sm text-[#8b9dc3]">
                    Distribution of transfer amounts showing volume patterns
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusedChart("distribution")}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Focus
              </Button>
            </div>
            <TransferDistributionChart transfers={transfers} height={400} />
          </div>

          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[rgba(34,197,94,0.1)] rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-400">
                    Timeline Analysis
                  </h3>
                  <p className="text-sm text-[#8b9dc3]">
                    Transfer activity over time with volume trends
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusedChart("timeline")}
                className="border-[rgba(34,197,94,0.3)] text-green-400 hover:bg-[rgba(34,197,94,0.1)]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Focus
              </Button>
            </div>
            <VolumeTimelineChart transfers={transfers} height={400} />
          </div>

          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[rgba(168,85,247,0.1)] rounded-lg flex items-center justify-center">
                  <Network className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-400">
                    Network Flow
                  </h3>
                  <p className="text-sm text-[#8b9dc3]">
                    Interactive network diagram showing address relationships
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusedChart("network")}
                className="border-[rgba(168,85,247,0.3)] text-purple-400 hover:bg-[rgba(168,85,247,0.1)]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Focus
              </Button>
            </div>
            <TransferNetworkDiagram transfers={transfers} height={500} />
          </div>
        </div>
      ) : (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[#00bfff]">
              Focused Chart View
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusedChart("distribution")}
                className={`border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)] ${
                  focusedChart === "distribution"
                    ? "bg-[rgba(0,191,255,0.1)] text-[#00bfff]"
                    : "text-[#8b9dc3]"
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Distribution
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusedChart("timeline")}
                className={`border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.1)] ${
                  focusedChart === "timeline"
                    ? "bg-[rgba(34,197,94,0.1)] text-green-400"
                    : "text-[#8b9dc3]"
                }`}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Timeline
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusedChart("network")}
                className={`border-[rgba(168,85,247,0.3)] hover:bg-[rgba(168,85,247,0.1)] ${
                  focusedChart === "network"
                    ? "bg-[rgba(168,85,247,0.1)] text-purple-400"
                    : "text-[#8b9dc3]"
                }`}
              >
                <Network className="h-4 w-4 mr-2" />
                Network
              </Button>
            </div>
          </div>

          {focusedChart === "distribution" && (
            <TransferDistributionChart transfers={transfers} height={600} />
          )}
          {focusedChart === "timeline" && (
            <VolumeTimelineChart transfers={transfers} height={600} />
          )}
          {focusedChart === "network" && (
            <TransferNetworkDiagram transfers={transfers} height={700} />
          )}
          {!focusedChart && (
            <div className="h-96 flex items-center justify-center text-[#8b9dc3]">
              Select a chart to focus on
            </div>
          )}
        </div>
      )}

      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
              Chart Controls
            </h3>
            <p className="text-sm text-[#8b9dc3]">
              Interactive charts with distribution analysis, timeline trends,
              and network visualization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Charts
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
