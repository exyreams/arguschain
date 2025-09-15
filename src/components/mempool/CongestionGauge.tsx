import React from "react";
import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import type { CongestionAnalysis } from "@/lib/mempool/types";

interface CongestionGaugeProps {
  congestionAnalysis: CongestionAnalysis;
  title?: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

export const CongestionGauge: React.FC<CongestionGaugeProps> = ({
  congestionAnalysis,
  title = "Network Congestion",
  size = "md",
  showDetails = true,
  className,
}) => {
  const { level, factor, color, description } = congestionAnalysis;

  const percentage = Math.round(factor * 100);

  const sizeConfig = {
    sm: { height: 180, innerRadius: 50, outerRadius: 80 },
    md: { height: 220, innerRadius: 60, outerRadius: 100 },
    lg: { height: 280, innerRadius: 80, outerRadius: 120 },
  };

  const config = sizeConfig[size];

  const data = [
    {
      name: "Congestion",
      value: percentage,
      fill: color,
    },
  ];

  const segmentData = [
    { name: "Low", value: 25, fill: "#22c55e" },
    { name: "Moderate", value: 25, fill: "#eab308" },
    { name: "High", value: 25, fill: "#f97316" },
    { name: "Extreme", value: 25, fill: "#ef4444" },
  ];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <h3 className="text-lg font-semibold text-[#00bfff] mb-2">{title}</h3>

      <div className="relative">
        <ResponsiveContainer
          width={config.outerRadius * 2.2}
          height={config.height}
        >
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={config.innerRadius}
            outerRadius={config.outerRadius}
            startAngle={180}
            endAngle={0}
            data={data}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill="rgba(139, 157, 195, 0.1)"
              data={[{ value: 100 }]}
            />

            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill={color}
              className="drop-shadow-lg"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-[#00bfff] mb-1">
            {percentage}%
          </div>
          <div className="text-sm text-[#8b9dc3] capitalize font-medium">
            {level}
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-1">
            {segmentData.map((segment, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: segment.fill }}
                />
                {index < segmentData.length - 1 && (
                  <div className="w-1 h-px bg-[rgba(139,157,195,0.3)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 text-center max-w-sm space-y-2">
          <p className="text-sm text-[#8b9dc3]">{description}</p>
          <div className="text-xs text-[#6b7280] bg-[rgba(25,28,40,0.6)] rounded-lg px-3 py-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00bfff]" />
              <span>
                Est. confirmation:{" "}
                {congestionAnalysis.estimatedConfirmationTime}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-[#8b9dc3]">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#eab308]" />
          <span className="text-[#8b9dc3]">Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#f97316]" />
          <span className="text-[#8b9dc3]">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[#8b9dc3]">Extreme</span>
        </div>
      </div>
    </div>
  );
};
