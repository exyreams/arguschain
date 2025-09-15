import React, { useCallback, useState, useRef } from "react";
import { Button, Badge, Dropdown } from "@/components/global";
import type { LogsAnalysisResults, ParsedTransferLog } from "@/lib/eventlogs";
import { TransferDistributionChart } from "./TransferDistributionChart";
import { VolumeTimelineChart } from "./VolumeTimelineChart";
import { TransferNetworkDiagram } from "./TransferNetworkDiagram";
import { AddressHeatmapChart } from "./AddressHeatmapChart";
import { ParticipantBubbleChart } from "./ParticipantBubbleChart";
import { VolumeTreemapChart } from "./VolumeTreemapChart";
import { AnimatedFlowMap } from "./AnimatedFlowMap";
import { ChartContainer } from "../ChartContainer";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface MultiChartDashboardProps {
  transfers: ParsedTransferLog[];
  results: LogsAnalysisResults;
  className?: string;
}

interface ChartConfig {
  id: string;
  title: string;
  icon: React.ReactNode | null;
  component: React.ComponentType<any>;
  props: any;
  size: "small" | "medium" | "large" | "full";
  category: "distribution" | "temporal" | "network" | "analytics";
  enabled: boolean;
  exportable: boolean;
}

interface DashboardLayout {
  name: string;
  description: string;
  layout: {
    [key: string]: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  };
}

