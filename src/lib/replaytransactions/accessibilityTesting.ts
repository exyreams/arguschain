interface AccessibilityViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
  }>;
  tags: string[];
}

interface AccessibilityTestResult {
  violations: AccessibilityViolation[];
  passes: AccessibilityViolation[];
  incomplete: AccessibilityViolation[];
  inapplicable: AccessibilityViolation[];
  timestamp: number;
  url: string;
  testEngine: string;
}

class WCAGChecker {
  private static rules = {
    "color-contrast": {
      level: "AA",
      guideline: "1.4.3",
      description: "Elements must have sufficient color contrast",
      test: (element: Element) => this.checkColorContrast(element),
    },
    "images-alt-text": {
      level: "A",
      guideline: "1.1.1",
      description: "Images must have alternative text",
      test: (element: Element) => this.checkImageAltText(element),
    },
    "heading-structure": {
      level: "AA",
      guideline: "1.3.1",
      description: "Headings must be properly structured",
      test: (element: Element) => this.checkHeadingStructure(element),
    },

    "keyboard-navigation": {
      level: "A",
      guideline: "2.1.1",
      description: "All functionality must be keyboard accessible",
      test: (element: Element) => this.checkKeyboardNavigation(element),
    },
    "focus-visible": {
      level: "AA",
      guideline: "2.4.7",
      description: "Focus must be clearly visible",
      test: (element: Element) => this.checkFocusVisible(element),
    },
    "skip-links": {
      level: "A",
      guideline: "2.4.1",
      description: "Skip links must be provided",
      test: (element: Element) => this.checkSkipLinks(element),
    },

    "form-labels": {
      level: "A",
      guideline: "3.3.2",
      description: "Form inputs must have labels",
      test: (element: Element) => this.checkFormLabels(element),
    },
    "link-purpose": {
      level: "A",
      guideline: "2.4.4",
      description: "Link purpose must be clear",
      test: (element: Element) => this.checkLinkPurpose(element),
    },

    "valid-html": {
      level: "A",
      guideline: "4.1.1",
      description: "HTML must be valid",
      test: (element: Element) => this.checkValidHTML(element),
    },
    "aria-attributes": {
      level: "A",
      guideline: "4.1.2",
      description: "ARIA attributes must be valid",
      test: (element: Element) => this.checkAriaAttributes(element),
    },
  };

  static async runAllTests(
    container: Element = document.body,
  ): Promise<AccessibilityTestResult> {
    const violations: AccessibilityViolation[] = [];
    const passes: AccessibilityViolation[] = [];

    for (const [ruleId, rule] of Object.entries(this.rules)) {
      try {
        const result = await rule.test(container);
        if (result.violations.length > 0) {
          violations.push(...result.violations);
        } else {
          passes.push({
            id: ruleId,
            impact: "minor",
            description: rule.description,
            help: `${rule.description} - PASSED`,
            helpUrl: `https://www.w3.org/WAI/WCAG21/Understanding/${rule.guideline}`,
            nodes: [],
            tags: [rule.level, rule.guideline],
          });
        }
      } catch (error) {
        console.error(`Error running accessibility test ${ruleId}:`, error);
      }
    }

    return {
      violations,
      passes,
      incomplete: [],
      inapplicable: [],
      timestamp: Date.now(),
      url: window.location.href,
      testEngine: "Custom WCAG Checker",
    };
  }

