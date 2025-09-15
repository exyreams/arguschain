import html2canvas from "html2canvas";
import { toast } from "sonner";

export interface ChartExportOptions {
  format: "png" | "svg";
  quality: number;
  scale: number;
  filename?: string;
  includeBackground: boolean;
}

export class ChartExporter {
  /**
   * Export a single chart element as image or PDF
   */
  static async exportChart(
    element: HTMLElement,
    options: Partial<ChartExportOptions> = {}
  ): Promise<void> {
    const config: ChartExportOptions = {
      format: "png",
      quality: 1.0,
      scale: 2,
      filename: "chart",
      includeBackground: true,
      ...options,
    };

    try {
      const loadingToastId = toast.loading("Preparing chart for export...");

      const canvas = await html2canvas(element, {
        scale: config.scale,
        backgroundColor: config.includeBackground ? "#0f1419" : null,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      if (config.format === "png") {
        await this.downloadCanvasAsPNG(canvas, config.filename);
        toast.success("Chart exported as PNG successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        `Failed to export chart: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw error;
    }
  }

  /**
   * Export multiple charts as separate images
   */
  static async exportMultipleCharts(
    elements: HTMLElement[],
    options: Partial<ChartExportOptions> = {}
  ): Promise<void> {
    const config: ChartExportOptions = {
      format: "png",
      quality: 1.0,
      scale: 2,
      filename: "chart",
      includeBackground: true,
      ...options,
    };

    try {
      const loadingToastId = toast.loading(
        `Exporting ${elements.length} charts...`
      );

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const filename = `${config.filename}-${i + 1}`;

        await this.exportChart(element, {
          ...config,
          filename,
        });
      }

      toast.dismiss(loadingToastId);
      toast.success(`Successfully exported ${elements.length} charts!`);
    } catch (error) {
      console.error("Multiple export error:", error);
      toast.error(
        `Failed to export charts: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw error;
    }
  }

  /**
   * Download canvas as PNG
   */
  private static async downloadCanvasAsPNG(
    canvas: HTMLCanvasElement,
    filename: string
  ): Promise<void> {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          resolve();
        },
        "image/png",
        0.9
      );
    });
  }

  /**
   * Get all exportable chart elements on the page
   */
  static getExportableCharts(): HTMLElement[] {
    const selectors = [
      '[data-chart="true"]',
      ".recharts-wrapper",
      ".chart-container",
      '[class*="Chart"]',
      'svg[class*="chart"]',
      ".apexcharts-canvas",
      'canvas[class*="chart"]',
      ".bg-\\[rgba\\(15\\,20\\,25\\,0\\.8\\)\\]", // Our chart containers
    ];

    const elements: HTMLElement[] = [];

    selectors.forEach((selector) => {
      const found = document.querySelectorAll(
        selector
      ) as NodeListOf<HTMLElement>;
      found.forEach((el) => {
        if (
          el.offsetWidth > 100 &&
          el.offsetHeight > 100 &&
          window.getComputedStyle(el).display !== "none"
        ) {
          elements.push(el);
        }
      });
    });

    return Array.from(new Set(elements));
  }
}
