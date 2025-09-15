import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Input } from "@/components/global";
import { Dropdown } from "@/components/global/Dropdown";
import {
  AlertCircle,
  Bookmark,
  Database,
  GitCompare,
  Loader2,
  Network,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { blockchainService } from "@/lib/blockchainService";
import { RPC_CONFIG, shortenAddress } from "@/lib/config";
import Statusbar from "../components/status/Statusbar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  MappingAnalytics,
  StorageAnalytics,
  StorageComparatorDashboard,
} from "@/components/storagerange";
import { BookmarkManager } from "@/components/storagerange";

import {
  useMappingAnalysis,
  useMappingAnalysisMutation,
  useStorageAnalysis,
  useStorageAnalysisMutation,
  useStorageComparison,
} from "@/hooks/storagerange";

const useCommonERC20Addresses = () => {
  return [
    "0xA0b86a33E6441b8C4505B7C0c5b2F8B8C4505B7C",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "0xA0b86a33E6441b8C4505B7C0c5b2F8B8C4505B7C",
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  ];
};

interface StorageAnalysisState {
  contractAddress: string;
  blockIdentifier: string;
  selectedNetwork: "mainnet" | "sepolia";
  analysisType: "storage" | "mapping" | "comparison";
  mappingSlot: string;
  mappingKeys: string[];
  comparisonBlock2: string;
  maxSlots: number;
  showAdvancedSettings: boolean;
}

