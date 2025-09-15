import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export type TooltipPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delayShow?: number;
  delayHide?: number;
  className?: string;
  offset?: number;
  hasArrow?: boolean;
  maxWidth?: number;
  disabled?: boolean;
  interactive?: boolean;
}

interface ChildElementProps {
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  ref?: React.Ref<HTMLElement>;
}

const getAnimationVariants = (placement: TooltipPlacement): Variants => {
  const baseVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 300,
        duration: 0.2,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.15,
        ease: "easeInOut",
      },
    },
  };

  const animOffset = 8;

  if (placement.startsWith("top")) {
    baseVariants.hidden = { ...baseVariants.hidden, y: animOffset };
    baseVariants.exit = { ...baseVariants.exit, y: animOffset };
  } else if (placement.startsWith("bottom")) {
    baseVariants.hidden = { ...baseVariants.hidden, y: -animOffset };
    baseVariants.exit = { ...baseVariants.exit, y: -animOffset };
  } else if (placement.startsWith("left")) {
    baseVariants.hidden = { ...baseVariants.hidden, x: animOffset };
    baseVariants.exit = { ...baseVariants.exit, x: animOffset };
  } else if (placement.startsWith("right")) {
    baseVariants.hidden = { ...baseVariants.hidden, x: -animOffset };
    baseVariants.exit = { ...baseVariants.exit, x: -animOffset };
  }

  return baseVariants;
};

