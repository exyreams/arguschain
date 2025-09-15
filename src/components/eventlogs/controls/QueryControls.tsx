import { useEffect, useState } from "react";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";

import { Dropdown } from "@/components/global/Dropdown";
import type { LogsQueryConfig } from "@/lib/eventlogs";
import { BLOCK_PATTERNS, PYUSD_CONFIG } from "@/lib/eventlogs";
import { Tooltip } from "@/components/global/Tooltip";
import {
  AlertCircle,
  HelpCircle,
  Network,
  Search,
  Settings,
} from "lucide-react";
import { BookmarkManager } from "@/components/eventlogs";
import { toast } from "@/hooks/global/useToast";
import { useBlockchainStatus } from "@/hooks/blockchain";

interface QueryControlsProps {
  onAnalyze: (config: LogsQueryConfig) => void;
  loading?: boolean;
  networks: Array<{ value: string; label: string }>;
  currentNetwork: "mainnet" | "sepolia";
  onNetworkChange: (network: "mainnet" | "sepolia") => void;
  // BookmarkManager props
  queryParams?: LogsQueryConfig;
  analysisResults?: {
    total_transfers?: number;
    total_volume?: number;
    unique_senders?: number;
    unique_receivers?: number;
  };
  onLoadBookmark?: (bookmark: any) => void;
  onSignUpClick?: () => void;
  className?: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

interface FormState {
  fromBlock: string;
  toBlock: string;
  contractAddress: string;
  analysisDepth: "basic" | "full" | "advanced";
  includeTimestamps: boolean;
  customRpcUrl: string;
  maxResults: number;
}

export function QueryControls({
  onAnalyze,
  loading = false,
  currentNetwork,
  onNetworkChange,
  queryParams,
  analysisResults,
  onLoadBookmark,
  onSignUpClick,
  className = "",
}: QueryControlsProps) {
  const [formState, setFormState] = useState<FormState>({
    fromBlock: "",
    toBlock: "",
    contractAddress: PYUSD_CONFIG.ethereum.address,
    analysisDepth: "full",
    includeTimestamps: true,
    customRpcUrl: "",
    maxResults: 1000,
  });

  const [validation, setValidation] = useState<{
    fromBlock: ValidationResult;
    toBlock: ValidationResult;
    blockRange: ValidationResult;
    contractAddress: ValidationResult;
    overall: ValidationResult;
  }>({
    fromBlock: { isValid: true },
    toBlock: { isValid: true },
    blockRange: { isValid: true },
    contractAddress: { isValid: true },
    overall: { isValid: true },
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fieldInteractions, setFieldInteractions] = useState<{
    fromBlock: boolean;
    toBlock: boolean;
    contractAddress: boolean;
  }>({
    fromBlock: false,
    toBlock: false,
    contractAddress: false,
  });

  // Get current block number from the blockchain status hook
  const { currentBlock, isLoading: blockchainLoading } = useBlockchainStatus();

  const validateBlockIdentifier = (
    blockId: string,
    hasInteracted: boolean = false
  ): ValidationResult => {
    if (!blockId || blockId.trim() === "") {
      return hasInteracted
        ? { isValid: false, error: "Block identifier is required" }
        : { isValid: true };
    }

    const trimmed = blockId.trim();

    if (BLOCK_PATTERNS.tags.includes(trimmed as any)) {
      return { isValid: true };
    }

    if (BLOCK_PATTERNS.hex.test(trimmed)) {
      const numValue = parseInt(trimmed, 16);
      if (numValue < 0) {
        return { isValid: false, error: "Block number cannot be negative" };
      }
      return { isValid: true };
    }

    if (BLOCK_PATTERNS.decimal.test(trimmed)) {
      const numValue = parseInt(trimmed, 10);
      if (numValue < 0) {
        return { isValid: false, error: "Block number cannot be negative" };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error:
        "Invalid format. Use decimal, hex (0x...), or tag (latest, pending, etc.)",
    };
  };

  const validateBlockRange = (
    fromBlock: string,
    toBlock: string
  ): ValidationResult => {
    const fromValidation = validateBlockIdentifier(fromBlock);
    if (!fromValidation.isValid) {
      return { isValid: false, error: `From block: ${fromValidation.error}` };
    }

    const toValidation = validateBlockIdentifier(toBlock);
    if (!toValidation.isValid) {
      return { isValid: false, error: `To block: ${toValidation.error}` };
    }

    const warnings: string[] = [];

    try {
      let fromNum: number | null = null;
      let toNum: number | null = null;

      if (fromBlock.startsWith("0x")) {
        fromNum = parseInt(fromBlock, 16);
      } else if (BLOCK_PATTERNS.decimal.test(fromBlock)) {
        fromNum = parseInt(fromBlock, 10);
      }

      if (toBlock.startsWith("0x")) {
        toNum = parseInt(toBlock, 16);
      } else if (BLOCK_PATTERNS.decimal.test(toBlock)) {
        toNum = parseInt(toBlock, 10);
      }

      if (fromNum !== null && toNum !== null) {
        if (fromNum > toNum) {
          return {
            isValid: false,
            error: "From block cannot be greater than to block",
          };
        }

        const range = toNum - fromNum + 1;
        if (range > 5) {
          return {
            isValid: false,
            error: `Range ${range} exceeds Google RPC limit of 5 blocks`,
          };
        }

        if (range > 3) {
          warnings.push(
            "Large block range may result in slow query performance"
          );
        }
      }
    } catch (error) {
      warnings.push("Could not validate range - will be checked by API");
    }

    return { isValid: true, warnings };
  };

  const validateContractAddress = (address: string): ValidationResult => {
    if (!address || address.trim() === "") {
      return { isValid: false, error: "Contract address is required" };
    }

    const trimmed = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return { isValid: false, error: "Invalid Ethereum address format" };
    }

    return { isValid: true };
  };

  useEffect(() => {
    const fromBlockValidation = validateBlockIdentifier(
      formState.fromBlock,
      fieldInteractions.fromBlock
    );
    const toBlockValidation = validateBlockIdentifier(
      formState.toBlock,
      fieldInteractions.toBlock
    );
    const blockRangeValidation = validateBlockRange(
      formState.fromBlock,
      formState.toBlock
    );
    const contractValidation = validateContractAddress(
      formState.contractAddress
    );

    const overallValid =
      fromBlockValidation.isValid &&
      toBlockValidation.isValid &&
      blockRangeValidation.isValid &&
      contractValidation.isValid;

    setValidation({
      fromBlock: fromBlockValidation,
      toBlock: toBlockValidation,
      blockRange: blockRangeValidation,
      contractAddress: contractValidation,
      overall: { isValid: overallValid },
    });
  }, [formState, fieldInteractions]);

  const handleSubmit = () => {
    // Force validation for all fields when submit is clicked
    setFieldInteractions({
      fromBlock: true,
      toBlock: true,
      contractAddress: true,
    });

    // Re-validate all fields with forced interaction
    const fromBlockValidation = validateBlockIdentifier(
      formState.fromBlock,
      true
    );
    const toBlockValidation = validateBlockIdentifier(formState.toBlock, true);
    const blockRangeValidation = validateBlockRange(
      formState.fromBlock,
      formState.toBlock
    );
    const contractValidation = validateContractAddress(
      formState.contractAddress
    );

    const overallValid =
      fromBlockValidation.isValid &&
      toBlockValidation.isValid &&
      blockRangeValidation.isValid &&
      contractValidation.isValid;

    // Update validation state to show errors
    setValidation({
      fromBlock: fromBlockValidation,
      toBlock: toBlockValidation,
      blockRange: blockRangeValidation,
      contractAddress: contractValidation,
      overall: { isValid: overallValid },
    });

    // Only proceed if validation passes
    if (!overallValid) return;

    const config: LogsQueryConfig = {
      from_block: formState.fromBlock.trim(),
      to_block: formState.toBlock.trim(),
      network: currentNetwork,
      contract_address: formState.contractAddress.trim(),
      analysis_depth: formState.analysisDepth,
      include_timestamps: formState.includeTimestamps,
      max_results: formState.maxResults,
    };

    onAnalyze(config);
  };

  const handleQuickRange = (range: "latest" | "recent-5" | "recent-10") => {
    // Check if we have a valid current block number
    if (!currentBlock || currentBlock === 0) {
      toast.error("Block Number Not Available", {
        description:
          "Waiting for blockchain connection. Please try again in a moment.",
        duration: 4000,
      });
      return;
    }

    const latestBlockNumber = currentBlock;

    switch (range) {
      case "latest":
        setFormState((prev) => ({
          ...prev,
          fromBlock: latestBlockNumber.toString(),
          toBlock: latestBlockNumber.toString(),
        }));
        toast.success("Block Range Updated", {
          description: `Set to latest block: ${latestBlockNumber.toLocaleString()}`,
          duration: 3000,
        });
        break;
      case "recent-5":
        const fromBlock5 = Math.max(0, latestBlockNumber - 4);
        setFormState((prev) => ({
          ...prev,
          fromBlock: fromBlock5.toString(),
          toBlock: latestBlockNumber.toString(),
        }));
        toast.success("Block Range Updated", {
          description: `Set to blocks ${fromBlock5.toLocaleString()} - ${latestBlockNumber.toLocaleString()} (5 blocks)`,
          duration: 3000,
        });
        break;
      case "recent-10":
        const fromBlock10 = Math.max(0, latestBlockNumber - 9);
        setFormState((prev) => ({
          ...prev,
          fromBlock: fromBlock10.toString(),
          toBlock: latestBlockNumber.toString(),
        }));
        toast.success("Block Range Updated", {
          description: `Set to blocks ${fromBlock10.toLocaleString()} - ${latestBlockNumber.toLocaleString()} (10 blocks)`,
          duration: 3000,
        });
        break;
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
          Query Configuration
        </h2>
        <div className="flex items-center gap-3">
          <BookmarkManager
            queryParams={queryParams}
            analysisResults={analysisResults}
            onLoadBookmark={onLoadBookmark}
            onSignUpClick={onSignUpClick}
          />
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
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#00bfff] flex items-center gap-2">
            Block Range
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b9dc3] font-medium">
                  From Block
                </label>
                <Tooltip
                  content="Starting block number for the analysis."
                  delayShow={200}
                  offset={15}
                  placement={"right"}
                >
                  <HelpCircle className="h-3 w-3 text-[#6b7280] hover:text-[#00bfff] cursor-help" />
                </Tooltip>
              </div>
              <Input
                placeholder="Block number, hex, or 'latest'"
                value={formState.fromBlock}
                onChange={(e) => {
                  setFormState((prev) => ({
                    ...prev,
                    fromBlock: e.target.value,
                  }));
                  setFieldInteractions((prev) => ({
                    ...prev,
                    fromBlock: true,
                  }));
                }}
                className={`font-mono ${
                  !validation.fromBlock.isValid
                    ? "border-red-500 focus-visible:ring-red-500"
                    : validation.fromBlock.isValid && formState.fromBlock
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                }`}
              />
              {validation.fromBlock.error && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{validation.fromBlock.error}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b9dc3] font-medium">
                  To Block
                </label>
                <Tooltip
                  content="Ending block number for the analysis."
                  delayShow={200}
                  offset={15}
                  placement={"right"}
                >
                  <HelpCircle className="h-3 w-3 text-[#6b7280] hover:text-[#00bfff] cursor-help" />
                </Tooltip>
              </div>
              <Input
                placeholder="Block number, hex, or 'latest'"
                value={formState.toBlock}
                onChange={(e) => {
                  setFormState((prev) => ({
                    ...prev,
                    toBlock: e.target.value,
                  }));
                  setFieldInteractions((prev) => ({
                    ...prev,
                    toBlock: true,
                  }));
                }}
                className={`font-mono ${
                  !validation.toBlock.isValid
                    ? "border-red-500 focus-visible:ring-red-500"
                    : validation.toBlock.isValid && formState.toBlock
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                }`}
              />
              {validation.toBlock.error && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{validation.toBlock.error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#8b9dc3] mr-2">Quick ranges:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange("latest")}
              disabled={blockchainLoading || !currentBlock}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-50"
            >
              {blockchainLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-[#00bfff] border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : (
                `Latest Block${currentBlock ? ` (#${currentBlock.toLocaleString()})` : ""}`
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickRange("recent-5")}
              disabled={blockchainLoading || !currentBlock}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-50"
            >
              {blockchainLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-[#00bfff] border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : (
                "Recent 5 Blocks"
              )}
            </Button>
            <span className="text-xs text-[#6b7280] ml-4 px-2 py-1 bg-[rgba(15,20,25,0.8)] rounded">
              Uses live block data from {currentNetwork}
              {currentBlock
                ? ` (Current: #${currentBlock.toLocaleString()})`
                : ""}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#00bfff] flex items-center gap-2">
            Network & Contract
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-[#8b9dc3] font-medium">
                Network
              </label>
              <div className="flex gap-2">
                <Button
                  variant={currentNetwork === "mainnet" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    onNetworkChange("mainnet");
                  }}
                  className={
                    currentNetwork === "mainnet"
                      ? "bg-[#00bfff] text-[#0f1419]"
                      : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  }
                >
                  <Network className="h-3 w-3 mr-1" />
                  Mainnet
                </Button>
                <Button
                  variant={currentNetwork === "sepolia" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    onNetworkChange("sepolia");
                  }}
                  className={
                    currentNetwork === "sepolia"
                      ? "bg-[#00bfff] text-[#0f1419]"
                      : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  }
                >
                  <Network className="h-3 w-3 mr-1" />
                  Sepolia
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Contract Address
                </label>
                <Tooltip
                  content="Ethereum contract address to analyze. Must be a valid 40-character hexadecimal address starting with 0x."
                  delayShow={200}
                  offset={15}
                  placement={"right"}
                >
                  <HelpCircle className="h-3 w-3 text-[#6b7280] hover:text-[#00bfff] cursor-help" />
                </Tooltip>
              </div>
              <Input
                placeholder="0x..."
                value={formState.contractAddress}
                onChange={(e) => {
                  setFormState((prev) => ({
                    ...prev,
                    contractAddress: e.target.value,
                  }));
                  setFieldInteractions((prev) => ({
                    ...prev,
                    contractAddress: true,
                  }));
                }}
                className={`font-mono ${
                  !validation.contractAddress.isValid
                    ? "border-red-500 focus-visible:ring-red-500"
                    : validation.contractAddress.isValid
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                }`}
              />
              {validation.contractAddress.error && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{validation.contractAddress.error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#00bfff] flex items-center gap-2">
            Query Options
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Analysis Depth
                </label>
                <Tooltip
                  content={
                    <>
                      <span className="text-[#00bfff]">Basic:</span> Top 5
                      results.
                      <br />
                      <span className="text-[#00bfff]">Full:</span>{" "}
                      Comprehensive Analysis
                      <br />
                      <span className="text-[#00bfff]">Advanced:</span>{" "}
                      Comprehensive Analysis with extra metrics.
                    </>
                  }
                  offset={15}
                  placement={"right"}
                >
                  <HelpCircle className="h-3 w-3 text-[#6b7280] hover:text-[#00bfff] cursor-help" />
                </Tooltip>
              </div>
              <Dropdown
                title=""
                value={formState.analysisDepth}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    analysisDepth: value as "basic" | "full" | "advanced",
                  }))
                }
                placeholder="Select analysis depth..."
                options={[
                  { value: "basic", label: "Basic - Top 5 results only" },
                  { value: "full", label: "Full - Comprehensive analysis" },
                  {
                    value: "advanced",
                    label: "Advanced - Detailed with extra metrics",
                  },
                ]}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Include Timestamps
                </label>
                <Tooltip
                  content="Include block timestamps in the analysis for time-series data and chronological insights."
                  offset={15}
                  placement={"right"}
                >
                  <HelpCircle className="h-3 w-3 text-[#6b7280] hover:text-[#00bfff] cursor-help" />
                </Tooltip>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormState((prev) => ({
                      ...prev,
                      includeTimestamps: !prev.includeTimestamps,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:ring-offset-2 ${
                    formState.includeTimestamps
                      ? "bg-[#00bfff]"
                      : "bg-[rgba(107,114,128,0.3)]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formState.includeTimestamps
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-[#8b9dc3]">
                  {formState.includeTimestamps ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-4">
            <h3 className="text-sm font-medium text-[#00bfff]">
              Advanced Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#8b9dc3]">Max Results</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={formState.maxResults}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      maxResults: parseInt(e.target.value) || 1000,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[#8b9dc3]">
                    Custom RPC Endpoint
                  </label>
                  <Tooltip
                    content="Custom RPC endpoint URL for blockchain queries. Leave empty to use default RPC."
                    offset={15}
                    placement={"right"}
                  >
                    <HelpCircle className="h-3 w-3 text-[#6b7280] hover:text-[#00bfff] cursor-help" />
                  </Tooltip>
                </div>
                <Input
                  placeholder="https://your-rpc-endpoint.com"
                  value={formState.customRpcUrl}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      customRpcUrl: e.target.value,
                    }))
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!validation.overall.isValid || loading}
            className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-8 py-3 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#0f1419] border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Analyze Logs
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
