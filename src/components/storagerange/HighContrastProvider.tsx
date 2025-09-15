import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { highContrastMode } from "@/lib/storagerange/accessibilityUtils";

interface HighContrastContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  contrastLevel: "normal" | "high" | "maximum";
  setContrastLevel: (level: "normal" | "high" | "maximum") => void;
  getContrastColors: () => ContrastColors;
}

interface ContrastColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  focus: string;
  error: string;
  warning: string;
  success: string;
  muted: string;
}

const HighContrastContext = createContext<HighContrastContextType | undefined>(
  undefined,
);

interface HighContrastProviderProps {
  children: ReactNode;
  className?: string;
}

export const HighContrastProvider: React.FC<HighContrastProviderProps> = ({
  children,
  className = "",
}) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [contrastLevel, setContrastLevel] = useState<
    "normal" | "high" | "maximum"
  >("normal");
  const [systemPreference, setSystemPreference] = useState(false);

  useEffect(() => {
    const isSystemHighContrast = highContrastMode.isHighContrast();
    setSystemPreference(isSystemHighContrast);

    const userPreference = localStorage.getItem("high-contrast-mode");
    if (userPreference === null && isSystemHighContrast) {
      setIsHighContrast(true);
      setContrastLevel("high");
    } else if (userPreference) {
      setIsHighContrast(userPreference === "true");
      const savedLevel = localStorage.getItem("contrast-level") as
        | "normal"
        | "high"
        | "maximum";
      if (savedLevel) {
        setContrastLevel(savedLevel);
      }
    }

    const cleanup = highContrastMode.addHighContrastListener((highContrast) => {
      setSystemPreference(highContrast);

      const userPreference = localStorage.getItem("high-contrast-mode");
      if (userPreference === null) {
        setIsHighContrast(highContrast);
        setContrastLevel(highContrast ? "high" : "normal");
      }
    });

    return cleanup;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const colors = getContrastColors();

    root.style.setProperty("--hc-background", colors.background);
    root.style.setProperty("--hc-foreground", colors.foreground);
    root.style.setProperty("--hc-primary", colors.primary);
    root.style.setProperty("--hc-secondary", colors.secondary);
    root.style.setProperty("--hc-accent", colors.accent);
    root.style.setProperty("--hc-border", colors.border);
    root.style.setProperty("--hc-focus", colors.focus);
    root.style.setProperty("--hc-error", colors.error);
    root.style.setProperty("--hc-warning", colors.warning);
    root.style.setProperty("--hc-success", colors.success);
    root.style.setProperty("--hc-muted", colors.muted);

    if (isHighContrast) {
      document.body.classList.add("high-contrast");
      document.body.classList.add(`contrast-${contrastLevel}`);
    } else {
      document.body.classList.remove("high-contrast");
      document.body.classList.remove(
        "contrast-normal",
        "contrast-high",
        "contrast-maximum",
      );
    }

    return () => {
      document.body.classList.remove(
        "high-contrast",
        "contrast-normal",
        "contrast-high",
        "contrast-maximum",
      );
    };
  }, [isHighContrast, contrastLevel]);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    localStorage.setItem("high-contrast-mode", newValue.toString());

    const message = newValue
      ? "High contrast mode enabled"
      : "High contrast mode disabled";

    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "assertive");
    announcement.setAttribute("aria-atomic", "true");
    announcement.style.position = "absolute";
    announcement.style.left = "-10000px";
    announcement.textContent = message;

    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const handleSetContrastLevel = (level: "normal" | "high" | "maximum") => {
    setContrastLevel(level);
    localStorage.setItem("contrast-level", level);

    if (level !== "normal" && !isHighContrast) {
      setIsHighContrast(true);
      localStorage.setItem("high-contrast-mode", "true");
    }
  };

  const getContrastColors = (): ContrastColors => {
    if (!isHighContrast) {
      return {
        background: "#191c28",
        foreground: "#8b9dc3",
        primary: "#00bfff",
        secondary: "#4a5568",
        accent: "#00bfff",
        border: "rgba(0,191,255,0.2)",
        focus: "#00bfff",
        error: "#ff6b6b",
        warning: "#feca57",
        success: "#4ecdc4",
        muted: "#8b9dc3",
      };
    }

    switch (contrastLevel) {
      case "high":
        return {
          background: "#000000",
          foreground: "#ffffff",
          primary: "#00ffff",
          secondary: "#ffffff",
          accent: "#ffff00",
          border: "#ffffff",
          focus: "#ffff00",
          error: "#ff0000",
          warning: "#ffff00",
          success: "#00ff00",
          muted: "#cccccc",
        };

      case "maximum":
        return {
          background: "#000000",
          foreground: "#ffffff",
          primary: "#ffffff",
          secondary: "#ffffff",
          accent: "#ffffff",
          border: "#ffffff",
          focus: "#ffffff",
          error: "#ffffff",
          warning: "#ffffff",
          success: "#ffffff",
          muted: "#ffffff",
        };

      default:
        return {
          background: "#1a1a1a",
          foreground: "#ffffff",
          primary: "#00ccff",
          secondary: "#cccccc",
          accent: "#ffcc00",
          border: "#666666",
          focus: "#ffcc00",
          error: "#ff4444",
          warning: "#ffaa00",
          success: "#44ff44",
          muted: "#aaaaaa",
        };
    }
  };

  const contextValue: HighContrastContextType = {
    isHighContrast,
    toggleHighContrast,
    contrastLevel,
    setContrastLevel: handleSetContrastLevel,
    getContrastColors,
  };

  return (
    <HighContrastContext.Provider value={contextValue}>
      <div
        className={`${className} ${isHighContrast ? "high-contrast" : ""} contrast-${contrastLevel}`}
        data-high-contrast={isHighContrast}
        data-contrast-level={contrastLevel}
        data-system-preference={systemPreference}
      >
        {children}
      </div>
    </HighContrastContext.Provider>
  );
};

