import React, { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/global";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Code,
  Cpu,
  Database,
  ExternalLink,
  Lightbulb,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GasAnalysisData {
  totalGasUsed: number;
  gasBreakdown: {
    category: string;
    gasUsed: number;
    percentage: number;
  }[];
  opcodeDistribution: {
    opcode: string;
    count: number;
    gasUsed: number;
    percentage: number;
  }[];
  functionCalls: {
    signature: string;
    name: string;
    gasUsed: number;
    count: number;
  }[];
  storageOperations: {
    type: "SLOAD" | "SSTORE";
    count: number;
    gasUsed: number;
  }[];
  memoryOperations: {
    type: "MLOAD" | "MSTORE";
    count: number;
    gasUsed: number;
  }[];
}

interface OptimizationPattern {
  id: string;
  name: string;
  description: string;
  category:
    | "storage"
    | "computation"
    | "memory"
    | "loops"
    | "functions"
    | "data-structures";
  severity: "low" | "medium" | "high" | "critical";
  potentialSavings: {
    gasAmount: number;
    percentage: number;
    costUSD: number;
  };
  detectionCriteria: {
    opcodes?: string[];
    gasThreshold?: number;
    patternType: string;
    conditions: string[];
  };
  recommendations: {
    title: string;
    description: string;
    codeExample?: string;
    difficulty: "easy" | "medium" | "hard";
    estimatedEffort: string;
  }[];
  resources: {
    title: string;
    url: string;
    type: "documentation" | "tool" | "guide" | "example";
  }[];
}

interface GasOptimizationEngineProps {
  gasData: GasAnalysisData;
  transactionHash?: string;
  onPatternSelect?: (pattern: OptimizationPattern) => void;
  onImplementationGuide?: (patternId: string) => void;
  className?: string;
  showComparison?: boolean;
}

class GasOptimizationEngine {
  private static patterns: OptimizationPattern[] = [
    {
      id: "storage-packing",
      name: "Storage Variable Packing",
      description:
        "Multiple storage variables can be packed into a single storage slot to reduce SSTORE operations.",
      category: "storage",
      severity: "high",
      potentialSavings: {
        gasAmount: 15000,
        percentage: 25,
        costUSD: 30,
      },
      detectionCriteria: {
        opcodes: ["SSTORE"],
        gasThreshold: 20000,
        patternType: "multiple_small_storage",
        conditions: [
          "Multiple SSTORE operations to consecutive slots",
          "Variables smaller than 32 bytes",
          "High storage operation frequency",
        ],
      },
      recommendations: [
        {
          title: "Pack Variables in Structs",
          description:
            "Group related variables into structs to utilize storage slot packing.",
          codeExample: `
            uint128 public balance;
            uint64 public timestamp;
            bool public active;
            
            struct UserData {
                uint128 balance;
                uint64 timestamp;
                bool active;
            }`,
          difficulty: "easy",
          estimatedEffort: "1-2 hours",
        },
        {
          title: "Optimize Variable Order",
          description:
            "Arrange variables by size to maximize packing efficiency.",
          difficulty: "easy",
          estimatedEffort: "30 minutes",
        },
      ],
      resources: [
        {
          title: "Solidity Storage Layout",
          url: "https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html",
          type: "documentation",
        },
        {
          title: "Storage Packing Guide",
          url: "https://consensys.net/blog/developers/solidity-gas-optimization-tips/",
          type: "guide",
        },
      ],
    },
    {
      id: "loop-optimization",
      name: "Loop Gas Optimization",
      description:
        "Inefficient loops consuming excessive gas through repeated operations or unbounded iterations.",
      category: "loops",
      severity: "critical",
      potentialSavings: {
        gasAmount: 50000,
        percentage: 40,
        costUSD: 100,
      },
      detectionCriteria: {
        opcodes: ["JUMP", "JUMPI"],
        gasThreshold: 100000,
        patternType: "expensive_loops",
        conditions: [
          "High number of JUMP/JUMPI operations",
          "Repeated storage reads in loops",
          "Unbounded loop iterations",
        ],
      },
      recommendations: [
        {
          title: "Cache Storage Variables",
          description:
            "Cache storage variables in memory before loop execution.",
          codeExample: `// Before: Reading storage in loop
for (uint i = 0; i < users.length; i++) {
    if (users[i].active) { // SLOAD each iteration
        // process user
    }
}

// After: Cache in memory
uint length = users.length; // Single SLOAD
for (uint i = 0; i < length; i++) {
    User memory user = users[i]; // Cache user data
    if (user.active) {
        // process user
    }
}`,
          difficulty: "medium",
          estimatedEffort: "2-4 hours",
        },
        {
          title: "Implement Loop Bounds",
          description:
            "Add maximum iteration limits to prevent gas limit issues.",
          difficulty: "easy",
          estimatedEffort: "1 hour",
        },
      ],
      resources: [
        {
          title: "Loop Optimization Patterns",
          url: "https://github.com/ethereum/solidity/issues/3779",
          type: "guide",
        },
      ],
    },
    {
      id: "function-visibility",
      name: "Function Visibility Optimization",
      description:
        "Public functions consume more gas than external functions when called externally.",
      category: "functions",
      severity: "medium",
      potentialSavings: {
        gasAmount: 5000,
        percentage: 8,
        costUSD: 10,
      },
      detectionCriteria: {
        gasThreshold: 5000,
        patternType: "public_functions",
        conditions: [
          "Public functions called externally",
          "Functions not called internally",
          "High function call frequency",
        ],
      },
      recommendations: [
        {
          title: "Use External Visibility",
          description:
            "Change public functions to external when not called internally.",
          codeExample: `// Before: public function
function transfer(address to, uint amount) public {
    // function logic
}

// After: external function
function transfer(address to, uint amount) external {
    // function logic
}`,
          difficulty: "easy",
          estimatedEffort: "15 minutes",
        },
      ],
      resources: [
        {
          title: "Function Visibility Best Practices",
          url: "https://docs.soliditylang.org/en/latest/contracts.html#visibility-and-getters",
          type: "documentation",
        },
      ],
    },
    {
      id: "memory-optimization",
      name: "Memory Usage Optimization",
      description:
        "Excessive memory operations increasing gas costs through inefficient data handling.",
      category: "memory",
      severity: "medium",
      potentialSavings: {
        gasAmount: 8000,
        percentage: 12,
        costUSD: 16,
      },
      detectionCriteria: {
        opcodes: ["MLOAD", "MSTORE"],
        gasThreshold: 10000,
        patternType: "memory_intensive",
        conditions: [
          "High memory operation count",
          "Large memory allocations",
          "Inefficient memory usage patterns",
        ],
      },
      recommendations: [
        {
          title: "Optimize Memory Layout",
          description:
            "Minimize memory allocations and reuse memory slots when possible.",
          difficulty: "medium",
          estimatedEffort: "3-5 hours",
        },
        {
          title: "Use Assembly for Memory Operations",
          description:
            "Use inline assembly for critical memory operations to reduce overhead.",
          difficulty: "hard",
          estimatedEffort: "1-2 days",
        },
      ],
      resources: [
        {
          title: "Memory Optimization Guide",
          url: "https://consensys.net/blog/developers/solidity-memory-and-storage-optimization/",
          type: "guide",
        },
      ],
    },
    {
      id: "data-structure-optimization",
      name: "Data Structure Optimization",
      description:
        "Inefficient data structures causing unnecessary gas consumption.",
      category: "data-structures",
      severity: "high",
      potentialSavings: {
        gasAmount: 25000,
        percentage: 30,
        costUSD: 50,
      },
      detectionCriteria: {
        gasThreshold: 30000,
        patternType: "inefficient_data_structures",
        conditions: [
          "Frequent array iterations",
          "Large mapping operations",
          "Inefficient data access patterns",
        ],
      },
      recommendations: [
        {
          title: "Use Mappings Instead of Arrays",
          description:
            "Replace arrays with mappings for O(1) access when order is not important.",
          codeExample: `// Before: Array iteration
address[] public users;
function isUser(address user) public view returns (bool) {
    for (uint i = 0; i < users.length; i++) {
        if (users[i] == user) return true;
    }
    return false;
}

// After: Mapping lookup
mapping(address => bool) public isUser;
function addUser(address user) public {
    isUser[user] = true;
}`,
          difficulty: "medium",
          estimatedEffort: "2-3 hours",
        },
        {
          title: "Implement Efficient Indexing",
          description: "Add index mappings for frequently accessed data.",
          difficulty: "medium",
          estimatedEffort: "1-2 hours",
        },
      ],
      resources: [
        {
          title: "Data Structure Gas Costs",
          url: "https://ethereum.stackexchange.com/questions/3067/why-does-mapping-cost-less-gas-than-array",
          type: "guide",
        },
      ],
    },
    {
      id: "computation-optimization",
      name: "Computation Optimization",
      description:
        "Expensive computational operations that can be optimized or cached.",
      category: "computation",
      severity: "medium",
      potentialSavings: {
        gasAmount: 12000,
        percentage: 15,
        costUSD: 24,
      },
      detectionCriteria: {
        opcodes: ["MUL", "DIV", "MOD", "EXP"],
        gasThreshold: 15000,
        patternType: "expensive_computation",
        conditions: [
          "Repeated expensive operations",
          "Complex mathematical calculations",
          "Redundant computations",
        ],
      },
      recommendations: [
        {
          title: "Cache Computation Results",
          description:
            "Store results of expensive computations to avoid recalculation.",
          difficulty: "medium",
          estimatedEffort: "1-3 hours",
        },
        {
          title: "Use Bit Operations",
          description:
            "Replace division/multiplication by powers of 2 with bit shifts.",
          codeExample: `// Before: Division
uint result = value / 8;

// After: Bit shift
uint result = value >> 3; // 8 = 2^3`,
          difficulty: "easy",
          estimatedEffort: "30 minutes",
        },
      ],
      resources: [
        {
          title: "Gas Optimization Techniques",
          url: "https://consensys.net/blog/developers/solidity-gas-optimization-tips/",
          type: "guide",
        },
      ],
    },
  ];

  static analyzeGasUsage(gasData: GasAnalysisData): OptimizationPattern[] {
    const detectedPatterns: OptimizationPattern[] = [];

    this.patterns.forEach((pattern) => {
      if (this.detectPattern(pattern, gasData)) {
        const adjustedPattern = {
          ...pattern,
          potentialSavings: this.calculatePotentialSavings(pattern, gasData),
        };
        detectedPatterns.push(adjustedPattern);
      }
    });

    return detectedPatterns.sort(
      (a, b) => b.potentialSavings.gasAmount - a.potentialSavings.gasAmount,
    );
  }

  private static detectPattern(
    pattern: OptimizationPattern,
    gasData: GasAnalysisData,
  ): boolean {
    const { detectionCriteria } = pattern;

    if (
      detectionCriteria.gasThreshold &&
      gasData.totalGasUsed < detectionCriteria.gasThreshold
    ) {
      return false;
    }

    if (detectionCriteria.opcodes) {
      const relevantOpcodes = gasData.opcodeDistribution.filter((op) =>
        detectionCriteria.opcodes!.includes(op.opcode),
      );

      if (relevantOpcodes.length === 0) return false;

      switch (detectionCriteria.patternType) {
        case "multiple_small_storage":
          return this.detectStoragePackingOpportunity(gasData);
        case "expensive_loops":
          return this.detectExpensiveLoops(gasData);
        case "public_functions":
          return this.detectPublicFunctionOptimization(gasData);
        case "memory_intensive":
          return this.detectMemoryOptimization(gasData);
        case "inefficient_data_structures":
          return this.detectDataStructureOptimization(gasData);
        case "expensive_computation":
          return this.detectComputationOptimization(gasData);
        default:
          return true;
      }
    }

    return true;
  }

  private static detectStoragePackingOpportunity(
    gasData: GasAnalysisData,
  ): boolean {
    const sstoreOps = gasData.opcodeDistribution.find(
      (op) => op.opcode === "SSTORE",
    );
    return sstoreOps ? sstoreOps.count > 3 && sstoreOps.gasUsed > 15000 : false;
  }

  private static detectExpensiveLoops(gasData: GasAnalysisData): boolean {
    const jumpOps = gasData.opcodeDistribution.filter(
      (op) => op.opcode === "JUMP" || op.opcode === "JUMPI",
    );
    const totalJumps = jumpOps.reduce((sum, op) => sum + op.count, 0);
    return totalJumps > 50 && gasData.totalGasUsed > 100000;
  }

  private static detectPublicFunctionOptimization(
    gasData: GasAnalysisData,
  ): boolean {
    return (
      gasData.functionCalls.length > 3 &&
      gasData.functionCalls.some((call) => call.gasUsed > 3000)
    );
  }

  private static detectMemoryOptimization(gasData: GasAnalysisData): boolean {
    const memoryOps = gasData.memoryOperations.reduce(
      (sum, op) => sum + op.count,
      0,
    );
    return memoryOps > 20;
  }

  private static detectDataStructureOptimization(
    gasData: GasAnalysisData,
  ): boolean {
    const storageReads = gasData.opcodeDistribution.find(
      (op) => op.opcode === "SLOAD",
    );
    return storageReads ? storageReads.count > 10 : false;
  }

  private static detectComputationOptimization(
    gasData: GasAnalysisData,
  ): boolean {
    const expensiveOps = gasData.opcodeDistribution.filter((op) =>
      ["MUL", "DIV", "MOD", "EXP"].includes(op.opcode),
    );
    const totalExpensiveOps = expensiveOps.reduce(
      (sum, op) => sum + op.count,
      0,
    );
    return totalExpensiveOps > 5;
  }

  private static calculatePotentialSavings(
    pattern: OptimizationPattern,
    gasData: GasAnalysisData,
  ): { gasAmount: number; percentage: number; costUSD: number } {
    const baseGas = gasData.totalGasUsed;
    const patternGasUsage = this.estimatePatternGasUsage(pattern, gasData);

    const gasAmount = Math.min(
      pattern.potentialSavings.gasAmount,
      patternGasUsage * 0.8,
    );
    const percentage = (gasAmount / baseGas) * 100;
    const costUSD = (gasAmount * 20 * 2000) / 1e18;

    return { gasAmount, percentage, costUSD };
  }

  private static estimatePatternGasUsage(
    pattern: OptimizationPattern,
    gasData: GasAnalysisData,
  ): number {
    switch (pattern.category) {
      case "storage":
        return gasData.storageOperations.reduce(
          (sum, op) => sum + op.gasUsed,
          0,
        );
      case "memory":
        return gasData.memoryOperations.reduce(
          (sum, op) => sum + op.gasUsed,
          0,
        );
      case "computation":
        const computeOps = gasData.opcodeDistribution.filter((op) =>
          ["MUL", "DIV", "MOD", "EXP"].includes(op.opcode),
        );
        return computeOps.reduce((sum, op) => sum + op.gasUsed, 0);
      default:
        return gasData.totalGasUsed * 0.2;
    }
  }
}

const severityConfig = {
  critical: {
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-950",
    icon: AlertCircle,
    label: "Critical",
  },
  high: {
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    icon: TrendingDown,
    label: "High",
  },
  medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    icon: Lightbulb,
    label: "Medium",
  },
  low: {
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    icon: CheckCircle,
    label: "Low",
  },
};

