import React from "react";

// Navigation action configuration
export interface NavigationAction {
  label: string;
  path: string;
  variant:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "link";
  icon?: React.ComponentType<{ className?: string }>;
}

// Error page configuration
export interface ErrorPageConfig {
  title: string;
  subtitle: string;
  description: string;
  illustration: {
    src: string;
    alt: string;
    size: "sm" | "md" | "lg";
  };
  actions: NavigationAction[];
}

// Component prop interfaces
export interface ErrorIllustrationProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  src?: string;
  alt?: string;
}

export interface NavigationActionsProps {
  actions: NavigationAction[];
  onActionClick?: (action: NavigationAction) => void;
  className?: string;
}

export interface NotFoundPageProps {
  className?: string;
  config?: Partial<ErrorPageConfig>;
}

// Default configuration
export const DEFAULT_404_CONFIG: ErrorPageConfig = {
  title: "404",
  subtitle: "Page Not Found",
  description: "The page you're looking for doesn't exist or has been moved.",
  illustration: {
    src: "/src/assets/error_logo.svg",
    alt: "Arguschain error illustration",
    size: "lg",
  },
  actions: [
    {
      label: "Go Back",
      path: "back",
      variant: "outline",
    },
    {
      label: "Debug Trace",
      path: "/debug-trace",
      variant: "ghost",
    },
    {
      label: "Transaction Analysis",
      path: "/trace-transaction",
      variant: "ghost",
    },
  ],
};
