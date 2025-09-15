import React, { useRef } from "react";
import { ExportButton } from "./ExportButton";

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  data?: any;
  exportable?: boolean;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  data,
  exportable = true,
  className = "",
}) => {
  const chartContentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`relative group bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden hover:border-[rgba(0,191,255,0.3)] transition-all duration-300 ${className}`}
      data-chart-container="true"
      data-chart-title={title}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(0,191,255,0.1)]">
        <h4 className="text-lg font-semibold text-[#00bfff]">{title}</h4>
        {exportable && (
          <ExportButton
            chartRef={chartContentRef}
            data={data}
            filename={`${title.toLowerCase().replace(/\s+/g, "-")}-chart`}
            className="scale-75"
          />
        )}
      </div>

      {/* Chart Content */}
      <div
        ref={chartContentRef}
        className="p-4 overflow-hidden"
        data-chart-content="true"
      >
        {children}
      </div>
    </div>
  );
};
