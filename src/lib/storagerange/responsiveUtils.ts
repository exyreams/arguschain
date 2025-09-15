export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export class ResponsiveManager {
  private static currentBreakpoint: Breakpoint = "lg";
  private static observers: ((breakpoint: Breakpoint) => void)[] = [];
  private static mediaQueries: Map<Breakpoint, MediaQueryList> = new Map();

  static init(): void {
    Object.entries(breakpoints).forEach(([name, width]) => {
      const mediaQuery = window.matchMedia(`(min-width: ${width}px)`);
      this.mediaQueries.set(name as Breakpoint, mediaQuery);

      mediaQuery.addEventListener("change", () => {
        this.updateCurrentBreakpoint();
      });
    });

    this.updateCurrentBreakpoint();
  }

  private static updateCurrentBreakpoint(): void {
    const width = window.innerWidth;
    let newBreakpoint: Breakpoint = "xs";

    Object.entries(breakpoints).forEach(([name, minWidth]) => {
      if (width >= minWidth) {
        newBreakpoint = name as Breakpoint;
      }
    });

    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.observers.forEach((observer) => observer(newBreakpoint));
    }
  }

  static getCurrentBreakpoint(): Breakpoint {
    return this.currentBreakpoint;
  }

  static isMobile(): boolean {
    return this.currentBreakpoint === "xs" || this.currentBreakpoint === "sm";
  }

  static isTablet(): boolean {
    return this.currentBreakpoint === "md";
  }

  static isDesktop(): boolean {
    return ["lg", "xl", "2xl"].includes(this.currentBreakpoint);
  }

  static subscribe(callback: (breakpoint: Breakpoint) => void): () => void {
    this.observers.push(callback);

    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  static getResponsiveValue<T>(
    values: Partial<Record<Breakpoint, T>>,
  ): T | undefined {
    const breakpointOrder: Breakpoint[] = ["xs", "sm", "md", "lg", "xl", "2xl"];
    const currentIndex = breakpointOrder.indexOf(this.currentBreakpoint);

    for (let i = currentIndex; i >= 0; i--) {
      const breakpoint = breakpointOrder[i];
      if (values[breakpoint] !== undefined) {
        return values[breakpoint];
      }
    }

    return undefined;
  }
}

export class TouchManager {
  private static touchStartTime = 0;
  private static touchStartPosition = { x: 0, y: 0 };
  private static longPressTimeout: NodeJS.Timeout | null = null;

  static setupTouchInteractions(element: HTMLElement): {
    onTap: (callback: (event: TouchEvent) => void) => void;
    onLongPress: (callback: (event: TouchEvent) => void) => void;
    onSwipe: (
      callback: (
        direction: "left" | "right" | "up" | "down",
        event: TouchEvent,
      ) => void,
    ) => void;
    cleanup: () => void;
  } {
    let tapCallback: ((event: TouchEvent) => void) | null = null;
    let longPressCallback: ((event: TouchEvent) => void) | null = null;
    let swipeCallback:
      | ((
          direction: "left" | "right" | "up" | "down",
          event: TouchEvent,
        ) => void)
      | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      this.touchStartTime = Date.now();
      const touch = event.touches[0];
      this.touchStartPosition = { x: touch.clientX, y: touch.clientY };

      if (longPressCallback) {
        this.longPressTimeout = setTimeout(() => {
          longPressCallback(event);
        }, 500);
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - this.touchStartTime;

      if (this.longPressTimeout) {
        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }

      if (touchDuration < 200 && tapCallback) {
        tapCallback(event);
      }

      if (swipeCallback && event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartPosition.x;
        const deltaY = touch.clientY - this.touchStartPosition.y;
        const minSwipeDistance = 50;

        if (
          Math.abs(deltaX) > minSwipeDistance ||
          Math.abs(deltaY) > minSwipeDistance
        ) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            swipeCallback(deltaX > 0 ? "right" : "left", event);
          } else {
            swipeCallback(deltaY > 0 ? "down" : "up", event);
          }
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (this.longPressTimeout) {
        const touch = event.touches[0];
        const deltaX = Math.abs(touch.clientX - this.touchStartPosition.x);
        const deltaY = Math.abs(touch.clientY - this.touchStartPosition.y);

        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(this.longPressTimeout);
          this.longPressTimeout = null;
        }
      }
    };

    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchend", handleTouchEnd, { passive: false });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });

