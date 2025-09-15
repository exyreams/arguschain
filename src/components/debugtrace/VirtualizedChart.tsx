import { useCallback, useMemo, useState } from "react";

interface VirtualizedChartProps {
  data: any[];
  renderChart: (
    data: any[],
    startIndex: number,
    endIndex: number,
  ) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  threshold?: number;
  className?: string;
}

interface VirtualizationState {
  startIndex: number;
  endIndex: number;
  visibleData: any[];
  totalHeight: number;
}

export function VirtualizedChart({
  data,
  renderChart,
  itemHeight = 20,
  containerHeight = 400,
  threshold = 1000,
  className = "",
}: VirtualizedChartProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const shouldVirtualize = data.length > threshold;

  const virtualizationState = useMemo((): VirtualizationState => {
    if (!shouldVirtualize) {
      return {
        startIndex: 0,
        endIndex: data.length,
        visibleData: data,
        totalHeight: containerHeight,
      };
    }

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const bufferSize = Math.floor(visibleCount * 0.5);
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - bufferSize,
    );
    const endIndex = Math.min(
      data.length,
      startIndex + visibleCount + bufferSize * 2,
    );

    return {
      startIndex,
      endIndex,
      visibleData: data.slice(startIndex, endIndex),
      totalHeight: data.length * itemHeight,
    };
  }, [
    data,
    scrollTop,
    containerHeight,
    itemHeight,
    shouldVirtualize,
    threshold,
  ]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const renderPerformanceInfo = () => {
    if (!shouldVirtualize) return null;

    return (
      <div className="text-xs text-[#6b7280] mb-2 flex justify-between">
        <span>
          Showing {virtualizationState.visibleData.length} of {data.length}{" "}
          items
        </span>
        <span>Virtualized for performance</span>
      </div>
    );
  };

  if (!shouldVirtualize) {
    return <div className={className}>{renderChart(data, 0, data.length)}</div>;
  }

  return (
    <div className={className}>
      {renderPerformanceInfo()}
      <div
        className="relative overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div
          style={{
            height: virtualizationState.totalHeight,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: virtualizationState.startIndex * itemHeight,
              left: 0,
              right: 0,
              height: virtualizationState.visibleData.length * itemHeight,
            }}
          >
            {renderChart(
              virtualizationState.visibleData,
              virtualizationState.startIndex,
              virtualizationState.endIndex,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useLargeDatasetOptimization<T>(
  data: T[],
  options: {
    chunkSize?: number;
    processingDelay?: number;
    enableVirtualization?: boolean;
    virtualizationThreshold?: number;
  } = {},
) {
  const {
    chunkSize = 100,
    processingDelay = 10,
    enableVirtualization = true,
    virtualizationThreshold = 1000,
  } = options;

  const [processedChunks, setProcessedChunks] = useState<T[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const chunkedData = useMemo(() => {
    if (data.length <= chunkSize) return [data];

    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }, [data, chunkSize]);

  const processChunks = useCallback(
    async (processor: (chunk: T[]) => Promise<T[]> | T[]): Promise<T[]> => {
      setIsProcessing(true);
      setProcessedChunks([]);
      setProcessingProgress(0);

      const results: T[][] = [];

      for (let i = 0; i < chunkedData.length; i++) {
        const chunk = chunkedData[i];
        const processedChunk = await processor(chunk);
        results.push(processedChunk);

        setProcessedChunks([...results]);
        setProcessingProgress(((i + 1) / chunkedData.length) * 100);

        if (processingDelay > 0 && i < chunkedData.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, processingDelay));
        }
      }

      setIsProcessing(false);
      return results.flat();
    },
    [chunkedData, processingDelay],
  );

  const shouldVirtualize =
    enableVirtualization && data.length > virtualizationThreshold;

  return {
    chunkedData,
    processedChunks: processedChunks.flat(),
    isProcessing,
    processingProgress,
    processChunks,
    shouldVirtualize,
    dataSize: data.length,
    chunkCount: chunkedData.length,
  };
}
