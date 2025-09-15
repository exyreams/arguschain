import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { debounce } from "lodash";

interface ChartOptimizationOptions {
  debounceMs?: number;
  maxDataPoints?: number;
  enableCaching?: boolean;
  enableMemoization?: boolean;
  resizeDebounceMs?: number;
}

interface ChartDimensions {
  width: number;
  height: number;
}

interface ChartCache<T> {
  [key: string]: T;
}

interface ChartOptimizationState {
  dimensions: ChartDimensions;
  isResizing: boolean;
  renderCount: number;
  lastRenderTime: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * useChartOptimization - Hook for optimizing chart rendering and interactions
 *
 * This hook provides:
 * - Debounced updates for interactive features
 * - Efficient re-rendering strategies
 * - Chart data caching and memoization
 * - Responsive chart resizing and adaptation
 * - Performance monitoring and metrics
 */
export function useChartOptimization<T>(
  data: T[],
  options: ChartOptimizationOptions = {}
) {
  const {
    debounceMs = 150,
    maxDataPoints = 1000,
    enableCaching = true,
    enableMemoization = true,
    resizeDebounceMs = 250,
  } = options;

  const [state, setState] = useState<ChartOptimizationState>({
    dimensions: { width: 0, height: 0 },
    isResizing: false,
    renderCount: 0,
    lastRenderTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  const cacheRef = useRef<ChartCache<any>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized data processing with sampling
  const optimizedData = useMemo(() => {
    const startTime = performance.now();

    let processedData = data;

    // Sample data if it exceeds maximum points
    if (data.length > maxDataPoints) {
      const step = Math.ceil(data.length / maxDataPoints);
      processedData = data.filter((_, index) => index % step === 0);
    }

    const endTime = performance.now();

    setState((prev) => ({
      ...prev,
      lastRenderTime: endTime - startTime,
      renderCount: prev.renderCount + 1,
    }));

    return processedData;
  }, [data, maxDataPoints]);

  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce((updateFn: () => void) => {
      updateFn();
    }, debounceMs),
    [debounceMs]
  );

  // Caching utilities
  const getCachedValue = useCallback(
    <R>(key: string, computeFn: () => R): R => {
      if (!enableCaching) {
        return computeFn();
      }

      if (cacheRef.current[key]) {
        setState((prev) => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
        return cacheRef.current[key];
      }

      const value = computeFn();
      cacheRef.current[key] = value;
      setState((prev) => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
      return value;
    },
    [enableCaching]
  );

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    setState((prev) => ({ ...prev, cacheHits: 0, cacheMisses: 0 }));
  }, []);

  // Resize handling
  const handleResize = useCallback(
    debounce(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setState((prev) => ({
          ...prev,
          dimensions: { width: rect.width, height: rect.height },
          isResizing: false,
        }));
      }
    }, resizeDebounceMs),
    [resizeDebounceMs]
  );

  const startResize = useCallback(() => {
    setState((prev) => ({ ...prev, isResizing: true }));
    handleResize();
  }, [handleResize]);

  // Setup resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      startResize();
    });

    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [startResize]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      debouncedUpdate.cancel();
      handleResize.cancel();
    };
  }, [debouncedUpdate, handleResize]);

  // Memoized render function
  const memoizedRender = useCallback(
    (renderFn: () => any) => {
      if (!enableMemoization) {
        return renderFn();
      }

      const cacheKey = `render_${JSON.stringify(optimizedData)}_${state.dimensions.width}_${state.dimensions.height}`;
      return getCachedValue(cacheKey, renderFn);
    },
    [optimizedData, state.dimensions, enableMemoization, getCachedValue]
  );

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const cacheHitRate =
      state.cacheHits + state.cacheMisses > 0
        ? (state.cacheHits / (state.cacheHits + state.cacheMisses)) * 100
        : 0;

    return {
      renderCount: state.renderCount,
      lastRenderTime: state.lastRenderTime,
      averageRenderTime:
        state.renderCount > 0 ? state.lastRenderTime / state.renderCount : 0,
      cacheHitRate,
      dataReduction:
        data.length > 0
          ? ((data.length - optimizedData.length) / data.length) * 100
          : 0,
      memoryUsage: JSON.stringify(cacheRef.current).length,
    };
  }, [state, data.length, optimizedData.length]);

  return {
    // Optimized data
    data: optimizedData,
    originalDataLength: data.length,

    // State
    dimensions: state.dimensions,
    isResizing: state.isResizing,

    // Utilities
    containerRef,
    debouncedUpdate,
    getCachedValue,
    clearCache,
    memoizedRender,

    // Performance
    performanceMetrics,
  };
}

/**
 * useChartInteractions - Hook for optimizing chart interactions
 */
export function useChartInteractions() {
  const [interactions, setInteractions] = useState({
    isHovering: false,
    isDragging: false,
    isZooming: false,
    lastInteraction: 0,
  });

  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startInteraction = useCallback((type: "hover" | "drag" | "zoom") => {
    setInteractions((prev) => ({
      ...prev,
      [`is${type.charAt(0).toUpperCase() + type.slice(1)}ing`]: true,
      lastInteraction: Date.now(),
    }));

    // Clear existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    // Set timeout to end interaction
    interactionTimeoutRef.current = setTimeout(() => {
      setInteractions((prev) => ({
        ...prev,
        [`is${type.charAt(0).toUpperCase() + type.slice(1)}ing`]: false,
      }));
    }, 150);
  }, []);

  const endInteraction = useCallback((type: "hover" | "drag" | "zoom") => {
    setInteractions((prev) => ({
      ...prev,
      [`is${type.charAt(0).toUpperCase() + type.slice(1)}ing`]: false,
    }));
  }, []);

  // Debounced interaction handlers
  const debouncedHover = useCallback(
    debounce((callback: () => void) => callback(), 50),
    []
  );

  const debouncedDrag = useCallback(
    debounce((callback: () => void) => callback(), 16), // ~60fps
    []
  );

  const debouncedZoom = useCallback(
    debounce((callback: () => void) => callback(), 100),
    []
  );

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      debouncedHover.cancel();
      debouncedDrag.cancel();
      debouncedZoom.cancel();
    };
  }, [debouncedHover, debouncedDrag, debouncedZoom]);

  return {
    interactions,
    startInteraction,
    endInteraction,
    debouncedHover,
    debouncedDrag,
    debouncedZoom,
  };
}

/**
 * useChartAnimation - Hook for optimizing chart animations
 */
export function useChartAnimation(duration = 300) {
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const animate = useCallback(
    (updateFn: (progress: number) => void, onComplete?: () => void) => {
      setIsAnimating(true);
      startTimeRef.current = performance.now();

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        updateFn(easedProgress);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          setIsAnimating(false);
          if (onComplete) onComplete();
        }
      };

      animationRef.current = requestAnimationFrame(step);
    },
    [duration]
  );

  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      setIsAnimating(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  return {
    isAnimating,
    animate,
    cancelAnimation,
  };
}

export default useChartOptimization;
