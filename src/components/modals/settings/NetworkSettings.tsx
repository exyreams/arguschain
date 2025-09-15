import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNetworkSwitcher } from "@/hooks/blockchain";
import { Check, Loader2 } from "lucide-react";

const contentVariants = {
  hidden: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.6, 1] as const,
    },
  },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

export const NetworkSettings = () => {
  const {
    switchNetwork,
    isLoading: isSwitching,
    currentNetwork,
  } = useNetworkSwitcher();

  const [optimisticNetwork, setOptimisticNetwork] = useState<
    "mainnet" | "sepolia" | null
  >(null);

  useEffect(() => {
    setOptimisticNetwork(null);
  }, [currentNetwork]);

  const displayNetwork = optimisticNetwork || currentNetwork;

  const networks = [
    {
      id: "mainnet" as const,
      name: "Ethereum Mainnet",
      description: "Main Ethereum network with real ETH and live transactions",
      chainId: 1,
      color: "bg-green-500",
      rpc: "https://your-mainnet-rpc-endpoint.com",
    },
    {
      id: "sepolia" as const,
      name: "Sepolia Testnet",
      description: "Ethereum test network for development and testing",
      chainId: 11155111,
      color: "bg-yellow-500",
      rpc: "https://your-sepolia-rpc-endpoint.com",
    },
  ];

  const handleNetworkSwitch = async (networkId: "mainnet" | "sepolia") => {
    setOptimisticNetwork(networkId);
    switchNetwork(networkId);
  };

  return (
    <motion.div
      className="space-y-4"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key="network"
    >
      <motion.div variants={itemVariants}>
        <h3 className="text-[#00bfff] text-lg font-semibold mb-2">
          Network Configuration
        </h3>
        <p className="text-[#8b9dc3] text-sm mb-4">
          Choose which Ethereum network to connect to. This affects all
          blockchain data displayed in the application.
        </p>
      </motion.div>

      <motion.div
        className="space-y-3"
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        {networks.map((network) => (
          <div
            key={network.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 ease-in-out ${
              displayNetwork === network.id
                ? "border-[rgba(0,191,255,0.6)] bg-[rgba(0,191,255,0.15)] shadow-lg shadow-[rgba(0,191,255,0.1)]"
                : "border-[rgba(0,191,255,0.2)] bg-transparent hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)] hover:shadow-md hover:shadow-[rgba(0,191,255,0.05)]"
            }`}
            onClick={() => handleNetworkSwitch(network.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${network.color}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-medium text-sm ${displayNetwork === network.id ? "text-[#00bfff]" : "text-[#8b9dc3]"}`}
                    >
                      {network.name}
                    </h4>
                    {displayNetwork === network.id && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-[rgba(0,191,255,0.2)] text-[#00bfff] rounded-full border border-[rgba(0,191,255,0.3)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[#8b9dc3] text-xs mt-1">
                    {network.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[#6b7280] text-xs">
                      Chain ID: {network.chainId}
                    </span>
                    <span className="text-[#6b7280] text-xs">
                      Status:{" "}
                      {displayNetwork === network.id
                        ? "Connected"
                        : "Available"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <AnimatePresence mode="wait">
                  {isSwitching && displayNetwork !== network.id ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <Loader2 className="w-4 h-4 text-[#00bfff] animate-spin" />
                    </motion.div>
                  ) : displayNetwork === network.id ? (
                    <motion.div
                      key="check"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{
                        duration: 0.3,
                        ease: "backOut",
                        scale: { type: "spring", stiffness: 300, damping: 20 },
                      }}
                    >
                      <Check className="w-4 h-4 text-[#00bfff]" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="mt-6 p-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.2)] rounded-lg"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Custom RPC Endpoint
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          You can configure custom RPC endpoints in your environment variables.
        </p>
        <div className="text-[#6b7280] text-xs font-mono">
          VITE_ETHEREUM_RPC_URL=your_custom_endpoint
        </div>
      </motion.div>
    </motion.div>
  );
};
