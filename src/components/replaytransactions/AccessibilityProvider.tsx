import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";

interface AccessibilityContextType {
  announceMessage: (message: string, priority?: "polite" | "assertive") => void;
  announceRegion: (regionName: string, content: string) => void;

  focusElement: (selector: string) => void;
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => () => void;

  highContrastMode: boolean;
  toggleHighContrast: () => void;

  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;

  fontSize: "small" | "medium" | "large" | "extra-large";
  setFontSize: (size: "small" | "medium" | "large" | "extra-large") => void;

  colorBlindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia";
  setColorBlindMode: (
    mode: "none" | "protanopia" | "deuteranopia" | "tritanopia",
  ) => void;

  skipLinks: Array<{ id: string; label: string; target: string }>;
  addSkipLink: (id: string, label: string, target: string) => void;
  removeSkipLink: (id: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null,
);

const LiveRegion: React.FC<{
  messages: Array<{
    id: string;
    message: string;
    priority: "polite" | "assertive";
  }>;
}> = ({ messages }) => {
  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="polite-announcements"
      >
        {messages
          .filter((msg) => msg.priority === "polite")
          .map((msg) => (
            <div key={msg.id}>{msg.message}</div>
          ))}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="assertive-announcements"
      >
        {messages
          .filter((msg) => msg.priority === "assertive")
          .map((msg) => (
            <div key={msg.id}>{msg.message}</div>
          ))}
      </div>
    </>
  );
};

const SkipLinks: React.FC<{
  links: Array<{ id: string; label: string; target: string }>;
}> = ({ links }) => {
  if (links.length === 0) return null;

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-primary text-primary-foreground p-2 space-x-2">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.target}`}
            className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={(e) => {
              e.preventDefault();
              const target = document.getElementById(link.target);
              if (target) {
                target.focus();
                target.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
};

const useFocusTrap = () => {
  const trapFocus = useCallback(
    (containerRef: React.RefObject<HTMLElement>) => {
      const container = containerRef.current;
      if (!container) return () => {};

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          container.blur();
        }
      };

      container.addEventListener("keydown", handleTabKey);
      container.addEventListener("keydown", handleEscapeKey);

      firstElement?.focus();

      return () => {
        container.removeEventListener("keydown", handleTabKey);
        container.removeEventListener("keydown", handleEscapeKey);
      };
    },
    [],
  );

  return trapFocus;
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      message: string;
      priority: "polite" | "assertive";
    }>
  >([]);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState<
    "small" | "medium" | "large" | "extra-large"
  >("medium");
  const [colorBlindMode, setColorBlindMode] = useState<
    "none" | "protanopia" | "deuteranopia" | "tritanopia"
  >("none");
  const [skipLinks, setSkipLinks] = useState<
    Array<{ id: string; label: string; target: string }>
  >([]);

  const trapFocus = useFocusTrap();

  useEffect(() => {
    const savedPrefs = localStorage.getItem("accessibility-preferences");
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setHighContrastMode(prefs.highContrastMode || false);
        setReducedMotion(prefs.reducedMotion || false);
        setFontSize(prefs.fontSize || "medium");
        setColorBlindMode(prefs.colorBlindMode || "none");
      } catch (error) {
        console.error("Failed to load accessibility preferences:", error);
      }
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      setReducedMotion(true);
    }

    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)",
    ).matches;
    if (prefersHighContrast) {
      setHighContrastMode(true);
    }
  }, []);

  useEffect(() => {
    const prefs = {
      highContrastMode,
      reducedMotion,
      fontSize,
      colorBlindMode,
    };
    localStorage.setItem("accessibility-preferences", JSON.stringify(prefs));
  }, [highContrastMode, reducedMotion, fontSize, colorBlindMode]);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("high-contrast", highContrastMode);

    root.classList.toggle("reduce-motion", reducedMotion);

    root.classList.remove(
      "font-small",
      "font-medium",
      "font-large",
      "font-extra-large",
    );
    root.classList.add(`font-${fontSize}`);

    root.classList.remove("protanopia", "deuteranopia", "tritanopia");
    if (colorBlindMode !== "none") {
      root.classList.add(colorBlindMode);
    }
  }, [highContrastMode, reducedMotion, fontSize, colorBlindMode]);

  const announceMessage = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const id = `announcement-${Date.now()}-${Math.random()}`;
      setMessages((prev) => [...prev, { id, message, priority }]);

      setTimeout(() => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
      }, 1000);
    },
    [],
  );

  const announceRegion = useCallback(
    (regionName: string, content: string) => {
      announceMessage(`${regionName}: ${content}`, "polite");
    },
    [announceMessage],
  );

  const focusElement = useCallback(
    (selector: string) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      }
    },
    [reducedMotion],
  );

  const toggleHighContrast = useCallback(() => {
    setHighContrastMode((prev) => !prev);
    announceMessage(
      `High contrast mode ${!highContrastMode ? "enabled" : "disabled"}`,
      "assertive",
    );
  }, [highContrastMode, announceMessage]);

  const addSkipLink = useCallback(
    (id: string, label: string, target: string) => {
      setSkipLinks((prev) => {
        const existing = prev.find((link) => link.id === id);
        if (existing) {
          return prev.map((link) =>
            link.id === id ? { id, label, target } : link,
          );
        }
        return [...prev, { id, label, target }];
      });
    },
    [],
  );

  const removeSkipLink = useCallback((id: string) => {
    setSkipLinks((prev) => prev.filter((link) => link.id !== id));
  }, []);

  const contextValue: AccessibilityContextType = {
    announceMessage,
    announceRegion,
    focusElement,
    trapFocus,
    highContrastMode,
    toggleHighContrast,
    reducedMotion,
    setReducedMotion,
    fontSize,
    setFontSize,
    colorBlindMode,
    setColorBlindMode,
    skipLinks,
    addSkipLink,
    removeSkipLink,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <SkipLinks links={skipLinks} />
      <LiveRegion messages={messages} />
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider",
    );
  }
  return context;
};

