import React, { useState, memo } from "react";
import { cn } from "@/lib/utils";
import type { ErrorIllustrationProps } from "./types";

const ErrorIllustration: React.FC<ErrorIllustrationProps> = ({
  className,
  size = "lg",
  animate = true,
  src = "/src/assets/error_logo.svg",
  alt = "Error illustration",
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    console.warn("Failed to load error illustration, falling back to CSS icon");
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const sizeClasses = {
    sm: "w-24 h-24 sm:w-32 sm:h-32",
    md: "w-36 h-36 sm:w-48 sm:h-48",
    lg: "w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80",
  };

  // Fallback CSS icon if SVG fails to load
  const FallbackIcon = () => (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-bg-dark-secondary border-2 border-border-color",
        sizeClasses[size],
        animate && "animate-pulse"
      )}
      role="img"
      aria-label={alt}
    >
      <svg
        className="w-1/2 h-1/2 text-text-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    </div>
  );

  if (imageError) {
    return <FallbackIcon />;
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative">
        {/* Loading placeholder */}
        {!isLoaded && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-bg-dark-secondary rounded-lg animate-pulse",
              sizeClasses[size]
            )}
            aria-hidden="true"
          >
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Main SVG illustration */}
        <img
          src={src}
          alt={alt}
          className={cn(
            "object-contain transition-opacity duration-300 max-w-full h-auto",
            sizeClasses[size],
            animate && isLoaded && "animate-fade-in",
            !isLoaded && "opacity-0"
          )}
          onError={handleImageError}
          onLoad={handleImageLoad}
          role="img"
        />
      </div>
    </div>
  );
};

export default memo(ErrorIllustration);
