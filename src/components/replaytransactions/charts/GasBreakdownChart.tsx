import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/global";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { VISUALIZATION_COLORS } from "@/lib/replaytransactions";

interface GasBreakdownChartProps {
  gasBreakdown: Array<{
    category: string;
    gasUsed: number;
    percentage: number;
    description: string;
  }>;
  totalGas: number;
  className?: string;
}

type ChartType = "pie" | "bar";

export const GasBreakdownChart: React.FC<GasBreakdownChartProps> = ({
  gasBreakdown,
  totalGas,
  className = "",
}) => {
  const [chartType, setChartType] = useState<ChartType>("pie");

  if (
    !gasBreakdown ||
    !Array.isArray(gasBreakdown) ||
    gasBreakdown.length === 0
  ) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-[#8b9dc3]">No gas breakdown data available</div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 text-sm">
          <div className="text-[#00bfff] font-semibold mb-2">
            {data.category}
          </div>
          <div className="text-[#8b9dc3] mb-1">
            Gas Used:{" "}
            <span className="text-[#00bfff]">
              {data.gasUsed.toLocaleString()}
            </span>
          </div>
          <div className="text-[#8b9dc3] mb-1">
            Percentage:{" "}
            <span className="text-[#00bfff]">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-[#8b9dc3] text-xs italic">
            {data.description}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!gasBreakdown || gasBreakdown.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-[#8b9dc3]">No gas breakdown data available</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-2 mb-4">
        <Button
          variant={chartType === "pie" ? "default" : "outline"}
          size="sm"
          onClick={() => setChartType("pie")}
          className={
            chartType === "pie"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }
        >
          <PieChartIcon className="h-4 w-4 mr-2" />
          Pie Chart
        </Button>
        <Button
          variant={chartType === "bar" ? "default" : "outline"}
          size="sm"
          onClick={() => setChartType("bar")}
          className={
            chartType === "bar"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Bar Chart
        </Button>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                data={gasBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="gasUsed"
              >
                {gasBreakdown.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      VISUALIZATION_COLORS.chart[
                        index % VISUALIZATION_COLORS.chart.length
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={CustomTooltip} />
              <Legend
                wrapperStyle={{
                  color: VISUALIZATION_COLORS.secondary,
                  fontSize: "12px",
                }}
              />
            </PieChart>
          ) : (
            <BarChart data={gasBreakdown}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={VISUALIZATION_COLORS.background.border}
                opacity={0.3}
              />
              <XAxis
                dataKey="category"
                stroke={VISUALIZATION_COLORS.secondary}
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke={VISUALIZATION_COLORS.secondary} fontSize={12} />
              <Tooltip content={CustomTooltip} />
              <Bar
                dataKey="gasUsed"
                fill={VISUALIZATION_COLORS.primary}
                radius={[4, 4, 0, 0]}
              >
                {gasBreakdown.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      VISUALIZATION_COLORS.chart[
                        index % VISUALIZATION_COLORS.chart.length
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-6">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-3">
          Gas Usage Summary
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,191,255,0.2)]">
                <th className="text-left py-2 text-[#8b9dc3]">Category</th>
                <th className="text-right py-2 text-[#8b9dc3]">Gas Used</th>
                <th className="text-right py-2 text-[#8b9dc3]">Percentage</th>
                <th className="text-left py-2 text-[#8b9dc3]">Description</th>
              </tr>
            </thead>
            <tbody>
              {gasBreakdown.map((item, index) => (
                <tr
                  key={item.category}
                  className="border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)]"
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{
                          background:
                            VISUALIZATION_COLORS.chart[
                              index % VISUALIZATION_COLORS.chart.length
                            ],
                        }}
                      />
                      <span className="text-[#00bfff]">{item.category}</span>
                    </div>
                  </td>
                  <td className="text-right py-2 text-[#00bfff] font-mono">
                    {item.gasUsed.toLocaleString()}
                  </td>
                  <td className="text-right py-2 text-[#00bfff]">
                    {item.percentage.toFixed(1)}%
                  </td>
                  <td className="py-2 text-[#8b9dc3] text-xs">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[rgba(0,191,255,0.3)] font-semibold">
                <td className="py-2 text-[#00bfff]">Total</td>
                <td className="text-right py-2 text-[#00bfff] font-mono">
                  {totalGas.toLocaleString()}
                </td>
                <td className="text-right py-2 text-[#00bfff]">100.0%</td>
                <td className="py-2 text-[#8b9dc3] text-xs">
                  Complete transaction gas usage
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-3">
          Efficiency Insights
        </h4>
        <div className="space-y-2 text-sm">
          {gasBreakdown.map((item, index) => {
            let insight = "";
            let color = VISUALIZATION_COLORS.secondary;

            if (item.percentage > 50) {
              insight = `${item.category} dominates gas usage - consider optimization`;
              color = VISUALIZATION_COLORS.warning;
            } else if (item.percentage > 30) {
              insight = `${item.category} is a significant gas consumer`;
              color = VISUALIZATION_COLORS.info;
            } else if (item.percentage < 5) {
              insight = `${item.category} has minimal gas impact`;
              color = VISUALIZATION_COLORS.success;
            }

            if (insight) {
              return (
                <div key={item.category} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span style={{ color }}>{insight}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
