import { useEffect, useCallback, useRef, useState } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface KeyboardNavigationOptions {
  enableGlobalShortcuts?: boolean;
  enableTabNavigation?: boolean;
  enableArrowNavigation?: boolean;
  trapFocus?: boolean;
}

/**
 * useKeyboardNavigation - Hook for comprehensive keyboard navigation
 *
 * This hook provides:
 * - Global keyboard shortcuts (Ctrl+1-4 for tabs)
 * - Logical tab order management
 * - Arrow key navigation for lists and grids
 * - Focus trapping for modals
 * - Skip links and focus management
 */
export function useKeyboardNavigation(
  shortcuts: KeyboardShortcut[] = [],
  options: KeyboardNavigationOptions = {}
) {
  const {
    enableGlobalShortcuts = true,
    enableTabNavigation = true,
    enableArrowNavigation = true,
    trapFocus = false,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isShortcutHelpVisible, setIsShortcutHelpVisible] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  // Get all focusable elements within container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    // Sort by tab index
    return elements.sort((a, b) => {
      const aIndex = parseInt(a.getAttribute("tabindex") || "0");
      const bIndex = parseInt(b.getAttribute("tabindex") || "0");
      return aIndex - bIndex;
    });
  }, []);

  // Update focusable elements when container changes
  useEffect(() => {
    focusableElementsRef.current = getFocusableElements();
  }, [getFocusableElements]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check for registered shortcuts
      const matchingShortcut = shortcuts.find((shortcut) => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.altKey === event.altKey &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.metaKey === event.metaKey
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
        return;
      }

      // Global shortcuts
      if (enableGlobalShortcuts) {
        // Tab navigation (Ctrl+1-4)
        if (event.ctrlKey && ["1", "2", "3", "4"].includes(event.key)) {
          event.preventDefault();
          const tabIndex = parseInt(event.key) - 1;
          const tabButtons = document.querySelectorAll('[role="tab"]');
          if (tabButtons[tabIndex]) {
            (tabButtons[tabIndex] as HTMLElement).click();
            (tabButtons[tabIndex] as HTMLElement).focus();
          }
          return;
        }

        // Help shortcut (Ctrl+?)
        if (event.ctrlKey && event.key === "/") {
          event.preventDefault();
          setIsShortcutHelpVisible((prev) => !prev);
          return;
        }

        // Escape to close modals/help
        if (event.key === "Escape") {
          setIsShortcutHelpVisible(false);
          // Also trigger any escape handlers
          const escapeEvent = new CustomEvent("keyboardEscape");
          document.dispatchEvent(escapeEvent);
          return;
        }
      }

      // Arrow navigation
      if (enableArrowNavigation && containerRef.current) {
        const focusableElements = focusableElementsRef.current;
        const currentElement = document.activeElement as HTMLElement;
        const currentIndex = focusableElements.indexOf(currentElement);

        if (currentIndex !== -1) {
          let nextIndex = currentIndex;

          switch (event.key) {
            case "ArrowDown":
            case "ArrowRight":
              event.preventDefault();
              nextIndex = (currentIndex + 1) % focusableElements.length;
              break;
            case "ArrowUp":
            case "ArrowLeft":
              event.preventDefault();
              nextIndex =
                currentIndex === 0
                  ? focusableElements.length - 1
                  : currentIndex - 1;
              break;
            case "Home":
              event.preventDefault();
              nextIndex = 0;
              break;
            case "End":
              event.preventDefault();
              nextIndex = focusableElements.length - 1;
              break;
          }

          if (nextIndex !== currentIndex && focusableElements[nextIndex]) {
            focusableElements[nextIndex].focus();
            setFocusedIndex(nextIndex);
          }
        }
      }

      // Focus trapping
      if (trapFocus && event.key === "Tab") {
        const focusableElements = focusableElementsRef.current;
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentElement = document.activeElement;

        if (event.shiftKey) {
          // Shift+Tab (backward)
          if (currentElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (forward)
          if (currentElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [shortcuts, enableGlobalShortcuts, enableArrowNavigation, trapFocus]
  );

  // Focus management utilities
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      setFocusedIndex(0);
    }
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      const lastIndex = focusableElements.length - 1;
      focusableElements[lastIndex].focus();
      setFocusedIndex(lastIndex);
    }
  }, [getFocusableElements]);

  const focusNext = useCallback(() => {
    const focusableElements = getFocusableElements();
    const nextIndex = (focusedIndex + 1) % focusableElements.length;
    if (focusableElements[nextIndex]) {
      focusableElements[nextIndex].focus();
      setFocusedIndex(nextIndex);
    }
  }, [focusedIndex, getFocusableElements]);

  const focusPrevious = useCallback(() => {
    const focusableElements = getFocusableElements();
    const prevIndex =
      focusedIndex === 0 ? focusableElements.length - 1 : focusedIndex - 1;
    if (focusableElements[prevIndex]) {
      focusableElements[prevIndex].focus();
      setFocusedIndex(prevIndex);
    }
  }, [focusedIndex, getFocusableElements]);

  const focusElement = useCallback(
    (index: number) => {
      const focusableElements = getFocusableElements();
      if (focusableElements[index]) {
        focusableElements[index].focus();
        setFocusedIndex(index);
      }
    },
    [getFocusableElements]
  );

  // Setup event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Update focusable elements when DOM changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      focusableElementsRef.current = getFocusableElements();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled", "tabindex"],
      });
    }

    return () => observer.disconnect();
  }, [getFocusableElements]);

  return {
    containerRef,
    focusedIndex,
    isShortcutHelpVisible,
    setIsShortcutHelpVisible,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement,
    focusableElements: focusableElementsRef.current,
  };
}

/**
 * useSkipLinks - Hook for skip navigation links
 */
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showSkipLinks = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideSkipLinks = useCallback(() => {
    setIsVisible(false);
  }, []);

  const skipToContent = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return {
    skipLinksRef,
    isVisible,
    showSkipLinks,
    hideSkipLinks,
    skipToContent,
  };
}

/**
 * useFocusTrap - Hook for focus trapping in modals
 */
export function useFocusTrap(isActive: boolean = false) {
  const trapRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !trapRef.current) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the trap
    const focusableElements = trapRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const currentElement = document.activeElement;

      if (event.shiftKey) {
        // Shift+Tab
        if (currentElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (currentElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return trapRef;
}

/**
 * useAnnouncements - Hook for screen reader announcements
 */
export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      setAnnouncements((prev) => [...prev, message]);

      // Clear the announcement after a delay
      setTimeout(() => {
        setAnnouncements((prev) => prev.filter((msg) => msg !== message));
      }, 1000);
    },
    []
  );

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  return {
    announcements,
    announce,
    clearAnnouncements,
    announcementRef,
  };
}

export default useKeyboardNavigation;
