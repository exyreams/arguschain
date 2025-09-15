import * as React from "react";
import { cn } from "@/lib/utils";

interface CustomScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

const CustomScrollArea = React.forwardRef<HTMLDivElement, CustomScrollAreaProps>(
  ({ children, className, maxHeight = "500px", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "custom-scrollbar overflow-y-auto overflow-x-hidden",
          className
        )}
        style={{ maxHeight }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CustomScrollArea.displayName = "CustomScrollArea";

export { CustomScrollArea };