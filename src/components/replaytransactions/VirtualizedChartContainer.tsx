import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge, Button, Card } from "@/components/global";
import {
  AlertTriangle,
  BarChart3,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPoint {
  x: any;
  y: any;
  [key: string]: any;
}

interface ChartSeries {
  id: string;
  name: string;
  data: DataPoint[];
  color?: string;
  type?: "line" | "bar" | "area" | "scatter";
}

interface VirtualizedChartContainerProps {
  series: ChartSeries[];
  width?: number;
  height?: number;
  maxDataPoints?: number;
  samplingStrategy?: "uniform" | "adaptive" | "peak-preserving" | "time-based";
  aggregationMethod?: "average" | "sum" | "min" | "max" | "median";
  onDataPointClick?: (point: DataPoint, seriesId: string) => void;
  onZoomChange?: (range: { start: any; end: any }) => void;
  className?: string;
  showControls?: boolean;
  showPerformanceMetrics?: boolean;
}

class DataSamplingEngine {
  static uniformSampling(data: DataPoint[], targetSize: number): DataPoint[] {
    if (data.length <= targetSize) return data;

    const step = data.length / targetSize;
    const sampled: DataPoint[] = [];

    for (let i = 0; i < targetSize; i++) {
      const index = Math.floor(i * step);
      sampled.push(data[index]);
    }

    return sampled;
  }

  static adaptiveSampling(data: DataPoint[], targetSize: number): DataPoint[] {
    if (data.length <= targetSize) return data;

    const variances = data.map((point, index) => {
      if (index === 0 || index === data.length - 1) return Infinity;

      const prev = data[index - 1];
      const next = data[index + 1];
      const avgY = (prev.y + next.y) / 2;

      return Math.abs(point.y - avgY);
    });

    const indexed = data.map((point, index) => ({
      point,
      variance: variances[index],
      index,
    }));
    indexed.sort((a, b) => b.variance - a.variance);

    const highVarianceCount = Math.floor(targetSize * 0.3);
    const uniformCount = targetSize - highVarianceCount;

    const highVariancePoints = indexed
      .slice(0, highVarianceCount)
      .map((item) => item.point);
    const remainingData = indexed
      .slice(highVarianceCount)
      .map((item) => item.point);
    const uniformPoints = this.uniformSampling(remainingData, uniformCount);

    return [...highVariancePoints, ...uniformPoints].sort((a, b) => {
      const aIndex = data.indexOf(a);
      const bIndex = data.indexOf(b);
      return aIndex - bIndex;
    });
  }

  static peakPreservingSampling(
    data: DataPoint[],
    targetSize: number,
  ): DataPoint[] {
    if (data.length <= targetSize) return data;

    const peaks: DataPoint[] = [];
    const valleys: DataPoint[] = [];

    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];

      if (current.y > prev.y && current.y > next.y) {
        peaks.push(current);
      } else if (current.y < prev.y && current.y < next.y) {
        valleys.push(current);
      }
    }

    const criticalPoints = [
      data[0],
      ...peaks,
      ...valleys,
      data[data.length - 1],
    ];
    const uniqueCriticalPoints = Array.from(new Set(criticalPoints));

    if (uniqueCriticalPoints.length >= targetSize) {
      return uniqueCriticalPoints.slice(0, targetSize);
    }

    const remaining = data.filter(
      (point) => !uniqueCriticalPoints.includes(point),
    );
    const additionalPoints = this.uniformSampling(
      remaining,
      targetSize - uniqueCriticalPoints.length,
    );

    return [...uniqueCriticalPoints, ...additionalPoints].sort((a, b) => {
      const aIndex = data.indexOf(a);
      const bIndex = data.indexOf(b);
      return aIndex - bIndex;
    });
  }

  static timeBasedSampling(data: DataPoint[], targetSize: number): DataPoint[] {
    if (data.length <= targetSize) return data;

    const timeSpan = data[data.length - 1].x - data[0].x;
    const bucketSize = timeSpan / targetSize;

    const buckets: DataPoint[][] = Array(targetSize)
      .fill(null)
      .map(() => []);

    data.forEach((point) => {
      const bucketIndex = Math.min(
        Math.floor((point.x - data[0].x) / bucketSize),
        targetSize - 1,
      );
      buckets[bucketIndex].push(point);
    });

    return buckets
      .map((bucket) => {
        if (bucket.length === 0) return null;
        if (bucket.length === 1) return bucket[0];

        const avgY =
          bucket.reduce((sum, point) => sum + point.y, 0) / bucket.length;
        const avgX =
          bucket.reduce((sum, point) => sum + point.x, 0) / bucket.length;

        return { ...bucket[0], x: avgX, y: avgY };
      })
      .filter(Boolean) as DataPoint[];
  }
}

