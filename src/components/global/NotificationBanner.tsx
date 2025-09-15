import React from "react";
import { cn } from "@/lib/utils";
import { X, Info, AlertCircle, CheckCircle, Zap } from "lucide-react";

interface NotificationBannerProps {
  id: string;
  title: string;
  description: string;
  type?: "info" | "success" | "warning" | "feature";
  priority?: "high" | "medium" | "low";
  actionText?: string;
  actionUrl?: string;
  onDismiss?: (id: string) => void;
  onAction?: (id: string, url?: string) => void;
  className?: string;
  "aria-label"?: string;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  id,
  title,
  description,
  type = "info",
  priority = "medium",
  actionText,
  actionUrl,
  onDismiss,
  onAction,
  className,
  "aria-label": ariaLabel,
}) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return CheckCircle;
      case "warning":
        return AlertCircle;
      case "feature":
        return Zap;
      default:
        return Info;
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500/10 border-green-500/20 text-green-400";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
      case "feature":
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
      default:
        return "bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.2)] text-[#00bfff]";
    }
  };

  const getPriorityStyles = () => {
    switch (priority) {
      case "high":
        return "border-l-4 border-l-red-500";
      case "low":
        return "border-l-2 border-l-gray-500";
      default:
        return "border-l-3 border-l-[#00bfff]";
    }
  };

  const IconComponent = getIcon();

  const handleAction = () => {
    if (onAction) {
      onAction(id, actionUrl);
    }
    if (actionUrl) {
      window.open(actionUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(id);
    }
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg backdrop-blur-[10px] transition-all duration-300",
        getTypeStyles(),
        getPriorityStyles(),
        className
      )}
      role="alert"
      aria-label={ariaLabel || `${type} notification: ${title}`}
    >
      <div className="flex items-start space-x-3">
        <IconComponent
          className="h-5 w-5 mt-0.5 flex-shrink-0"
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
          <p className="text-xs text-[#8b9dc3] leading-relaxed">
            {description}
          </p>

          {actionText && (
            <button
              onClick={handleAction}
              className={cn(
                "mt-2 px-3 py-1 text-xs font-medium rounded transition-colors",
                "bg-[rgba(0,191,255,0.2)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.3)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff]"
              )}
              aria-label={`${actionText} for ${title}`}
            >
              {actionText}
            </button>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={cn(
              "p-1 rounded-md transition-colors flex-shrink-0",
              "text-[#8b9dc3] hover:text-white hover:bg-[rgba(255,255,255,0.1)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff]"
            )}
            aria-label={`Dismiss ${title} notification`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
