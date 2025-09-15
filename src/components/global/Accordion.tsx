import * as React from "react";
import {
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionType = "single" | "multiple";

interface AccordionContextType {
  value: string | string[];
  onValueChange: (value: string) => void;
  type: AccordionType;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

const useAccordionContext = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error(
      "Accordion components must be used within an <Accordion> provider"
    );
  }
  return context;
};

interface AccordionItemContextType {
  isOpen: boolean;
  value: string;
  onToggle: () => void;
}

const AccordionItemContext = createContext<AccordionItemContextType | null>(
  null
);

const useAccordionItemContext = () => {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error(
      "AccordionItem sub-components must be used within an <AccordionItem>"
    );
  }
  return context;
};

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  type?: AccordionType;
  defaultValue?: string | string[];
}

const Accordion = ({
  children,
  className,
  value: controlledValue,
  onValueChange,
  type = "single",
  defaultValue,
}: AccordionProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState<string | string[]>(
    defaultValue ?? (type === "multiple" ? [] : "")
  );

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = useCallback(
    (itemValue: string) => {
      let newValue: string | string[];
      if (type === "multiple") {
        const currentValue = Array.isArray(value) ? value : [];
        newValue = currentValue.includes(itemValue)
          ? currentValue.filter((v) => v !== itemValue)
          : [...currentValue, itemValue];
      } else {
        newValue = value === itemValue ? "" : itemValue;
      }

      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [type, value, isControlled, onValueChange]
  );

  const contextValue = useMemo(
    () => ({
      value: Array.isArray(value) ? value : [value],
      onValueChange: handleValueChange,
      type,
    }),
    [value, handleValueChange, type]
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      <div className={cn("border-b border-[rgba(0,191,255,0.3)]", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    value: string;
    className?: string;
  }
>(({ children, value, className }, ref) => {
  const { value: contextValue, onValueChange } = useAccordionContext();
  const isOpen = contextValue.includes(value);

  const onToggle = () => onValueChange(value);

  const itemContextValue = useMemo(
    () => ({ isOpen, value, onToggle }),
    [isOpen, value, onToggle]
  );

  return (
    <AccordionItemContext.Provider value={itemContextValue}>
      <div
        ref={ref}
        className={cn(
          "border-t border-[rgba(0,191,255,0.3)] first:border-t-0",
          className
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen, onToggle } = useAccordionItemContext();

  return (
    <button
      ref={ref}
      onClick={onToggle}
      aria-expanded={isOpen}
      className={cn(
        "flex w-full flex-1 items-center justify-between py-4 text-left text-sm font-medium text-[#8b9dc3] transition-all duration-200 hover:text-[#00bfff] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00bfff]",
        isOpen && "text-[#00bfff]",
        className
      )}
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
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
      </motion.div>
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen } = useAccordionItemContext();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          ref={ref}
          initial="collapsed"
          animate="open"
          exit="collapsed"
          variants={{
            open: { opacity: 1, height: "auto" },
            collapsed: { opacity: 0, height: 0 },
          }}
          transition={{
            duration: 0.35,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="overflow-hidden"
          style={props.style}
        >
          <div
            className={cn("pb-4 pt-0.5 text-sm text-[#8b9dc3]/90", className)}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
