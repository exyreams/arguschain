export class AriaLabelManager {
  private static labelMap = new Map<string, string>();

  static setLabel(elementId: string, label: string): void {
    this.labelMap.set(elementId, label);
  }

  static getLabel(elementId: string): string | undefined {
    return this.labelMap.get(elementId);
  }

  static generateLabel(context: string, value?: string | number): string {
    if (value !== undefined) {
      return `${context}: ${value}`;
    }
    return context;
  }

  static generateChartLabel(chartType: string, dataPoint: any): string {
    switch (chartType) {
      case "pie":
        return `${dataPoint.name}: ${dataPoint.value} (${dataPoint.percentage}%)`;
      case "bar":
        return `${dataPoint.category}: ${dataPoint.value}`;
      case "line":
        return `Time ${dataPoint.time}: ${dataPoint.value}`;
      default:
        return `Data point: ${dataPoint.value}`;
    }
  }
}

export class KeyboardNavigationManager {
  private static focusableElements = [
    "button",
    "input",
    "select",
    "textarea",
    "a[href]",
    '[tabindex]:not([tabindex="-1"])',
  ];

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = this.focusableElements.join(", ");
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  static trapFocus(container: HTMLElement): (event: KeyboardEvent) => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    return (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (event.key === "Escape") {
        const closeButton = container.querySelector(
          "[data-close]",
        ) as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    };
  }

  static handleArrowNavigation(
    elements: HTMLElement[],
    currentIndex: number,
    direction: "up" | "down" | "left" | "right",
  ): number {
    let newIndex = currentIndex;

    switch (direction) {
      case "up":
      case "left":
        newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
        break;
      case "down":
      case "right":
        newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
        break;
    }

    elements[newIndex]?.focus();
    return newIndex;
  }
}

export class ScreenReaderManager {
  private static announcements: string[] = [];

  static announce(
    message: string,
    priority: "polite" | "assertive" = "polite",
  ): void {
    this.announcements.push(message);

    let liveRegion = document.getElementById("sr-live-region");
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.id = "sr-live-region";
      liveRegion.setAttribute("aria-live", priority);
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.style.position = "absolute";
      liveRegion.style.left = "-10000px";
      liveRegion.style.width = "1px";
      liveRegion.style.height = "1px";
      liveRegion.style.overflow = "hidden";
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;

    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = "";
      }
    }, 1000);
  }

  static announceDataChange(type: string, oldValue: any, newValue: any): void {
    const message = `${type} changed from ${oldValue} to ${newValue}`;
    this.announce(message, "polite");
  }

  static announceChartData(chartType: string, dataPoints: any[]): void {
    const summary =
      `${chartType} chart with ${dataPoints.length} data points. ` +
      `Use arrow keys to navigate through data points.`;
    this.announce(summary, "polite");
  }

  static announceError(error: string): void {
    this.announce(`Error: ${error}`, "assertive");
  }

  static announceSuccess(message: string): void {
    this.announce(`Success: ${message}`, "polite");
  }
}

export class HighContrastManager {
  private static isHighContrast = false;
  private static observers: ((enabled: boolean) => void)[] = [];

  static init(): void {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-contrast: high)");
      this.isHighContrast = mediaQuery.matches;

      mediaQuery.addEventListener("change", (e) => {
        this.setHighContrast(e.matches);
      });
    }

    const stored = localStorage.getItem("high-contrast-mode");
    if (stored !== null) {
      this.setHighContrast(stored === "true");
    }
  }

  static setHighContrast(enabled: boolean): void {
    this.isHighContrast = enabled;
    localStorage.setItem("high-contrast-mode", enabled.toString());

    if (enabled) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }

    this.observers.forEach((observer) => observer(enabled));
  }

  static isEnabled(): boolean {
    return this.isHighContrast;
  }

  static subscribe(callback: (enabled: boolean) => void): () => void {
    this.observers.push(callback);

    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  static getContrastColors(): {
    background: string;
    foreground: string;
    accent: string;
    border: string;
  } {
    if (this.isHighContrast) {
      return {
        background: "#000000",
        foreground: "#ffffff",
        accent: "#ffff00",
        border: "#ffffff",
      };
    }

    return {
      background: "rgba(25,28,40,0.8)",
      foreground: "#8b9dc3",
      accent: "#00bfff",
      border: "rgba(0,191,255,0.2)",
    };
  }
}