export const AccessibleButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
}> = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  ariaLabel,
  ariaDescribedBy,
  className,
}) => {
  const { announceMessage } = useAccessibility();

  const handleClick = useCallback(() => {
    if (disabled) return;
    onClick?.();

    if (ariaLabel) {
      announceMessage(`${ariaLabel} activated`, "polite");
    }
  }, [onClick, disabled, ariaLabel, announceMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",

        variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" &&
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",

        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4",
        size === "lg" && "h-12 px-6 text-lg",

        className,
      )}
    >
      {children}
    </button>
  );
};

export const AccessibleTable: React.FC<{
  caption: string;
  headers: string[];
  data: any[][];
  className?: string;
  sortable?: boolean;
  onSort?: (columnIndex: number, direction: "asc" | "desc") => void;
}> = ({ caption, headers, data, className, sortable = false, onSort }) => {
  const { announceMessage } = useAccessibility();
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = useCallback(
    (columnIndex: number) => {
      if (!sortable || !onSort) return;

      const newDirection =
        sortColumn === columnIndex && sortDirection === "asc" ? "desc" : "asc";
      setSortColumn(columnIndex);
      setSortDirection(newDirection);
      onSort(columnIndex, newDirection);

      announceMessage(
        `Table sorted by ${headers[columnIndex]} in ${newDirection}ending order`,
        "polite",
      );
    },
    [sortable, onSort, sortColumn, sortDirection, headers, announceMessage],
  );

  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full border-collapse" role="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr role="row">
            {headers.map((header, index) => (
              <th
                key={index}
                role="columnheader"
                scope="col"
                tabIndex={sortable ? 0 : undefined}
                onClick={sortable ? () => handleSort(index) : undefined}
                onKeyDown={
                  sortable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSort(index);
                        }
                      }
                    : undefined
                }
                aria-sort={
                  sortColumn === index
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : sortable
                      ? "none"
                      : undefined
                }
                className={cn(
                  "p-3 text-left border-b font-medium",
                  sortable &&
                    "cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                )}
              >
                <div className="flex items-center space-x-2">
                  <span>{header}</span>
                  {sortable && sortColumn === index && (
                    <span aria-hidden="true">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} role="row">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} role="gridcell" className="p-3 border-b">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const AccessibleChart: React.FC<{
  title: string;
  description: string;
  data: any[];
  children: React.ReactNode;
  className?: string;
  alternativeTable?: boolean;
}> = ({
  title,
  description,
  data,
  children,
  className,
  alternativeTable = true,
}) => {
  const { announceMessage } = useAccessibility();
  const [showTable, setShowTable] = useState(false);

  const toggleTable = useCallback(() => {
    setShowTable((prev) => !prev);
    announceMessage(
      showTable ? "Showing chart view" : "Showing table view",
      "polite",
    );
  }, [showTable, announceMessage]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {alternativeTable && (
          <AccessibleButton
            onClick={toggleTable}
            variant="ghost"
            size="sm"
            ariaLabel={`Switch to ${showTable ? "chart" : "table"} view`}
          >
            {showTable ? "Show Chart" : "Show Table"}
          </AccessibleButton>
        )}
      </div>

      {showTable && alternativeTable ? (
        <div
          role="img"
          aria-labelledby="chart-title"
          aria-describedby="chart-description"
        >
          <div id="chart-title" className="sr-only">
            {title}
          </div>
          <div id="chart-description" className="sr-only">
            {description}
          </div>

          <AccessibleTable
            caption={`Data table for ${title}`}
            headers={Object.keys(data[0] || {})}
            data={data.map((item) => Object.values(item))}
          />
        </div>
      ) : (
        <div
          role="img"
          aria-labelledby="chart-title"
          aria-describedby="chart-description"
          tabIndex={0}
        >
          <div id="chart-title" className="sr-only">
            {title}
          </div>
          <div id="chart-description" className="sr-only">
            {description}
          </div>
          {children}
        </div>
      )}
    </div>
  );
};

export const AccessibilitySettings: React.FC<{ className?: string }> = ({
  className,
}) => {
  const {
    highContrastMode,
    toggleHighContrast,
    reducedMotion,
    setReducedMotion,
    fontSize,
    setFontSize,
    colorBlindMode,
    setColorBlindMode,
    announceMessage,
  } = useAccessibility();

  return (
    <div
      className={cn("space-y-6 p-4", className)}
      role="region"
      aria-label="Accessibility Settings"
    >
      <h2 className="text-xl font-semibold">Accessibility Settings</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">Display</label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="high-contrast"
            checked={highContrastMode}
            onChange={toggleHighContrast}
            className="rounded"
          />
          <label htmlFor="high-contrast" className="text-sm">
            High contrast mode
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Motion</label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="reduced-motion"
            checked={reducedMotion}
            onChange={(e) => {
              setReducedMotion(e.target.checked);
              announceMessage(
                `Reduced motion ${e.target.checked ? "enabled" : "disabled"}`,
                "polite",
              );
            }}
            className="rounded"
          />
          <label htmlFor="reduced-motion" className="text-sm">
            Reduce motion and animations
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="font-size" className="text-sm font-medium">
          Font Size
        </label>
        <select
          id="font-size"
          value={fontSize}
          onChange={(e) => {
            const newSize = e.target.value as typeof fontSize;
            setFontSize(newSize);
            announceMessage(`Font size changed to ${newSize}`, "polite");
          }}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra Large</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="color-blind-mode" className="text-sm font-medium">
          Color Vision Support
        </label>
        <select
          id="color-blind-mode"
          value={colorBlindMode}
          onChange={(e) => {
            const newMode = e.target.value as typeof colorBlindMode;
            setColorBlindMode(newMode);
            announceMessage(
              `Color vision mode changed to ${newMode === "none" ? "default" : newMode}`,
              "polite",
            );
          }}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
        >
          <option value="none">Default</option>
          <option value="protanopia">Protanopia (Red-blind)</option>
          <option value="deuteranopia">Deuteranopia (Green-blind)</option>
          <option value="tritanopia">Tritanopia (Blue-blind)</option>
        </select>
      </div>
    </div>
  );
};

export default AccessibilityProvider;
