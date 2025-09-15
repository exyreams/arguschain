import React, { useEffect, useState } from "react";
import { Button } from "@/components/global";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

type DeviceType = "mobile" | "tablet" | "desktop";

interface LayoutConfig {
  columns: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    "2xl": number;
  };
  gaps: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
  padding: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
}

export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>("lg");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({ width, height });

      let newBreakpoint: Breakpoint = "xs";

      Object.entries(breakpoints).forEach(([bp, minWidth]) => {
        if (width >= minWidth) {
          newBreakpoint = bp as Breakpoint;
        }
      });

      setCurrentBreakpoint(newBreakpoint);
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);

    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  const isMobile = currentBreakpoint === "xs" || currentBreakpoint === "sm";
  const isTablet = currentBreakpoint === "md";
  const isDesktop =
    currentBreakpoint === "lg" ||
    currentBreakpoint === "xl" ||
    currentBreakpoint === "2xl";

  const deviceType: DeviceType = isMobile
    ? "mobile"
    : isTablet
      ? "tablet"
      : "desktop";

  return {
    currentBreakpoint,
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    deviceType,
    isAtLeast: (bp: Breakpoint) => windowSize.width >= breakpoints[bp],
    isBelow: (bp: Breakpoint) => windowSize.width < breakpoints[bp],
  };
};

export const useTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    };

    checkTouch();
    window.addEventListener("touchstart", checkTouch, { once: true });

    return () => window.removeEventListener("touchstart", checkTouch);
  }, []);

  return isTouch;
};

export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  config?: Partial<LayoutConfig>;
  className?: string;
  autoFit?: boolean;
  minItemWidth?: string;
}> = ({
  children,
  config,
  className,
  autoFit = false,
  minItemWidth = "300px",
}) => {
  const { currentBreakpoint } = useBreakpoint();

  const defaultConfig: LayoutConfig = {
    columns: { xs: 1, sm: 1, md: 2, lg: 3, xl: 4, "2xl": 4 },
    gaps: {
      xs: "1rem",
      sm: "1rem",
      md: "1.5rem",
      lg: "2rem",
      xl: "2rem",
      "2xl": "2rem",
    },
    padding: {
      xs: "1rem",
      sm: "1rem",
      md: "1.5rem",
      lg: "2rem",
      xl: "2rem",
      "2xl": "2rem",
    },
  };

  const finalConfig = { ...defaultConfig, ...config };
  const columns = finalConfig.columns[currentBreakpoint];
  const gap = finalConfig.gaps[currentBreakpoint];
  const padding = finalConfig.padding[currentBreakpoint];

  const gridStyle = autoFit
    ? {
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
        gap,
        padding,
      }
    : {
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        padding,
      };

  return (
    <div className={cn("w-full", className)} style={gridStyle}>
      {children}
    </div>
  );
};

export const ResponsiveContainer: React.FC<{
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
  fluid?: boolean;
}> = ({ children, maxWidth = "xl", className, fluid = false }) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6 lg:px-8",
        !fluid && maxWidthClasses[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: "left" | "right";
  className?: string;
}> = ({ isOpen, onClose, children, title, position = "left", className }) => {
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isMobile) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "fixed top-0 h-full w-80 max-w-[85vw] bg-background border-r z-50 transform transition-transform duration-300 ease-in-out",
          position === "left" ? "left-0" : "right-0",
          isOpen
            ? "translate-x-0"
            : position === "left"
              ? "-translate-x-full"
              : "translate-x-full",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Navigation drawer"}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
};

