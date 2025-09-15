import React, { useEffect, useState } from "react";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Dropdown } from "@/components/global/Dropdown";
import { Alert } from "@/components/global/Alert";
import { Badge } from "@/components/global/Badge";
import { Loader } from "@/components/global/Loader";
import { AlertCircle, Play, Settings, Zap } from "lucide-react";
import {
  FUNCTION_SIGNATURES,
  SimulationValidator,
} from "@/lib/transactionsimulation";
import type {
  SimulationParams,
  SimulationResult,
  ValidationResult,
} from "@/lib/transactionsimulation/types";

interface SimulationInterfaceProps {
  onSimulate: (params: SimulationParams) => Promise<SimulationResult>;
  loading?: boolean;
  className?: string;
}

export const SimulationInterface: React.FC<SimulationInterfaceProps> = ({
  onSimulate,
  loading = false,
  className = "",
}) => {
  const [functionName, setFunctionName] = useState<string>("transfer");
  const [fromAddress, setFromAddress] = useState<string>("");
  const [parameters, setParameters] = useState<string[]>(["", ""]);
  const [network, setNetwork] = useState<string>("mainnet");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [gasLimit, setGasLimit] = useState<string>("");
  const [gasPrice, setGasPrice] = useState<string>("");
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  useEffect(() => {
    const signature = FUNCTION_SIGNATURES[functionName];
    if (signature) {
      const newParams = new Array(signature.paramTypes.length).fill("");
      setParameters(newParams);
    }
  }, [functionName]);

  useEffect(() => {
    const params: SimulationParams = {
      functionName,
      fromAddress,
      parameters: parameters.map((p) => p.trim()).filter((p) => p !== ""),
      network,
      ...(gasLimit && { gasLimit: parseInt(gasLimit) }),
      ...(gasPrice && { gasPrice: parseInt(gasPrice) }),
    };

    const validationResult =
      SimulationValidator.validateSimulationParams(params);
    setValidation(validationResult);
  }, [functionName, fromAddress, parameters, network, gasLimit, gasPrice]);

  const handleParameterChange = (index: number, value: string) => {
    const newParams = [...parameters];
    newParams[index] = value;
    setParameters(newParams);
  };

  const handleSimulate = async () => {
    if (!validation.isValid) return;

    const params: SimulationParams = {
      functionName,
      fromAddress,
      parameters: parameters
        .map((p) => {
          const trimmed = p.trim();

          if (functionName && FUNCTION_SIGNATURES[functionName]) {
            const signature = FUNCTION_SIGNATURES[functionName];
            const paramIndex = parameters.indexOf(p);
            if (signature.paramTypes[paramIndex] === "uint256") {
              return parseFloat(trimmed) || 0;
            }
          }
          return trimmed;
        })
        .filter((p) => p !== ""),
      network,
      ...(gasLimit && { gasLimit: parseInt(gasLimit) }),
      ...(gasPrice && { gasPrice: parseInt(gasPrice) }),
    };

    await onSimulate(params);
  };

  const getParameterPlaceholder = (
    paramType: string,
    index: number
  ): string => {
    switch (paramType) {
      case "address":
        if (functionName === "transfer" && index === 0)
          return "Recipient address (0x...)";
        if (functionName === "transferFrom" && index === 0)
          return "From address (0x...)";
        if (functionName === "transferFrom" && index === 1)
          return "To address (0x...)";
        if (functionName === "approve" && index === 0)
          return "Spender address (0x...)";
        if (functionName === "balanceOf" && index === 0)
          return "Account address (0x...)";
        if (functionName === "allowance" && index === 0)
          return "Owner address (0x...)";
        if (functionName === "allowance" && index === 1)
          return "Spender address (0x...)";
        return "Address (0x...)";
      case "uint256":
        if (
          functionName.includes("transfer") ||
          functionName === "approve" ||
          functionName === "mint" ||
          functionName === "burn"
        ) {
          return "Amount (e.g., 100.5)";
        }
        return "Number";
      case "bool":
        return "true or false";
      case "bytes32":
        return "Hex string (0x...)";
      default:
        return "Value";
    }
  };

  const getParameterLabel = (paramType: string, index: number): string => {
    switch (paramType) {
      case "address":
        if (functionName === "transfer" && index === 0) return "To Address";
        if (functionName === "transferFrom" && index === 0)
          return "From Address";
        if (functionName === "transferFrom" && index === 1) return "To Address";
        if (functionName === "approve" && index === 0) return "Spender";
        if (functionName === "balanceOf" && index === 0) return "Account";
        if (functionName === "allowance" && index === 0) return "Owner";
        if (functionName === "allowance" && index === 1) return "Spender";
        return `Address ${index + 1}`;
      case "uint256":
        if (
          functionName.includes("transfer") ||
          functionName === "approve" ||
          functionName === "mint" ||
          functionName === "burn"
        ) {
          return "Amount";
        }
        return `Amount ${index + 1}`;
      default:
        return `Parameter ${index + 1}`;
    }
  };

  const signature = FUNCTION_SIGNATURES[functionName];

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
          Transaction Simulation
        </h2>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            PYUSD
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff]"
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Dropdown
            title="Function"
            value={functionName}
            onValueChange={setFunctionName}
            placeholder="Select function"
            options={Object.keys(FUNCTION_SIGNATURES).map((name) => ({
              value: name,
              label: `${name}()`,
            }))}
          />

          <Dropdown
            title="Network"
            value={network}
            onValueChange={setNetwork}
            placeholder="Select network"
            options={[
              { value: "mainnet", label: "Ethereum Mainnet" },
              { value: "sepolia", label: "Sepolia Testnet" },
            ]}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#8b9dc3] font-medium">
            From Address
          </label>
          <Input
            placeholder="Sender address (0x...)"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            className="font-mono"
          />
        </div>

        {signature && signature.paramTypes.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm text-[#8b9dc3] font-medium">
              Parameters
            </label>
            {signature.paramTypes.map((paramType, index) => (
              <div key={index} className="space-y-1">
                <label className="text-xs text-[#6b7280]">
                  {getParameterLabel(paramType, index)} ({paramType})
                </label>
                <Input
                  placeholder={getParameterPlaceholder(paramType, index)}
                  value={parameters[index] || ""}
                  onChange={(e) => handleParameterChange(index, e.target.value)}
                  className={paramType === "address" ? "font-mono" : ""}
                />
              </div>
            ))}
          </div>
        )}

        {showAdvanced && (
          <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
            <h3 className="text-sm font-medium text-[#00bfff]">
              Advanced Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-[#8b9dc3]">Gas Limit</label>
                <Input
                  placeholder="Auto estimate"
                  value={gasLimit}
                  onChange={(e) => setGasLimit(e.target.value)}
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#8b9dc3]">
                  Gas Price (Gwei)
                </label>
                <Input
                  placeholder="Current network price"
                  value={gasPrice}
                  onChange={(e) => setGasPrice(e.target.value)}
                  type="number"
                />
              </div>
            </div>
          </div>
        )}

        {validation.errors.length > 0 && (
          <Alert
            variant="destructive"
            className="bg-red-500/10 border-red-500/50 text-red-400"
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

        <Button
          onClick={handleSimulate}
          disabled={!validation.isValid || loading}
          className="w-full bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium py-3 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 mr-2" />
              Simulating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Simulate Transaction
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
                {getFunctionDescription(functionName)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getFunctionDescription(functionName: string): string {
  const descriptions: Record<string, string> = {
    transfer:
      "Transfer tokens from your account to another address. Requires sufficient balance.",
    transferFrom:
      "Transfer tokens from one address to another using an allowance. Requires sufficient allowance and balance.",
    approve:
      "Approve another address to spend tokens on your behalf. Sets the allowance amount.",
    balanceOf:
      "Query the token balance of an address. This is a read-only operation.",
    allowance:
      "Query the amount of tokens that an owner has approved for a spender. Read-only operation.",
    totalSupply:
      "Query the total supply of tokens in circulation. Read-only operation.",
    decimals:
      "Query the number of decimal places used by the token. Read-only operation.",
    name: "Query the name of the token. Read-only operation.",
    symbol: "Query the symbol of the token. Read-only operation.",
    mint: "Create new tokens and assign them to an address. Requires minter privileges.",
    burn: "Destroy tokens from your account, reducing the total supply. Requires sufficient balance.",
    burnFrom:
      "Destroy tokens from another account using an allowance. Requires sufficient allowance and balance.",
    increaseAllowance:
      "Increase the allowance for a spender by a specific amount.",
    decreaseAllowance:
      "Decrease the allowance for a spender by a specific amount.",
    pause: "Pause all token transfers. Requires admin privileges.",
    unpause:
      "Resume token transfers after being paused. Requires admin privileges.",
    paused: "Check if the contract is currently paused. Read-only operation.",
  };

  return (
    descriptions[functionName] ||
    "Execute the specified function with the provided parameters."
  );
}