class DataAggregationEngine {
  static aggregateByMethod(
    data: DataPoint[],
    method: "average" | "sum" | "min" | "max" | "median",
    bucketSize: number,
  ): DataPoint[] {
    const buckets: DataPoint[][] = [];

    for (let i = 0; i < data.length; i += bucketSize) {
      buckets.push(data.slice(i, i + bucketSize));
    }

    return buckets
      .map((bucket) => {
        if (bucket.length === 0) return null;

        const x = bucket[Math.floor(bucket.length / 2)].x;
        let y: number;

        switch (method) {
          case "average":
            y = bucket.reduce((sum, point) => sum + point.y, 0) / bucket.length;
            break;
          case "sum":
            y = bucket.reduce((sum, point) => sum + point.y, 0);
            break;
          case "min":
            y = Math.min(...bucket.map((point) => point.y));
            break;
          case "max":
            y = Math.max(...bucket.map((point) => point.y));
            break;
          case "median":
            const sorted = bucket.map((point) => point.y).sort((a, b) => a - b);
            y = sorted[Math.floor(sorted.length / 2)];
            break;
          default:
            y = bucket[0].y;
        }

        return { ...bucket[0], x, y };
      })
      .filter(Boolean) as DataPoint[];
  }
}

const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    dataProcessingTime: 0,
    memoryUsage: 0,
    frameRate: 0,
  });

  const startTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);

  const startMeasurement = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endMeasurement = useCallback((type: "render" | "processing") => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;

    setMetrics((prev) => ({
      ...prev,
      [type === "render" ? "renderTime" : "dataProcessingTime"]: duration,
    }));
  }, []);

  const updateFrameRate = useCallback(() => {
    const now = performance.now();
    frameCount.current++;

    if (now - lastFrameTime.current >= 1000) {
      setMetrics((prev) => ({
        ...prev,
        frameRate: frameCount.current,
      }));
      frameCount.current = 0;
      lastFrameTime.current = now;
    }
  }, []);

  return { metrics, startMeasurement, endMeasurement, updateFrameRate };
};

export const VirtualizedChartContainer: React.FC<
  VirtualizedChartContainerProps
