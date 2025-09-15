import React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
  "aria-describedby"?: string;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  defaultChecked,
  disabled = false,
  required = false,
  className,
  textClassName,
  children,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  onChange,
  onCheckedChange,
  ...props
}) => {
  const [internalChecked, setInternalChecked] = React.useState(
    defaultChecked || false
  );

  const isControlled = checked !== undefined;
  const checkedValue = isControlled ? checked : internalChecked;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = event.target.checked;

    if (!isControlled) {
      setInternalChecked(newChecked);
    }

    onChange?.(newChecked);
    onCheckedChange?.(newChecked);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!disabled) {
        const newChecked = !checkedValue;

        if (!isControlled) {
          setInternalChecked(newChecked);
        }

        onChange?.(newChecked);
        onCheckedChange?.(newChecked);
      }
    }
  };

  return (
    <label
      className={cn(
        "flex items-center space-x-2 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      htmlFor={id}
    >
      <div className="relative flex items-center">
        {/* Hidden native checkbox for accessibility */}
        <input
          id={id}
          type="checkbox"
          checked={checkedValue}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className="sr-only"
          {...props}
        />

        {/* Custom checkbox visual */}
        <div
          className={cn(
            "relative flex items-center justify-center w-4 h-4 rounded border-2 transition-all duration-200",
            "focus-within:ring-2 focus-within:ring-accent-primary focus-within:ring-offset-2 focus-within:ring-offset-bg-dark-primary",

            // Unchecked state
            !checkedValue && [
              "border-border-color bg-transparent",
              "hover:border-accent-primary hover:bg-accent-primary/10",
            ],

            // Checked state
            checkedValue && [
              "border-accent-primary bg-accent-primary",
              "hover:bg-accent-primary/90",
            ],

            // Disabled state
            disabled && [
              "border-border-color/50 bg-bg-dark-secondary/50",
              "hover:border-border-color/50 hover:bg-bg-dark-secondary/50",
            ]
          )}
          tabIndex={0}
          role="checkbox"
          aria-checked={checkedValue}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
        >
          {/* Checkmark */}
          {checkedValue && (
            <svg
              className={cn(
                "w-3 h-3 text-white transition-all duration-200",
                "animate-in zoom-in-50"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Label text */}
      {children && (
        <span
          className={cn(
            "text-sm",
            textClassName || "text-text-primary",
            disabled && !textClassName && "text-text-secondary"
          )}
        >
          {children}
        </span>
      )}
    </label>
  );
};