export const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  className?: string;
}> = ({
  title,
  children,
  defaultOpen = false,
  alwaysOpen = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { isMobile } = useBreakpoint();

  const shouldCollapse = isMobile && !alwaysOpen;

  return (
    <div className={cn("border rounded-lg", className)}>
      <button
        className={cn(
          "w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors",
          !shouldCollapse && "cursor-default",
        )}
        onClick={() => shouldCollapse && setIsOpen(!isOpen)}
        disabled={!shouldCollapse}
        aria-expanded={shouldCollapse ? isOpen : true}
        aria-controls={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <h3 className="font-medium">{title}</h3>
        {shouldCollapse && (
          <div className="ml-2">
            {isOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
      </button>

      <div
        id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className={cn("border-t", shouldCollapse && !isOpen && "hidden")}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export const ResponsiveTable: React.FC<{
  children: React.ReactNode;
  className?: string;
  stackOnMobile?: boolean;
}> = ({ children, className, stackOnMobile = true }) => {
  const { isMobile } = useBreakpoint();

  if (isMobile && stackOnMobile) {
    return <div className={cn("space-y-4", className)}>{children}</div>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-full">{children}</div>
    </div>
  );
};

export const TouchButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled = false,
}) => {
  const { isMobile } = useBreakpoint();
  const isTouch = useTouch();

  const touchOptimized = isMobile || isTouch;

  return (
    <Button
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      className={cn(
        touchOptimized && size === "sm" && "h-10 px-4 text-sm",
        touchOptimized && size === "md" && "h-12 px-6",
        touchOptimized && size === "lg" && "h-14 px-8 text-lg",

        touchOptimized && "active:scale-95 transition-transform",

        className,
      )}
    >
      {children}
    </Button>
  );
};

export const LayoutSwitcher: React.FC<{
  layouts: Array<{
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType<any>;
  }>;
  currentLayout: string;
  onLayoutChange: (layoutId: string) => void;
  data: any;
  className?: string;
}> = ({ layouts, currentLayout, onLayoutChange, data, className }) => {
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    if (isMobile && currentLayout !== "mobile-optimized") {
      const mobileLayout = layouts.find(
        (l) => l.id.includes("mobile") || l.id.includes("stack"),
      );
      if (mobileLayout) {
        onLayoutChange(mobileLayout.id);
      }
    } else if (isTablet && currentLayout !== "tablet-optimized") {
      const tabletLayout = layouts.find(
        (l) => l.id.includes("tablet") || l.id.includes("grid"),
      );
      if (tabletLayout) {
        onLayoutChange(tabletLayout.id);
      }
    }
  }, [isMobile, isTablet, currentLayout, layouts, onLayoutChange]);

  const currentLayoutConfig = layouts.find((l) => l.id === currentLayout);
  const CurrentComponent = currentLayoutConfig?.component;

  return (
    <div className={cn("space-y-4", className)}>
      {!isMobile && layouts.length > 1 && (
        <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
          {layouts.map((layout) => {
            const IconComponent = layout.icon;
            return (
              <button
                key={layout.id}
                onClick={() => onLayoutChange(layout.id)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  currentLayout === layout.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
                title={layout.name}
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{layout.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {CurrentComponent && <CurrentComponent {...data} />}
    </div>
  );
};

export const DevicePreview: React.FC<{
  children: React.ReactNode;
  device: "mobile" | "tablet" | "desktop";
  className?: string;
}> = ({ children, device, className }) => {
  const deviceStyles = {
    mobile: "w-[375px] h-[667px]",
    tablet: "w-[768px] h-[1024px]",
    desktop: "w-full h-full",
  };

  const deviceIcons = {
    mobile: Smartphone,
    tablet: Tablet,
    desktop: Monitor,
  };

  const DeviceIcon = deviceIcons[device];

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className="flex items-center space-x-2 p-2 bg-muted border-b">
        <DeviceIcon className="h-4 w-4" />
        <span className="text-sm font-medium capitalize">{device} Preview</span>
      </div>

      <div className="p-4 bg-gray-100">
        <div
          className={cn(
            "bg-white border rounded-lg overflow-hidden mx-auto",
            deviceStyles[device],
            device !== "desktop" && "shadow-lg",
          )}
        >
          <div className="w-full h-full overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const ResponsiveImage: React.FC<{
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}> = ({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  className,
  priority = false,
}) => {
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      className={cn("w-full h-auto", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
};

export const ResponsiveText: React.FC<{
  children: React.ReactNode;
  variant?: "h1" | "h2" | "h3" | "h4" | "body" | "caption";
  className?: string;
}> = ({ children, variant = "body", className }) => {
  const { currentBreakpoint } = useBreakpoint();

  const variantClasses = {
    h1: {
      xs: "text-2xl font-bold",
      sm: "text-3xl font-bold",
      md: "text-4xl font-bold",
      lg: "text-5xl font-bold",
      xl: "text-6xl font-bold",
      "2xl": "text-6xl font-bold",
    },
    h2: {
      xs: "text-xl font-semibold",
      sm: "text-2xl font-semibold",
      md: "text-3xl font-semibold",
      lg: "text-4xl font-semibold",
      xl: "text-4xl font-semibold",
      "2xl": "text-4xl font-semibold",
    },
    h3: {
      xs: "text-lg font-semibold",
      sm: "text-xl font-semibold",
      md: "text-2xl font-semibold",
      lg: "text-2xl font-semibold",
      xl: "text-2xl font-semibold",
      "2xl": "text-2xl font-semibold",
    },
    h4: {
      xs: "text-base font-medium",
      sm: "text-lg font-medium",
      md: "text-xl font-medium",
      lg: "text-xl font-medium",
      xl: "text-xl font-medium",
      "2xl": "text-xl font-medium",
    },
    body: {
      xs: "text-sm",
      sm: "text-base",
      md: "text-base",
      lg: "text-base",
      xl: "text-base",
      "2xl": "text-base",
    },
    caption: {
      xs: "text-xs",
      sm: "text-sm",
      md: "text-sm",
      lg: "text-sm",
      xl: "text-sm",
      "2xl": "text-sm",
    },
  };

  const Component = variant.startsWith("h") ? variant : "p";
  const classes = variantClasses[variant][currentBreakpoint];

  return React.createElement(
    Component,
    {
      className: cn(classes, className),
    },
    children,
  );
};

export default ResponsiveLayout;