const categoryConfig = {
  storage: { icon: Database, label: "Storage", color: "text-purple-600" },
  computation: { icon: Cpu, label: "Computation", color: "text-blue-600" },
  memory: { icon: BarChart3, label: "Memory", color: "text-green-600" },
  loops: { icon: Target, label: "Loops", color: "text-red-600" },
  functions: { icon: Code, label: "Functions", color: "text-orange-600" },
  "data-structures": {
    icon: Database,
    label: "Data Structures",
    color: "text-indigo-600",
  },
};

export const GasOptimizationEngine: React.FC<GasOptimizationEngineProps> = ({
  gasData,
  transactionHash,
  onPatternSelect,
  onImplementationGuide,
  className,
  showComparison = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(
    new Set(),
  );

  const optimizationPatterns = useMemo(() => {
    return GasOptimizationEngine.analyzeGasUsage(gasData);
  }, [gasData]);

  const filteredPatterns = useMemo(() => {
    if (selectedCategory === "all") return optimizationPatterns;
    return optimizationPatterns.filter(
      (pattern) => pattern.category === selectedCategory,
    );
  }, [optimizationPatterns, selectedCategory]);

  const totalPotentialSavings = useMemo(() => {
    return optimizationPatterns.reduce(
      (total, pattern) => ({
        gasAmount: total.gasAmount + pattern.potentialSavings.gasAmount,
        costUSD: total.costUSD + pattern.potentialSavings.costUSD,
        percentage: Math.min(
          80,
          total.percentage + pattern.potentialSavings.percentage,
        ),
      }),
      { gasAmount: 0, costUSD: 0, percentage: 0 },
    );
  }, [optimizationPatterns]);

  const toggleExpanded = (patternId: string) => {
    const newExpanded = new Set(expandedPatterns);
    if (newExpanded.has(patternId)) {
      newExpanded.delete(patternId);
    } else {
      newExpanded.add(patternId);
    }
    setExpandedPatterns(newExpanded);
  };

  const categories = [...new Set(optimizationPatterns.map((p) => p.category))];

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>Gas Optimization Engine</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {optimizationPatterns.length} optimization opportunities detected
          </p>
        </div>

        {showComparison && totalPotentialSavings.gasAmount > 0 && (
          <div className="text-right">
            <div className="text-lg font-semibold text-green-600">
              -{totalPotentialSavings.gasAmount.toLocaleString()} gas
            </div>
            <div className="text-sm text-muted-foreground">
              ~${totalPotentialSavings.costUSD.toFixed(2)} savings
            </div>
          </div>
        )}
      </div>

      {showComparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {gasData.totalGasUsed.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Current Gas Usage
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              -{totalPotentialSavings.gasAmount.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Potential Savings
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalPotentialSavings.percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Efficiency Gain</div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-muted-foreground">
          Category:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-sm border rounded px-3 py-1 bg-background"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => {
            const config =
              categoryConfig[category as keyof typeof categoryConfig];
            return (
              <option key={category} value={category}>
                {config?.label || category}
              </option>
            );
          })}
        </select>
      </div>

      <div className="space-y-4">
        {filteredPatterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No optimization opportunities found</p>
            <p className="text-xs">
              Your gas usage appears to be well optimized
            </p>
          </div>
        ) : (
          filteredPatterns.map((pattern) => {
            const severityInfo = severityConfig[pattern.severity];
            const categoryInfo = categoryConfig[pattern.category];
            const SeverityIcon = severityInfo.icon;
            const CategoryIcon = categoryInfo.icon;
            const isExpanded = expandedPatterns.has(pattern.id);

            return (
              <div
                key={pattern.id}
                className={cn(
                  "border rounded-lg p-4 transition-all duration-200",
                  severityInfo.bgColor,
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={cn("p-2 rounded-full", severityInfo.color)}>
                      <SeverityIcon className="h-4 w-4 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground">
                          {pattern.name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {categoryInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {severityInfo.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {pattern.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm mb-3">
                        <div className="flex items-center space-x-1 text-green-600">
                          <TrendingDown className="h-4 w-4" />
                          <span className="font-medium">
                            -
                            {pattern.potentialSavings.gasAmount.toLocaleString()}{" "}
                            gas
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          ~${pattern.potentialSavings.costUSD.toFixed(2)}{" "}
                          savings
                        </div>
                        <div className="text-muted-foreground">
                          {pattern.potentialSavings.percentage.toFixed(1)}%
                          reduction
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleExpanded(pattern.id)}
                      className="text-xs"
                    >
                      {isExpanded ? "Less" : "Details"}
                    </Button>
                    {onImplementationGuide && (
                      <Button
                        size="sm"
                        onClick={() => onImplementationGuide(pattern.id)}
                        className="text-xs"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Implement
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">
                        Detection Criteria:
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {pattern.detectionCriteria.conditions.map(
                          (condition, index) => (
                            <li key={index}>{condition}</li>
                          ),
                        )}
                      </ul>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium mb-2">
                        Optimization Recommendations:
                      </h5>
                      <div className="space-y-3">
                        {pattern.recommendations.map((rec, index) => (
                          <div
                            key={index}
                            className="border rounded p-3 bg-background/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-sm font-medium">
                                {rec.title}
                              </h6>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="text-xs">
                                  {rec.difficulty}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {rec.estimatedEffort}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {rec.description}
                            </p>
                            {rec.codeExample && (
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                <code>{rec.codeExample}</code>
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {pattern.resources.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-2">Resources:</h5>
                        <div className="space-y-2">
                          {pattern.resources.map((resource, index) => (
                            <a
                              key={index}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>{resource.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {resource.type}
                              </Badge>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
