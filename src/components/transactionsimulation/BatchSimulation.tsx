import React, { useMemo, useState } from "react";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Dropdown } from "@/components/global/Dropdown";
import { Badge } from "@/components/global/Badge";
import { Alert } from "@/components/global/Alert";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Eye,
  EyeOff,
  Package,
  Play,
  Plus,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  FUNCTION_SIGNATURES,
  SimulationUtils,
  SimulationValidator,
} from "@/lib/transactionsimulation";
import { BatchAnalyticsChart, TransactionFlowChart } from "./charts";
import type {
  BatchGasChartData,
  BatchOperation,
  BatchResult,
  TransactionFlowData,
} from "@/lib/transactionsimulation/types";

interface BatchSimulationProps {
  onSimulate: (operations: BatchOperation[]) => Promise<BatchResult>;
  loading?: boolean;
  className?: string;
}

export const BatchSimulation: React.FC<BatchSimulationProps> = ({
  onSimulate,
  loading = false,
  className = "",
}) => {
  const [operations, setOperations] = useState<BatchOperation[]>([
    { functionName: "transfer", parameters: ["", ""] },
  ]);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  React.useEffect(() => {
    const validationResult =
      SimulationValidator.validateBatchOperations(operations);
    setValidation(validationResult);
  }, [operations]);

  const addOperation = () => {
    setOperations([
      ...operations,
      { functionName: "transfer", parameters: ["", ""] },
    ]);
  };

  const removeOperation = (index: number) => {
    if (operations.length > 1) {
      setOperations(operations.filter((_, i) => i !== index));
    }
  };

  const updateOperation = (
    index: number,
    field: keyof BatchOperation,
    value: any
  ) => {
    const newOperations = [...operations];
    if (field === "functionName") {
      const signature = FUNCTION_SIGNATURES[value];
      newOperations[index] = {
        functionName: value,
        parameters: signature
          ? new Array(signature.paramTypes.length).fill("")
          : [],
      };
    } else {
      newOperations[index] = { ...newOperations[index], [field]: value };
    }
    setOperations(newOperations);
  };

  const updateParameter = (
    opIndex: number,
    paramIndex: number,
    value: string
  ) => {
    const newOperations = [...operations];
    const newParams = [...newOperations[opIndex].parameters];
    newParams[paramIndex] = value;
    newOperations[opIndex] = {
      ...newOperations[opIndex],
      parameters: newParams,
    };
    setOperations(newOperations);
  };

  const handleSimulate = async () => {
    if (!validation.isValid) return;

    const processedOperations = operations.map((op) => ({
      ...op,
      parameters: op.parameters
        .map((param, index) => {
          const trimmed = param.trim();
          if (!trimmed) return trimmed;

          const signature = FUNCTION_SIGNATURES[op.functionName];
          if (signature && signature.paramTypes[index] === "uint256") {
            return parseFloat(trimmed) || 0;
          }
          return trimmed;
        })
        .filter((p) => p !== ""),
    }));

    await onSimulate(processedOperations);
  };

  const getParameterPlaceholder = (
    functionName: string,
    paramType: string,
    index: number
  ): string => {
    switch (paramType) {
      case "address":
        if (functionName === "transfer" && index === 0)
          return "Recipient (0x...)";
        if (functionName === "transferFrom" && index === 0)
          return "From (0x...)";
        if (functionName === "transferFrom" && index === 1) return "To (0x...)";
        if (functionName === "approve" && index === 0) return "Spender (0x...)";
        return "Address (0x...)";
      case "uint256":
        return "Amount";
      default:
        return "Value";
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-[#00bfff]">
            Batch Simulation
          </h3>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {operations.length} operation{operations.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={addOperation}
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Operation
        </Button>
      </div>

      <div className="space-y-4 mb-6">
        {operations.map((operation, opIndex) => {
          const signature = FUNCTION_SIGNATURES[operation.functionName];

          return (
            <div
              key={opIndex}
              className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                  >
                    #{opIndex + 1}
                  </Badge>
                  <span className="text-[#8b9dc3] text-sm">Operation</span>
                </div>

                {operations.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeOperation(opIndex)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <Dropdown
                  title="Function"
                  value={operation.functionName}
                  onValueChange={(value) =>
                    updateOperation(opIndex, "functionName", value)
                  }
                  placeholder="Select function"
                  options={Object.keys(FUNCTION_SIGNATURES).map((name) => ({
                    value: name,
                    label: `${name}()`,
                  }))}
                />

                {signature && signature.paramTypes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Parameters
                    </label>
                    {signature.paramTypes.map((paramType, paramIndex) => (
                      <div key={paramIndex} className="space-y-1">
                        <label className="text-xs text-[#6b7280]">
                          Parameter {paramIndex + 1} ({paramType})
                        </label>
                        <Input
                          placeholder={getParameterPlaceholder(
                            operation.functionName,
                            paramType,
                            paramIndex
                          )}
                          value={operation.parameters[paramIndex] || ""}
                          onChange={(e) =>
                            updateParameter(opIndex, paramIndex, e.target.value)
                          }
                          className={paramType === "address" ? "font-mono" : ""}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {validation.errors.length > 0 && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-500/10 border-red-500/50 text-red-400"
        >
          <div>
            <div className="font-medium">Validation Errors:</div>
            <ul className="mt-1 text-sm list-disc list-inside">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert
          variant="warning"
          className="mb-4 bg-yellow-500/10 border-yellow-500/50 text-yellow-400"
        >
          <div>
            <div className="font-medium">Warnings:</div>
            <ul className="mt-1 text-sm list-disc list-inside">
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      <Button
        onClick={handleSimulate}
        disabled={!validation.isValid || loading || operations.length === 0}
        className="w-full bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium py-3 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0f1419] mr-2"></div>
            Simulating Batch...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Simulate Batch ({operations.length} operations)
          </>
        )}
      </Button>

      <div className="mt-4 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
        <div className="text-sm text-[#8b9dc3]">
          <div className="font-medium text-[#00bfff] mb-2">
            Batch Information:
          </div>
          <ul className="space-y-1 text-xs">
            <li>• Operations will be simulated in sequence</li>
            <li>• Each operation uses the same sender address</li>
            <li>• Failed operations will stop the batch simulation</li>
            <li>• Gas costs are estimated individually and summed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

interface BatchResultsProps {
  result: BatchResult;
  analysis?: any;
  onExport?: (format: "json" | "csv") => void;
  showChart?: boolean;
  className?: string;
}

export const BatchResults: React.FC<BatchResultsProps> = ({
  result,
  analysis,
  onExport,
  showChart = true,
  className = "",
}) => {
  const [showVisualization, setShowVisualization] = useState(showChart);

  const chartData = useMemo((): BatchGasChartData => {
    if (analysis?.chartData) {
      return analysis.chartData;
    }

    return {
      data: result.operations.map((op, index) => ({
        operation: `${op.functionName} ${index + 1}`,
        gasUsed: op.gasUsed,
        cumulativeGas: result.operations
          .slice(0, index + 1)
          .reduce((sum, o) => sum + o.gasUsed, 0),
        success: op.success,
        operationType: op.operationCategory || "Unknown",
        timestamp: Date.now() + index * 1000,
        efficiency: op.success ? Math.max(0, 100 - op.gasUsed / 1000) : 0,
      })),
      summary: {
        totalGas: result.totalGas,
        averageGas:
          result.operations.length > 0
            ? result.totalGas / result.operations.length
            : 0,
        successRate: result.successRate / 100,
        totalOperations: result.operations.length,
        failedOperations:
          result.operations.length - result.successfulOperations,
      },
    };
  }, [result, analysis]);

  const flowData = useMemo((): TransactionFlowData | null => {
    if (analysis?.flowData) {
      return analysis.flowData;
    }

    const successfulOps = result.operations.filter(
      (op) => op.success && op.stateChanges?.length > 0
    );
    if (successfulOps.length === 0) return null;

    const nodes = new Map<string, any>();
    const links: any[] = [];

    successfulOps.forEach((op, index) => {
      op.stateChanges?.forEach((change) => {
        if (change.type === "transfer" && change.from && change.to) {
          if (!nodes.has(change.from)) {
            nodes.set(change.from, {
              id: change.from,
              name: SimulationUtils.shortenAddress(change.from),
              address: change.from,
              nodeType: "sender",
              label: `Sender ${nodes.size + 1}`,
            });
          }
          if (!nodes.has(change.to)) {
            nodes.set(change.to, {
              id: change.to,
              name: SimulationUtils.shortenAddress(change.to),
              address: change.to,
              nodeType: "receiver",
              label: `Receiver ${nodes.size + 1}`,
            });
          }

          links.push({
            source: change.from,
            target: change.to,
            value: change.amount || 0,
            label: `${change.amount || 0} PYUSD`,
            type: change.type,
          });
        }
      });
    });

    if (nodes.size === 0) return null;

    return {
      nodes: Array.from(nodes.values()),
      links,
      layout: "horizontal",
      colors: {
        sender: "#ef4444",
        receiver: "#10b981",
        contract: "#00bfff",
      },
    };
  }, [result, analysis]);

  const getStatusIcon = (success: boolean, hypotheticalSuccess: boolean) => {
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    } else if (hypotheticalSuccess) {
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-400" />;
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge
            variant={result.batchSuccess ? "default" : "destructive"}
            className={
              result.batchSuccess
                ? "bg-green-500/20 border-green-500/50 text-green-400"
                : "bg-red-500/20 border-red-500/50 text-red-400"
            }
          >
            {result.batchSuccess ? "Success" : "Failed"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVisualization(!showVisualization)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {showVisualization ? (
              <EyeOff className="h-4 w-4 mr-1" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            Charts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {result.operations.length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Operations</div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {result.successfulOperations}
          </div>
          <div className="text-sm text-[#8b9dc3]">Successful</div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {result.successRate.toFixed(1)}%
          </div>
          <div className="text-sm text-[#8b9dc3]">Success Rate</div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {SimulationUtils.formatGas(result.totalGas)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
        </div>
      </div>

      {showVisualization && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-3 flex items-center gap-2">
            Batch Analytics
          </h4>
          <BatchAnalyticsChart data={chartData} height={350} />
        </div>
      )}

      {showVisualization && flowData && (
        <div className="mb-6">
          <TransactionFlowChart data={flowData} height={300} />
        </div>
      )}

      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-3">
            Optimization Recommendations
          </h4>
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <ul className="space-y-2 text-sm text-[#8b9dc3]">
              {analysis.recommendations.map(
                (recommendation: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-[#00bfff] mt-0.5 flex-shrink-0" />
                    <span>{recommendation}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-[#00bfff] flex items-center gap-2">
          Operation Results
        </h4>

        {result.operations.map((operation, index) => (
          <div
            key={index}
            className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(
                  operation.success,
                  operation.hypotheticalSuccess
                )}
                <Badge
                  variant="outline"
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                >
                  #{index + 1}
                </Badge>
                <span className="text-accent-primary font-mono">
                  {operation.functionName}()
                </span>
              </div>

              <div className="text-right">
                <div className="text-accent-primary font-mono">
                  {SimulationUtils.formatGas(operation.gasUsed)}
                </div>
                <div className="text-xs text-[#8b9dc3]">gas used</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[#8b9dc3] mb-1">Parameters:</div>
                <div className="text-accent-primary font-mono">
                  {operation.parameters
                    .map((param, i) => {
                      if (
                        typeof param === "string" &&
                        param.startsWith("0x") &&
                        param.length === 42
                      ) {
                        return SimulationUtils.shortenAddress(param);
                      }
                      if (typeof param === "number" && param > 1000) {
                        return SimulationUtils.formatTokenAmount(param);
                      }
                      return String(param);
                    })
                    .join(", ") || "None"}
                </div>
              </div>

              <div>
                <div className="text-[#8b9dc3] mb-1">Status:</div>
                <div
                  className={
                    operation.success
                      ? "text-green-400"
                      : operation.hypotheticalSuccess
                        ? "text-yellow-400"
                        : "text-red-400"
                  }
                >
                  {operation.success
                    ? "Success"
                    : operation.hypotheticalSuccess
                      ? "Hypothetical Success"
                      : "Failed"}
                </div>
              </div>
            </div>

            {operation.error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <div className="text-red-400 text-sm">{operation.error}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