export default function StorageAnalysis() {
  const { contractAddress: urlContractAddress } = useParams<{
    contractAddress: string;
  }>();
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<StorageAnalysisState>({
    contractAddress: urlContractAddress || "",
    blockIdentifier: searchParams.get("block") || "latest",
    selectedNetwork: "mainnet",
    analysisType: "storage",
    mappingSlot: "4",
    mappingKeys: [],
    comparisonBlock2: "",
    maxSlots: 50,
    showAdvancedSettings: false,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [rpcUrl, setRpcUrl] = useState(
    searchParams.get("rpc") || RPC_CONFIG.mainnet.rpcUrl
  );
  const [newMappingKey, setNewMappingKey] = useState("");

  const queryClient = useQueryClient();
  const commonERC20Addresses = useCommonERC20Addresses();

  const validateContractAddress = (address: string): string | null => {
    if (!address || address.trim() === "") {
      return "Please enter a contract address";
    }

    if (!address.startsWith("0x")) {
      return "Contract address must start with 0x";
    }

    if (address.length !== 42) {
      return "Contract address must be 42 characters long";
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return "Invalid contract address format";
    }

    return null;
  };

  const handleInputChange = (field: keyof StorageAnalysisState, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }));

    if (validationError) {
      setValidationError(null);
    }
  };

  const {
    data: provider,
    isLoading: isConnecting,
    error: connectionError,
    refetch: reconnect,
  } = useQuery({
    queryKey: ["blockchain-connection", state.selectedNetwork],
    queryFn: async () => {
      await blockchainService.connect(state.selectedNetwork);
      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Failed to get provider after connection");
      }
      return provider;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const {
    data: storageAnalysis,
    isLoading: isAnalyzingStorage,
    error: storageError,
    refetch: refetchStorage,
  } = useStorageAnalysis(
    state.contractAddress,
    state.blockIdentifier,
    { maxSlots: state.maxSlots },
    state.analysisType === "storage" &&
      !!provider &&
      !isConnecting &&
      !!state.contractAddress
  );

  const {
    data: mappingAnalysis,
    isLoading: isAnalyzingMapping,
    error: mappingError,
    refetch: refetchMapping,
  } = useMappingAnalysis(
    state.contractAddress,
    state.blockIdentifier,
    state.mappingSlot,
    state.mappingKeys,
    {
      enabled:
        state.analysisType === "mapping" &&
        !!provider &&
        !isConnecting &&
        !!state.contractAddress &&
        state.mappingKeys.length > 0,
    }
  );

  const {
    data: comparisonAnalysis,
    isLoading: isComparingStorage,
    error: comparisonError,
    refetch: refetchComparison,
  } = useStorageComparison(
    state.contractAddress,
    state.blockIdentifier,
    state.comparisonBlock2,
    { slotCount: state.maxSlots },
    state.analysisType === "comparison" &&
      !!provider &&
      !isConnecting &&
      !!state.contractAddress &&
      !!state.comparisonBlock2
  );

  const storageAnalysisMutation = useStorageAnalysisMutation();
  const mappingAnalysisMutation = useMappingAnalysisMutation();

  const handleAnalyze = () => {
    const addressError = validateContractAddress(state.contractAddress);
    if (addressError) {
      setValidationError(addressError);
      return;
    }

    setValidationError(null);

    console.log("Analyzing contract:", {
      contractAddress: state.contractAddress,
      blockIdentifier: state.blockIdentifier,
      analysisType: state.analysisType,
      maxSlots: state.maxSlots,
    });

    const params = new URLSearchParams();
    params.set("block", state.blockIdentifier);
    params.set("rpc", rpcUrl);
    window.history.pushState(
      {},
      "",
      `/storage-analysis/${state.contractAddress}?${params.toString()}`
    );

    if (state.analysisType === "storage") {
      storageAnalysisMutation.mutate({
        contractAddress: state.contractAddress,
        blockIdentifier: state.blockIdentifier,
        options: { maxSlots: state.maxSlots },
      });
    } else if (
      state.analysisType === "mapping" &&
      state.mappingKeys.length > 0
    ) {
      mappingAnalysisMutation.mutate({
        contractAddress: state.contractAddress,
        mappingSlot: state.mappingSlot,
        keys: state.mappingKeys,
        blockIdentifier: state.blockIdentifier,
      });
    }
  };

  const addMappingKey = () => {
    if (
      newMappingKey.trim() &&
      !state.mappingKeys.includes(newMappingKey.trim())
    ) {
      setState((prev) => ({
        ...prev,
        mappingKeys: [...prev.mappingKeys, newMappingKey.trim()],
      }));
      setNewMappingKey("");
    }
  };

  const removeMappingKey = (keyToRemove: string) => {
    setState((prev) => ({
      ...prev,
      mappingKeys: prev.mappingKeys.filter((key) => key !== keyToRemove),
    }));
  };

  const addCommonAddresses = () => {
    const newKeys = commonERC20Addresses.filter(
      (addr) => !state.mappingKeys.includes(addr)
    );
    setState((prev) => ({
      ...prev,
      mappingKeys: [...prev.mappingKeys, ...newKeys.slice(0, 5)],
    }));
  };

  const handleExportStorage = (format: "csv" | "json") => {
    if (!storageAnalysis) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `storage-analysis-${shortenAddress(state.contractAddress)}-${timestamp}`;

    if (format === "json") {
      const data = JSON.stringify(storageAnalysis, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      console.log("CSV export not implemented yet");
    }
  };

  const handleExportMapping = (format: "csv" | "json") => {
    if (!mappingAnalysis) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `mapping-analysis-${shortenAddress(state.contractAddress)}-slot${state.mappingSlot}-${timestamp}`;

    if (format === "json") {
      const data = JSON.stringify(mappingAnalysis, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isLoading =
    isConnecting ||
    isAnalyzingStorage ||
    isAnalyzingMapping ||
    isComparingStorage ||
    storageAnalysisMutation.isPending ||
    mappingAnalysisMutation.isPending;

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
      <header className="fixed top-0 left-0 w-full z-20 border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-40 pb-16 px-6">
        <div className="container mx-auto space-y-6">
          <div className="flex flex-col gap-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-[#00bfff] tracking-wide">
                Contract Storage Analysis
              </h1>
              <p className="text-[#8b9dc3] text-lg">
                Deep inspection of contract storage using debug_storageRangeAt
              </p>
            </div>

            <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage Inspector
                </h2>
                <div className="flex items-center gap-3">
                  <BookmarkManager
                    contractAddress={state.contractAddress}
                    blockNumber={state.blockIdentifier}
                    network={state.selectedNetwork}
                    analysisConfig={{
                      analysisType: state.analysisType,
                      includeHistory: state.analysisType === "comparison",
                      maxSlots: state.maxSlots,
                    }}
                    analysisResults={{
                      totalSlots: storageAnalysis?.slots?.length || 0,
                      nonZeroSlots:
                        storageAnalysis?.slots?.filter(
                          (slot) =>
                            slot.value !==
                            "0x0000000000000000000000000000000000000000000000000000000000000000"
                        ).length || 0,
                      mappingSlots: mappingAnalysis?.mappings?.length || 0,
                      storageSize: storageAnalysis?.metadata?.storageSize || 0,
                      analysisTime: Date.now(),
                    }}
                    onLoadBookmark={(bookmark) => {
                      handleInputChange(
                        "contractAddress",
                        bookmark.query_config.contractAddress
                      );
                      handleInputChange(
                        "blockIdentifier",
                        bookmark.query_config.blockNumber
                      );
                      handleInputChange(
                        "selectedNetwork",
                        bookmark.query_config.network as "mainnet" | "sepolia"
                      );
                      handleInputChange(
                        "analysisType",
                        bookmark.query_config.analysisDepth === "basic"
                          ? "storage"
                          : bookmark.query_config.analysisDepth === "detailed"
                            ? "mapping"
                            : "comparison"
                      );
                      if (bookmark.query_config.maxSlots) {
                        handleInputChange(
                          "maxSlots",
                          bookmark.query_config.maxSlots
                        );
                      }

                      // Update RPC URL based on network
                      if (bookmark.query_config.network === "mainnet") {
                        setRpcUrl(RPC_CONFIG.mainnet.rpcUrl);
                      } else if (bookmark.query_config.network === "sepolia") {
                        setRpcUrl(RPC_CONFIG.sepolia.rpcUrl);
                      }
                    }}
                    onSignUpClick={() => {
                      // Handle sign up click - could open auth modal or redirect
                      console.log("Sign up clicked");
                    }}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        showAdvancedSettings: !prev.showAdvancedSettings,
                      }))
                    }
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff]"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter contract address (0x...)"
                        value={state.contractAddress}
                        onChange={(e) =>
                          handleInputChange("contractAddress", e.target.value)
                        }
                        className={`w-full font-mono ${
                          validationError
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAnalyze();
                          }
                        }}
                      />
                      {validationError && (
                        <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{validationError}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Analyze
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Network
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant={
                          state.selectedNetwork === "mainnet"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          handleInputChange("selectedNetwork", "mainnet");
                          setRpcUrl(RPC_CONFIG.mainnet.rpcUrl);
                        }}
                        className={
                          state.selectedNetwork === "mainnet"
                            ? "bg-[#00bfff] text-[#0f1419]"
                            : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        }
                      >
                        <Network className="h-3 w-3 mr-1" />
                        Mainnet
                      </Button>
                      <Button
                        variant={
                          state.selectedNetwork === "sepolia"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          handleInputChange("selectedNetwork", "sepolia");
                          setRpcUrl(RPC_CONFIG.sepolia.rpcUrl);
                        }}
                        className={
                          state.selectedNetwork === "sepolia"
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
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Block
                    </label>
                    <Input
                      placeholder="latest, number, or hash"
                      value={state.blockIdentifier}
                      onChange={(e) =>
                        handleInputChange("blockIdentifier", e.target.value)
                      }
                    />
                  </div>

                  <Dropdown
                    title="Analysis Type"
                    value={state.analysisType}
                    onValueChange={(value) =>
                      handleInputChange("analysisType", value as any)
                    }
                    placeholder="Storage Analysis"
                    options={[
                      { value: "storage", label: "Storage Analysis" },
                      { value: "mapping", label: "Mapping Analysis" },
                      { value: "comparison", label: "Block Comparison" },
                    ]}
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Max Slots
                    </label>
                    <Input
                      type="number"
                      placeholder="50"
                      value={state.maxSlots}
                      onChange={(e) =>
                        handleInputChange(
                          "maxSlots",
                          parseInt(e.target.value) || 50
                        )
                      }
                      min="1"
                      max="200"
                    />
                  </div>
                </div>

                {state.analysisType === "mapping" && (
                  <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
                    <h3 className="text-sm font-medium text-[#00bfff]">
                      Mapping Analysis Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Mapping Slot
                        </label>
                        <Input
                          placeholder="4 (for ERC20 balances)"
                          value={state.mappingSlot}
                          onChange={(e) =>
                            handleInputChange("mappingSlot", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Add Key
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Address or key to analyze"
                            value={newMappingKey}
                            onChange={(e) => setNewMappingKey(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addMappingKey();
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addMappingKey}
                            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {state.mappingKeys.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#8b9dc3]">
                            Keys to Analyze ({state.mappingKeys.length}):
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addCommonAddresses}
                            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Add Common
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {state.mappingKeys.map((key, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] flex items-center gap-1"
                            >
                              <span className="font-mono text-xs">
                                {key.length > 20
                                  ? `${key.slice(0, 10)}...${key.slice(-6)}`
                                  : key}
                              </span>
                              <button
                                onClick={() => removeMappingKey(key)}
                                className="hover:text-red-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {state.analysisType === "comparison" && (
                  <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
                    <h3 className="text-sm font-medium text-[#00bfff]">
                      Block Comparison Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Block 1 (Base)
                        </label>
                        <Input
                          placeholder="Block identifier"
                          value={state.blockIdentifier}
                          onChange={(e) =>
                            handleInputChange("blockIdentifier", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Block 2 (Compare)
                        </label>
                        <Input
                          placeholder="Block identifier to compare"
                          value={state.comparisonBlock2}
                          onChange={(e) =>
                            handleInputChange(
                              "comparisonBlock2",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {state.showAdvancedSettings && (
                  <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
                    <h3 className="text-sm font-medium text-[#00bfff]">
                      Advanced Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Custom RPC Endpoint
                        </label>
                        <Input
                          placeholder="https://your-rpc-endpoint.com"
                          value={rpcUrl}
                          onChange={(e) => setRpcUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Timeout (seconds)
                        </label>
                        <Input
                          placeholder="30"
                          defaultValue="30"
                          type="number"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isConnecting && (
              <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting to {state.selectedNetwork} network...</span>
                </div>
              </div>
            )}

            {connectionError && (
              <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to connect to blockchain network</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reconnect()}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    Retry Connection
                  </Button>
                </div>
              </div>
            )}

            {(storageError || mappingError || comparisonError) && (
              <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {storageError?.message ||
                      mappingError?.message ||
                      comparisonError?.message}
                  </span>
                </div>
              </div>
            )}

            {storageAnalysis && state.analysisType === "storage" && (
              <StorageAnalytics
                analysisResult={storageAnalysis}
                loading={isAnalyzingStorage}
                onExport={handleExportStorage}
              />
            )}

            {mappingAnalysis && state.analysisType === "mapping" && (
              <MappingAnalytics
                analysisResult={mappingAnalysis}
                loading={isAnalyzingMapping}
                onExport={handleExportMapping}
              />
            )}

            {comparisonAnalysis && state.analysisType === "comparison" && (
              <StorageComparatorDashboard
                comparisonResult={comparisonAnalysis}
                loading={isComparingStorage}
                onExport={(format) => {
                  const timestamp = new Date()
                    .toISOString()
                    .slice(0, 19)
                    .replace(/:/g, "-");
                  const filename = `storage-comparison-${shortenAddress(state.contractAddress)}-${timestamp}`;

                  if (format === "json") {
                    const data = JSON.stringify(comparisonAnalysis, null, 2);
                    const blob = new Blob([data], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${filename}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              />
            )}

            {!isLoading &&
              !storageAnalysis &&
              !mappingAnalysis &&
              !comparisonAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Database className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Storage Slots
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Database className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Contract storage analysis will appear here
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Mapping Analysis
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Mapping storage analysis for balances and allowances
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <GitCompare className="h-5 w-5 text-[#00bfff]" />
                      <h3 className="text-lg font-semibold text-[#00bfff]">
                        Block Comparison
                      </h3>
                    </div>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                        <GitCompare className="h-8 w-8 text-[#00bfff]" />
                      </div>
                      <p className="text-[#8b9dc3] text-sm">
                        Compare storage state between different blocks
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