  private static async checkColorContrast(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const elements = container.querySelectorAll("*");

    elements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      if (
        color &&
        backgroundColor &&
        color !== "rgba(0, 0, 0, 0)" &&
        backgroundColor !== "rgba(0, 0, 0, 0)"
      ) {
        const contrast = this.calculateContrastRatio(color, backgroundColor);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;

        const isLargeText =
          fontSize >= 18 ||
          (fontSize >= 14 &&
            (fontWeight === "bold" || parseInt(fontWeight) >= 700));
        const requiredRatio = isLargeText ? 3 : 4.5;

        if (contrast < requiredRatio) {
          violations.push({
            id: "color-contrast",
            impact: "serious",
            description: `Element has insufficient color contrast ratio of ${contrast.toFixed(2)}:1`,
            help: `Ensure color contrast ratio is at least ${requiredRatio}:1`,
            helpUrl:
              "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
            nodes: [
              {
                target: [this.getSelector(element)],
                html: element.outerHTML.substring(0, 200),
                failureSummary: `Contrast ratio: ${contrast.toFixed(2)}:1 (required: ${requiredRatio}:1)`,
              },
            ],
            tags: ["AA", "1.4.3", "color-contrast"],
          });
        }
      }
    });

    return { violations };
  }

  private static async checkImageAltText(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const images = container.querySelectorAll("img");

    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      const ariaLabel = img.getAttribute("aria-label");
      const ariaLabelledBy = img.getAttribute("aria-labelledby");
      const role = img.getAttribute("role");

      if (role === "presentation" || alt === "") return;

      if (!alt && !ariaLabel && !ariaLabelledBy) {
        violations.push({
          id: "images-alt-text",
          impact: "critical",
          description: "Image missing alternative text",
          help: "Add alt attribute or aria-label to provide alternative text",
          helpUrl:
            "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
          nodes: [
            {
              target: [this.getSelector(img)],
              html: img.outerHTML,
              failureSummary: "Image has no alternative text",
            },
          ],
          tags: ["A", "1.1.1", "images"],
        });
      }
    });

    return { violations };
  }

  private static async checkHeadingStructure(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const headings = Array.from(
      container.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    );

    let previousLevel = 0;
    let hasH1 = false;

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));

      if (level === 1) {
        hasH1 = true;
      }

      if (previousLevel > 0 && level > previousLevel + 1) {
        violations.push({
          id: "heading-structure",
          impact: "moderate",
          description: `Heading level ${level} follows heading level ${previousLevel}, skipping levels`,
          help: "Heading levels should not skip levels",
          helpUrl:
            "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
          nodes: [
            {
              target: [this.getSelector(heading)],
              html: heading.outerHTML,
              failureSummary: `Heading level skipped from ${previousLevel} to ${level}`,
            },
          ],
          tags: ["AA", "1.3.1", "headings"],
        });
      }

      previousLevel = level;
    });

    if (headings.length > 0 && !hasH1) {
      violations.push({
        id: "heading-structure",
        impact: "moderate",
        description: "Page should have an h1 heading",
        help: "Add an h1 heading to provide page structure",
        helpUrl:
          "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
        nodes: [
          {
            target: ["body"],
            html: "<body>",
            failureSummary: "No h1 heading found on page",
          },
        ],
        tags: ["AA", "1.3.1", "headings"],
      });
    }

    return { violations };
  }

  private static async checkKeyboardNavigation(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const interactiveElements = container.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]',
    );

    interactiveElements.forEach((element) => {
      const tabIndex = element.getAttribute("tabindex");
      const isDisabled = element.hasAttribute("disabled");

      if (!isDisabled && tabIndex === "-1") {
        violations.push({
          id: "keyboard-navigation",
          impact: "serious",
          description: "Interactive element is not keyboard accessible",
          help: 'Remove tabindex="-1" or add keyboard event handlers',
          helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
          nodes: [
            {
              target: [this.getSelector(element)],
              html: element.outerHTML.substring(0, 200),
              failureSummary:
                'Element has tabindex="-1" making it inaccessible via keyboard',
            },
          ],
          tags: ["A", "2.1.1", "keyboard"],
        });
      }
    });

    return { violations };
  }

  private static async checkFocusVisible(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const focusableElements = container.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    focusableElements.forEach((element) => {
      const styles = window.getComputedStyle(element, ":focus");
      const outline = styles.outline;
      const outlineWidth = styles.outlineWidth;
      const boxShadow = styles.boxShadow;

      if (
        outline === "none" &&
        outlineWidth === "0px" &&
        boxShadow === "none"
      ) {
        violations.push({
          id: "focus-visible",
          impact: "serious",
          description: "Focusable element has no visible focus indicator",
          help: "Add visible focus styles using outline or box-shadow",
          helpUrl:
            "https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html",
          nodes: [
            {
              target: [this.getSelector(element)],
              html: element.outerHTML.substring(0, 200),
              failureSummary: "Element has no visible focus indicator",
            },
          ],
          tags: ["AA", "2.4.7", "focus"],
        });
      }
    });

    return { violations };
  }

  private static async checkSkipLinks(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const skipLinks = container.querySelectorAll('a[href^="#"]');
    const hasSkipToMain = Array.from(skipLinks).some(
      (link) =>
        link.textContent?.toLowerCase().includes("skip") &&
        link.textContent?.toLowerCase().includes("main"),
    );

    if (!hasSkipToMain && container === document.body) {
      violations.push({
        id: "skip-links",
        impact: "moderate",
        description: "Page should have skip links for keyboard navigation",
        help: "Add skip links to main content areas",
        helpUrl:
          "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html",
        nodes: [
          {
            target: ["body"],
            html: "<body>",
            failureSummary: "No skip links found",
          },
        ],
        tags: ["A", "2.4.1", "skip-links"],
      });
    }

    return { violations };
  }

  private static async checkFormLabels(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const inputs = container.querySelectorAll("input, select, textarea");

    inputs.forEach((input) => {
      const type = input.getAttribute("type");
      if (type === "hidden" || type === "submit" || type === "button") return;

      const id = input.getAttribute("id");
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      const label = id ? container.querySelector(`label[for="${id}"]`) : null;
      const wrappingLabel = input.closest("label");

      if (!label && !wrappingLabel && !ariaLabel && !ariaLabelledBy) {
        violations.push({
          id: "form-labels",
          impact: "critical",
          description: "Form input missing accessible label",
          help: "Add a label element or aria-label attribute",
          helpUrl:
            "https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html",
          nodes: [
            {
              target: [this.getSelector(input)],
              html: input.outerHTML,
              failureSummary: "Input has no associated label",
            },
          ],
          tags: ["A", "3.3.2", "forms"],
        });
      }
    });

    return { violations };
  }

  private static async checkLinkPurpose(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const links = container.querySelectorAll("a[href]");

    links.forEach((link) => {
      const text = link.textContent?.trim();
      const ariaLabel = link.getAttribute("aria-label");
      const title = link.getAttribute("title");

      const linkText = ariaLabel || text || title || "";

      if (
        !linkText ||
        linkText.length < 3 ||
        ["click here", "read more", "more", "link"].includes(
          linkText.toLowerCase(),
        )
      ) {
        violations.push({
          id: "link-purpose",
          impact: "serious",
          description: "Link purpose is unclear or missing",
          help: "Provide descriptive link text that explains the link purpose",
          helpUrl:
            "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
          nodes: [
            {
              target: [this.getSelector(link)],
              html: link.outerHTML,
              failureSummary: `Link text: "${linkText}"`,
            },
          ],
          tags: ["A", "2.4.4", "links"],
        });
      }
    });

    return { violations };
  }

  private static async checkValidHTML(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];

    const ids = new Map<string, Element[]>();
    const elementsWithIds = container.querySelectorAll("[id]");

    elementsWithIds.forEach((element) => {
      const id = element.getAttribute("id")!;
      if (!ids.has(id)) {
        ids.set(id, []);
      }
      ids.get(id)!.push(element);
    });

    ids.forEach((elements, id) => {
      if (elements.length > 1) {
        violations.push({
          id: "valid-html",
          impact: "moderate",
          description: `Duplicate ID "${id}" found`,
          help: "Ensure all IDs are unique",
          helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/parsing.html",
          nodes: elements.map((element) => ({
            target: [this.getSelector(element)],
            html: element.outerHTML.substring(0, 200),
            failureSummary: `Duplicate ID: ${id}`,
          })),
          tags: ["A", "4.1.1", "html"],
        });
      }
    });

    return { violations };
  }

  private static async checkAriaAttributes(
    container: Element,
  ): Promise<{ violations: AccessibilityViolation[] }> {
    const violations: AccessibilityViolation[] = [];
    const elementsWithAria = container.querySelectorAll(
      "[aria-labelledby], [aria-describedby]",
    );

    elementsWithAria.forEach((element) => {
      const labelledBy = element.getAttribute("aria-labelledby");
      const describedBy = element.getAttribute("aria-describedby");

      [labelledBy, describedBy].forEach((idList) => {
        if (idList) {
          const ids = idList.split(/\s+/);
          ids.forEach((id) => {
            if (!container.querySelector(`#${id}`)) {
              violations.push({
                id: "aria-attributes",
                impact: "serious",
                description: `ARIA reference to non-existent element ID "${id}"`,
                help: "Ensure referenced elements exist",
                helpUrl:
                  "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
                nodes: [
                  {
                    target: [this.getSelector(element)],
                    html: element.outerHTML.substring(0, 200),
                    failureSummary: `References non-existent ID: ${id}`,
                  },
                ],
                tags: ["A", "4.1.2", "aria"],
              });
            }
          });
        }
      });
    });

    return { violations };
  }

  private static calculateContrastRatio(
    color1: string,
    color2: string,
  ): number {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private static parseColor(color: string): [number, number, number] {
    const div = document.createElement("div");
    div.style.color = color;
    document.body.appendChild(div);
    const computedColor = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [0, 0, 0];
  }

  private static getLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  private static getSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.className) {
        selector += "." + current.className.split(" ").join(".");
      }

      path.unshift(selector);
      current = current.parentElement!;
    }

    return path.join(" > ");
  }
}