export function MultiChartDashboard({
  transfers,
  results,
  className = "",
}: MultiChartDashboardProps) {
  const [selectedLayout, setSelectedLayout] = useState("default");
  const [enabledCharts, setEnabledCharts] = useState<Set<string>>(
    new Set([
      "distribution",
      "timeline",
      "network",
      "heatmap",
      "bubble",
      "flow",
      "treemap",
    ])
  );
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    [number, number] | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartConfigs: ChartConfig[] = [
    {
      id: "distribution",
      title: "Transfer Distribution",
      icon: null,
      component: TransferDistributionChart,
      props: { transfers, height: 350 },
      size: "medium",
      category: "distribution",
      enabled: true,
      exportable: true,
    },
    {
      id: "heatmap",
      title: "Address Heatmap",
      icon: null,
      component: AddressHeatmapChart,
      props: { transfers, height: 350 },
      size: "medium",
      category: "analytics",
      enabled: true,
      exportable: true,
    },
    {
      id: "timeline",
      title: "Volume Timeline",
      icon: null,
      component: VolumeTimelineChart,
      props: {
        transfers,
        height: 350,
        onBrushChange: syncEnabled ? setSelectedTimeRange : undefined,
        brushDomain: selectedTimeRange,
      },
      size: "medium",
      category: "temporal",
      enabled: true,
      exportable: true,
    },
    {
      id: "treemap",
      title: "Volume Distribution",
      icon: null,
      component: VolumeTreemapChart,
      props: { results, height: 350 },
      size: "medium",
      category: "distribution",
      enabled: true,
      exportable: true,
    },
    {
      id: "network",
      title: "Network Diagram",
      icon: null,
      component: TransferNetworkDiagram,
      props: { transfers, height: 450 },
      size: "full",
      category: "network",
      enabled: true,
      exportable: true,
    },
    {
      id: "bubble",
      title: "Participant Analysis",
      icon: null,
      component: ParticipantBubbleChart,
      props: { results, height: 350 },
      size: "medium",
      category: "analytics",
      enabled: true,
      exportable: true,
    },
    {
      id: "flow",
      title: "Flow Animation",
      icon: null,
      component: AnimatedFlowMap,
      props: { transfers, height: 350 },
      size: "medium",
      category: "network",
      enabled: true,
      exportable: true,
    },
  ];

  const layouts: DashboardLayout[] = [
    {
      name: "default",
      description: "Balanced Overview",
      layout: {
        // Row 1: Transfer Distribution + Address Heatmap (side by side)
        distribution: { x: 0, y: 0, w: 6, h: 5 },
        heatmap: { x: 6, y: 0, w: 6, h: 5 },
        // Row 2: Volume Timeline + Volume Treemap (side by side)
        timeline: { x: 0, y: 5, w: 6, h: 5 },
        treemap: { x: 6, y: 5, w: 6, h: 5 },
        // Row 3: Network Diagram (full width, contained)
        network: { x: 0, y: 10, w: 12, h: 6 },
        // Row 4: Participant Bubbles + Flow Animation
        bubble: { x: 0, y: 16, w: 6, h: 4 },
        flow: { x: 6, y: 16, w: 6, h: 4 },
      },
    },
    {
      name: "analytics",
      description: "Analytics Focus",
      layout: {
        distribution: { x: 0, y: 0, w: 6, h: 5 },
        heatmap: { x: 6, y: 0, w: 6, h: 5 },
        timeline: { x: 0, y: 5, w: 6, h: 5 },
        treemap: { x: 6, y: 5, w: 6, h: 5 },
        bubble: { x: 0, y: 10, w: 6, h: 4 },
        flow: { x: 6, y: 10, w: 6, h: 4 },
        network: { x: 0, y: 14, w: 12, h: 6 },
      },
    },
    {
      name: "network",
      description: "Network Focus",
      layout: {
        network: { x: 0, y: 0, w: 12, h: 8 },
        flow: { x: 0, y: 8, w: 6, h: 4 },
        bubble: { x: 6, y: 8, w: 6, h: 4 },
      },
    },
  ];

  const layoutOptions = layouts.map((layout) => ({
    value: layout.name,
    label: layout.description,
  }));

  const activeCharts = chartConfigs.filter((chart) =>
    enabledCharts.has(chart.id)
  );

  const toggleChart = useCallback((chartId: string) => {
    setEnabledCharts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chartId)) {
        newSet.delete(chartId);
      } else {
        newSet.add(chartId);
      }
      return newSet;
    });
  }, []);

  const getGridSize = (size: ChartConfig["size"]) => {
    switch (size) {
      case "small":
        return "col-span-3";
      case "medium":
        return "col-span-6";
      case "large":
        return "col-span-9";
      case "full":
        return "col-span-12";
      default:
        return "col-span-6";
    }
  };

  return (
    <div ref={containerRef} className={`space-y-4 ${className}`}>
      {/* Simplified Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] px-3 py-1"
          >
            {activeCharts.length} active
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            value={selectedLayout}
            onValueChange={setSelectedLayout}
            options={layoutOptions}
            placeholder="Select Layout"
            className="min-w-[140px]"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSyncEnabled(!syncEnabled)}
            className={`border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)] transition-all duration-200 ${
              syncEnabled ? "text-[#00bfff]" : "text-[#6b7280]"
            }`}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Sync {syncEnabled ? "On" : "Off"}
          </Button>

          <div className="flex items-center gap-1">
            {chartConfigs.map((chart) => (
              <Button
                key={chart.id}
                variant="outline"
                size="sm"
                onClick={() => toggleChart(chart.id)}
                className={`border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)] px-3 py-1 transition-all duration-200 ${
                  enabledCharts.has(chart.id)
                    ? "text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    : "text-[#6b7280]"
                }`}
                title={chart.title}
              >
                {chart.title}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-12 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, staggerChildren: 0.1 }}
      >
        {activeCharts.map((chart, index) => {
          const ChartComponent = chart.component;
          return (
            <motion.div
              key={chart.id}
              className={getGridSize(chart.size)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <ChartContainer
                title={chart.title}
                data={chart.props}
                exportable={chart.exportable}
              >
                <ChartComponent {...chart.props} />
              </ChartContainer>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Compact Stats Footer */}
      <motion.div
        className="bg-[rgba(0,191,255,0.03)] border border-[rgba(0,191,255,0.08)] rounded-lg p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-base font-semibold text-[#00bfff]">
              {activeCharts.length}
            </div>
            <div className="text-xs text-[#8b9dc3]">Charts</div>
          </div>
          <div>
            <div className="text-base font-semibold text-[#00bfff]">
              {transfers.length.toLocaleString()}
            </div>
            <div className="text-xs text-[#8b9dc3]">Data Points</div>
          </div>
          <div>
            <div className="text-base font-semibold text-[#00bfff]">
              {syncEnabled ? "On" : "Off"}
            </div>
            <div className="text-xs text-[#8b9dc3]">Sync</div>
          </div>
          <div>
            <div className="text-base font-semibold text-[#00bfff]">
              {layouts.find((l) => l.name === selectedLayout)?.description}
            </div>
            <div className="text-xs text-[#8b9dc3]">Layout</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
