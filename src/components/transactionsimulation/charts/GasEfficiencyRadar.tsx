import React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { GasEfficiencyMetrics } from "@/lib/transactionsimulation/types";

interface GasEfficiencyRadarProps {
  metrics: GasEfficiencyMetrics;
  height?: number;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Score:</span>
            <span className="text-white">{value.toFixed(1)}/100</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Grade:</span>
            <span className={`font-semibold ${getGradeColor(value)}`}>
              {getGrade(value)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const getGrade = (score: number): string => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

const getGradeColor = (score: number): string => {
  if (score >= 90) return "text-green-400";
  if (score >= 80) return "text-blue-400";
  if (score >= 70) return "text-yellow-400";
  if (score >= 60) return "text-orange-400";
  return "text-red-400";
};

export const GasEfficiencyRadar: React.FC<GasEfficiencyRadarProps> = ({
  metrics,
  height = 300,
  className = "",
}) => {
  const radarData = [
    {
      metric: "Gas Usage",
      value: metrics.factors.gasUsage,
      fullMark: 100,
    },
    {
      metric: "Success Rate",
      value: metrics.factors.successRate,
      fullMark: 100,
    },
    {
      metric: "Complexity",
      value: 100 - metrics.factors.complexity,
      fullMark: 100,
    },
    {
      metric: "Optimization",
      value: metrics.factors.optimization,
      fullMark: 100,
    },
  ];

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Gas Efficiency Analysis
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Overall Grade:</span>
            <span
              className={`text-xl font-bold ${getGradeColor(metrics.score)}`}
            >
              {metrics.grade}
            </span>
          </div>
        </div>
        <div className="text-sm text-[#8b9dc3]">
          Overall Score: {metrics.score.toFixed(1)}/100
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(0,191,255,0.2)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#8b9dc3", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#8b9dc3", fontSize: 10 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Radar
            name="Efficiency"
            dataKey="value"
            stroke="#00bfff"
            fill="#00bfff"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={{ fill: "#00bfff", strokeWidth: 2, r: 4 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Gas Usage</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {metrics.factors.gasUsage.toFixed(1)}%
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Success Rate</div>
          <div className="text-lg font-semibold text-green-400">
            {metrics.factors.successRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Complexity</div>
          <div className="text-lg font-semibold text-yellow-400">
            {metrics.factors.complexity.toFixed(1)}%
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Optimization</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {metrics.factors.optimization.toFixed(1)}%
          </div>
        </div>
      </div>

      {metrics.recommendations.length > 0 && (
        <div className="mt-4 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
          <h5 className="text-sm font-semibold text-[#00bfff] mb-2">
            Optimization Recommendations
          </h5>
          <ul className="space-y-1 text-sm text-[#8b9dc3]">
            {metrics.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-[#00bfff] mt-1">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GasEfficiencyRadar;
