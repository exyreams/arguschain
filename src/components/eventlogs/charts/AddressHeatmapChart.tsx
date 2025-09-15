import React, { useMemo, useState, useCallback } from "react";
import { Badge, Button, Dropdown } from "@/components/global";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue, shortenAddress } from "@/lib/eventlogs";
import { Filter } from "lucide-react";
import { forEach } from "lodash";

interface AddressHeatmapChartProps {
  transfers: ParsedTransferLog[];
  height?: number | string;
  className?: string;
  hideTitle?: boolean;
}

interface HeatmapCell {
  from: string;
  to: string;
  value: number;
  intensity: number;
  count: number;
  percentage: number;
}

interface HeatmapData {
  cells: HeatmapCell[];
  addresses: string[];
  maxValue: number;
  totalValue: number;
}

export function AddressHeatmapChart({
  transfers,
  height = 500,
  className = "",
  hideTitle = false,
}: AddressHeatmapChartProps) {
  const [maxAddresses, setMaxAddresses] = useState(12);
  const [colorScheme, setColorScheme] = useState<"blue" | "viridis" | "plasma">(
    "blue"
  );
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [showValues, setShowValues] = useState(false);
  const [showFullAddresses, setShowFullAddresses] = useState(false);

  const heatmapData = useMemo((): HeatmapData => {
    if (!transfers || transfers.length === 0) {
      return { cells: [], addresses: [], maxValue: 0, totalValue: 0 };
    }

    // Calculate address volumes to get top addresses
    const addressVolumes = new Map<string, number>();
    transfers.forEach((transfer) => {
      const fromVol = addressVolumes.get(transfer.from) || 0;
      const toVol = addressVolumes.get(transfer.to) || 0;
      addressVolumes.set(transfer.from, fromVol + transfer.value_pyusd);
      addressVolumes.set(transfer.to, toVol + transfer.value_pyusd);
    });

    // Get top addresses by volume
    const topAddresses = Array.from(addressVolumes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxAddresses)
      .map(([address]) => address);

    // Create flow matrix
    const flowMatrix = new Map<string, HeatmapCell>();
    let totalValue = 0;

    transfers.forEach((transfer) => {
      if (
        topAddresses.includes(transfer.from) &&
        topAddresses.includes(transfer.to)
      ) {
        const key = `${transfer.from}->${transfer.to}`;
        const existing = flowMatrix.get(key) || {
          from: transfer.from,
          to: transfer.to,
          value: 0,
          intensity: 0,
          count: 0,
          percentage: 0,
        };
        existing.value += transfer.value_pyusd;
        existing.count += 1;
        totalValue += transfer.value_pyusd;
        flowMatrix.set(key, existing);
      }
    });

    const cells = Array.from(flowMatrix.values());
    const maxValue = Math.max(...cells.map((cell) => cell.value));

    // Calculate intensities and percentages
    cells.forEach((cell) => {
      cell.intensity = maxValue > 0 ? cell.value / maxValue : 0;
      cell.percentage = totalValue > 0 ? (cell.value / totalValue) * 100 : 0;
    });

    return {
      cells,
      addresses: topAddresses,
      maxValue,
      totalValue,
    };
  }, [transfers, maxAddresses]);

  const getColorByScheme = useCallback(
    (intensity: number): string => {
      const alpha = Math.max(0.1, Math.min(1, intensity));

      switch (colorScheme) {
        case "viridis":
          // Viridis-like color scheme
          const r = Math.floor(68 + (253 - 68) * intensity);
          const g = Math.floor(1 + (231 - 1) * intensity);
          const b = Math.floor(84 + (37 - 84) * intensity);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;

        case "plasma":
          // Plasma-like color scheme
          const pr = Math.floor(13 + (240 - 13) * intensity);
          const pg = Math.floor(8 + (249 - 8) * intensity);
          const pb = Math.floor(135 + (33 - 135) * intensity);
          return `rgba(${pr}, ${pg}, ${pb}, ${alpha})`;

        default: // blue
          return `rgba(0, 191, 255, ${alpha})`;
      }
    },
    [colorScheme]
  );

  const handleCellClick = useCallback(
    (cell: HeatmapCell) => {
      setSelectedCell(
        selectedCell?.from === cell.from && selectedCell?.to === cell.to
          ? null
          : cell
      );
    },
    [selectedCell]
  );

  if (!transfers || transfers.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#00bfff] rounded-full opacity-50"></div>
          </div>
          <p className="text-[#8b9dc3] text-sm">No transfer data available</p>
        </div>
      </div>
    );
  }

  if (heatmapData.addresses.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(255,193,7,0.1)] rounded-full flex items-center justify-center">
            <Filter className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No flows between top addresses
          </p>
        </div>
      </div>
    );
  }

  const cellSize = Math.min(
    (typeof height === "number"
      ? height - 120
      : typeof height === "string"
        ? 600
        : 380) / heatmapData.addresses.length,
    typeof height === "string" ? 60 : 40 // Larger cells in fullscreen
  );

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {heatmapData.addresses.length}×{heatmapData.addresses.length} matrix
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Addresses:</span>
            <Dropdown
              value={maxAddresses.toString()}
              onValueChange={(value) => setMaxAddresses(Number(value))}
              options={[
                { value: "8", label: "8" },
                { value: "10", label: "10" },
                { value: "12", label: "12" },
                { value: "15", label: "15" },
              ]}
              className="min-w-[80px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Colors:</span>
            <Dropdown
              value={colorScheme}
              onValueChange={(value) => setColorScheme(value as any)}
              options={[
                { value: "blue", label: "Blue" },
                { value: "viridis", label: "Viridis" },
                { value: "plasma", label: "Plasma" },
              ]}
              className="min-w-[100px]"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowValues(!showValues)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {showValues ? "Hide" : "Show"} Values
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullAddresses(!showFullAddresses)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {showFullAddresses ? "Short" : "Full"} Addresses
          </Button>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 mb-6 overflow-hidden">
        <div className="flex items-start gap-4 overflow-x-auto">
          {/* Y-axis labels */}
          <div
            className="flex flex-col justify-start pt-8 flex-shrink-0"
            style={{ minWidth: showFullAddresses ? "120px" : "80px" }}
          >
            {heatmapData.addresses.map((address, i) => (
              <div
                key={`y-${address}`}
                className="text-xs text-[#8b9dc3] text-right pr-2 truncate"
                style={{
                  height: `${cellSize}px`,
                  lineHeight: `${cellSize}px`,
                  minHeight: `${cellSize}px`,
                  maxWidth: showFullAddresses ? "120px" : "80px",
                }}
                title={address}
              >
                {showFullAddresses ? address : shortenAddress(address)}
              </div>
            ))}
          </div>

          {/* Main heatmap area */}
          <div className="flex-1 overflow-hidden">
            {/* X-axis labels */}
            <div className="flex mb-2 overflow-hidden">
              {heatmapData.addresses.map((address, i) => (
                <div
                  key={`x-${address}`}
                  className="text-xs text-[#8b9dc3] text-center truncate"
                  style={{
                    width: `${cellSize}px`,
                    transform: "rotate(-45deg)",
                    transformOrigin: "center",
                    height: showFullAddresses ? "60px" : "30px",
                    lineHeight: showFullAddresses ? "60px" : "30px",
                    maxWidth: `${cellSize}px`,
                  }}
                  title={address}
                >
                  {showFullAddresses ? address : shortenAddress(address)}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="relative">
              {heatmapData.addresses.map((fromAddr, i) => (
                <div key={`row-${fromAddr}`} className="flex">
                  {heatmapData.addresses.map((toAddr, j) => {
                    const cell = heatmapData.cells.find(
                      (c) => c.from === fromAddr && c.to === toAddr
                    );
                    const intensity = cell?.intensity || 0;
                    const isSelected =
                      selectedCell?.from === fromAddr &&
                      selectedCell?.to === toAddr;
                    const isDiagonal = i === j;

                    return (
                      <div
                        key={`cell-${fromAddr}-${toAddr}`}
                        className={`border border-[rgba(0,191,255,0.1)] cursor-pointer transition-all duration-200 hover:border-[rgba(0,191,255,0.5)] ${
                          isSelected ? "ring-2 ring-[#00bfff]" : ""
                        } ${isDiagonal ? "opacity-30" : ""}`}
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          backgroundColor:
                            intensity > 0
                              ? getColorByScheme(intensity)
                              : "rgba(25,28,40,0.5)",
                        }}
                        onClick={() => cell && handleCellClick(cell)}
                        title={
                          cell
                            ? `${showFullAddresses ? fromAddr : shortenAddress(fromAddr)} → ${showFullAddresses ? toAddr : shortenAddress(toAddr)}\nValue: ${formatPyusdValue(cell.value)}\nTransfers: ${cell.count}\nPercentage: ${cell.percentage.toFixed(2)}%`
                            : `${showFullAddresses ? fromAddr : shortenAddress(fromAddr)} → ${showFullAddresses ? toAddr : shortenAddress(toAddr)}\nNo transfers`
                        }
                      >
                        {showValues && cell && cell.value > 0 && (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white text-center leading-none">
                              {cell.count}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Color scale legend */}
        <div className="mt-6 flex items-center gap-4">
          <span className="text-sm text-[#8b9dc3]">Flow Intensity:</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6b7280]">Low</span>
            <div className="flex">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 border border-[rgba(0,191,255,0.1)]"
                  style={{
                    backgroundColor: getColorByScheme(i / 9),
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-[#6b7280]">High</span>
          </div>
          <div className="text-xs text-[#8b9dc3]">
            Max: {formatPyusdValue(heatmapData.maxValue)} PYUSD
          </div>
        </div>
      </div>

      {/* Selected Cell Details */}
      {selectedCell && (
        <div className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[#00bfff]">
              Flow Details:{" "}
              {showFullAddresses
                ? selectedCell.from
                : shortenAddress(selectedCell.from)}{" "}
              →{" "}
              {showFullAddresses
                ? selectedCell.to
                : shortenAddress(selectedCell.to)}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCell(null)}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Close
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[#8b9dc3]">Total Value:</span>
              <div className="text-[#00bfff] font-bold">
                {formatPyusdValue(selectedCell.value)} PYUSD
              </div>
            </div>
            <div>
              <span className="text-[#8b9dc3]">Transfer Count:</span>
              <div className="text-[#10b981] font-bold">
                {selectedCell.count}
              </div>
            </div>
            <div>
              <span className="text-[#8b9dc3]">Percentage:</span>
              <div className="text-[#f59e0b] font-bold">
                {selectedCell.percentage.toFixed(2)}%
              </div>
            </div>
            <div>
              <span className="text-[#8b9dc3]">Avg per Transfer:</span>
              <div className="text-[#8b5cf6] font-bold">
                {formatPyusdValue(selectedCell.value / selectedCell.count)}{" "}
                PYUSD
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
          <div className="text-xl font-bold text-[#00bfff] mb-1">
            {formatPyusdValue(heatmapData.totalValue)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Flow</div>
        </div>
        <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
          <div className="text-xl font-bold text-[#10b981] mb-1">
            {heatmapData.cells.length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Active Flows</div>
        </div>
        <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
          <div className="text-xl font-bold text-[#f59e0b] mb-1">
            {formatPyusdValue(heatmapData.maxValue)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Max Flow</div>
        </div>
        <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
          <div className="text-xl font-bold text-[#8b5cf6] mb-1">
            {(
              (heatmapData.cells.length /
                (heatmapData.addresses.length * heatmapData.addresses.length)) *
              100
            ).toFixed(1)}
            %
          </div>
          <div className="text-sm text-[#8b9dc3]">Matrix Density</div>
        </div>
      </div>
    </div>
  );
}