export const useHighContrast = (): HighContrastContextType => {
  const context = useContext(HighContrastContext);
  if (context === undefined) {
    throw new Error(
      "useHighContrast must be used within a HighContrastProvider",
    );
  }
  return context;
};

export const HighContrastControls: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const {
    isHighContrast,
    toggleHighContrast,
    contrastLevel,
    setContrastLevel,
  } = useHighContrast();

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <label
          htmlFor="high-contrast-toggle"
          className="text-sm text-[#8b9dc3]"
        >
          High Contrast
        </label>
        <button
          id="high-contrast-toggle"
          role="switch"
          aria-checked={isHighContrast}
          onClick={toggleHighContrast}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${
              isHighContrast
                ? "bg-[#00bfff] focus:ring-[#00bfff]"
                : "bg-gray-600 focus:ring-gray-500"
            }
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isHighContrast ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      {isHighContrast && (
        <div className="flex items-center gap-2">
          <label htmlFor="contrast-level" className="text-sm text-[#8b9dc3]">
            Level
          </label>
          <select
            id="contrast-level"
            value={contrastLevel}
            onChange={(e) =>
              setContrastLevel(e.target.value as "normal" | "high" | "maximum")
            }
            className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#00bfff]"
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="maximum">Maximum</option>
          </select>
        </div>
      )}
    </div>
  );
};

export const highContrastStyles = `
  .high-contrast {
    --color-background: var(--hc-background);
    --color-foreground: var(--hc-foreground);
    --color-primary: var(--hc-primary);
    --color-secondary: var(--hc-secondary);
    --color-accent: var(--hc-accent);
    --color-border: var(--hc-border);
    --color-focus: var(--hc-focus);
    --color-error: var(--hc-error);
    --color-warning: var(--hc-warning);
    --color-success: var(--hc-success);
    --color-muted: var(--hc-muted);
  }

  .high-contrast * {
    border-color: var(--hc-border) !important;
  }

  .high-contrast button,
  .high-contrast input,
  .high-contrast select,
  .high-contrast textarea {
    background-color: var(--hc-background) !important;
    color: var(--hc-foreground) !important;
    border: 2px solid var(--hc-border) !important;
  }

  .high-contrast button:focus,
  .high-contrast input:focus,
  .high-contrast select:focus,
  .high-contrast textarea:focus,
  .high-contrast [tabindex]:focus {
    outline: 3px solid var(--hc-focus) !important;
    outline-offset: 2px !important;
  }

  .high-contrast a {
    color: var(--hc-primary) !important;
    text-decoration: underline !important;
  }

  .high-contrast a:visited {
    color: var(--hc-accent) !important;
  }

  .contrast-maximum * {
    background-color: #000000 !important;
    color: #ffffff !important;
    border-color: #ffffff !important;
  }

  .contrast-maximum svg {
    fill: #ffffff !important;
    stroke: #ffffff !important;
  }
`;

if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = highContrastStyles;
  document.head.appendChild(styleElement);
}
