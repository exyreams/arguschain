export interface RpcProvider {
  name: string;
  description: string;
  website?: string;
  networks: string[];
  capabilities: {
    txpool_status: boolean;
    txpool_content: boolean;
    txpool_inspect: boolean;
    debug_traceTransaction: boolean;
  };
  costMultipliers: {
    txpool_status?: number;
    txpool_content?: number;
    txpool_inspect?: number;
  };
  limitations: string[];
  recommendations: string[];
}

export const RPC_PROVIDERS: Record<string, RpcProvider> = {
  google_cloud: {
    name: "Google Cloud Ethereum",
    description: "Google Cloud's managed Ethereum RPC service",
    website: "https://cloud.google.com/web3",
    networks: ["mainnet", "sepolia"],
    capabilities: {
      txpool_status: true,
      txpool_content: false,
      txpool_inspect: false,
      debug_traceTransaction: true,
    },
    costMultipliers: {
      txpool_status: 50,
    },
    limitations: [
      "No txpool_content support - cannot analyze live mempool transactions",
      "No txpool_inspect support - cannot get detailed transaction info",
      "Can use debug_traceTransaction for recent transaction analysis",
      "Rate limiting may apply for frequent requests",
    ],
    recommendations: [
      "Use Tx Status page for basic mempool monitoring",
      "Use Transaction Pool page with recent transaction analysis",
      "Good for production applications needing reliable uptime",
    ],
  },

  alchemy: {
    name: "Alchemy",
    description: "Enhanced Ethereum API with additional features",
    website: "https://www.alchemy.com",
    networks: ["mainnet", "sepolia", "polygon", "arbitrum"],
    capabilities: {
      txpool_status: true,
      txpool_content: true,
      txpool_inspect: true,
      debug_traceTransaction: true,
    },
    costMultipliers: {
      txpool_status: 50,
      txpool_content: 100,
      txpool_inspect: 75,
    },
    limitations: [
      "Rate limits based on plan tier",
      "txpool_content may be restricted on free tier",
      "Higher costs for debug methods",
    ],
    recommendations: [
      "Excellent for full-featured mempool analysis",
      "Supports all Arguschain features",
      "Consider paid plan for production use",
    ],
  },

  infura: {
    name: "Infura",
    description: "Reliable Ethereum infrastructure provider",
    website: "https://infura.io",
    networks: ["mainnet", "sepolia", "polygon"],
    capabilities: {
      txpool_status: true,
      txpool_content: false,
      txpool_inspect: false,
      debug_traceTransaction: true,
    },
    costMultipliers: {
      txpool_status: 50,
    },
    limitations: [
      "Limited mempool methods support",
      "No txpool_content or txpool_inspect",
      "Debug methods available but may be rate limited",
    ],
    recommendations: [
      "Good for basic mempool monitoring",
      "Use Tx Status page for available features",
      "Consider Alchemy for advanced mempool analysis",
    ],
  },

  quicknode: {
    name: "QuickNode",
    description: "High-performance blockchain infrastructure",
    website: "https://www.quicknode.com",
    networks: ["mainnet", "sepolia", "polygon", "bsc"],
    capabilities: {
      txpool_status: true,
      txpool_content: true,
      txpool_inspect: true,
      debug_traceTransaction: true,
    },
    costMultipliers: {
      txpool_status: 50,
      txpool_content: 100,
      txpool_inspect: 75,
    },
    limitations: [
      "Pricing based on requests per second",
      "Some methods require specific plan tiers",
    ],
    recommendations: [
      "Full support for all mempool features",
      "Good performance for high-volume applications",
      "Check plan requirements for debug methods",
    ],
  },

  ankr: {
    name: "Ankr",
    description: "Multi-chain RPC provider with competitive pricing",
    website: "https://www.ankr.com",
    networks: ["mainnet", "sepolia", "polygon", "bsc", "avalanche"],
    capabilities: {
      txpool_status: true,
      txpool_content: false,
      txpool_inspect: false,
      debug_traceTransaction: true,
    },
    costMultipliers: {
      txpool_status: 50,
    },
    limitations: [
      "Limited mempool methods on free tier",
      "txpool_content not available",
      "Rate limits vary by plan",
    ],
    recommendations: [
      "Cost-effective for basic monitoring",
      "Good multi-chain support",
      "Use Tx Status page for available features",
    ],
  },

  local_node: {
    name: "Local Ethereum Node",
    description: "Self-hosted Ethereum node with full control",
    networks: ["mainnet", "sepolia", "custom"],
    capabilities: {
      txpool_status: true,
      txpool_content: true,
      txpool_inspect: true,
      debug_traceTransaction: true,
    },
    costMultipliers: {
      txpool_status: 1,
      txpool_content: 1,
      txpool_inspect: 1,
    },
    limitations: [
      "Requires technical setup and maintenance",
      "Hardware and bandwidth requirements",
      "Sync time for initial setup",
    ],
    recommendations: [
      "Full control over all features",
      "No rate limits or external costs",
      "Best for development and testing",
      "Requires --txlookuplimit and debug flags",
    ],
  },
};

