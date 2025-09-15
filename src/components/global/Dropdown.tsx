import * as React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type DropdownPosition = "top" | "bottom";

interface SelectContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedValue: string | undefined;
  setSelectedValue: (value: string, label: React.ReactNode) => void;
  selectedLabel: React.ReactNode;
  placeholder?: string;
  contentPosition: DropdownPosition;
  triggerRect: DOMRect | null;
}

const SelectContext = createContext<SelectContextType | null>(null);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error(
      "Select components must be used within a <Select> provider",
    );
  }
  return context;
};

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

const Select = ({
  children,
  value,
  onValueChange,
  placeholder,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{
    value?: string;
    label: React.ReactNode;
  }>({
    value: value,
    label: placeholder,
  });
  const [contentPosition, setContentPosition] =
    useState<DropdownPosition>("bottom");
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const selectRef = useRef<HTMLDivElement>(null);

  const setSelectedValue = useCallback(
    (newValue: string, newLabel: React.ReactNode) => {
      onValueChange?.(newValue);
      setSelectedOption({ value: newValue, label: newLabel });
      setIsOpen(false);
    },
    [onValueChange],
  );

  const findLabel = useCallback(
    (nodes: React.ReactNode, targetValue: string): React.ReactNode => {
      let foundLabel: React.ReactNode = null;
      React.Children.forEach(nodes, (child) => {
        if (foundLabel) return;
        if (React.isValidElement(child) && child.props) {
          const props = child.props as any;
          if (props.value === targetValue) {
            foundLabel = props.children;
          } else if (props.children) {
            const nestedLabel = findLabel(props.children, targetValue);
            if (nestedLabel) foundLabel = nestedLabel;
          }
        }
      });
      return foundLabel;
    },
    [],
  );

  useEffect(() => {
    if (value !== undefined) {
      const label = findLabel(children, value) || placeholder;
      setSelectedOption({ value, label });
    }
  }, [value, children, placeholder, findLabel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (selectRef.current && selectRef.current.contains(target)) {
        return;
      }

      const dropdownContent = document.querySelector('[role="listbox"]');
      if (dropdownContent && dropdownContent.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const calculatePosition = () => {
      if (selectRef.current) {
        const triggerEl = selectRef.current.querySelector("button");
        if (!triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        setTriggerRect(rect);

        const viewportHeight = window.innerHeight;
        const contentHeightEstimate = 240;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (
          spaceBelow < contentHeightEstimate &&
          spaceAbove > contentHeightEstimate
        ) {
          setContentPosition("top");
        } else {
          setContentPosition("bottom");
        }
      }
    };

    calculatePosition();
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);

    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [isOpen]);

  const contextValue = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      selectedValue: value,
      setSelectedValue,
      selectedLabel: selectedOption.label,
      placeholder,
      contentPosition,
      triggerRect,
    }),
    [
      isOpen,
      value,
      setSelectedValue,
      selectedOption.label,
      placeholder,
      contentPosition,
      triggerRect,
    ],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative" ref={selectRef}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement> & { disabled?: boolean }
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = useSelectContext();
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded-md px-3 py-2 text-sm focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] focus:outline-none cursor-pointer transition-all duration-200 hover:border-[rgba(0,191,255,0.5)] hover:text-[#00bfff] flex items-center justify-between",
        className,
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8,
        }}
      >
        <ChevronDown className="h-4 w-4 text-[#8b9dc3]" />
      </motion.div>
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { selectedLabel, placeholder: contextPlaceholder } = useSelectContext();
  const displayLabel = selectedLabel || placeholder || contextPlaceholder;

  return (
    <span className={cn(!selectedLabel && "text-[#8b9dc3]")}>
      {displayLabel}
    </span>
  );
};
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children: React.ReactNode;
  }
>(({ className, children }, ref) => {
  const { isOpen, contentPosition, triggerRect } = useSelectContext();

  const animationVariants = useMemo(
    () => ({
      initial: {
        opacity: 0,
        y: contentPosition === "top" ? 8 : -8,
        scale: 0.92,
      },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: contentPosition === "top" ? 8 : -8, scale: 0.92 },
    }),
    [contentPosition],
  );

  const portalStyles = useMemo((): React.CSSProperties => {
    if (!triggerRect) return { display: "none" };

    const styles: React.CSSProperties = {
      position: "fixed",
      left: triggerRect.left,
      width: triggerRect.width,
      zIndex: 9999,
    };

    if (contentPosition === "top") {
      styles.bottom = window.innerHeight - triggerRect.top;
      styles.marginBottom = "0.5rem";
    } else {
      styles.top = triggerRect.bottom;
      styles.marginTop = "0.5rem";
    }

    return styles;
  }, [triggerRect, contentPosition]);

  const content = (
    <AnimatePresence>
      {isOpen && triggerRect && (
        <motion.div
          ref={ref}
          role="listbox"
          initial={animationVariants.initial}
          animate={animationVariants.animate}
          exit={animationVariants.exit}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8,
            duration: 0.3,
          }}
          style={portalStyles}
          className={cn(
            "max-h-60 min-w-[8rem] overflow-auto rounded-md border border-[rgba(0,191,255,0.3)] bg-[rgba(15,20,25,0.95)] text-[#8b9dc3] shadow-lg p-2 backdrop-blur-sm",
            "[&::-webkit-scrollbar]:w-2",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-[rgba(139,157,195,0.3)]",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb:hover]:bg-[rgba(139,157,195,0.5)]",
            "[&::-webkit-scrollbar-button]:hidden",
            "scrollbar-width-thin",
            "scrollbar-color-[rgba(139,157,195,0.3)] transparent",
            className,
          )}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.08,
                },
              },
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children: React.ReactNode;
    value: string;
    disabled?: boolean;
  }
>(({ className, children, value, disabled }, ref) => {
  const { selectedValue, setSelectedValue } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <motion.div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      variants={{
        hidden: { opacity: 0, y: -4 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      }}
      whileHover={
        !disabled
          ? {
              backgroundColor: "rgba(0,191,255,0.08)",
              color: "#00bfff",
              transition: { duration: 0.2, ease: "easeOut" },
            }
          : undefined
      }
      whileTap={
        !disabled
          ? {
              backgroundColor: "rgba(0,191,255,0.15)",
              transition: { duration: 0.1, ease: "easeOut" },
            }
          : undefined
      }
      onClick={() => !disabled && setSelectedValue(value, children)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center justify-between rounded-md py-2.5 px-3 mb-1 text-sm outline-none border border-transparent transition-colors duration-200 ease-out text-[#8b9dc3]",
        isSelected &&
          "!bg-[rgba(0,191,255,0.15)] !text-[#00bfff] !border-[#00bfff]",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              mass: 0.4,
              delay: 0.1,
            }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
        )}
      </span>
    </motion.div>
  );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  options: DropdownOption[];
  title?: string;
  disabled?: boolean;
}

export const Dropdown = ({
  value,
  onValueChange,
  placeholder = "Select an option",
  className,
  options,
  title,
  disabled = false,
}: DropdownProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <label className="text-sm text-[#8b9dc3] font-medium">{title}</label>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
      >
        <SelectTrigger
          className={disabled ? "opacity-50 cursor-not-allowed" : ""}
          disabled={disabled}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default Dropdown;
