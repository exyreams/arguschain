import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  variant?: "default" | "outlined" | "elevated";
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

const CardRoot: React.FC<CardProps> = ({
  title,
  children,
  variant = "default",
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const cardClasses = cn(
    // Base styles
    "rounded-lg border bg-card text-card-foreground shadow-sm",
    "bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border-[rgba(0,191,255,0.2)]",

    // Variants
    variant === "outlined" && "border-2",
    variant === "elevated" && "shadow-lg",

    // Interactive
    onClick && "cursor-pointer hover:bg-[rgba(25,28,40,0.9)] transition-colors",

    className
  );

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {title && (
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold text-[#00bfff]">{title}</h3>
        </div>
      )}
      <div className={title ? "p-6 pt-4" : ""}>{children}</div>
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)}>
      {children}
    </div>
  );
};

const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
};

// Create compound component
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
});
