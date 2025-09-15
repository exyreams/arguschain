import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import {
  AdaptiveLayoutManager,
  type Breakpoint,
  MobileOptimizationManager,
  ResponsiveManager,
  TouchManager,
} from "@/lib/storagerange/responsiveUtils";
import { ChevronDown, ChevronUp, Menu, X } from "lucide-react";

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  mobileCollapsed?: boolean;
  className?: string;
  onRefresh?: () => Promise<void>;
}

export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  title,
  collapsible = false,
  defaultExpanded = true,
  mobileCollapsed = false,
  className = "",
  onRefresh,
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>("lg");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchManagerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = ResponsiveManager.subscribe((breakpoint) => {
      setCurrentBreakpoint(breakpoint);

      if (mobileCollapsed && ResponsiveManager.isMobile()) {
        setIsExpanded(false);
      }
    });

    setCurrentBreakpoint(ResponsiveManager.getCurrentBreakpoint());

    return unsubscribe;
  }, [mobileCollapsed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    TouchManager.makeTouchFriendly(container);

    touchManagerRef.current = TouchManager.setupTouchInteractions(container);

    touchManagerRef.current.onSwipe((direction: string) => {
      if (collapsible) {
        if (direction === "up" && !isExpanded) {
          setIsExpanded(true);
        } else if (direction === "down" && isExpanded) {
          setIsExpanded(false);
        }
      }
    });

    let cleanupPullToRefresh: (() => void) | undefined;
    if (onRefresh && ResponsiveManager.isMobile()) {
      cleanupPullToRefresh = MobileOptimizationManager.setupPullToRefresh(
        container,
        async () => {
          setIsRefreshing(true);
          try {
            await onRefresh();
          } finally {
            setIsRefreshing(false);
          }
        },
      );
    }

    return () => {
      touchManagerRef.current?.cleanup();
      cleanupPullToRefresh?.();
    };
  }, [collapsible, isExpanded, onRefresh]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  const getResponsiveClasses = () => {
    const isMobile = ResponsiveManager.isMobile();
    const isTablet = ResponsiveManager.isTablet();

    return {
      container: `
        ${isMobile ? "px-2 py-2" : "px-4 py-4"}
        ${isTablet ? "px-3 py-3" : ""}
        transition-all duration-300 ease-in-out
      `,
      content: `
        ${isMobile ? "space-y-3" : "space-y-4"}
        ${isExpanded ? "block" : "hidden"}
      `,
      header: `
        flex items-center justify-between
        ${isMobile ? "py-2" : "py-3"}
        ${collapsible ? "cursor-pointer" : ""}
      `,
      title: `
        font-semibold text-[#00bfff]
        ${isMobile ? "text-base" : "text-lg"}
      `,
    };
  };

  const classes = getResponsiveClasses();
  const isMobile = ResponsiveManager.isMobile();

  return (
    <div
      ref={containerRef}
      className={`
        ${className}
        ${classes.container}
        ${isRefreshing ? "opacity-70" : ""}
        relative overflow-hidden
      `}
    >
      <Card className="h-full">
        {(title || collapsible) && (
          <div
            className={classes.header}
            onClick={collapsible ? toggleExpanded : undefined}
            role={collapsible ? "button" : undefined}
            aria-expanded={collapsible ? isExpanded : undefined}
            tabIndex={collapsible ? 0 : undefined}
            onKeyDown={
              collapsible
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpanded();
                    }
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-3">
              {title && <h3 className={classes.title}>{title}</h3>}

              {isRefreshing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00bfff]"></div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMobileMenu();
                  }}
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  aria-label="Toggle mobile menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </Button>
              )}

              {collapsible && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  aria-label={
                    isExpanded ? "Collapse section" : "Expand section"
                  }
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {isMobile && isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-50"
            onClick={toggleMobileMenu}
          >
            <div className="absolute top-0 right-0 w-64 h-full bg-[rgba(25,28,40,0.95)] border-l border-[rgba(0,191,255,0.2)] p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[#00bfff] font-medium">Menu</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMobileMenu}
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {onRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="w-full border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                )}

                {collapsible && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toggleExpanded();
                      toggleMobileMenu();
                    }}
                    className="w-full border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    {isExpanded ? "Collapse" : "Expand"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={classes.content}>{children}</div>

        {isMobile && onRefresh && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="bg-[rgba(0,191,255,0.9)] text-white px-3 py-1 rounded-b-lg text-sm">
              Pull to refresh
            </div>
          </div>
        )}

        {isMobile && collapsible && (
          <div className="absolute bottom-2 right-2 text-xs text-[#8b9dc3] opacity-50">
            Swipe ↕ to toggle
          </div>
        )}
      </Card>
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  itemCount?: number;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  itemCount,
  className = "",
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>("lg");

  useEffect(() => {
    const unsubscribe = ResponsiveManager.subscribe(setCurrentBreakpoint);
    setCurrentBreakpoint(ResponsiveManager.getCurrentBreakpoint());
    return unsubscribe;
  }, []);

  const getGridColumns = () => {
    if (!itemCount) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

    const columns = AdaptiveLayoutManager.getGridColumns(itemCount);
    const currentColumns = ResponsiveManager.getResponsiveValue(columns) || 1;

    return `grid-cols-${currentColumns}`;
  };

  return (
    <div className={`grid gap-4 ${getGridColumns()} ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
  }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export const ResponsiveTabs: React.FC<ResponsiveTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}) => {
  const [currentTab, setCurrentTab] = useState(activeTab || tabs[0]?.id);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const unsubscribe = ResponsiveManager.subscribe(() => {
      setIsMobile(ResponsiveManager.isMobile());
    });

    setIsMobile(ResponsiveManager.isMobile());
    return unsubscribe;
  }, []);

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find((tab) => tab.id === currentTab)?.content;

  if (isMobile) {
    return (
      <div className={className}>
        <select
          value={currentTab}
          onChange={(e) => handleTabChange(e.target.value)}
          className="w-full p-3 mb-4 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] text-base"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>

        <div className="min-h-[200px]">{activeTabContent}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex space-x-1 mb-4 bg-[rgba(15,20,25,0.6)] rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${
                currentTab === tab.id
                  ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                  : "text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>{activeTabContent}</div>
    </div>
  );
};
