import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import {
  BarChart3,
  Eye,
  EyeOff,
  Pause,
  Play,
  Table,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  generateAriaLabel,
  highContrastMode,
  screenReader,
} from "@/lib/storagerange/accessibilityUtils";

interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
  color?: string;
  description?: string;
}

interface AccessibleChartProps {
  data: ChartDataPoint[];
  type: "bar" | "pie" | "line" | "area";
  title: string;
  description?: string;
  className?: string;
  height?: number;
  showDataTable?: boolean;
  enableAudio?: boolean;
}

type ViewMode = "chart" | "table" | "both";

export const AccessibleChart: React.FC<AccessibleChartProps> = ({
  data,
  type,
  title,
  description,
  className = "",
  height = 300,
  showDataTable = true,
  enableAudio = true,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [focusedDataPoint, setFocusedDataPoint] = useState(0);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(enableAudio);
  const [showVisualIndicators, setShowVisualIndicators] = useState(true);

  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setIsHighContrast(highContrastMode.isHighContrast());

    const cleanup = highContrastMode.addHighContrastListener((highContrast) => {
      setIsHighContrast(highContrast);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    if (audioEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn("Audio context not supported:", error);
        setAudioEnabled(false);
      }
    }
  }, [audioEnabled]);

  const playTone = useCallback(
    (frequency: number, duration: number = 200) => {
      if (!audioContextRef.current || !audioEnabled) return;

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.setValueAtTime(
        frequency,
        audioContextRef.current.currentTime,
      );
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + duration / 1000,
      );

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    },
    [audioEnabled],
  );

  const valueToFrequency = useCallback(
    (value: number, minValue: number, maxValue: number): number => {
      const minFreq = 200;
      const maxFreq = 800;
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      return minFreq + normalizedValue * (maxFreq - minFreq);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setFocusedDataPoint((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowRight":
          event.preventDefault();
          setFocusedDataPoint((prev) => Math.min(data.length - 1, prev + 1));
          break;
        case "Home":
          event.preventDefault();
          setFocusedDataPoint(0);
          break;
        case "End":
          event.preventDefault();
          setFocusedDataPoint(data.length - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          handleDataPointSelect(focusedDataPoint);
          break;
        case "p":
        case "P":
          if (audioEnabled) {
            event.preventDefault();
            playDataSonification();
          }
          break;
      }
    },
    [data.length, focusedDataPoint, audioEnabled],
  );

  useEffect(() => {
    const chart = chartRef.current;
    if (chart && viewMode !== "table") {
      chart.addEventListener("keydown", handleKeyDown);
      return () => chart.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown, viewMode]);

  useEffect(() => {
    if (data[focusedDataPoint]) {
      const point = data[focusedDataPoint];
      const announcement = generateAriaLabel.chartDataPoint(
        point.name,
        point.value,
        point.category,
      );

      screenReader.announce(announcement, "polite");

      if (audioEnabled) {
        const minValue = Math.min(...data.map((d) => d.value));
        const maxValue = Math.max(...data.map((d) => d.value));
        const frequency = valueToFrequency(point.value, minValue, maxValue);
        playTone(frequency);
      }
    }
  }, [focusedDataPoint, data, audioEnabled, valueToFrequency, playTone]);

  const handleDataPointSelect = (index: number) => {
    const point = data[index];
    if (point) {
      screenReader.announce(
        `Selected ${point.name} with value ${point.value}${
          point.description ? `. ${point.description}` : ""
        }`,
        "assertive",
      );
    }
  };

  const playDataSonification = useCallback(() => {
    if (!audioEnabled || isPlaying) return;

    setIsPlaying(true);
    const minValue = Math.min(...data.map((d) => d.value));
    const maxValue = Math.max(...data.map((d) => d.value));

    let index = 0;
    const playNext = () => {
      if (index >= data.length) {
        setIsPlaying(false);
        screenReader.announce("Data sonification complete", "polite");
        return;
      }

      const point = data[index];
      const frequency = valueToFrequency(point.value, minValue, maxValue);
      playTone(frequency, 300);

      screenReader.announce(`${point.name}: ${point.value}`, "polite");

      index++;
      setTimeout(playNext, 400);
    };

    screenReader.announce("Starting data sonification", "polite");
    playNext();
  }, [data, audioEnabled, isPlaying, valueToFrequency, playTone]);

  const getHighContrastColors = () => {
    if (!isHighContrast) {
      return ["#00bfff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"];
    }

    return ["#ffffff", "#ffff00", "#00ffff", "#ff00ff", "#00ff00", "#ff0000"];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div
          className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg"
          role="tooltip"
          aria-live="polite"
        >
          <p className="text-[#00bfff] font-medium">{label}</p>
          <p className="text-[#8b9dc3]">
            Value: <span className="text-[#00bfff]">{data.value}</span>
          </p>
          {data.payload.description && (
            <p className="text-[#8b9dc3] text-sm mt-1">
              {data.payload.description}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const colors = getHighContrastColors();

    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(139,157,195,0.1)"
            />
            <XAxis
              dataKey="name"
              stroke="#8b9dc3"
              fontSize={12}
              aria-label="Category axis"
            />
            <YAxis stroke="#8b9dc3" fontSize={12} aria-label="Value axis" />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill={colors[0]}
              stroke={isHighContrast ? colors[1] : "none"}
              strokeWidth={isHighContrast ? 2 : 0}
            />
          </BarChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              stroke={isHighContrast ? "#ffffff" : "none"}
              strokeWidth={isHighContrast ? 2 : 0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );

      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(139,157,195,0.1)"
            />
            <XAxis dataKey="name" stroke="#8b9dc3" fontSize={12} />
            <YAxis stroke="#8b9dc3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors[0]}
              strokeWidth={isHighContrast ? 3 : 2}
              dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(139,157,195,0.1)"
            />
            <XAxis dataKey="name" stroke="#8b9dc3" fontSize={12} />
            <YAxis stroke="#8b9dc3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors[0]}
              fill={`${colors[0]}33`}
              strokeWidth={isHighContrast ? 3 : 2}
            />
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3
            className="text-lg font-semibold text-[#00bfff]"
            id={`chart-title-${title.replace(/\s+/g, "-").toLowerCase()}`}
          >
            {title}
          </h3>
          {description && (
            <p
              className="text-sm text-[#8b9dc3] mt-1"
              id={`chart-desc-${title.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showDataTable && (
            <div className="flex items-center gap-1 mr-4">
              <Button
                variant={viewMode === "chart" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("chart")}
                aria-label="Chart view"
                aria-pressed={viewMode === "chart"}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "both" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("both")}
                aria-label="Both chart and table view"
                aria-pressed={viewMode === "both"}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1">
            {audioEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={playDataSonification}
                disabled={isPlaying}
                aria-label={
                  isPlaying
                    ? "Playing data sonification"
                    : "Play data sonification"
                }
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
              aria-label={
                audioEnabled
                  ? "Disable audio feedback"
                  : "Enable audio feedback"
              }
              aria-pressed={audioEnabled}
            >
              {audioEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVisualIndicators(!showVisualIndicators)}
              aria-label={
                showVisualIndicators
                  ? "Hide visual indicators"
                  : "Show visual indicators"
              }
              aria-pressed={showVisualIndicators}
            >
              {showVisualIndicators ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {(viewMode === "chart" || viewMode === "both") && (
        <div className="mb-6">
          <div
            ref={chartRef}
            className="relative focus:outline-none focus:ring-2 focus:ring-[#00bfff] rounded-lg"
            tabIndex={0}
            role="img"
            aria-labelledby={`chart-title-${title.replace(/\s+/g, "-").toLowerCase()}`}
            aria-describedby={`chart-desc-${title.replace(/\s+/g, "-").toLowerCase()} chart-instructions`}
            style={{ height }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>

            {showVisualIndicators && focusedDataPoint >= 0 && (
              <div
                className="absolute top-2 right-2 bg-[rgba(0,191,255,0.9)] text-white px-2 py-1 rounded text-sm"
                aria-hidden="true"
              >
                {data[focusedDataPoint]?.name}: {data[focusedDataPoint]?.value}
              </div>
            )}
          </div>

          <div
            id="chart-instructions"
            className="text-xs text-[#8b9dc3] mt-2"
            aria-live="polite"
          >
            Use arrow keys to navigate data points. Press Enter to select.
            {audioEnabled && " Press P to play data sonification."}
          </div>
        </div>
      )}

      {(viewMode === "table" || viewMode === "both") && (
        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            className="w-full"
            role="table"
            aria-labelledby={`chart-title-${title.replace(/\s+/g, "-").toLowerCase()}`}
            aria-describedby="data-table-description"
          >
            <caption id="data-table-description" className="sr-only">
              {generateAriaLabel.table(
                data.length,
                3,
                `Data table for ${title} with ${data.length} data points`,
              )}
            </caption>

            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#8b9dc3] border-b border-[rgba(0,191,255,0.1)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#8b9dc3] border-b border-[rgba(0,191,255,0.1)]">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#8b9dc3] border-b border-[rgba(0,191,255,0.1)]">
                  Description
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-[rgba(0,191,255,0.05)] hover:bg-[rgba(0,191,255,0.05)]"
                >
                  <td className="px-4 py-3 text-sm text-[#00bfff]">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8b9dc3] font-mono">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : item.value}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8b9dc3]">
                    {item.description || item.category || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        Chart summary: {data.length} data points. Minimum value:{" "}
        {Math.min(...data.map((d) => d.value))}. Maximum value:{" "}
        {Math.max(...data.map((d) => d.value))}. Average value:{" "}
        {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(2)}.
      </div>
    </Card>
  );
};
