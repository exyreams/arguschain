import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Alert } from "@/components/global/Alert";
import {
  AlertCircle,
  BookOpen,
  Code,
  Hash,
  Loader2,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import {
  bytecodeService,
  EXAMPLE_CONTRACTS,
  RPC_ENDPOINTS,
} from "@/lib/bytecode";
import {
  BytecodeAnalytics,
  BytecodeBookmarkManager,
} from "@/components/bytecode";
import Statusbar from "@/components/status/Statusbar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

interface ContractInput {
  id: string;
  address: string;
  name: string;
}

type AnalysisMode = "contracts" | "transaction";

export default function BytecodeAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("contracts");
  const [contracts, setContracts] = useState<ContractInput[]>([
    { id: "1", address: "", name: "Contract A" },
    { id: "2", address: "", name: "Contract B" },
  ]);
  const [transactionHash, setTransactionHash] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<
    "mainnet" | "sepolia" | "holesky"
  >("mainnet");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const addressesParam = searchParams.get("addresses");
    const namesParam = searchParams.get("names");
    const txHashParam = searchParams.get("txHash");
    const networkParam = searchParams.get("network");

    if (txHashParam) {
      setAnalysisMode("transaction");
      setTransactionHash(txHashParam);
    } else if (addressesParam) {
      setAnalysisMode("contracts");
      const addresses = addressesParam.split(",");
      const names = namesParam ? namesParam.split(",") : [];

      const newContracts = addresses.map((address, index) => ({
        id: (index + 1).toString(),
        address: address.trim(),
        name:
          names[index]?.trim() || `Contract ${String.fromCharCode(65 + index)}`,
      }));

      setContracts(newContracts);
    }

    if (
      networkParam &&
      ["mainnet", "sepolia", "holesky"].includes(networkParam)
    ) {
      setSelectedNetwork(networkParam as "mainnet" | "sepolia" | "holesky");
    }
  }, [searchParams]);

  const {
    data: serviceReady,
    isLoading: isInitializing,
    error: initError,
    refetch: reinitialize,
  } = useQuery({
    queryKey: ["bytecode-service-init", selectedNetwork],
    queryFn: async () => {
      await bytecodeService.initialize(selectedNetwork);
      return true;
    },
    retry: 3,
    retryDelay: 2000,
    staleTime: 5 * 60 * 1000,
  });

  const analysisMutation = useMutation({
    mutationFn: async (contractsToAnalyze: ContractInput[]) => {
      const validContracts = contractsToAnalyze.filter((c) => c.address.trim());

      if (validContracts.length === 0) {
        throw new Error("No valid contract addresses provided");
      }

      const contractsData = validContracts.map((c) => ({
        address: c.address.trim(),
        name: c.name.trim() || `Contract (${shortenAddress(c.address)})`,
      }));

      return await bytecodeService.analyzeMultipleContracts(contractsData);
    },
    onMutate: () => {
      setValidationErrors({});
    },
    onError: (error: Error) => {
      console.error("Analysis error:", error);
    },
  });

  const transactionAnalysisMutation = useMutation({
    mutationFn: async (txHash: string) => {
      if (!txHash || !txHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        throw new Error("Invalid transaction hash format");
      }

      return await bytecodeService.analyzeFromTransaction(txHash);
    },
    onMutate: () => {
      setValidationErrors({});
    },
    onError: (error: Error) => {
      console.error("Transaction analysis error:", error);
    },
  });

  const validateAddress = (address: string): string | null => {
    if (!address || address.trim() === "") {
      return null;
    }

    if (!address.startsWith("0x")) {
      return "Address must start with 0x";
    }

    if (address.length !== 42) {
      return "Address must be 42 characters long";
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return "Invalid address format";
    }

    return null;
  };

  const validateTransactionHash = (hash: string): string | null => {
    if (!hash || hash.trim() === "") {
      return "Please enter a transaction hash";
    }

    if (!hash.startsWith("0x")) {
      return "Transaction hash must start with 0x";
    }

    if (hash.length !== 66) {
      return "Transaction hash must be 66 characters long";
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      return "Invalid transaction hash format";
    }

    return null;
  };

  const handleContractChange = (
    id: string,
    field: "address" | "name",
    value: string
  ) => {
    setContracts((prev) =>
      prev.map((contract) =>
        contract.id === id ? { ...contract, [field]: value } : contract
      )
    );

    if (field === "address" && validationErrors[id]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const addContract = () => {
    const newId = (contracts.length + 1).toString();
    setContracts((prev) => [
      ...prev,
      {
        id: newId,
        address: "",
        name: `Contract ${String.fromCharCode(65 + prev.length)}`,
      },
    ]);
  };

  const removeContract = (id: string) => {
    if (contracts.length > 1) {
      setContracts((prev) => prev.filter((contract) => contract.id !== id));
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const loadExampleContracts = (exampleType: "stablecoins" | "defi") => {
    const examples =
      exampleType === "stablecoins"
        ? EXAMPLE_CONTRACTS.STABLECOINS
        : EXAMPLE_CONTRACTS.DEFI_PROTOCOLS;

    const newContracts = examples.slice(0, 3).map((example, index) => ({
      id: (index + 1).toString(),
      address: example.address,
      name: example.name,
    }));

    setContracts(newContracts);
  };

  const handleAnalyze = () => {
    if (analysisMode === "transaction") {
      const error = validateTransactionHash(transactionHash);
      if (error) {
        setValidationErrors({ transaction: error });
        return;
      }

      setSearchParams({
        txHash: transactionHash,
        network: selectedNetwork,
      });

      transactionAnalysisMutation.mutate(transactionHash);
    } else {
      const errors: Record<string, string> = {};
      const validContracts = contracts.filter((contract) => {
        const address = contract.address.trim();
        if (!address) return false;

        const error = validateAddress(address);
        if (error) {
          errors[contract.id] = error;
          return false;
        }
        return true;
      });

      setValidationErrors(errors);

      if (Object.keys(errors).length > 0) {
        return;
      }

      if (validContracts.length === 0) {
        setValidationErrors({
          general: "Please enter at least one valid contract address",
        });
        return;
      }

      const addresses = validContracts.map((c) => c.address).join(",");
      const names = validContracts.map((c) => c.name).join(",");
      setSearchParams({
        addresses,
        names,
        network: selectedNetwork,
      });

      analysisMutation.mutate(validContracts);
    }
  };

  const shortenAddress = (address: string, chars: number = 4): string => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
  };

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
      <header className="fixed top-0 left-0 w-full z-10 border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-40 pb-16 px-6">
        <div className="container mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-[#00bfff] tracking-wide">
              Contract Bytecode Analysis
            </h1>
            <p className="text-[#8b9dc3] text-lg">
              Advanced smart contract bytecode analysis using eth_getCode
            </p>
          </div>

          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                <Code className="h-5 w-5" />
                Bytecode Analysis
              </h2>
              <div className="flex items-center gap-3">
                <BytecodeBookmarkManager
                  onLoadBookmark={(bookmark) => {
                    if (
                      bookmark.query_config.analysisType === "transaction" &&
                      bookmark.query_config.transactionHash
                    ) {
                      setAnalysisMode("transaction");
                      setTransactionHash(bookmark.query_config.transactionHash);
                      setSelectedNetwork(
                        bookmark.query_config.network as
                          | "mainnet"
                          | "sepolia"
                          | "holesky"
                      );
                    } else {
                      setAnalysisMode("contracts");
                      const newContracts =
                        bookmark.query_config.contractAddresses?.map(
                          (address, index) => ({
                            id: (index + 1).toString(),
                            address,
                            name:
                              bookmark.query_config.contractNames?.[index] ||
                              `Contract ${String.fromCharCode(65 + index)}`,
                          })
                        ) || [];
                      setContracts(newContracts);
                      setSelectedNetwork(
                        bookmark.query_config.network as
                          | "mainnet"
                          | "sepolia"
                          | "holesky"
                      );
                    }
                  }}
                />

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
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm text-[#8b9dc3] font-medium min-w-[80px]">
                  Mode:
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      analysisMode === "contracts" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setAnalysisMode("contracts")}
                    className={
                      analysisMode === "contracts"
                        ? "bg-[#00bfff] text-[#0f1419]"
                        : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                    }
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Contract Addresses
                  </Button>
                  <Button
                    variant={
                      analysisMode === "transaction" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setAnalysisMode("transaction")}
                    className={
                      analysisMode === "transaction"
                        ? "bg-[#00bfff] text-[#0f1419]"
                        : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                    }
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    From Transaction
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm text-[#8b9dc3] font-medium min-w-[80px]">
                  Network:
                </label>
                <div className="flex gap-2">
                  {(["mainnet", "sepolia", "holesky"] as const).map(
                    (network) => (
                      <Button
                        key={network}
                        variant={
                          selectedNetwork === network ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedNetwork(network)}
                        className={
                          selectedNetwork === network
                            ? "bg-[#00bfff] text-[#0f1419]"
                            : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        }
                      >
                        {RPC_ENDPOINTS[network].name}
                      </Button>
                    )
                  )}
                </div>
              </div>

              {analysisMode === "transaction" && (
                <div className="space-y-2">
                  <label className="text-sm text-[#8b9dc3] font-medium">
                    Transaction Hash:
                  </label>
                  <Input
                    placeholder="Enter transaction hash (0x...)"
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    className={cn(
                      "font-mono",
                      validationErrors.transaction &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {validationErrors.transaction && (
                    <div className="flex items-center gap-2 mt-1 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationErrors.transaction}</span>
                    </div>
                  )}
                  <p className="text-xs text-[#8b9dc3]">
                    Extracts and analyzes all contracts involved in the
                    transaction
                  </p>
                </div>
              )}

              {analysisMode === "contracts" && (
                <div className="flex items-center gap-4">
                  <label className="text-sm text-[#8b9dc3] font-medium min-w-[80px]">
                    Examples:
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadExampleContracts("stablecoins")}
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Stablecoins
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadExampleContracts("defi")}
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      DeFi Protocols
                    </Button>
                  </div>
                </div>
              )}

              {analysisMode === "contracts" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[#8b9dc3] font-medium">
                      Contract Addresses:
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addContract}
                      disabled={contracts.length >= 5}
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contract
                    </Button>
                  </div>

                  {contracts.map((contract, index) => (
                    <div key={contract.id} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder={`Contract address (0x...)`}
                          value={contract.address}
                          onChange={(e) =>
                            handleContractChange(
                              contract.id,
                              "address",
                              e.target.value
                            )
                          }
                          className={cn(
                            "font-mono",
                            validationErrors[contract.id] &&
                              "border-red-500 focus-visible:ring-red-500"
                          )}
                        />
                        {validationErrors[contract.id] && (
                          <div className="flex items-center gap-2 mt-1 text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{validationErrors[contract.id]}</span>
                          </div>
                        )}
                      </div>
                      <div className="w-32">
                        <Input
                          placeholder="Name"
                          value={contract.name}
                          onChange={(e) =>
                            handleContractChange(
                              contract.id,
                              "name",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      {contracts.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeContract(contract.id)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {validationErrors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationErrors.general}</span>
                </Alert>
              )}

              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={
                    analysisMutation.isPending ||
                    transactionAnalysisMutation.isPending ||
                    isInitializing ||
                    !serviceReady
                  }
                  className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-8 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                >
                  {analysisMutation.isPending ||
                  transactionAnalysisMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : analysisMode === "transaction" ? (
                    <Hash className="h-4 w-4 mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {analysisMode === "transaction"
                    ? "Analyze Transaction"
                    : "Analyze Bytecode"}
                </Button>
              </div>

              {/* Bookmark Manager */}
              <div className="border-t border-[rgba(0,191,255,0.1)] pt-4"></div>
            </div>
          </div>

          {isInitializing && (
            <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Initializing bytecode analysis service for {selectedNetwork}
                  ...
                </span>
              </div>
            </div>
          )}

          {initError && (
            <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to initialize service: {initError.message}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reinitialize()}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {(analysisMutation.data || transactionAnalysisMutation.data) && (
            <BytecodeAnalytics
              comparison={
                analysisMutation.data || transactionAnalysisMutation.data!
              }
              loading={
                analysisMutation.isPending ||
                transactionAnalysisMutation.isPending
              }
              error={
                analysisMutation.error?.message ||
                transactionAnalysisMutation.error?.message ||
                null
              }
              addresses={
                analysisMode === "transaction"
                  ? transactionAnalysisMutation.data?.contracts.map(
                      (c) => c.address
                    ) || []
                  : contracts
                      .filter((c) => c.address.trim())
                      .map((c) => c.address)
              }
              contractNames={
                analysisMode === "transaction"
                  ? transactionAnalysisMutation.data?.contracts.map(
                      (c) => c.contractName
                    ) || []
                  : contracts.filter((c) => c.address.trim()).map((c) => c.name)
              }
              network={selectedNetwork}
              txHash={
                analysisMode === "transaction" ? transactionHash : undefined
              }
              analysisType={analysisMode}
            />
          )}

          {analysisMode === "transaction" &&
            transactionAnalysisMutation.data && (
              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                  Transaction Analysis Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {transactionAnalysisMutation.data.contracts.length}
                    </div>
                    <div className="text-sm text-[#8b9dc3] mt-1">
                      Contracts Found
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {
                        transactionAnalysisMutation.data.contracts.filter(
                          (c) => c.proxy.isProxy
                        ).length
                      }
                    </div>
                    <div className="text-sm text-[#8b9dc3] mt-1">
                      Proxy Contracts
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#00bfff]">
                      {transactionAnalysisMutation.data.contracts.reduce(
                        (sum, c) => sum + c.standards.length,
                        0
                      )}
                    </div>
                    <div className="text-sm text-[#8b9dc3] mt-1">
                      Standards Detected
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-[#8b9dc3]">
                  <p>
                    Transaction Hash:{" "}
                    <span className="font-mono text-[#00bfff]">
                      {transactionHash}
                    </span>
                  </p>
                </div>
              </div>
            )}

          {(analysisMutation.error || transactionAnalysisMutation.error) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div className="space-y-2">
                <h4 className="font-semibold">Analysis Error</h4>
                <p>
                  {analysisMutation.error?.message ||
                    transactionAnalysisMutation.error?.message}
                </p>
              </div>
            </Alert>
          )}

          {!analysisMutation.data &&
            !transactionAnalysisMutation.data &&
            !analysisMutation.isPending &&
            !transactionAnalysisMutation.isPending && (
              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                  Getting Started with Bytecode Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-[#8b9dc3]">
                      What You Can Analyze:
                    </h4>
                    <ul className="space-y-2 text-sm text-[#8b9dc3]">
                      <li>• Contract size and complexity</li>
                      <li>• ERC standard compliance (ERC20, ERC721, etc.)</li>
                      <li>• Function signatures and categories</li>
                      <li>• Security features and patterns</li>
                      <li>• Proxy-implementation relationships</li>
                      <li>• Contract similarity comparisons</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-[#8b9dc3]">How to Use:</h4>
                    <ul className="space-y-2 text-sm text-[#8b9dc3]">
                      <li>
                        • <strong>Contract Mode:</strong> Enter 1-5 contract
                        addresses directly
                      </li>
                      <li>
                        • <strong>Transaction Mode:</strong> Extract contracts
                        from transaction hash
                      </li>
                      <li>• Choose your network (Mainnet, Sepolia, Holesky)</li>
                      <li>• Try example contracts to get started</li>
                      <li>• Compare multiple contracts side-by-side</li>
                      <li>• Export results for further analysis</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
