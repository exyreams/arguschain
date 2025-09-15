import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: "text" | "rectangular" | "circular" | "rounded";
  animation?: "pulse" | "wave" | "none";
}

/**
 * Skeleton - Basic skeleton loading component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  variant = "rectangular",
  animation = "pulse",
}) => {
  const baseClasses =
    "bg-gradient-to-r from-[rgba(139,157,195,0.1)] via-[rgba(139,157,195,0.2)] to-[rgba(139,157,195,0.1)]";

  const variantClasses = {
    text: "h-4 rounded",
    rectangular: "rounded",
    circular: "rounded-full",
    rounded: "rounded-lg",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-pulse bg-gradient-to-r from-[rgba(139,157,195,0.1)] via-[rgba(139,157,195,0.3)] to-[rgba(139,157,195,0.1)] bg-[length:200%_100%] animate-[wave_1.5s_ease-in-out_infinite]",
    none: "",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * TableSkeleton - Skeleton for table loading
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = "",
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-8 flex-1"
              variant="rounded"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * ChartSkeleton - Skeleton for chart loading
 */
interface ChartSkeletonProps {
  height?: number;
  className?: string;
  type?: "bar" | "line" | "pie" | "area";
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 300,
  className = "",
  type = "bar",
}) => {
  return (
    <div
      className={cn(
        "relative bg-[rgba(25,28,40,0.6)] rounded border border-[rgba(0,191,255,0.1)] p-4",
        className
      )}
      style={{ height }}
    >
      {/* Chart Title */}
      <div className="mb-4">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Chart Area */}
      <div className="relative h-full">
        {type === "bar" && (
          <div className="flex items-end justify-between h-full gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full"
                height={Math.random() * 80 + 20 + "%"}
                variant="rounded"
              />
            ))}
          </div>
        )}

        {type === "line" && (
          <div className="relative h-full">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <defs>
                <linearGradient
                  id="skeletonGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(139,157,195,0.1)" />
                  <stop offset="50%" stopColor="rgba(139,157,195,0.3)" />
                  <stop offset="100%" stopColor="rgba(139,157,195,0.1)" />
                </linearGradient>
              </defs>
              <path
                d="M 0 150 Q 100 100 200 120 T 400 80"
                stroke="url(#skeletonGradient)"
                strokeWidth="2"
                fill="none"
                className="animate-pulse"
              />
              <path
                d="M 0 150 Q 100 100 200 120 T 400 80 L 400 200 L 0 200 Z"
                fill="url(#skeletonGradient)"
                opacity="0.3"
                className="animate-pulse"
              />
            </svg>
          </div>
        )}

        {type === "pie" && (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="w-32 h-32" variant="circular" />
          </div>
        )}

        {type === "area" && (
          <div className="relative h-full">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <defs>
                <linearGradient
                  id="areaGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="rgba(139,157,195,0.3)" />
                  <stop offset="100%" stopColor="rgba(139,157,195,0.1)" />
                </linearGradient>
              </defs>
              <path
                d="M 0 180 Q 100 120 200 140 T 400 100 L 400 200 L 0 200 Z"
                fill="url(#areaGradient)"
                className="animate-pulse"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" variant="circular" />
            <Skeleton className="w-16 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * CardSkeleton - Skeleton for metric cards
 */
interface CardSkeletonProps {
  className?: string;
  showIcon?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className = "",
  showIcon = true,
}) => {
  return (
    <div
      className={cn(
        "bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-4 w-16" />
        </div>
        {showIcon && <Skeleton className="w-8 h-8" variant="circular" />}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
};

/**
 * ListSkeleton - Skeleton for list items
 */
interface ListSkeletonProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  className = "",
  showAvatar = false,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {showAvatar && <Skeleton className="w-10 h-10" variant="circular" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" variant="rounded" />
        </div>
      ))}
    </div>
  );
};

/**
 * ProgressSkeleton - Skeleton with progress indication
 */
interface ProgressSkeletonProps {
  progress?: number;
  className?: string;
  label?: string;
}

export const ProgressSkeleton: React.FC<ProgressSkeletonProps> = ({
  progress = 0,
  className = "",
  label = "Loading...",
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-32" />
        <span className="text-sm text-[#8b9dc3]">{progress.toFixed(0)}%</span>
      </div>

      <div className="w-full bg-[rgba(25,28,40,0.6)] rounded-full h-2">
        <div
          className="bg-gradient-to-r from-[#00bfff] to-[#0ea5e9] h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-center">
        <span className="text-sm text-[#8b9dc3]">{label}</span>
      </div>
    </div>
  );
};

export default Skeleton;
