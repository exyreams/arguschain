import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import {
  ChevronDown,
  ChevronUp,
  Grid,
  List,
  Maximize2,
  Menu,
  Minimize2,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
}

type DeviceType = "mobile" | "tablet" | "desktop";
type LayoutMode = "compact" | "comfortable" | "spacious";

export const useDeviceType = (): {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: "portrait" | "landscape";
} => {
  const [deviceInfo, setDeviceInfo] = useState({
    deviceType: "desktop" as DeviceType,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: typeof window !== "undefined" ? window.innerWidth : 1024,
    screenHeight: typeof window !== "undefined" ? window.innerHeight : 768,
    orientation: "landscape" as "portrait" | "landscape",
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let deviceType: DeviceType = "desktop";
      if (width < 768) {
        deviceType = "mobile";
      } else if (width < 1024) {
        deviceType = "tablet";
      }

      setDeviceInfo({
        deviceType,
        isMobile: deviceType === "mobile",
        isTablet: deviceType === "tablet",
        isDesktop: deviceType === "desktop",
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? "landscape" : "portrait",
      });
    };

    updateDeviceInfo();
    window.addEventListener("resize", updateDeviceInfo);
    window.addEventListener("orientationchange", updateDeviceInfo);

    return () => {
      window.removeEventListener("resize", updateDeviceInfo);
      window.removeEventListener("orientationchange", updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

export const useTouchGestures = (
  elementRef: React.RefObject<HTMLElement>,
  options: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onPinch?: (scale: number) => void;
    onTap?: () => void;
    onDoubleTap?: () => void;
    threshold?: number;
  } = {},
) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const lastTapRef = useRef<number>(0);
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(
    null,
  );

  const { threshold = 50 } = options;

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
      } else if (e.touches.length === 2 && options.onPinch) {
        const distance = getDistance(e.touches[0], e.touches[1]);
        pinchStartRef.current = {
          distance,
          scale: 1,
        };
      }
    },
    [options.onPinch],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && options.onPinch && pinchStartRef.current) {
        e.preventDefault();
        const distance = getDistance(e.touches[0], e.touches[1]);
        const scale = distance / pinchStartRef.current.distance;
        options.onPinch(scale);
      }
    },
    [options.onPinch],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (e.changedTouches.length === 1 && touchStartRef.current) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > threshold || absY > threshold) {
          if (absX > absY) {
            if (deltaX > 0 && options.onSwipeRight) {
              options.onSwipeRight();
            } else if (deltaX < 0 && options.onSwipeLeft) {
              options.onSwipeLeft();
            }
          } else {
            if (deltaY > 0 && options.onSwipeDown) {
              options.onSwipeDown();
            } else if (deltaY < 0 && options.onSwipeUp) {
              options.onSwipeUp();
            }
          }
        } else if (deltaTime < 300) {
          const now = Date.now();
          if (now - lastTapRef.current < 300 && options.onDoubleTap) {
            options.onDoubleTap();
          } else if (options.onTap) {
            options.onTap();
          }
          lastTapRef.current = now;
        }
      }

      touchStartRef.current = null;
      pinchStartRef.current = null;
    },
    [options, threshold],
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
};

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = "",
  title,
  collapsible = false,
  defaultCollapsed = false,
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024,
}) => {
  const { deviceType, isMobile, isTablet, orientation } = useDeviceType();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("comfortable");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useTouchGestures(containerRef, {
    onSwipeUp: () => {
      if (isMobile && collapsible && isCollapsed) {
        setIsCollapsed(false);
      }
    },
    onSwipeDown: () => {
      if (isMobile && collapsible && !isCollapsed) {
        setIsCollapsed(true);
      }
    },
    onDoubleTap: () => {
      if (isMobile) {
        setIsFullscreen(!isFullscreen);
      }
    },
  });

  useEffect(() => {
    if (isMobile) {
      setLayoutMode("compact");
    } else if (isTablet) {
      setLayoutMode("comfortable");
    } else {
      setLayoutMode("spacious");
    }
  }, [isMobile, isTablet]);

  const getResponsiveClasses = () => {
    const baseClasses = ["transition-all duration-300 ease-in-out", className];

    if (isMobile) {
      baseClasses.push(
        "px-2 py-2",
        orientation === "portrait" ? "max-h-screen" : "max-h-[80vh]",
      );
    } else if (isTablet) {
      baseClasses.push("px-4 py-3");
    } else {
      baseClasses.push("px-6 py-4");
    }

    switch (layoutMode) {
      case "compact":
        baseClasses.push("space-y-2 text-sm");
        break;
      case "comfortable":
        baseClasses.push("space-y-4 text-base");
        break;
      case "spacious":
        baseClasses.push("space-y-6 text-base");
        break;
    }

    if (isFullscreen) {
      baseClasses.push(
        "fixed inset-0 z-50 bg-[rgba(25,28,40,0.98)]",
        "overflow-auto",
      );
    }

    return baseClasses.join(" ");
  };

  const getTouchButtonSize = () => {
    return isMobile
      ? "h-12 min-w-12"
      : isTablet
        ? "h-10 min-w-10"
        : "h-8 min-w-8";
  };

  return (
    <div
      ref={containerRef}
      className={getResponsiveClasses()}
      data-device-type={deviceType}
      data-layout-mode={layoutMode}
      data-orientation={orientation}
    >
      {(isMobile || isTablet) && (
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-[rgba(25,28,40,0.95)] backdrop-blur-sm z-10 -mx-2 px-2 py-2 border-b border-[rgba(0,191,255,0.1)]">
          {title && (
            <h3 className="text-lg font-semibold text-[#00bfff] truncate flex-1">
              {title}
            </h3>
          )}

          <div className="flex items-center gap-2 ml-4">
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] hidden sm:inline-flex"
            >
              {deviceType === "mobile" && (
                <Smartphone className="h-3 w-3 mr-1" />
              )}
              {deviceType === "tablet" && <Tablet className="h-3 w-3 mr-1" />}
              {deviceType === "desktop" && <Monitor className="h-3 w-3 mr-1" />}
              {deviceType}
            </Badge>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLayoutMode(
                    layoutMode === "compact"
                      ? "comfortable"
                      : layoutMode === "comfortable"
                        ? "spacious"
                        : "compact",
                  )
                }
                className={`${getTouchButtonSize()} border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]`}
                aria-label={`Switch to ${
                  layoutMode === "compact"
                    ? "comfortable"
                    : layoutMode === "comfortable"
                      ? "spacious"
                      : "compact"
                } layout`}
              >
                {layoutMode === "compact" && <List className="h-4 w-4" />}
                {layoutMode === "comfortable" && <Grid className="h-4 w-4" />}
                {layoutMode === "spacious" && <Maximize2 className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`${getTouchButtonSize()} border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]`}
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>

              {collapsible && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`${getTouchButtonSize()} border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]`}
                  aria-label={
                    isCollapsed ? "Expand section" : "Collapse section"
                  }
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              )}

              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className={`${getTouchButtonSize()} border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]`}
                  aria-label="Toggle mobile menu"
                >
                  {showMobileMenu ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isMobile && !isTablet && title && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-[#00bfff]">{title}</h3>

          {collapsible && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      )}

      {isMobile && showMobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setShowMobileMenu(false)}
        >
          <div className="fixed right-0 top-0 h-full w-64 bg-[rgba(25,28,40,0.98)] backdrop-blur-sm border-l border-[rgba(0,191,255,0.2)] p-4">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-[#00bfff]">Options</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileMenu(false)}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                  Layout Mode
                </label>
                <div className="space-y-2">
                  {(["compact", "comfortable", "spacious"] as LayoutMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setLayoutMode(mode);
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          layoutMode === mode
                            ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                            : "text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff]"
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`transition-all duration-300 ${
          isCollapsed
            ? "max-h-0 overflow-hidden opacity-0"
            : "max-h-none opacity-100"
        }`}
      >
        {children}
      </div>

      {isMobile && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[rgba(0,0,0,0.8)] text-white text-xs px-3 py-1 rounded-full opacity-50 pointer-events-none">
          {collapsible && "Swipe up/down to expand/collapse"}
          {!collapsible && "Double tap for fullscreen"}
        </div>
      )}

      {isFullscreen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 z-50 border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(25,28,40,0.9)] backdrop-blur-sm"
          aria-label="Exit fullscreen"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
  minItemWidth?: number;
  gap?: number;
}> = ({ children, className = "", minItemWidth = 300, gap = 4 }) => {
  const { isMobile, isTablet } = useDeviceType();

  const getGridClasses = () => {
    if (isMobile) {
      return `grid grid-cols-1 gap-${gap}`;
    } else if (isTablet) {
      return `grid grid-cols-1 md:grid-cols-2 gap-${gap}`;
    } else {
      return `grid gap-${gap}`;
    }
  };

  const getGridStyle = () => {
    if (!isMobile && !isTablet) {
      return {
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
      };
    }
    return {};
  };

  return (
    <div className={`${getGridClasses()} ${className}`} style={getGridStyle()}>
      {children}
    </div>
  );
};

export const ResponsiveTable: React.FC<{
  children: React.ReactNode;
  className?: string;
  stackOnMobile?: boolean;
}> = ({ children, className = "", stackOnMobile = true }) => {
  const { isMobile } = useDeviceType();

  if (isMobile && stackOnMobile) {
    return <div className={`space-y-4 ${className}`}>{children}</div>;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="min-w-full">{children}</div>
    </div>
  );
};