    return {
      onTap: (callback) => {
        tapCallback = callback;
      },
      onLongPress: (callback) => {
        longPressCallback = callback;
      },
      onSwipe: (callback) => {
        swipeCallback = callback;
      },
      cleanup: () => {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchend", handleTouchEnd);
        element.removeEventListener("touchmove", handleTouchMove);

        if (this.longPressTimeout) {
          clearTimeout(this.longPressTimeout);
          this.longPressTimeout = null;
        }
      },
    };
  }

  static makeTouchFriendly(element: HTMLElement): void {
    element.style.minHeight = "44px";
    element.style.minWidth = "44px";

    element.style.transition = "background-color 0.1s ease";

    const originalBackground = getComputedStyle(element).backgroundColor;

    element.addEventListener("touchstart", () => {
      element.style.backgroundColor = "rgba(0, 191, 255, 0.1)";
    });

    element.addEventListener("touchend", () => {
      setTimeout(() => {
        element.style.backgroundColor = originalBackground;
      }, 100);
    });
  }
}

export class AdaptiveLayoutManager {
  static getGridColumns(itemCount: number): Record<Breakpoint, number> {
    if (itemCount <= 1) {
      return { xs: 1, sm: 1, md: 1, lg: 1, xl: 1, "2xl": 1 };
    } else if (itemCount <= 2) {
      return { xs: 1, sm: 2, md: 2, lg: 2, xl: 2, "2xl": 2 };
    } else if (itemCount <= 4) {
      return { xs: 1, sm: 2, md: 2, lg: 2, xl: 4, "2xl": 4 };
    } else {
      return { xs: 1, sm: 2, md: 3, lg: 4, xl: 4, "2xl": 6 };
    }
  }

  static getChartDimensions(): Record<
    Breakpoint,
    { width: number; height: number }
  > {
    return {
      xs: { width: 300, height: 200 },
      sm: { width: 400, height: 250 },
      md: { width: 500, height: 300 },
      lg: { width: 600, height: 350 },
      xl: { width: 700, height: 400 },
      "2xl": { width: 800, height: 450 },
    };
  }

  static getTablePageSize(): Record<Breakpoint, number> {
    return {
      xs: 5,
      sm: 10,
      md: 15,
      lg: 20,
      xl: 25,
      "2xl": 30,
    };
  }

  static shouldCollapse(section: "sidebar" | "filters" | "details"): boolean {
    const breakpoint = ResponsiveManager.getCurrentBreakpoint();

    switch (section) {
      case "sidebar":
        return ["xs", "sm"].includes(breakpoint);
      case "filters":
        return breakpoint === "xs";
      case "details":
        return ["xs", "sm"].includes(breakpoint);
      default:
        return false;
    }
  }
}

export class MobileOptimizationManager {
  static optimizeForMobile(): void {
    if (!ResponsiveManager.isMobile()) return;

    const style = document.createElement("style");
    style.textContent = `
      /* Mobile optimizations */
      .mobile-optimized {
        font-size: 16px !important; /* Prevent zoom on iOS */
      }
      
      .mobile-optimized input,
      .mobile-optimized select,
      .mobile-optimized textarea {
        font-size: 16px !important;
      }
      
      .mobile-optimized .touch-target {
        min-height: 44px !important;
        min-width: 44px !important;
        padding: 12px !important;
      }
      
      .mobile-optimized .scrollable {
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
      }
      
      .mobile-optimized .no-select {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      /* Hide hover effects on mobile */
      @media (hover: none) {
        .mobile-optimized .hover-effect:hover {
          background-color: initial !important;
          color: initial !important;
        }
      }
      
      /* Improve tap targets */
      .mobile-optimized button,
      .mobile-optimized a,
      .mobile-optimized [role="button"] {
        min-height: 44px;
        min-width: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      /* Optimize tables for mobile */
      .mobile-optimized .responsive-table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }
      
      .mobile-optimized .responsive-table table {
        width: 100%;
        min-width: 600px;
      }
    `;
    document.head.appendChild(style);

    document.body.classList.add("mobile-optimized");
  }

  static setupPullToRefresh(
    container: HTMLElement,
    onRefresh: () => Promise<void>,
  ): () => void {
    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;
    let pullDistance = 0;
    const threshold = 100;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || container.scrollTop > 0) return;

      currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;