> = ({
  series,
  width = 800,
  height = 400,
  maxDataPoints = 1000,
  samplingStrategy = "adaptive",
  aggregationMethod = "average",
  onDataPointClick,
  onZoomChange,
  className,
  showControls = true,
  showPerformanceMetrics = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSamplingStrategy, setCurrentSamplingStrategy] =
    useState(samplingStrategy);
  const [currentAggregationMethod, setCurrentAggregationMethod] =
    useState(aggregationMethod);
  const [zoomRange, setZoomRange] = useState<{ start: any; end: any } | null>(
    null,
  );
  const [showSettings, setShowSettings] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { metrics, startMeasurement, endMeasurement, updateFrameRate } =
    usePerformanceMetrics();

  const processedSeries = useMemo(() => {
    startMeasurement();

    const processed = series.map((s) => {
      let data = s.data;

      if (zoomRange) {
        data = data.filter(
          (point) => point.x >= zoomRange.start && point.x <= zoomRange.end,
        );
      }

      if (data.length > maxDataPoints) {
        switch (currentSamplingStrategy) {
          case "uniform":
            data = DataSamplingEngine.uniformSampling(data, maxDataPoints);
            break;
          case "adaptive":
            data = DataSamplingEngine.adaptiveSampling(data, maxDataPoints);
            break;
          case "peak-preserving":
            data = DataSamplingEngine.peakPreservingSampling(
              data,
              maxDataPoints,
            );
            break;
          case "time-based":
            data = DataSamplingEngine.timeBasedSampling(data, maxDataPoints);
            break;
        }
      }

      return { ...s, data, originalLength: s.data.length };
    });

    endMeasurement("processing");
    return processed;
  }, [
    series,
    maxDataPoints,
    currentSamplingStrategy,
    zoomRange,
    startMeasurement,
    endMeasurement,
  ]);

  const statistics = useMemo(() => {
    const totalOriginalPoints = series.reduce(
      (sum, s) => sum + s.data.length,
      0,
    );
    const totalProcessedPoints = processedSeries.reduce(
      (sum, s) => sum + s.data.length,
      0,
    );
    const compressionRatio =
      totalOriginalPoints > 0 ? totalProcessedPoints / totalOriginalPoints : 1;

    return {
      originalPoints: totalOriginalPoints,
      processedPoints: totalProcessedPoints,
      compressionRatio,
      samplingApplied: totalOriginalPoints > maxDataPoints,
    };
  }, [series, processedSeries, maxDataPoints]);

  const handleZoom = useCallback(
    (range: { start: any; end: any }) => {
      setZoomRange(range);
      onZoomChange?.(range);
    },
    [onZoomChange],
  );

  const resetZoom = useCallback(() => {
    setZoomRange(null);
    onZoomChange?.(null as any);
  }, [onZoomChange]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  useEffect(() => {
    if (!showPerformanceMetrics) return;

    const animate = () => {
      updateFrameRate();
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [showPerformanceMetrics, updateFrameRate]);

  return (
    <Card
      ref={containerRef}
      className={cn(
        "overflow-hidden",
        isFullscreen && "fixed inset-0 z-50",
        className,
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Virtualized Chart</span>
          </h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>
              {statistics.processedPoints.toLocaleString()} points displayed
            </span>
            {statistics.samplingApplied && (
              <Badge variant="outline" className="text-xs">
                {(statistics.compressionRatio * 100).toFixed(1)}% of original
                data
              </Badge>
            )}
            {zoomRange && (
              <Badge variant="outline" className="text-xs">
                Zoomed
              </Badge>
            )}
          </div>
        </div>

        {showControls && (
          <div className="flex items-center space-x-2">
            {zoomRange && (
              <Button size="sm" variant="outline" onClick={resetZoom}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset Zoom
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-3 w-3" />
            </Button>

            <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
      </div>

      {showSettings && (
        <div className="p-4 border-b bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Sampling Strategy
              </label>
              <select
                value={currentSamplingStrategy}
                onChange={(e) =>
                  setCurrentSamplingStrategy(e.target.value as any)
                }
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="uniform">Uniform</option>
                <option value="adaptive">Adaptive</option>
                <option value="peak-preserving">Peak Preserving</option>
                <option value="time-based">Time Based</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Aggregation Method
              </label>
              <select
                value={currentAggregationMethod}
                onChange={(e) =>
                  setCurrentAggregationMethod(e.target.value as any)
                }
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="average">Average</option>
                <option value="sum">Sum</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
                <option value="median">Median</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Max Data Points
              </label>
              <input
                type="number"
                value={maxDataPoints}
                onChange={(e) => {
                  console.log("Max data points changed:", e.target.value);
                }}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                min="100"
                max="10000"
                step="100"
              />
            </div>
          </div>
        </div>
      )}

      <div
        className="relative"
        style={{
          width: isFullscreen ? "100%" : width,
          height: isFullscreen ? "calc(100vh - 120px)" : height,
        }}
      >
        <div className="w-full h-full bg-muted/20 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Chart Visualization</p>
            <p className="text-sm">
              {processedSeries.length} series with {statistics.processedPoints}{" "}
              total points
            </p>
            {statistics.samplingApplied && (
              <div className="mt-2 flex items-center justify-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-xs">
                  Data optimized using {currentSamplingStrategy} sampling
                </span>
              </div>
            )}
          </div>
        </div>

        {statistics.originalPoints > 50000 && (
          <div className="absolute top-4 right-4 p-2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">
                Large dataset detected (
                {statistics.originalPoints.toLocaleString()} points)
              </span>
            </div>
          </div>
        )}
      </div>

      {showPerformanceMetrics && (
        <div className="p-4 border-t bg-muted/50">
          <h4 className="text-sm font-medium mb-2">Performance Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Render Time</div>
              <div className="font-medium">
                {metrics.renderTime.toFixed(2)}ms
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Processing Time</div>
              <div className="font-medium">
                {metrics.dataProcessingTime.toFixed(2)}ms
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Frame Rate</div>
              <div className="font-medium">{metrics.frameRate} FPS</div>
            </div>
            <div>
              <div className="text-muted-foreground">Compression</div>
              <div className="font-medium">
                {(statistics.compressionRatio * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Strategy: {currentSamplingStrategy}</span>
          <span>Method: {currentAggregationMethod}</span>
          {statistics.samplingApplied && (
            <span>
              Sampled: {((1 - statistics.compressionRatio) * 100).toFixed(1)}%
              reduction
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>Drag to zoom • Double-click to reset</span>
        </div>
      </div>
    </Card>
  );
};
