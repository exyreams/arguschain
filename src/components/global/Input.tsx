import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[rgba(0,191,255,0.3)] bg-[rgba(15,20,25,0.8)] px-3 py-2 text-sm text-[#8b9dc3] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8b9dc3]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfff] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
