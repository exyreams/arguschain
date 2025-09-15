// Accessibility utilities and helpers for profile components

// ARIA live region announcer
export class LiveRegionAnnouncer {
  private liveRegion: HTMLElement | null = null;

  constructor() {
    this.createLiveRegion();
  }

  private createLiveRegion(): void {
    if (typeof document === "undefined") return;

    this.liveRegion = document.createElement("div");
    this.liveRegion.setAttribute("aria-live", "polite");
    this.liveRegion.setAttribute("aria-atomic", "true");
    this.liveRegion.className = "sr-only";
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;

    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: "polite" | "assertive" = "polite"): void {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute("aria-live", priority);
    this.liveRegion.textContent = message;

    // Clear the message after a short delay to allow for re-announcements
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = "";
      }
    }, 1000);
  }

  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}

// Global announcer instance
export const announcer = new LiveRegionAnnouncer();

// Focus management utilities
export class FocusManager {
  private focusStack: HTMLElement[] = [];

  // Trap focus within a container
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store the currently focused element
    const previouslyFocused = document.activeElement as HTMLElement;
    this.focusStack.push(previouslyFocused);

    // Focus the first element
    firstElement.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      const previousElement = this.focusStack.pop();
      if (previousElement && document.contains(previousElement)) {
        previousElement.focus();
      }
    };
  }

  // Get all focusable elements within a container
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(
      (element) => {
        const htmlElement = element as HTMLElement;
        return (
          htmlElement.offsetWidth > 0 &&
          htmlElement.offsetHeight > 0 &&
          !htmlElement.hidden &&
          window.getComputedStyle(htmlElement).visibility !== "hidden"
        );
      }
    ) as HTMLElement[];
  }

  // Move focus to element with announcement
  moveFocusTo(element: HTMLElement, announcement?: string): void {
    element.focus();
    if (announcement) {
      announcer.announce(announcement);
    }
  }

  // Focus first error field
  focusFirstError(container: HTMLElement): boolean {
    const errorElement = container.querySelector(
      '[aria-invalid="true"], .error, [data-error]'
    ) as HTMLElement;
    if (errorElement) {
      this.moveFocusTo(errorElement, "Please correct the error in this field");
      return true;
    }
    return false;
  }
}

// Global focus manager instance
export const focusManager = new FocusManager();

// Keyboard navigation helpers
export const keyboardNavigation = {
  // Handle arrow key navigation for tab lists
  handleTabListNavigation: (
    event: React.KeyboardEvent,
    tabs: HTMLElement[],
    currentIndex: number,
    onTabChange: (index: number) => void
  ) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        newIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    onTabChange(newIndex);
    tabs[newIndex]?.focus();
  },

  // Handle Enter and Space key activation
  handleActivation: (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  },

  // Handle Escape key
  handleEscape: (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === "Escape") {
      event.preventDefault();
      callback();
    }
  },
};

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getRelativeLuminance: (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  // Calculate contrast ratio
  getContrastRatio: (
    color1: [number, number, number],
    color2: [number, number, number]
  ): number => {
    const l1 = colorContrast.getRelativeLuminance(...color1);
    const l2 = colorContrast.getRelativeLuminance(...color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  // Check if contrast meets WCAG AA standards
  meetsWCAGAA: (
    color1: [number, number, number],
    color2: [number, number, number]
  ): boolean => {
    return colorContrast.getContrastRatio(color1, color2) >= 4.5;
  },

  // Check if contrast meets WCAG AAA standards
  meetsWCAGAAA: (
    color1: [number, number, number],
    color2: [number, number, number]
  ): boolean => {
    return colorContrast.getContrastRatio(color1, color2) >= 7;
  },
};

// Screen reader utilities
export const screenReader = {
  // Create screen reader only text
  createSROnlyText: (text: string): HTMLSpanElement => {
    const span = document.createElement("span");
    span.className = "sr-only";
    span.textContent = text;
    span.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    return span;
  },

  // Announce form validation errors
  announceFormErrors: (errors: Array<{ field: string; message: string }>) => {
    const errorCount = errors.length;
    const message =
      errorCount === 1
        ? `1 error found: ${errors[0].message}`
        : `${errorCount} errors found. Please review and correct the highlighted fields.`;

    announcer.announce(message, "assertive");
  },

  // Announce successful actions
  announceSuccess: (message: string) => {
    announcer.announce(message, "polite");
  },

  // Announce loading states
  announceLoading: (message: string = "Loading...") => {
    announcer.announce(message, "polite");
  },
};

// ARIA utilities
export const aria = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix: string = "aria"): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create ARIA describedby relationship
  createDescribedBy: (element: HTMLElement, description: string): string => {
    const descId = aria.generateId("desc");
    const descElement = document.createElement("div");
    descElement.id = descId;
    descElement.className = "sr-only";
    descElement.textContent = description;

    element.parentNode?.insertBefore(descElement, element.nextSibling);
    element.setAttribute("aria-describedby", descId);

    return descId;
  },

  // Create ARIA labelledby relationship
  createLabelledBy: (element: HTMLElement, labelText: string): string => {
    const labelId = aria.generateId("label");
    const labelElement = document.createElement("div");
    labelElement.id = labelId;
    labelElement.className = "sr-only";
    labelElement.textContent = labelText;

    element.parentNode?.insertBefore(labelElement, element);
    element.setAttribute("aria-labelledby", labelId);

    return labelId;
  },

  // Set ARIA expanded state
  setExpanded: (element: HTMLElement, expanded: boolean) => {
    element.setAttribute("aria-expanded", expanded.toString());
  },

  // Set ARIA selected state
  setSelected: (element: HTMLElement, selected: boolean) => {
    element.setAttribute("aria-selected", selected.toString());
  },

  // Set ARIA invalid state
  setInvalid: (element: HTMLElement, invalid: boolean) => {
    element.setAttribute("aria-invalid", invalid.toString());
  },
};

