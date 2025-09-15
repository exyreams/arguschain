import * as React from "react";
import {
  useState,
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

const alertVariants = {
  default: {
    icon: <Info className="h-5 w-5" />,
    className:
      "bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]",
    iconColor: "text-[#00bfff]",
  },
  destructive: {
    icon: <XCircle className="h-5 w-5" />,
    className:
      "bg-[rgba(255,71,87,0.1)] border-destructive/50 text-destructive",
    iconColor: "text-destructive",
  },
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    className: "bg-[rgba(50,205,50,0.1)] border-green-500/30 text-green-400",
    iconColor: "text-green-400",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    className: "bg-[rgba(255,165,0,0.1)] border-orange-500/30 text-orange-400",
    iconColor: "text-orange-400",
  },
};

type AlertVariant = keyof typeof alertVariants;

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", children, icon, ...props }, ref) => {
    const config = alertVariants[variant];
    const displayIcon = icon !== undefined ? icon : config.icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4 pl-12",
          config.className,
          className
        )}
        {...props}
      >
        <span className={cn("absolute left-4 top-4", config.iconColor)}>
          {displayIcon}
        </span>
        {children}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-bold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

interface AlertDialogContextType {
  isOpen: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | null>(null);

const useAlertDialogContext = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      "AlertDialog components must be used within an <AlertDialog> provider"
    );
  }
  return context;
};

interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AlertDialog = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: AlertDialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange]
  );

  const onClose = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange]
  );

  const contextValue = useMemo(
    () => ({
      isOpen,
      onClose,
      onOpenChange: handleOpenChange,
    }),
    [isOpen, onClose, handleOpenChange]
  );

  return (
    <AlertDialogContext.Provider value={contextValue}>
      {children}
    </AlertDialogContext.Provider>
  );
};

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, onClick, asChild = false, ...props }, ref) => {
  const { onOpenChange } = useAlertDialogContext();

  if (asChild) {
    if (
      React.isValidElement<
        React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>
      >(children)
    ) {
      return React.cloneElement(children, {
        ...props,
        ref,
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          onOpenChange(true);
          children.props.onClick?.(e);
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        },
      });
    }
    return null;
  }

  return (
    <button
      ref={ref}
      onClick={(e) => {
        onOpenChange(true);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogPortal = ({ children }: { children: React.ReactNode }) => {
  const { isOpen } = useAlertDialogContext();
  return <AnimatePresence>{isOpen ? children : null}</AnimatePresence>;
};

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, onClick, ...props }, ref) => {
  const { onClose } = useAlertDialogContext();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed inset-0 z-50 bg-[rgba(15,20,25,0.8)] backdrop-blur-sm",
        className
      )}
      onClick={(e) => {
        onClose();
        onClick?.(e);
      }}
      {...props}
    />
  );
});
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => {
  const { isOpen, onClose } = useAlertDialogContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    firstElement.focus();
    const handleTabKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    const currentRef = contentRef.current;
    currentRef.addEventListener("keydown", handleTabKeyPress);
    return () => currentRef?.removeEventListener("keydown", handleTabKeyPress);
  }, [isOpen]);

  const content = (
    <AlertDialogPortal>
      <>
        <AlertDialogOverlay />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            ref={(node) => {
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
              (
                contentRef as React.MutableRefObject<HTMLDivElement | null>
              ).current = node;
            }}
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 20,
              transition: { duration: 0.2 },
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "relative grid w-full max-w-lg gap-4 rounded-xl border border-[rgba(0,191,255,0.3)] bg-[rgba(15,20,25,0.95)] p-6 text-[#8b9dc3] shadow-2xl backdrop-blur-md",
              className
            )}
            {...props}
          >
            {children}
          </motion.div>
        </div>
      </>
    </AlertDialogPortal>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
});
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3",
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-[#00bfff]", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[#8b9dc3]/90", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { onClose } = useAlertDialogContext();
  return (
    <Button
      ref={ref}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.isDefaultPrevented()) {
          onClose();
        }
      }}
      className={className}
      {...props}
    />
  );
});
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { onClose } = useAlertDialogContext();
  return (
    <Button
      ref={ref}
      variant="outline"
      className={cn("mt-2 sm:mt-0", className)}
      onClick={(e) => {
        onClick?.(e);
        onClose();
      }}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