export class AccessibilityTester {
  private static testResults: AccessibilityTestResult[] = [];

  static async runTests(container?: Element): Promise<AccessibilityTestResult> {
    const result = await WCAGChecker.runAllTests(container);
    this.testResults.push(result);
    return result;
  }

  static getTestHistory(): AccessibilityTestResult[] {
    return [...this.testResults];
  }

  static generateReport(result: AccessibilityTestResult): string {
    const { violations, passes } = result;
    const totalTests = violations.length + passes.length;
    const passRate = totalTests > 0 ? (passes.length / totalTests) * 100 : 0;

    let report = `# Accessibility Test Report\n\n`;
    report += `**Generated:** ${new Date(result.timestamp).toLocaleString()}\n`;
    report += `**URL:** ${result.url}\n`;
    report += `**Test Engine:** ${result.testEngine}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Tests:** ${totalTests}\n`;
    report += `- **Passed:** ${passes.length}\n`;
    report += `- **Failed:** ${violations.length}\n`;
    report += `- **Pass Rate:** ${passRate.toFixed(1)}%\n\n`;

    if (violations.length > 0) {
      report += `## Violations\n\n`;

      const violationsByImpact = violations.reduce(
        (acc, violation) => {
          if (!acc[violation.impact]) acc[violation.impact] = [];
          acc[violation.impact].push(violation);
          return acc;
        },
        {} as Record<string, AccessibilityViolation[]>,
      );

      ["critical", "serious", "moderate", "minor"].forEach((impact) => {
        const impactViolations = violationsByImpact[impact];
        if (impactViolations?.length > 0) {
          report += `### ${impact.toUpperCase()} (${impactViolations.length})\n\n`;

          impactViolations.forEach((violation) => {
            report += `#### ${violation.description}\n\n`;
            report += `**Help:** ${violation.help}\n\n`;
            report += `**WCAG Guidelines:** ${violation.tags.join(", ")}\n\n`;

            if (violation.nodes.length > 0) {
              report += `**Affected Elements:**\n`;
              violation.nodes.forEach((node) => {
                report += `- ${node.target.join(" > ")}\n`;
                report += `  - ${node.failureSummary}\n`;
              });
              report += "\n";
            }
          });
        }
      });
    }

    if (passes.length > 0) {
      report += `## Passed Tests\n\n`;
      passes.forEach((pass) => {
        report += `- ✅ ${pass.description}\n`;
      });
    }

    return report;
  }