// Accessibility testing utilities
export const a11yTesting = {
  // Check for missing alt text on images
  checkImageAltText: (container: HTMLElement): string[] => {
    const images = container.querySelectorAll("img");
    const issues: string[] = [];

    images.forEach((img, index) => {
      if (
        !img.alt &&
        !img.getAttribute("aria-label") &&
        !img.getAttribute("aria-labelledby")
      ) {
        issues.push(`Image ${index + 1} is missing alt text`);
      }
    });

    return issues;
  },

  // Check for proper heading hierarchy
  checkHeadingHierarchy: (container: HTMLElement): string[] => {
    const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const issues: string[] = [];
    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));

      if (index === 0 && level !== 1) {
        issues.push("First heading should be h1");
      } else if (level > previousLevel + 1) {
        issues.push(`Heading level jumps from h${previousLevel} to h${level}`);
      }

      previousLevel = level;
    });

    return issues;
  },

  // Check for keyboard accessibility
  checkKeyboardAccessibility: (container: HTMLElement): string[] => {
    const issues: string[] = [];
    const interactiveElements = container.querySelectorAll(
      "button, a, input, select, textarea, [tabindex]"
    );

    interactiveElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;

      // Check for missing tabindex on custom interactive elements
      if (
        !["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(
          element.tagName
        ) &&
        !htmlElement.hasAttribute("tabindex")
      ) {
        issues.push(`Interactive element ${index + 1} is missing tabindex`);
      }

      // Check for negative tabindex on focusable elements
      if (
        htmlElement.tabIndex === -1 &&
        !htmlElement.hasAttribute("aria-hidden")
      ) {
        issues.push(
          `Element ${index + 1} has tabindex="-1" but is not aria-hidden`
        );
      }
    });

    return issues;
  },

  // Run all accessibility checks
  runAllChecks: (container: HTMLElement): { [key: string]: string[] } => {
    return {
      imageAltText: a11yTesting.checkImageAltText(container),
      headingHierarchy: a11yTesting.checkHeadingHierarchy(container),
      keyboardAccessibility: a11yTesting.checkKeyboardAccessibility(container),
    };
  },
};

// High contrast mode detection
export const highContrast = {
  // Detect if high contrast mode is enabled
  isHighContrastMode: (): boolean => {
    if (typeof window === "undefined") return false;

    // Check for Windows high contrast mode
    if (window.matchMedia("(prefers-contrast: high)").matches) {
      return true;
    }

    // Check for forced colors (Windows high contrast)
    if (window.matchMedia("(forced-colors: active)").matches) {
      return true;
    }

    return false;
  },

  // Apply high contrast styles
  applyHighContrastStyles: (element: HTMLElement) => {
    if (highContrast.isHighContrastMode()) {
      element.classList.add("high-contrast");
    }
  },
};

// Reduced motion detection
export const reducedMotion = {
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  // Apply reduced motion styles
  applyReducedMotionStyles: (element: HTMLElement) => {
    if (reducedMotion.prefersReducedMotion()) {
      element.classList.add("reduce-motion");
    }
  },
};

// Accessibility event handlers
export const a11yEventHandlers = {
  // Handle modal focus management
  handleModalFocus: (modalElement: HTMLElement, isOpen: boolean) => {
    if (isOpen) {
      const cleanup = focusManager.trapFocus(modalElement);
      announcer.announce("Modal opened");
      return cleanup;
    } else {
      announcer.announce("Modal closed");
      return () => {};
    }
  },

  // Handle form submission with accessibility feedback
  handleFormSubmit: (
    formElement: HTMLElement,
    isValid: boolean,
    errors: Array<{ field: string; message: string }> = []
  ) => {
    if (isValid) {
      screenReader.announceSuccess("Form submitted successfully");
    } else {
      screenReader.announceFormErrors(errors);
      focusManager.focusFirstError(formElement);
    }
  },

  // Handle section navigation
  handleSectionNavigation: (sectionName: string) => {
    announcer.announce(`Navigated to ${sectionName} section`);
  },
};

// Export all utilities
export default {
  announcer,
  focusManager,
  keyboardNavigation,
  colorContrast,
  screenReader,
  aria,
  a11yTesting,
  highContrast,
  reducedMotion,
  a11yEventHandlers,
};
