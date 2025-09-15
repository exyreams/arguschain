import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/global/Badge";
import { Alert, AlertDescription } from "@/components/global/Alert";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  TreePine,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BlockTransactionSummary,
  PyusdFunctionCategories,
} from "@/lib/debugblock/types";
import { Card } from "../global";

interface FunctionCategoryAnalyticsProps {
  functionCategories: PyusdFunctionCategories;
  transactions: BlockTransactionSummary[];
  functionPatterns?: {
    functionUsage: Map<string, number>;
    categoryDistribution: PyusdFunctionCategories;
    topFunctions: Array<{ name: string; count: number; percentage: number }>;
    unusualPatterns: string[];
  };
  height?: number;
  className?: string;
}

interface ChartDataPoint {
  category: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

interface RadarTooltipProps {
  payload: {
    category: string;
    value: number;
    actualCount: number;
  };
}

const CATEGORY_COLORS = {
  token_movement: "#10B981",
  supply_change: "#F59E0B",
  allowance: "#3B82F6",
  control: "#8B5CF6",
  admin: "#EF4444",
  view: "#6B7280",
  other: "#F3F4F6",
};

const CATEGORY_LABELS = {
  token_movement: "Token Movement",
  supply_change: "Supply Changes",
  allowance: "Allowances",
  control: "Access Control",
  admin: "Admin Functions",
  view: "View Functions",
  other: "Other Functions",
};

const CATEGORY_DESCRIPTIONS = {
  token_movement: "Transfer, mint, and burn operations",
  supply_change: "Token supply modifications",
  allowance: "Approval and allowance management",
  control: "Access control and permissions",
  admin: "Administrative operations",
  view: "Read-only view functions",
  other: "Miscellaneous functions",
};

export const FunctionCategoryAnalytics: React.FC<
  FunctionCategoryAnalyticsProps
> = ({ functionCategories, transactions, functionPatterns, className }) => {
  const chartData = useMemo(() => {
    return Object.entries(functionCategories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        category: CATEGORY_LABELS[category as keyof PyusdFunctionCategories],
        count,
        percentage:
          (count /
            Math.max(
              Object.values(functionCategories).reduce((sum, c) => sum + c, 0),
              1,
            )) *
          100,
        color: CATEGORY_COLORS[category as keyof PyusdFunctionCategories],
        description:
          CATEGORY_DESCRIPTIONS[category as keyof PyusdFunctionCategories],
      }));
  }, [functionCategories]);

  const radarData = useMemo(() => {
    const maxCount = Math.max(...Object.values(functionCategories));
    return Object.entries(functionCategories).map(([category, count]) => ({
      category: CATEGORY_LABELS[category as keyof PyusdFunctionCategories],
      value: maxCount > 0 ? (count / maxCount) * 100 : 0,
      actualCount: count,
    }));
  }, [functionCategories]);

  const treeMapData = useMemo(() => {
    return chartData.map((item) => ({
      name: item.category,
      size: item.count,
      fill: item.color,
    }));
  }, [chartData]);

  const totalFunctions = Object.values(functionCategories).reduce(
    (sum, count) => sum + count,
    0,
  );
  const pyusdTransactions = transactions.filter((tx) => tx.pyusd_interaction);
  const functionEfficiency =
    pyusdTransactions.length > 0
      ? totalFunctions / pyusdTransactions.length
      : 0;

  const riskLevel = useMemo(() => {
    const adminRatio = functionCategories.admin / Math.max(totalFunctions, 1);
    const supplyChangeRatio =
      functionCategories.supply_change / Math.max(totalFunctions, 1);

    if (adminRatio > 0.3 || supplyChangeRatio > 0.5) return "high";
    if (adminRatio > 0.1 || supplyChangeRatio > 0.2) return "medium";
    return "low";
  }, [functionCategories, totalFunctions]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{data.description}</p>
          <p className="text-sm">
            <span className="font-medium">{data.count}</span> calls (
            {data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (totalFunctions === 0) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <PieChartIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No PYUSD function calls found in this block
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalFunctions}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Function Calls
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {chartData.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Active Categories
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {functionEfficiency.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              Calls per Transaction
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Badge
              variant={
                riskLevel === "high"
                  ? "destructive"
                  : riskLevel === "medium"
                    ? "secondary"
                    : "default"
              }
              className="text-lg px-3 py-1"
            >
              {riskLevel.toUpperCase()}
            </Badge>
            <div className="text-sm text-muted-foreground mt-1">Risk Level</div>
          </div>
        </Card>
      </div>

      {functionPatterns?.unusualPatterns &&
        functionPatterns.unusualPatterns.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Unusual Patterns Detected:</div>
              <ul className="list-disc list-inside space-y-1">
                {functionPatterns.unusualPatterns.map((pattern) => (
                  <li key={pattern} className="text-sm">
                    {pattern}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Function Category Distribution">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) =>
                  `${category}: ${percentage.toFixed(1)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.category}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Function Call Counts">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Activity Pattern Analysis">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" fontSize={12} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
              <Radar
                name="Activity Level"
                dataKey="value"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.3}
              />
              <Tooltip
                formatter={(
                  value: number,
                  name: string,
                  props: RadarTooltipProps,
                ) => [
                  `${props.payload.actualCount} calls (${value.toFixed(1)}%)`,
                  name,
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Proportional View">
          <div className="flex items-center gap-2 mb-4">
            <TreePine className="h-5 w-5" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={treeMapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
            />
          </ResponsiveContainer>
        </Card>
      </div>

      {functionPatterns?.topFunctions &&
        functionPatterns.topFunctions.length > 0 && (
          <Card title="Most Called Functions">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Function</th>
                    <th className="text-right p-2">Calls</th>
                    <th className="text-right p-2">Percentage</th>
                    <th className="text-center p-2">Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {functionPatterns.topFunctions.map((func) => (
                    <tr key={func.name} className="border-b">
                      <td className="p-2 font-mono text-sm">{func.name}</td>
                      <td className="text-right p-2 font-medium">
                        {func.count}
                      </td>
                      <td className="text-right p-2">
                        {func.percentage.toFixed(1)}%
                      </td>
                      <td className="text-center p-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${func.percentage}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      <Card title="Category Analysis">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartData.map((category) => (
            <div key={category.category} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <h4 className="font-medium">{category.category}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {category.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">{category.count}</span>
                <Badge variant="secondary">
                  {category.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
