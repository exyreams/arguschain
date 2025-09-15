import React, { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import type { LogsAnalysisResults } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";

interface VolumeTreemapChartProps {
  results: LogsAnalysisResults;
  height?: number | string;
  className?: string;
  hideTitle?: boolean;
}

interface TreemapData {
  name: string;
  size: number;
  value: number;
  percentage: number;
  transactions: number;
  address: string;
  color: string;
  [key: string]: any; // Index signature required by Recharts
}

const CustomizedContent = (props: any) => {
  const { x, y, width, height, payload, name } = props;

  // Early return if dimensions are too small or payload is missing
  if (width < 10 || height < 10) return null;

  const fontSize = Math.min(width / 6, height / 3, 14);
  const textColor = "#ffffff";

  // Provide fallback values for payload properties
  const cellColor = payload?.color || "hsl(200, 70%, 50%)";
  const cellName = payload?.name || name || "Unknown";
  const cellValue = payload?.value || 0;
  const cellPercentage = payload?.percentage || 0;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: cellColor,
          stroke: "rgba(0,191,255,0.4)",
          strokeWidth: 2,
        }}
      />
      {width > 60 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2 - fontSize / 2}
          textAnchor="middle"
          fill={textColor}
          fontSize={fontSize}
          fontWeight="bold"
        >
          {cellName}
        </text>
      )}
      {width > 80 && height > 50 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + fontSize / 2}
          textAnchor="middle"
          fill={textColor}
          fontSize={fontSize * 0.8}
        >
          {formatPyusdValue(cellValue)}
        </text>
      )}
      {width > 100 && height > 70 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + fontSize * 1.5}
          textAnchor="middle"
          fill={textColor}
          fontSize={fontSize * 0.7}
        >
          {cellPercentage.toFixed(1)}%
        </text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length && payload[0]?.payload) {
    const data = payload[0].payload as TreemapData;

    // Ensure data exists and has required properties
    if (!data || typeof data !== "object") {
      return null;
    }

    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{data.name || "Unknown"}</p>
        <div className="space-y-1 mt-2">
          <p className="text-white text-sm">
            Volume: {formatPyusdValue(data.value || 0)} PYUSD
          </p>
          <p className="text-white text-sm">
            Transactions: {(data.transactions || 0).toLocaleString()}
          </p>
          <p className="text-white text-sm">
            Market Share: {(data.percentage || 0).toFixed(2)}%
          </p>
          <p className="text-white text-sm">
            Address: {data.address || "Unknown"}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const VolumeTreemapChart: React.FC<VolumeTreemapChartProps> = ({
  results,
  height = 400,
  className = "",
  hideTitle = false,
}) => {
  // Debug logging
  console.log("VolumeTreemapChart - results:", results ? "present" : "missing");

  // Early return if results is not properly structured
  if (!results || typeof results !== "object") {
    console.log("VolumeTreemapChart: Invalid results structure", results);
    return (
      <div
        className={`h-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center gap-2 mb-4"></div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-[#00bfff] rounded-full opacity-50"></div>
            </div>
            <p className="text-[#8b9dc3] text-sm">No data available</p>
            <p className="text-[#6b7280] text-xs mt-1">
              Waiting for analysis results...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const treemapData = useMemo(() => {
    try {
      // Try top_senders first, then fall back to top_receivers
      let participants = results?.top_senders;
      let participantType = "senders";

      if (
        !participants ||
        !Array.isArray(participants) ||
        participants.length === 0
      ) {
        participants = results?.top_receivers;
        participantType = "receivers";
      }

      if (
        !participants ||
        !Array.isArray(participants) ||
        participants.length === 0
      ) {
        console.log("No participants found in results:", results);
        return [];
      }

      const validParticipants = participants.filter(
        (participant) =>
          participant &&
          typeof participant.total_value === "number" &&
          participant.total_value > 0
      );

      if (validParticipants.length === 0) {
        console.log("No valid participants after filtering");
        return [];
      }

      // Sort by volume descending to ensure largest participants are first
      validParticipants.sort((a, b) => b.total_value - a.total_value);

      const maxVolume = validParticipants[0].total_value;
      const totalVolume = validParticipants.reduce(
        (sum, p) => sum + p.total_value,
        0
      );

      const data: TreemapData[] = validParticipants
        .slice(0, 15) // Limit to top 15 for better visualization
        .map((participant, index) => {
          // Create distinct colors with better contrast
          const colorPalette = [
            "hsl(220, 70%, 50%)", // Blue
            "hsl(280, 70%, 55%)", // Purple
            "hsl(340, 70%, 50%)", // Pink
            "hsl(40, 70%, 50%)", // Orange
            "hsl(120, 70%, 40%)", // Green
            "hsl(180, 70%, 45%)", // Cyan
            "hsl(260, 70%, 60%)", // Violet
            "hsl(20, 70%, 50%)", // Red-Orange
            "hsl(160, 70%, 40%)", // Teal
            "hsl(300, 70%, 55%)", // Magenta
            "hsl(200, 70%, 45%)", // Light Blue
            "hsl(80, 70%, 45%)", // Yellow-Green
            "hsl(320, 70%, 50%)", // Hot Pink
            "hsl(60, 70%, 50%)", // Yellow
            "hsl(140, 70%, 40%)", // Forest Green
          ];

          // Calculate relative size for better color intensity
          const relativeSize = participant.total_value / maxVolume;
          const baseColorIndex = index % colorPalette.length;
          const baseColor = colorPalette[baseColorIndex];

          // Adjust lightness based on relative volume (30% to 65% range)
          const hueMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
          let finalColor = baseColor;

          if (hueMatch) {
            const hue = parseInt(hueMatch[1]);
            const saturation = parseInt(hueMatch[2]);
            // Higher volume = brighter color (within reasonable range)
            const lightness = Math.round(30 + relativeSize * 35);
            finalColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          }

          // Calculate percentage of total volume
          const volumePercentage =
            (participant.total_value / totalVolume) * 100;

          const item: TreemapData = {
            name:
              participant.address_short ||
              participant.address?.slice(0, 8) ||
              `${participantType === "senders" ? "Sender" : "Receiver"} ${index + 1}`,
            size: participant.total_value,
            value: participant.total_value,
            percentage: volumePercentage,
            transactions: participant.transactions || 0,
            address: participant.address || "",
            color: finalColor,
          };

          return item;
        });

      console.log("Generated treemap data:", data.length, "items");
      return data;
    } catch (error) {
      console.error("Error generating treemap data:", error);
      return [];
    }
  }, [results]);

  if (treemapData.length === 0) {
    const sendersCount = results?.top_senders?.length || 0;
    const receiversCount = results?.top_receivers?.length || 0;

    return (
      <div
        className={`h-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center gap-2 mb-4"></div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-[#00bfff] rounded-full opacity-50"></div>
            </div>
            <p className="text-[#8b9dc3] text-sm">No volume data to display</p>
            <div className="text-[#6b7280] text-xs mt-2 space-y-1">
              <p>
                Senders: {sendersCount} • Receivers: {receiversCount}
              </p>
              {sendersCount === 0 && receiversCount === 0 && (
                <p>Run an analysis to see volume distribution</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div
        data-chart="true"
        className={`h-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"></div>
          <div className="text-sm text-[#8b9dc3]">
            {treemapData.length} participants
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: typeof height === "number" ? `${height}px` : height,
            minHeight: "400px",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="rgba(0,191,255,0.4)"
              content={<CustomizedContent />}
            >
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0,191,255,0.1)" }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-[#8b9dc3]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[hsl(220,85%,45%)] rounded-sm"></div>
            <span>Low Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[hsl(280,85%,55%)] rounded-sm"></div>
            <span>Medium Volume</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[hsl(340,85%,65%)] rounded-sm"></div>
            <span>High Volume</span>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-[#6b7280]">
          Size represents volume • Color intensity shows relative volume
        </div>
      </div>
    );
  } catch (error) {
    console.error("VolumeTreemapChart render error:", error);
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center">
            <div className="w-10 h-10 bg-red-500 rounded-full opacity-50"></div>
          </div>
          <p className="text-red-400 text-lg font-medium">
            Chart Rendering Error
          </p>
          <p className="text-[#6b7280] text-sm mt-2">
            Unable to render the chart with the current data
          </p>
          <p className="text-[#6b7280] text-xs mt-1">
            This might be due to insufficient data or data format issues
          </p>
        </div>
      </div>
    );
  }
};