export const Tooltip = ({
  content,
  children,
  placement = "top",
  delayShow = 300,
  delayHide = 200,
  className,
  offset = 8,
  hasArrow = true,
  maxWidth = 240,
  disabled = false,
  interactive = false,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (!isVisible && !showTimeoutRef.current) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        showTimeoutRef.current = null;
      }, delayShow);
    }
  };

  const handleMouseLeave = () => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // For interactive tooltips, don't hide immediately if user might be moving to tooltip
    if (interactive && isVisible && !hideTimeoutRef.current) {
      hideTimeoutRef.current = setTimeout(
        () => {
          // Only hide if not hovering over tooltip
          if (!isHoveringTooltip) {
            setIsVisible(false);
          }
          hideTimeoutRef.current = null;
        },
        Math.max(delayHide, 150)
      ); // Minimum 150ms delay for interactive tooltips
    } else if (!interactive && isVisible && !hideTimeoutRef.current) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        hideTimeoutRef.current = null;
      }, delayHide);
    }
  };

  const handleTooltipMouseEnter = () => {
    if (!interactive) return;

    setIsHoveringTooltip(true);

    // Cancel any pending hide timeout when entering tooltip
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Ensure tooltip is visible
    if (!isVisible) {
      setIsVisible(true);
    }
  };

  const handleTooltipMouseLeave = () => {
    if (!interactive) return;

    setIsHoveringTooltip(false);

    if (isVisible && !hideTimeoutRef.current) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        hideTimeoutRef.current = null;
      }, delayHide);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsVisible(false);
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }
  };

  const existingProps = children.props as Record<string, any> | undefined;
  const childProps = (existingProps || {}) as ChildElementProps;

  const childElement = React.cloneElement(children, {
    ...existingProps,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (!disabled) handleMouseEnter();
      if (childProps.onMouseEnter) {
        childProps.onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (!disabled) handleMouseLeave();
      if (childProps.onMouseLeave) {
        childProps.onMouseLeave(e);
      }
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (!disabled) handleMouseEnter();
      if (childProps.onFocus) {
        childProps.onFocus(e);
      }
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      if (!disabled) handleMouseLeave();
      if (childProps.onBlur) {
        childProps.onBlur(e);
      }
    },
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;

      const { ref } = children as React.ReactElement & {
        ref?: React.Ref<HTMLElement>;
      };
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && "current" in ref) {
        (ref as React.RefObject<HTMLElement>).current = node;
      }
    },
  } as any);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        setIsVisible(false);
        if (showTimeoutRef.current) {
          clearTimeout(showTimeoutRef.current);
          showTimeoutRef.current = null;
        }
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      }
    };

    if (interactive && isVisible) {
      document.addEventListener("keydown", handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [interactive, isVisible]);

  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

    const calculatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;
      let arrowTop = 0;
      let arrowLeft = 0;

      const appliedOffset = offset;

      const arrowSize = 4;
      const outsideRatio = 0.6;
      const arrowOutside = arrowSize * 2 * outsideRatio;
      const arrowInside = arrowSize * 2 * (1 - outsideRatio);

      switch (placement) {
        case "top":
          top = triggerRect.top - tooltipRect.height - appliedOffset;
          left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          arrowLeft = tooltipRect.width / 2 - arrowSize;
          arrowTop = tooltipRect.height - arrowInside;
          break;

        case "top-start":
          top = triggerRect.top - tooltipRect.height - appliedOffset;
          left = triggerRect.left;
          arrowLeft = Math.min(triggerRect.width / 2 - arrowSize, 16);
          arrowTop = tooltipRect.height - arrowInside;
          break;

        case "top-end":
          top = triggerRect.top - tooltipRect.height - appliedOffset;
          left = triggerRect.right - tooltipRect.width;
          arrowLeft =
            tooltipRect.width - Math.min(triggerRect.width / 2 + arrowSize, 24);
          arrowTop = tooltipRect.height - arrowInside;
          break;

        case "bottom":
          top = triggerRect.bottom + appliedOffset;
          left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          arrowLeft = tooltipRect.width / 2 - arrowSize;
          arrowTop = -arrowOutside;
          break;

        case "bottom-start":
          top = triggerRect.bottom + appliedOffset;
          left = triggerRect.left;
          arrowLeft = Math.min(triggerRect.width / 2 - arrowSize, 16);
          arrowTop = -arrowOutside;
          break;

        case "bottom-end":
          top = triggerRect.bottom + appliedOffset;
          left = triggerRect.right - tooltipRect.width;
          arrowLeft =
            tooltipRect.width - Math.min(triggerRect.width / 2 + arrowSize, 24);
          arrowTop = -arrowOutside;
          break;

        case "left":
          top =
            triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - appliedOffset;

          arrowLeft = tooltipRect.width - arrowSize + arrowOutside;
          arrowTop = tooltipRect.height / 2 - arrowSize;
          break;

        case "left-start":
          top = triggerRect.top;
          left = triggerRect.left - tooltipRect.width - appliedOffset;

          arrowLeft = tooltipRect.width - arrowSize + arrowOutside;
          arrowTop = Math.min(triggerRect.height / 2 - arrowSize, 16);
          break;

        case "left-end":
          top = triggerRect.bottom - tooltipRect.height;
          left = triggerRect.left - tooltipRect.width - appliedOffset;

          arrowLeft = tooltipRect.width - arrowSize + arrowOutside;
          arrowTop =
            tooltipRect.height -
            Math.min(triggerRect.height / 2 + arrowSize, 24);
          break;

        case "right":
          top =
            triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + appliedOffset;
          arrowLeft = -arrowOutside;
          arrowTop = tooltipRect.height / 2 - arrowSize;
          break;

        case "right-start":
          top = triggerRect.top;
          left = triggerRect.right + appliedOffset;
          arrowLeft = -arrowOutside;
          arrowTop = Math.min(triggerRect.height / 2 - arrowSize, 16);
          break;

        case "right-end":
          top = triggerRect.bottom - tooltipRect.height;
          left = triggerRect.right + appliedOffset;
          arrowLeft = -arrowOutside;
          arrowTop =
            tooltipRect.height -
            Math.min(triggerRect.height / 2 + arrowSize, 24);
          break;
      }

      const viewportPadding = 10;
      if (left < viewportPadding) left = viewportPadding;
      if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipRect.width - viewportPadding;
      }

      if (top < viewportPadding) top = viewportPadding;
      if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
        top = window.innerHeight - tooltipRect.height - viewportPadding;
      }

      setPosition({ top, left });
      setArrowPosition({ top: arrowTop, left: arrowLeft });
    };

    calculatePosition();

    const handleRecalculation = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener("resize", handleRecalculation);
    window.addEventListener("scroll", handleRecalculation, true);

    return () => {
      window.removeEventListener("resize", handleRecalculation);
      window.removeEventListener("scroll", handleRecalculation, true);
    };
  }, [isVisible, placement, offset]);

  const getArrowRotation = () => {
    if (placement.startsWith("top")) return "rotate(225deg)";
    if (placement.startsWith("right")) return "rotate(315deg)";
    if (placement.startsWith("bottom")) return "rotate(45deg)";
    if (placement.startsWith("left")) return "rotate(135deg)";
    return "rotate(45deg)";
  };

  if (disabled) {
    return childElement;
  }

  return (
    <>
      {childElement}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence mode="wait">
            {isVisible && (
              <motion.div
                ref={tooltipRef}
                variants={getAnimationVariants(placement)}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "fixed z-[100002] p-2.5 rounded-md bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] shadow-lg",
                  "text-sm text-[#8b9dc3] backdrop-blur-sm",
                  interactive ? "pointer-events-auto" : "pointer-events-none",
                  className
                )}
                style={{
                  top: `${position.top}px`,
                  left: `${position.left}px`,
                  maxWidth: `${maxWidth}px`,
                }}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
                onKeyDown={handleKeyDown}
                tabIndex={interactive ? 0 : -1}
                role={interactive ? "dialog" : "tooltip"}
                aria-label={interactive ? "Interactive tooltip" : undefined}
              >
                {content}
                {hasArrow && (
                  <div
                    className="absolute w-2 h-2 bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)]"
                    style={{
                      top: `${arrowPosition.top}px`,
                      left: `${arrowPosition.left}px`,
                      transform: getArrowRotation(),

                      ...(placement.startsWith("left")
                        ? { borderRight: "none", borderBottom: "none" }
                        : { borderRight: "none", borderBottom: "none" }),
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
