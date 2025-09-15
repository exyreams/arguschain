import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCcw,
  TrendingUp,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface ChartDataPoint {
  [key: string]: string | number;
}

interface VirtualizedChartProps {
  data: ChartDataPoint[];
  type: "bar" | "pie" | "line" | "scatter";
  title: string;
  xKey: string;
  yKey: string;
  className?: string;
  pageSize?: number;
  enableVirtualization?: boolean;
  enableSampling?: boolean;
  samplingRate?: number;
}

interface ChartState {
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  samplingEnabled: boolean;
  virtualizationEnabled: boolean;
}

export const VirtualizedChart: React.FC<VirtualizedChartProps> = ({
  data,
  type,
  title,
  xKey,
  yKey,
  className,
  pageSize = 50,
  enableVirtualization = true,
  enableSampling = true,
  samplingRate = 0.1,
}) => {
  const [state, setState] = useState<ChartState>({
    currentPage: 0,
    totalPages: Math.ceil(data.length / pageSize),
    zoomLevel: 1,
    samplingEnabled: enableSampling && data.length > 1000,
    virtualizationEnabled: enableVirtualization && data.length > 100,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 400,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: width || 800, height: height || 400 });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const processedData = useMemo(() => {
    let result = [...data];

    if (state.samplingEnabled && result.length > 1000) {
      const sampleSize = Math.max(
        100,
        Math.floor(result.length * samplingRate),
      );
      const step = Math.floor(result.length / sampleSize);
      result = result.filter((_, index) => index % step === 0);
    }

    if (state.virtualizationEnabled) {
      const startIndex = state.currentPage * pageSize;
      const endIndex = startIndex + pageSize;
      result = result.slice(startIndex, endIndex);
    }

    if (state.zoomLevel > 1) {
      const zoomFactor = 1 / state.zoomLevel;
      const centerIndex = Math.floor(result.length / 2);
      const rangeSize = Math.floor(result.length * zoomFactor);
      const startIndex = Math.max(0, centerIndex - rangeSize / 2);
      const endIndex = Math.min(result.length, startIndex + rangeSize);
      result = result.slice(startIndex, endIndex);
    }

    return result;
  }, [data, state, pageSize, samplingRate]);

  const chartConfig = useMemo(() => {
    const dataSize = processedData.length;

    return {
      animationDuration: dataSize > 100 ? 0 : 300,
      strokeWidth: dataSize > 500 ? 1 : 2,
      dotSize: dataSize > 200 ? 2 : 4,
      barSize: Math.max(2, Math.min(20, containerSize.width / dataSize)),
    };
  }, [processedData.length, containerSize.width]);

  const handlePrevPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.max(0, prev.currentPage - 1),
    }));
  }, []);

  const handleNextPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.min(prev.totalPages - 1, prev.currentPage + 1),
    }));
  }, []);

  const handleZoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoomLevel: Math.min(5, prev.zoomLevel * 1.5),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoomLevel: Math.max(0.5, prev.zoomLevel / 1.5),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentPage: 0,
      zoomLevel: 1,
    }));
  }, []);

  const toggleSampling = useCallback(() => {
    setState((prev) => ({
      ...prev,
      samplingEnabled: !prev.samplingEnabled,
    }));
  }, []);

  const toggleVirtualization = useCallback(() => {
    setState((prev) => ({
      ...prev,
      virtualizationEnabled: !prev.virtualizationEnabled,
      currentPage: 0,
    }));
  }, []);

  const getColor = useCallback((index: number) => {
    const colors = [
      "#00bfff",
      "#0099cc",
      "#8b9dc3",
      "#00ff88",
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
      "#ff9ff3",
    ];
    return colors[index % colors.length];
  }, []);

  const renderChart = () => {
    const commonProps = {
      data: processedData,
      width: containerSize.width,
      height: containerSize.height - 100,
    };

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid
                strokeDasharray="3,3"
                stroke="rgba(139,157,195,0.2)"
              />
              <XAxis
                dataKey={xKey}
                stroke="#8b9dc3"
                fontSize={12}
                interval={processedData.length > 20 ? "preserveStartEnd" : 0}
              />
              <YAxis stroke="#8b9dc3" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(25,28,40,0.9)",
                  border: "1px solid rgba(0,191,255,0.3)",
                  borderRadius: "8px",
                  color: "#00bfff",
                }}
              />
              <Bar
                dataKey={yKey}
                fill="#00bfff"
                maxBarSize={chartConfig.barSize}
                animationDuration={chartConfig.animationDuration}
              >
                {processedData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid
                strokeDasharray="3,3"
                stroke="rgba(139,157,195,0.2)"
              />
              <XAxis
                dataKey={xKey}
                stroke="#8b9dc3"
                fontSize={12}
                interval={processedData.length > 20 ? "preserveStartEnd" : 0}
              />
              <YAxis stroke="#8b9dc3" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(25,28,40,0.9)",
                  border: "1px solid rgba(0,191,255,0.3)",
                  borderRadius: "8px",
                  color: "#00bfff",
                }}
              />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="#00bfff"
                strokeWidth={chartConfig.strokeWidth}
                dot={{ r: chartConfig.dotSize }}
                animationDuration={chartConfig.animationDuration}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
              <CartesianGrid
                strokeDasharray="3,3"
                stroke="rgba(139,157,195,0.2)"
              />
              <XAxis
                dataKey={xKey}
                stroke="#8b9dc3"
                fontSize={12}
                type="number"
              />
              <YAxis
                dataKey={yKey}
                stroke="#8b9dc3"
                fontSize={12}
                type="number"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(25,28,40,0.9)",
                  border: "1px solid rgba(0,191,255,0.3)",
                  borderRadius: "8px",
                  color: "#00bfff",
                }}
              />
              <Scatter
                dataKey={yKey}
                fill="#00bfff"
                animationDuration={chartConfig.animationDuration}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                outerRadius={
                  Math.min(containerSize.width, containerSize.height) / 4
                }
                fill="#00bfff"
                dataKey={yKey}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                animationDuration={chartConfig.animationDuration}
              >
                {processedData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(index)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(25,28,40,0.9)",
                  border: "1px solid rgba(0,191,255,0.3)",
                  borderRadius: "8px",
                  color: "#00bfff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">{title}</h3>
            <Badge className="bg-[rgba(0,191,255,0.2)] border-[rgba(0,191,255,0.5)] text-[#00bfff]">
              {processedData.length} / {data.length} items
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSampling}
              className={`border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] ${
                state.samplingEnabled ? "bg-[rgba(0,191,255,0.1)]" : ""
              }`}
            >
              <Layers className="h-3 w-3 mr-1" />
              Sampling
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleVirtualization}
              className={`border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] ${
                state.virtualizationEnabled ? "bg-[rgba(0,191,255,0.1)]" : ""
              }`}
            >
              <Layers className="h-3 w-3 mr-1" />
              Virtual
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="w-full h-96 bg-[rgba(25,28,40,0.6)] rounded-lg p-4"
        >
          {renderChart()}
        </div>

        <div className="flex items-center justify-between">
          {state.virtualizationEnabled && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={state.currentPage === 0}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>

              <span className="text-sm text-[#8b9dc3]">
                Page {state.currentPage + 1} of {state.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={state.currentPage === state.totalPages - 1}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={state.zoomLevel <= 0.5}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>

            <span className="text-sm text-[#8b9dc3] min-w-[60px] text-center">
              {Math.round(state.zoomLevel * 100)}%
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={state.zoomLevel >= 5}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#8b9dc3]">
          <div className="flex items-center gap-4">
            <span>Rendering: {processedData.length} items</span>
            <span>
              Animation:{" "}
              {chartConfig.animationDuration > 0 ? "Enabled" : "Disabled"}
            </span>
            <span>
              Sampling: {state.samplingEnabled ? "Active" : "Inactive"}
            </span>
          </div>
          <div>
            Zoom: {state.zoomLevel.toFixed(1)}x | Page: {state.currentPage + 1}/
            {state.totalPages}
          </div>
        </div>
      </div>
    </Card>
  );
};
