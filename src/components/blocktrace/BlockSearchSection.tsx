import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Hash,
  History,
  Info,
  Loader2,
  Network,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { Badge, Button, Input } from "@/components/global";
import { RPC_CONFIG } from "@/lib/config";
import { useCurrentBlock } from "@/hooks/blockchain/useBlockchainQueries.ts";

interface BlockSearchSectionProps {
  inputBlockId: string;
  setInputBlockId: (value: string) => void;
  validationError: string | null;
  setValidationError: (error: string | null) => void;
  loading: boolean;
  onSearch: () => void;
  selectedNetwork: "mainnet" | "sepolia";
  setSelectedNetwork: (network: "mainnet" | "sepolia") => void;
  rpcUrl: string;
  setRpcUrl: (url: string) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
}

export const BlockSearchSection: React.FC<BlockSearchSectionProps> = ({
  inputBlockId,
  setInputBlockId,
  validationError,
  setValidationError,
  loading,
  onSearch,
  selectedNetwork,
  setSelectedNetwork,
  rpcUrl,
  setRpcUrl,
  showAdvancedSettings,
  setShowAdvancedSettings,
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const {
    data: currentBlock,
    error: currentBlockError,
    isLoading: isCurrentBlockLoading,
  } = useCurrentBlock();

  const networkStatus = currentBlockError
    ? "error"
    : isCurrentBlockLoading
      ? "connecting"
      : currentBlock
        ? "connected"
        : "connecting";

  useEffect(() => {
    const saved = localStorage.getItem("arguschain-recent-blocks");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.warn("Failed to parse recent searches");
      }
    }

    if (currentBlockError) {
      console.error("Failed to get current block:", currentBlockError);
    }
  }, [selectedNetwork, currentBlockError]);

  const handleSearch = () => {
    if (inputBlockId.trim()) {
      const updated = [
        inputBlockId,
        ...recentSearches.filter((s) => s !== inputBlockId),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("arguschain-recent-blocks", JSON.stringify(updated));
    }
    onSearch();
  };

  const PREDEFINED_IDENTIFIERS = ["latest", "pending", "earliest"];
  const MAX_SUGGESTIONS = 5;
  const NUMERIC_BLOCK_SUGGESTIONS_COUNT = 3;

  const createPredefinedSuggestions = (value: string): string[] => {
    if (value === "") return [...PREDEFINED_IDENTIFIERS];

    return PREDEFINED_IDENTIFIERS.filter((identifier) =>
      identifier.startsWith(value.toLowerCase())
    );
  };

  const createNumericBlockSuggestions = (
    value: string,
    currentBlock: number
  ): string[] => {
    if (!value.match(/^\d+$/)) return [];

    const suggestions: string[] = [];
    for (let i = 0; i < NUMERIC_BLOCK_SUGGESTIONS_COUNT; i++) {
      const suggestion = (currentBlock - i).toString();
      if (suggestion.startsWith(value)) {
        suggestions.push(suggestion);
      }
    }
    return suggestions;
  };

  const generateSuggestions = (
    value: string,
    currentBlock: number | undefined
  ): string[] => {
    if (!currentBlock) return [];

    const predefinedSuggestions = createPredefinedSuggestions(value);
    const numericSuggestions = createNumericBlockSuggestions(
      value,
      currentBlock
    );

    return [...predefinedSuggestions, ...numericSuggestions].slice(
      0,
      MAX_SUGGESTIONS
    );
  };

  const handleInputChange = (value: string) => {
    setInputBlockId(value);
    setValidationError(null);
    setSuggestions(generateSuggestions(value, currentBlock));
  };

  const getInputType = (input: string) => {
    if (!input) return null;
    if (
      ["latest", "pending", "earliest", "finalized", "safe"].includes(
        input.toLowerCase()
      )
    ) {
      return { type: "tag", icon: Clock, color: "text-[#10b981]" };
    }
    if (input.startsWith("0x") && input.length === 66) {
      return { type: "hash", icon: Hash, color: "text-[#8b5cf6]" };
    }
    if (input.match(/^\d+$/)) {
      return { type: "number", icon: BarChart3, color: "text-[#00bfff]" };
    }
    if (input.startsWith("0x") && input.length < 66) {
      return { type: "hex", icon: Hash, color: "text-[#f59e0b]" };
    }
    return { type: "unknown", icon: AlertCircle, color: "text-[#ef4444]" };
  };

  const inputType = getInputType(inputBlockId);

  return (
    <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Block Trace Analyzer
          </h2>
          <Badge
            className={`text-xs ${
              networkStatus === "connected"
                ? "text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]"
                : networkStatus === "connecting"
                  ? "text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]"
                  : "text-[#ef4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]"
            }`}
          >
            {networkStatus === "connected" && (
              <CheckCircle className="h-3 w-3 mr-1" />
            )}
            {networkStatus === "connecting" && (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            )}
            {networkStatus === "error" && (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {networkStatus === "connected"
              ? "Connected"
              : networkStatus === "connecting"
                ? "Connecting"
                : "Error"}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff]"
        >
          <Settings className="h-4 w-4 mr-2" />
          Advanced
        </Button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="relative">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Enter block number, hash, or tag (latest, pending, earliest)"
                  value={inputBlockId}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className={`w-full font-mono pr-12 ${
                    validationError
                      ? "border-[rgba(239,68,68,0.5)] focus-visible:ring-[rgba(239,68,68,0.3)]"
                      : "border-[rgba(0,191,255,0.2)] focus-visible:ring-[rgba(0,191,255,0.3)]"
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                {inputType && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <inputType.icon className={`h-4 w-4 ${inputType.color}`} />
                  </div>
                )}
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || networkStatus !== "connected"}
                className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Analyze Block
              </Button>
            </div>

            {inputType && inputBlockId && (
              <div className="flex items-center gap-2 mt-2">
                <inputType.icon className={`h-3 w-3 ${inputType.color}`} />
                <span className={`text-xs ${inputType.color}`}>
                  {inputType.type === "tag" && "Block tag"}
                  {inputType.type === "hash" && "Block hash"}
                  {inputType.type === "number" && "Block number"}
                  {inputType.type === "hex" && "Hex number"}
                  {inputType.type === "unknown" && "Invalid format"}
                </span>
                {inputType.type === "number" && currentBlock && (
                  <span className="text-xs text-[#8b9dc3]">
                    ({currentBlock - parseInt(inputBlockId)} blocks ago)
                  </span>
                )}
              </div>
            )}

            {suggestions.length > 0 && inputBlockId && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[rgba(25,28,40,0.95)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg shadow-lg z-10">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputBlockId(suggestion);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
              <AlertCircle className="h-4 w-4 text-[#ef4444]" />
              <span className="text-sm text-[#ef4444]">{validationError}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <label className="text-sm text-[#8b9dc3] font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network
            </label>
            <div className="flex gap-2">
              <Button
                variant={selectedNetwork === "mainnet" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedNetwork("mainnet");
                  setRpcUrl(RPC_CONFIG.mainnet.rpcUrl);
                }}
                className={
                  selectedNetwork === "mainnet"
                    ? "bg-[#00bfff] text-[#0f1419] hover:bg-[#0099cc]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                <div className="w-2 h-2 rounded-full bg-[#10b981] mr-2" />
                Mainnet
              </Button>
              <Button
                variant={selectedNetwork === "sepolia" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedNetwork("sepolia");
                  setRpcUrl(RPC_CONFIG.sepolia.rpcUrl);
                }}
                className={
                  selectedNetwork === "sepolia"
                    ? "bg-[#00bfff] text-[#0f1419] hover:bg-[#0099cc]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                <div className="w-2 h-2 rounded-full bg-[#f59e0b] mr-2" />
                Sepolia
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-[#8b9dc3] font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Select
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputBlockId("latest")}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                Latest
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (currentBlock) {
                    setInputBlockId((currentBlock - 1).toString());
                  }
                }}
                disabled={!currentBlock}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-50"
              >
                Previous
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-[#8b9dc3] font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Current Block
            </label>
            <div className="p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
              {currentBlock ? (
                <div className="text-sm">
                  <div className="font-mono text-[#00bfff]">
                    #{currentBlock.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#8b9dc3]">Latest block</div>
                </div>
              ) : (
                <div className="text-sm text-[#8b9dc3]">Loading...</div>
              )}
            </div>
          </div>
        </div>

        {recentSearches.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm text-[#8b9dc3] font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Searches
            </label>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setInputBlockId(search)}
                  className="px-3 py-1.5 text-xs font-mono bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg text-[#8b9dc3] hover:border-[rgba(0,191,255,0.3)] hover:text-[#00bfff] transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAdvancedSettings && (
        <div className="border-t border-[rgba(0,191,255,0.1)] pt-6 mt-6 space-y-4">
          <h3 className="text-sm font-medium text-[#00bfff] flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-[#8b9dc3]">
                Custom RPC Endpoint
              </label>
              <Input
                placeholder="https://your-rpc-endpoint.com"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <div className="text-xs text-[#6b7280]">
                Override default RPC endpoint for custom node access
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[#8b9dc3]">
                Request Timeout (seconds)
              </label>
              <Input
                placeholder="60"
                defaultValue="60"
                type="number"
                min="10"
                max="300"
              />
              <div className="text-xs text-[#6b7280]">
                Maximum time to wait for blockchain responses
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-[#00bfff] mt-0.5" />
              <div className="text-sm text-[#8b9dc3]">
                <div className="font-medium text-[#00bfff] mb-1">
                  Performance Tips
                </div>
                <ul className="space-y-1 text-xs">
                  <li>• Use block numbers for faster lookups than hashes</li>
                  <li>
                    • Recent blocks (last 128) are cached for better performance
                  </li>
                  <li>• Large blocks may take longer to analyze completely</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