export class ColorAccessibilityManager {
  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  static meetsWCAGAA(color1: string, color2: string): boolean {
    return this.getContrastRatio(color1, color2) >= 4.5;
  }

  static meetsWCAGAAA(color1: string, color2: string): boolean {
    return this.getContrastRatio(color1, color2) >= 7;
  }

  private static hexToRgb(
    hex: string,
  ): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private static getLuminance(rgb: {
    r: number;
    g: number;
    b: number;
  }): number {
    const { r, g, b } = rgb;

    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  static getAccessibleColor(
    baseColor: string,
    backgroundColor: string,
  ): string {
    if (this.meetsWCAGAA(baseColor, backgroundColor)) {
      return baseColor;
    }

    const rgb = this.hexToRgb(baseColor);
    if (!rgb) return baseColor;

    const bgRgb = this.hexToRgb(backgroundColor);
    if (!bgRgb) return baseColor;

    const bgLuminance = this.getLuminance(bgRgb);

    if (bgLuminance < 0.5) {
      return "#ffffff";
    } else {
      return "#000000";
    }
  }
}

export class AccessibleDataTable {
  static generateTableDescription(data: any[], columns: string[]): string {
    const rowCount = data.length;
    const colCount = columns.length;

    return (
      `Data table with ${rowCount} rows and ${colCount} columns. ` +
      `Columns are: ${columns.join(", ")}. ` +
      `Use arrow keys to navigate cells.`
    );
  }

  static generateCellDescription(
    value: any,
    rowIndex: number,
    colIndex: number,
    columnName: string,
  ): string {
    return `Row ${rowIndex + 1}, ${columnName}: ${value}`;
  }

  static generateSummaryStats(data: any[], column: string): string {
    const values = data
      .map((row) => row[column])
      .filter((v) => typeof v === "number");

    if (values.length === 0) return `No numeric data in ${column}`;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return (
      `${column} statistics: Average ${avg.toFixed(2)}, ` +
      `Minimum ${min}, Maximum ${max}, Total ${sum.toFixed(2)}`
    );
  }
}

export function initializeAccessibility(): void {
  HighContrastManager.init();

  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.key === "h") {
      event.preventDefault();
      HighContrastManager.setHighContrast(!HighContrastManager.isEnabled());
      ScreenReaderManager.announce(
        `High contrast mode ${HighContrastManager.isEnabled() ? "enabled" : "disabled"}`,
      );
    }

    if (event.altKey && event.key === "s") {
      event.preventDefault();
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.focus();
        ScreenReaderManager.announce("Skipped to main content");
      }
    }
  });

  const style = document.createElement("style");
  style.textContent = `
    .focus-visible {
      outline: 2px solid #00bfff !important;
      outline-offset: 2px !important;
    }
    
    .high-contrast .focus-visible {
      outline: 3px solid #ffff00 !important;
    }
    
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
    
    .high-contrast {
      --bg-primary: #000000;
      --text-primary: #ffffff;
      --accent-primary: #ffff00;
      --border-primary: #ffffff;
    }
    
    .high-contrast * {
      background-color: var(--bg-primary) !important;
      color: var(--text-primary) !important;
      border-color: var(--border-primary) !important;
    }
    
    .high-contrast .accent {
      color: var(--accent-primary) !important;
      border-color: var(--accent-primary) !important;
    }
  `;
  document.head.appendChild(style);
}

