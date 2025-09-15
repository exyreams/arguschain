import React, { useState, useEffect } from "react";
import {
  Button,
  Input,
  Badge,
  Alert,
  Checkbox,
  Label,
} from "@/components/global";
import { Dropdown } from "@/components/global/Dropdown";
import { ethers } from "ethers";
import {
  Plus,
  Trash2,
  Play,
  AlertCircle,
  BarChart3,
  Copy,
  Settings,
} from "lucide-react";
import {
  FUNCTION_SIGNATURES,
  SimulationValidator,
} from "@/lib/transactionsimulation";
import type {
  SimulationParams,
  ValidationResult,
} from "@/lib/transactionsimulation/types";

interface ComparisonVariant {
  id: string;
  name: string;
  parameters: any[];
  enabled: boolean;
}

interface ComparisonConfig {
  functionName: string;
  fromAddress: string;
  network: string;
  variants: ComparisonVariant[];
  gasLimit?: number;
  gasPrice?: number;
}

interface ComparisonInterfaceProps {
  onRunComparison: (
    functionName: string,
    fromAddress: string,
    variants: Array<{ name: string; parameters: any[] }>
  ) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const ComparisonInterface: React.FC<ComparisonInterfaceProps> = ({
  onRunComparison,
  loading = false,
  className = "",
}) => {
  const [config, setConfig] = useState<ComparisonConfig>({
    functionName: "transfer",
    fromAddress: "",
    network: "mainnet",
    variants: [
      {
        id: "1",
        name: "Small Amount",
        parameters: ["", "100"],
        enabled: true,
      },
      {
        id: "2",
        name: "Medium Amount",
        parameters: ["", "1000"],
        enabled: true,
      },
    ],
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  const signature = FUNCTION_SIGNATURES[config.functionName];

  useEffect(() => {
    // Update parameter arrays when function changes
    if (signature) {
      const newVariants = config.variants.map((variant) => {
        const newParams = new Array(signature.paramTypes.length).fill("");
        // Copy existing parameters if they exist
        signature.paramTypes.forEach((_, index) => {
          if (variant.parameters[index] !== undefined) {
            newParams[index] = variant.parameters[index];
          }
        });
        return { ...variant, parameters: newParams };
      });
      setConfig((prev) => ({ ...prev, variants: newVariants }));
    }
  }, [config.functionName, signature]);

  useEffect(() => {
    // Validate configuration
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.functionName) {
      errors.push("Function name is required");
    }

    if (!config.fromAddress) {
      errors.push("From address is required");
    } else {
      try {
        ethers.getAddress(config.fromAddress);
      } catch {
        errors.push("Invalid from address format");
      }
    }

    const enabledVariants = config.variants.filter((v) => v.enabled);
    if (enabledVariants.length < 2) {
      errors.push("At least 2 variants are required for comparison");
    }

    // Validate each variant
    enabledVariants.forEach((variant, index) => {
      if (!variant.name.trim()) {
        errors.push(`Variant ${index + 1} needs a name`);
      }

      if (signature) {
        signature.paramTypes.forEach((paramType, paramIndex) => {
          const param = variant.parameters[paramIndex];
          if (!param || param.toString().trim() === "") {
            if (
              !["totalSupply", "decimals", "name", "symbol", "paused"].includes(
                config.functionName
              )
            ) {
              errors.push(
                `Variant "${variant.name}" is missing parameter ${paramIndex + 1}`
              );
            }
          } else {
            // Validate parameter format
            if (paramType === "address") {
              try {
                ethers.getAddress(param);
              } catch {
                errors.push(
                  `Variant "${variant.name}" has invalid address format for parameter ${paramIndex + 1}`
                );
              }
            }
            if (paramType === "uint256" && isNaN(Number(param))) {
              errors.push(
                `Variant "${variant.name}" has invalid number format for parameter ${paramIndex + 1}`
              );
            }
          }
        });
      }
    });

    if (enabledVariants.length > 10) {
      warnings.push(
        "Comparing more than 10 variants may take longer to process"
      );
    }

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }, [config, signature]);

  const addVariant = () => {
    const newVariant: ComparisonVariant = {
      id: Date.now().toString(),
      name: `Variant ${config.variants.length + 1}`,
      parameters: signature
        ? new Array(signature.paramTypes.length).fill("")
        : [],
      enabled: true,
    };
    setConfig((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
  };

  const removeVariant = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== id),
    }));
  };

  const duplicateVariant = (id: string) => {
    const variant = config.variants.find((v) => v.id === id);
    if (variant) {
      const newVariant: ComparisonVariant = {
        ...variant,
        id: Date.now().toString(),
        name: `${variant.name} (Copy)`,
      };
      setConfig((prev) => ({
        ...prev,
        variants: [...prev.variants, newVariant],
      }));
    }
  };

  const updateVariant = (id: string, updates: Partial<ComparisonVariant>) => {
    setConfig((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    }));
  };

  const updateVariantParameter = (
    id: string,
    paramIndex: number,
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => {
        if (v.id === id) {
          const newParams = [...v.parameters];
          newParams[paramIndex] = value;
          return { ...v, parameters: newParams };
        }
        return v;
      }),
    }));
  };

  const handleRunComparison = async () => {
    if (!validation.isValid) return;

    const enabledVariants = config.variants
      .filter((v) => v.enabled)
      .map((v) => ({
        name: v.name,
        parameters: v.parameters.map((p, index) => {
          if (signature && signature.paramTypes[index] === "uint256") {
            return parseFloat(p) || 0;
          }
          return p;
        }),
      }));

    await onRunComparison(
      config.functionName,
      config.fromAddress,
      enabledVariants
    );
  };

  const getParameterPlaceholder = (
    paramType: string,
    index: number
  ): string => {
    switch (paramType) {
      case "address":
        if (config.functionName === "transfer" && index === 0)
          return "Recipient address (0x...)";
        if (config.functionName === "transferFrom" && index === 0)
          return "From address (0x...)";
        if (config.functionName === "transferFrom" && index === 1)
          return "To address (0x...)";
        if (config.functionName === "approve" && index === 0)
          return "Spender address (0x...)";
        return "Address (0x...)";
      case "uint256":
        if (
          config.functionName.includes("transfer") ||
          config.functionName === "approve"
        ) {
          return "Amount (e.g., 100.5)";
        }
        return "Number";
      default:
        return "Value";
    }
  };

  const getParameterLabel = (paramType: string, index: number): string => {
    switch (paramType) {
      case "address":
        if (config.functionName === "transfer" && index === 0)
          return "To Address";
        if (config.functionName === "transferFrom" && index === 0)
          return "From Address";
        if (config.functionName === "transferFrom" && index === 1)
          return "To Address";
        if (config.functionName === "approve" && index === 0) return "Spender";
        return `Address ${index + 1}`;
      case "uint256":
        if (
          config.functionName.includes("transfer") ||
          config.functionName === "approve"
        ) {
          return "Amount";
        }
        return `Amount ${index + 1}`;
      default:
        return `Parameter ${index + 1}`;
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Parameter Comparison
        </h3>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {config.variants.filter((v) => v.enabled).length} variants
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Base Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-[#8b9dc3] font-medium">
              Function
            </Label>
            <Dropdown
              value={config.functionName}
              onValueChange={(value) =>
                setConfig((prev) => ({ ...prev, functionName: value }))
              }
              placeholder="Select function"
              options={Object.keys(FUNCTION_SIGNATURES).map((name) => ({
                value: name,
                label: `${name}()`,
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-[#8b9dc3] font-medium">
              From Address
            </Label>
            <Input
              placeholder="Sender address (0x...)"
              value={config.fromAddress}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, fromAddress: e.target.value }))
              }
              className="font-mono"
            />
          </div>
        </div>

        {showAdvanced && (
          <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
            <h4 className="text-sm font-medium text-[#00bfff]">
              Advanced Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-[#8b9dc3]">Gas Limit</Label>
                <Input
                  placeholder="Auto estimate"
                  type="number"
                  value={config.gasLimit || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      gasLimit: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#8b9dc3]">
                  Gas Price (Gwei)
                </Label>
                <Input
                  placeholder="Current network price"
                  type="number"
                  value={config.gasPrice || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      gasPrice: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Variants Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Comparison Variants
            </h4>
            <Button
              onClick={addVariant}
              size="sm"
              className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium transition-all duration-200 hover:shadow-[0_0_8px_rgba(0,191,255,0.3)]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </div>

          <div className="space-y-3">
            {config.variants.map((variant, variantIndex) => (
              <div
                key={variant.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  variant.enabled
                    ? "border-[rgba(0,191,255,0.3)] bg-bg-dark-primary shadow-sm"
                    : "border-[rgba(139,157,195,0.3)] bg-bg-dark-primary/70"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`variant-${variant.id}`}
                        checked={variant.enabled}
                        onCheckedChange={(checked) =>
                          updateVariant(variant.id, { enabled: !!checked })
                        }
                        className="border-[rgba(0,191,255,0.3)] data-[state=checked]:bg-[#00bfff] data-[state=checked]:border-[#00bfff]"
                      />
                      <Label
                        htmlFor={`variant-${variant.id}`}
                        className="text-sm text-[#8b9dc3] cursor-pointer"
                      >
                        Enable
                      </Label>
                    </div>
                    <Input
                      value={variant.name}
                      onChange={(e) =>
                        updateVariant(variant.id, { name: e.target.value })
                      }
                      className="w-48 bg-[rgba(15,20,25,0.5)] border-[rgba(0,191,255,0.2)]"
                      placeholder="Variant name"
                    />
                    <Badge
                      variant="outline"
                      className={`${
                        variant.enabled
                          ? "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                          : "border-[rgba(139,157,195,0.3)] text-[#8b9dc3] bg-[rgba(139,157,195,0.1)]"
                      }`}
                    >
                      #{variantIndex + 1}
                      {!variant.enabled && (
                        <span className="ml-1 text-xs opacity-75">
                          (disabled)
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateVariant(variant.id)}
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff] transition-colors"
                      title="Duplicate variant"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeVariant(variant.id)}
                      disabled={config.variants.length <= 2}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={
                        config.variants.length <= 2
                          ? "Minimum 2 variants required"
                          : "Remove variant"
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {signature && signature.paramTypes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {signature.paramTypes.map((paramType, paramIndex) => (
                      <div key={paramIndex} className="space-y-2">
                        <Label className="text-xs text-[#6b7280] font-medium">
                          {getParameterLabel(paramType, paramIndex)}
                          <span className="text-[#8b9dc3] ml-1">
                            ({paramType})
                          </span>
                        </Label>
                        <Input
                          placeholder={getParameterPlaceholder(
                            paramType,
                            paramIndex
                          )}
                          value={variant.parameters[paramIndex] || ""}
                          onChange={(e) =>
                            updateVariantParameter(
                              variant.id,
                              paramIndex,
                              e.target.value
                            )
                          }
                          className={`${
                            paramType === "address" ? "font-mono" : ""
                          } bg-[rgba(15,20,25,0.5)] border-[rgba(0,191,255,0.2)] ${
                            !variant.enabled ? "opacity-50" : ""
                          }`}
                          disabled={!variant.enabled}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <Alert
            variant="destructive"
            className="bg-red-500/10 border-red-500/50 text-red-400"
          >
            <div>
              <div className="font-medium">Configuration Errors:</div>
              <ul className="mt-1 text-sm list-disc list-inside">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </Alert>
        )}

        {validation.warnings.length > 0 && (
          <Alert className="bg-yellow-500/10 border-yellow-500/50 text-yellow-400">
            <AlertCircle className="h-4 w-4" />
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

        {/* Run Comparison Button */}
        <Button
          onClick={handleRunComparison}
          disabled={!validation.isValid || loading}
          className="w-full bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium py-3 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#0f1419] border-t-transparent rounded-full animate-spin mr-2" />
              Running Comparison...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Comparison ({
                config.variants.filter((v) => v.enabled).length
              }{" "}
              variants)
            </>
          )}
        </Button>

        {signature && (
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
            <div className="text-sm text-[#8b9dc3]">
              <div className="font-medium text-[#00bfff] mb-2">
                Function Signature:
              </div>
              <code className="text-xs font-mono bg-[rgba(0,191,255,0.1)] px-2 py-1 rounded">
                {signature.name}
              </code>
              <div className="mt-3 text-xs">
                This comparison will simulate the {config.functionName} function
                with {config.variants.filter((v) => v.enabled).length} different
                parameter sets to analyze gas usage and efficiency differences.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