export function detectRpcProvider(rpcUrl: string): RpcProvider | null {
  const url = rpcUrl.toLowerCase();

  if (url.includes("googleapis.com") || url.includes("google")) {
    return RPC_PROVIDERS.google_cloud;
  }

  if (url.includes("alchemy")) {
    return RPC_PROVIDERS.alchemy;
  }

  if (url.includes("infura")) {
    return RPC_PROVIDERS.infura;
  }

  if (url.includes("quicknode")) {
    return RPC_PROVIDERS.quicknode;
  }

  if (url.includes("ankr")) {
    return RPC_PROVIDERS.ankr;
  }

  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return RPC_PROVIDERS.local_node;
  }

  return null;
}

export function getRecommendedPages(provider: RpcProvider): {
  txStatus: boolean;
  networkMonitor: boolean;
  transactionPool: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  const txStatus = provider.capabilities.txpool_status;

  const networkMonitor = provider.capabilities.txpool_status;

  const transactionPool =
    provider.capabilities.txpool_content ||
    provider.capabilities.debug_traceTransaction;

  if (provider.capabilities.txpool_content) {
    recommendations.push(
      "Full live mempool analysis available with your provider",
    );
  } else if (provider.capabilities.debug_traceTransaction) {
    recommendations.push(
      "Transaction Pool analysis available using recent transaction tracing",
    );
  } else {
    recommendations.push(
      "Consider switching to Alchemy or QuickNode for detailed transaction analysis",
    );
  }

  if (txStatus && networkMonitor) {
    recommendations.push("All basic mempool monitoring features are available");
  }

  return {
    txStatus,
    networkMonitor,
    transactionPool,
    recommendations,
  };
}

export function getAlternativeProviders(
  requiredCapabilities: (keyof RpcProvider["capabilities"])[],
): RpcProvider[] {
  return Object.values(RPC_PROVIDERS).filter((provider) =>
    requiredCapabilities.every(
      (capability) => provider.capabilities[capability],
    ),
  );
}

export function generateProviderComparison(): {
  provider: string;
  txpool_status: boolean;
  txpool_content: boolean;
  txpool_inspect: boolean;
  debug_trace: boolean;
  networks: string;
  cost_level: "Free" | "Low" | "Medium" | "High";
}[] {
  return Object.entries(RPC_PROVIDERS).map(([key, provider]) => ({
    provider: provider.name,
    txpool_status: provider.capabilities.txpool_status,
    txpool_content: provider.capabilities.txpool_content,
    txpool_inspect: provider.capabilities.txpool_inspect,
    debug_trace: provider.capabilities.debug_traceTransaction,
    networks: provider.networks.join(", "),
    cost_level:
      key === "local_node"
        ? "Free"
        : key === "google_cloud"
          ? "Low"
          : key === "ankr"
            ? "Low"
            : key === "infura"
              ? "Medium"
              : "High",
  }));
}