      if (pullDistance > 0) {
        e.preventDefault();

        const opacity = Math.min(pullDistance / threshold, 1);
        container.style.transform = `translateY(${Math.min(pullDistance * 0.5, 50)}px)`;
        container.style.opacity = (1 - opacity * 0.3).toString();
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > threshold && !isRefreshing) {
        isRefreshing = true;

        try {
          await onRefresh();
        } finally {
          isRefreshing = false;
        }
      }

      container.style.transform = "";
      container.style.opacity = "";
      pullDistance = 0;
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }
}

export class ProgressiveDisclosureManager {
  static createCollapsibleSection(
    title: string,
    content: HTMLElement,
    defaultExpanded = false,
  ): HTMLElement {
    const section = document.createElement("div");
    section.className = "collapsible-section";

    const header = document.createElement("button");
    header.className = "collapsible-header touch-target";
    header.setAttribute("aria-expanded", defaultExpanded.toString());
    header.innerHTML = `
      <span>${title}</span>
      <svg class="collapsible-icon" width="16" height="16" viewBox="0 0 16 16">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "collapsible-content";
    contentWrapper.style.display = defaultExpanded ? "block" : "none";
    contentWrapper.appendChild(content);

    header.addEventListener("click", () => {
      const isExpanded = header.getAttribute("aria-expanded") === "true";
      const newExpanded = !isExpanded;

      header.setAttribute("aria-expanded", newExpanded.toString());
      contentWrapper.style.display = newExpanded ? "block" : "none";

      const icon = header.querySelector(".collapsible-icon") as HTMLElement;
      if (icon) {
        icon.style.transform = newExpanded ? "rotate(180deg)" : "rotate(0deg)";
      }
    });

    section.appendChild(header);
    section.appendChild(contentWrapper);

    return section;
  }

  static createTabsForMobile(
    tabs: Array<{ label: string; content: HTMLElement }>,
    activeIndex = 0,
  ): HTMLElement {
    const container = document.createElement("div");
    container.className = "mobile-tabs";

    const selector = document.createElement("select");
    selector.className = "mobile-tab-selector touch-target";

    tabs.forEach((tab, index) => {
      const option = document.createElement("option");
      option.value = index.toString();
      option.textContent = tab.label;
      option.selected = index === activeIndex;
      selector.appendChild(option);
    });

    const contentContainer = document.createElement("div");
    contentContainer.className = "mobile-tab-content";

    contentContainer.appendChild(tabs[activeIndex].content);

    selector.addEventListener("change", () => {
      const newIndex = parseInt(selector.value);
      contentContainer.innerHTML = "";
      contentContainer.appendChild(tabs[newIndex].content);
    });

    container.appendChild(selector);
    container.appendChild(contentContainer);

    return container;
  }
}

export function initializeResponsiveDesign(): void {
  ResponsiveManager.init();
  MobileOptimizationManager.optimizeForMobile();

  const style = document.createElement("style");
  style.textContent = `
    .collapsible-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 20, 25, 0.6);
      border: 1px solid rgba(0, 191, 255, 0.2);
      border-radius: 8px;
      color: #00bfff;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .collapsible-header:hover {
      background: rgba(0, 191, 255, 0.1);
      border-color: rgba(0, 191, 255, 0.3);
    }
    
    .collapsible-icon {
      transition: transform 0.2s ease;
    }
    
    .collapsible-content {
      margin-top: 8px;
      padding: 16px;
      background: rgba(25, 28, 40, 0.8);
      border: 1px solid rgba(0, 191, 255, 0.1);
      border-radius: 8px;
    }
    
    .mobile-tab-selector {
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 20, 25, 0.8);
      border: 1px solid rgba(0, 191, 255, 0.3);
      border-radius: 8px;
      color: #8b9dc3;
      font-size: 16px;
      margin-bottom: 16px;
    }
    
    .mobile-tab-content {
      min-height: 200px;
    }
    
    /* Responsive utilities */
    @media (max-width: 640px) {
      .hide-mobile { display: none !important; }
      .show-mobile { display: block !important; }
    }
    
    @media (min-width: 641px) {
      .hide-desktop { display: none !important; }
      .show-desktop { display: block !important; }
    }
    
    @media (max-width: 768px) {
      .responsive-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      
      .responsive-flex {
        flex-direction: column !important;
        gap: 16px !important;
      }
    }
  `;
  document.head.appendChild(style);
}
