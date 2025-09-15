export const BYTECODE_ANALYSIS_CONFIG = {
  DEFAULT_NETWORK: "mainnet",
  CACHE_DURATION: 30 * 60 * 1000,
  MAX_CONTRACTS_PER_ANALYSIS: 10,
  MIN_BYTECODE_SIZE: 2,
  COMPLEXITY_THRESHOLDS: {
    LOW: 10,
    MEDIUM: 50,
  },
  SIMILARITY_THRESHOLD: 80,
};

export const CHART_COLORS = {
  PRIMARY: "#00bfff",
  SECONDARY: "#8b9dc3",
  SUCCESS: "#10b981",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  INFO: "#3b82f6",
  PURPLE: "#8b5cf6",
  PINK: "#ec4899",
  INDIGO: "#6366f1",
  TEAL: "#14b8a6",
};

export const STANDARD_COLORS = {
  ERC20: CHART_COLORS.SUCCESS,
  ERC721: CHART_COLORS.INFO,
  ERC1155: CHART_COLORS.PURPLE,
  Proxy: CHART_COLORS.WARNING,
  Security: CHART_COLORS.ERROR,
  Unknown: CHART_COLORS.SECONDARY,
};

export const COMPLEXITY_COLORS = {
  Low: CHART_COLORS.SUCCESS,
  Medium: CHART_COLORS.WARNING,
  High: CHART_COLORS.ERROR,
};

export const EXAMPLE_CONTRACTS = {
  STABLECOINS: [
    {
      name: "USDC",
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      description: "USD Coin - Centre Consortium stablecoin",
    },
    {
      name: "USDT",
      address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      description: "Tether USD - Tether stablecoin",
    },
    {
      name: "DAI",
      address: "0x6b175474e89094c44da98b954eedeac495271d0f",
      description: "Dai Stablecoin - MakerDAO decentralized stablecoin",
    },
  ],
  DEFI_PROTOCOLS: [
    {
      name: "Uniswap V3 Factory",
      address: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
      description: "Uniswap V3 Factory contract",
    },
    {
      name: "Compound cUSDC",
      address: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
      description: "Compound USD Coin market",
    },
  ],
  PROXY_EXAMPLES: [
    {
      name: "OpenZeppelin Proxy",
      address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      description: "Example of OpenZeppelin proxy pattern",
    },
  ],
};

export const RPC_ENDPOINTS = {
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
  },
  sepolia: {
    name: "Sepolia Testnet",
    chainId: 11155111,
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
  },
  holesky: {
    name: "Holesky Testnet",
    chainId: 17000,
    rpcUrl: "https://ethereum-holesky.publicnode.com",
  },
};

export const ANALYSIS_MODES = {
  SINGLE: "single",
  MULTIPLE: "multiple",
  TRANSACTION: "transaction",
  COMPARISON: "comparison",
} as const;

export const EXPORT_FORMATS = {
  JSON: "json",
  CSV: "csv",
} as const;
