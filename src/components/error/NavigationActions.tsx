import React, { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/global";
import { cn } from "@/lib/utils";
import type { NavigationAction, NavigationActionsProps } from "./types";

const NavigationActions: React.FC<NavigationActionsProps> = ({
  actions,
  onActionClick,
  className,
}) => {
  const navigate = useNavigate();

  const handleActionClick = useCallback(
    (action: NavigationAction) => {
      // Call custom handler if provided
      onActionClick?.(action);

      // Handle navigation
      if (action.path === "back") {
        // Use browser history for "Go Back"
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // Fallback to dashboard if no history
          navigate("/", { replace: true });
        }
      } else {
        // Navigate to specified path
        navigate(action.path, { replace: true });
      }
    },
    [navigate, onActionClick],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, action: NavigationAction) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleActionClick(action);
      }
    },
    [handleActionClick],
  );

  // For the main navigation buttons (Go Home, Back), put them side by side
  // For additional actions, use a separate grid layout
  const mainActions = actions.filter(
    (action) => action.label === "Go Home" || action.label === "Back",
  );
  const additionalActions = actions.filter(
    (action) => action.label !== "Go Home" && action.label !== "Back",
  );

  return (
    <nav
      className={cn("space-y-3 sm:space-y-4", className)}
      aria-label="Error recovery options"
      role="navigation"
    >
      {/* Main navigation actions - side by side */}
      {mainActions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {mainActions.map((action, index) => (
            <Button
              key={`main-${index}`}
              variant={action.variant}
              size="lg"
              onClick={() => handleActionClick(action)}
              onKeyDown={(e) => handleKeyDown(e, action)}
              className="min-h-[44px] sm:h-12 text-sm sm:text-base font-medium [touch-action:manipulation]"
              aria-label={`${action.label} - Navigation option`}
            >
              <div className="flex items-center justify-center gap-2">
                {action.icon && (
                  <action.icon
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    aria-hidden="true"
                  />
                )}
                <span>{action.label}</span>
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* Additional actions - responsive grid layout */}
      {additionalActions.length > 0 && (
        <div
          className={cn(
            "grid gap-2 sm:gap-3",
            additionalActions.length === 1
              ? "grid-cols-1"
              : additionalActions.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : additionalActions.length === 3
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {additionalActions.map((action, index) => (
            <Button
              key={`additional-${index}`}
              variant={action.variant}
              size="default"
              onClick={() => handleActionClick(action)}
              onKeyDown={(e) => handleKeyDown(e, action)}
              className="min-h-[44px] sm:h-10 [touch-action:manipulation]"
              aria-label={`${action.label} - Additional option`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                {action.icon && (
                  <action.icon
                    className="w-3 h-3 sm:w-4 sm:h-4"
                    aria-hidden="true"
                  />
                )}
                <span className="text-xs sm:text-sm">{action.label}</span>
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* Accessibility: Screen reader instructions */}
      <div className="sr-only">
        <p>
          Use the buttons above to navigate away from this error page. The
          primary option will take you to the main dashboard. Secondary options
          provide alternative navigation paths.
        </p>
      </div>
    </nav>
  );
};

export default memo(NavigationActions);
