import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface ResponsiveChartProps {
  children: React.ReactNode;
  title: string;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}

interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: "portrait" | "landscape";
}

interface TouchGesture {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isSwipe: boolean;
  direction: "left" | "right" | null;
}

export function ResponsiveChart({
  children,
  title,
  minHeight = 300,
  maxHeight = 600,
  className = "",
}: ResponsiveChartProps) {
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: "landscape",
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [touchGesture, setTouchGesture] = useState<TouchGesture | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const updateViewport = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    setViewport({
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      orientation: width > height ? "landscape" : "portrait",
    });
  }, []);

  useEffect(() => {
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, [updateViewport]);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    setTouchGesture({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      isSwipe: false,
      direction: null,
    });
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchGesture) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchGesture.startX;
    const deltaY = touch.clientY - touchGesture.startY;

    setTouchGesture((prev) =>
      prev
        ? {
            ...prev,
            currentX: touch.clientX,
            currentY: touch.clientY,
            deltaX,
            deltaY,
            isSwipe: Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50,
          }
        : null
    );
  };

  const handleTouchEnd = () => {
    if (!touchGesture || !touchGesture.isSwipe) {
      setTouchGesture(null);
      return;
    }

    const { deltaX, deltaY } = touchGesture;
    let direction: TouchGesture["direction"];

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? "right" : "left";
    }

    switch (direction) {
      case "left":
        break;
      case "right":
        break;
    }

    setTouchGesture(null);
  };

  const getResponsiveDimensions = () => {
    let height: number;

    if (viewport.isMobile) {
      height = Math.min(viewport.height * 0.4, maxHeight);
    } else if (viewport.isTablet) {
      height = Math.min(viewport.height * 0.5, maxHeight);
    } else {
      height = Math.min(viewport.height * 0.6, maxHeight);
    }

    return {
      height: Math.max(minHeight, height),
      width: "100%",
    };
  };

  const dimensions = getResponsiveDimensions();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getResponsiveClasses = () => {
    const classes = ["transition-all duration-300"];

    if (viewport.isMobile) {
      classes.push("mobile-optimized");
    } else if (viewport.isTablet) {
      classes.push("tablet-optimized");
    } else {
      classes.push("desktop-optimized");
    }

    return classes.join(" ");
  };

  return (
    <div
      ref={containerRef}
      className={`${getResponsiveClasses()} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between mb-4 p-3 bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg">
        <h3 className="text-lg font-semibold text-[#00bfff] truncate">
          {title}
        </h3>

        <div className="flex items-center gap-2">
          {viewport.isMobile && (
            <>
              <button
                onClick={toggleCollapse}
                className="p-2 text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                aria-label={isCollapsed ? "Expand chart" : "Collapse chart"}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>

              <div className="text-xs text-[#6b7280] flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />
                {viewport.orientation}
              </div>
            </>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div
          ref={chartRef}
          className="relative overflow-hidden rounded-lg border border-[rgba(0,191,255,0.2)]"
          style={{
            height: dimensions.height,
            width: dimensions.width,
          }}
        >
          {children}

          {touchGesture && touchGesture.isSwipe && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-[rgba(0,191,255,0.8)] text-[#0f1419] px-3 py-1 rounded-full text-sm font-medium">
                {touchGesture.direction && (
                  <>
                    {touchGesture.direction === "left" && "← Previous"}
                    {touchGesture.direction === "right" && "→ Next"}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {viewport.isMobile && (
        <div className="mt-2 text-xs text-[#6b7280] text-center">
          <p>Tap controls to expand/collapse</p>
        </div>
      )}
    </div>
  );
}

export function useResponsive() {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: "landscape" as "portrait" | "landscape",
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > height ? "landscape" : "portrait",
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  return viewport;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveGrid({
  children,
  className = "",
}: ResponsiveGridProps) {
  const { isMobile, isTablet } = useResponsive();

  const getGridClasses = () => {
    if (isMobile) {
      return "grid grid-cols-1 gap-4";
    } else if (isTablet) {
      return "grid grid-cols-1 lg:grid-cols-2 gap-6";
    } else {
      return "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6";
    }
  };

  return <div className={`${getGridClasses()} ${className}`}>{children}</div>;
}