  static async exportReport(
    result: AccessibilityTestResult,
    format: "json" | "html" | "markdown" = "json",
  ): Promise<string> {
    switch (format) {
      case "json":
        return JSON.stringify(result, null, 2);

      case "markdown":
        return this.generateReport(result);

      case "html":
        const markdown = this.generateReport(result);

        return `<html><body><pre>${markdown}</pre></body></html>`;

      default:
        return JSON.stringify(result, null, 2);
    }
  }

  static createTestSuite(): {
    runColorContrastTest: () => Promise<AccessibilityTestResult>;
    runKeyboardNavigationTest: () => Promise<AccessibilityTestResult>;
    runScreenReaderTest: () => Promise<AccessibilityTestResult>;
    runFormAccessibilityTest: () => Promise<AccessibilityTestResult>;
    runFullSuite: () => Promise<AccessibilityTestResult>;
  } {
    return {
      runColorContrastTest: async () => {
        const result = await WCAGChecker.runAllTests();
        return {
          ...result,
          violations: result.violations.filter(
            (v) => v.id === "color-contrast",
          ),
          passes: result.passes.filter((v) => v.id === "color-contrast"),
        };
      },

      runKeyboardNavigationTest: async () => {
        const result = await WCAGChecker.runAllTests();
        return {
          ...result,
          violations: result.violations.filter(
            (v) =>
              v.id === "keyboard-navigation" ||
              v.id === "focus-visible" ||
              v.id === "skip-links",
          ),
          passes: result.passes.filter(
            (v) =>
              v.id === "keyboard-navigation" ||
              v.id === "focus-visible" ||
              v.id === "skip-links",
          ),
        };
      },

      runScreenReaderTest: async () => {
        const result = await WCAGChecker.runAllTests();
        return {
          ...result,
          violations: result.violations.filter(
            (v) =>
              v.id === "images-alt-text" ||
              v.id === "heading-structure" ||
              v.id === "aria-attributes",
          ),
          passes: result.passes.filter(
            (v) =>
              v.id === "images-alt-text" ||
              v.id === "heading-structure" ||
              v.id === "aria-attributes",
          ),
        };
      },

      runFormAccessibilityTest: async () => {
        const result = await WCAGChecker.runAllTests();
        return {
          ...result,
          violations: result.violations.filter((v) => v.id === "form-labels"),
          passes: result.passes.filter((v) => v.id === "form-labels"),
        };
      },

      runFullSuite: () => WCAGChecker.runAllTests(),
    };
  }
}

export function useAccessibilityTesting() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [results, setResults] = React.useState<AccessibilityTestResult | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const runTests = React.useCallback(async (container?: Element) => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await AccessibilityTester.runTests(container);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  }, []);

  const exportResults = React.useCallback(
    async (format: "json" | "html" | "markdown" = "json") => {
      if (!results) return null;
      return AccessibilityTester.exportReport(results, format);
    },
    [results],
  );

  return {
    isRunning,
    results,
    error,
    runTests,
    exportResults,
    hasViolations: results ? results.violations.length > 0 : false,
    violationCount: results ? results.violations.length : 0,
    passCount: results ? results.passes.length : 0,
  };
}

export { WCAGChecker, AccessibilityTester };
export type { AccessibilityViolation, AccessibilityTestResult };