export const generateAriaLabel = {
  table: (
    rowCount: number,
    columnCount: number,
    description?: string,
  ): string => {
    const baseDescription = `Data table with ${rowCount} rows and ${columnCount} columns.`;
    return description ? `${baseDescription} ${description}` : baseDescription;
  },

  storageSlot: (slot: string, value: string, description?: string): string => {
    const baseDescription = `Storage slot ${slot} with value ${value}`;
    return description ? `${baseDescription}. ${description}` : baseDescription;
  },

  chartDataPoint: (
    name: string,
    value: string | number,
    description?: string,
  ): string => {
    const baseDescription = `Data point ${name}: ${value}`;
    return description ? `${baseDescription}. ${description}` : baseDescription;
  },

  chart: (
    chartType: string,
    dataCount: number,
    description?: string,
  ): string => {
    const baseDescription = `${chartType} chart with ${dataCount} data points`;
    return description ? `${baseDescription}. ${description}` : baseDescription;
  },

  button: (action: string, state?: string): string => {
    return state ? `${action} button, ${state}` : `${action} button`;
  },

  input: (label: string, value?: string, required?: boolean): string => {
    let description = `${label} input`;
    if (value) description += ` with value ${value}`;
    if (required) description += ", required";
    return description;
  },

  navigation: (currentPage: string, totalPages?: number): string => {
    return totalPages
      ? `Navigation: ${currentPage}, page 1 of ${totalPages}`
      : `Navigation: ${currentPage}`;
  },

  status: (status: string, details?: string): string => {
    return details ? `Status: ${status}. ${details}` : `Status: ${status}`;
  },
};

export const keyboardNavigation = {
  handleArrowKeys: (
    event: KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
  ): number => {
    let newIndex = currentIndex;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
        break;
      case "ArrowDown":
        event.preventDefault();
        newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = elements.length - 1;
        break;
    }

    if (newIndex !== currentIndex && elements[newIndex]) {
      elements[newIndex].focus();
    }

    return newIndex;
  },

  trapFocus: (container: HTMLElement): ((event: KeyboardEvent) => void) => {
    return KeyboardNavigationManager.trapFocus(container);
  },

  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    return KeyboardNavigationManager.getFocusableElements(container);
  },
};

export const screenReader = {
  announce: (
    message: string,
    priority: "polite" | "assertive" = "polite",
  ): void => {
    ScreenReaderManager.announce(message, priority);
  },

  announceDataChange: (type: string, oldValue: any, newValue: any): void => {
    ScreenReaderManager.announceDataChange(type, oldValue, newValue);
  },

  announceChartData: (chartType: string, dataPoints: any[]): void => {
    ScreenReaderManager.announceChartData(chartType, dataPoints);
  },

  announceError: (error: string): void => {
    ScreenReaderManager.announceError(error);
  },

  announceSuccess: (message: string): void => {
    ScreenReaderManager.announceSuccess(message);
  },
};

export const highContrastMode = {
  isEnabled: (): boolean => {
    return HighContrastManager.isEnabled();
  },

  toggle: (): void => {
    HighContrastManager.setHighContrast(!HighContrastManager.isEnabled());
  },

  enable: (): void => {
    HighContrastManager.setHighContrast(true);
  },

  disable: (): void => {
    HighContrastManager.setHighContrast(false);
  },

  subscribe: (callback: (enabled: boolean) => void): (() => void) => {
    return HighContrastManager.subscribe(callback);
  },

  getColors: () => {
    return HighContrastManager.getContrastColors();
  },
};

export const focusManagement = {
  setFocus: (element: HTMLElement | null): void => {
    if (element) {
      element.focus();
    }
  },

  saveFocus: (): HTMLElement | null => {
    return document.activeElement as HTMLElement;
  },

  restoreFocus: (element: HTMLElement | null): void => {
    if (element) {
      element.focus();
    }
  },

  trapFocus: (container: HTMLElement): ((event: KeyboardEvent) => void) => {
    return KeyboardNavigationManager.trapFocus(container);
  },
};
