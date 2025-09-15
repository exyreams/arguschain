export const PYUSD_CONFIG = {
  ethereum: {
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    decimals: 6,
    symbol: "PYUSD",
    name: "PayPal USD",

    transfer_event_topic:
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  },
  sepolia: {
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    decimals: 6,
    symbol: "PYUSD",
    name: "PayPal USD (Testnet)",
    transfer_event_topic:
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  },
} as const;

export const RPC_LIMITS = {
  google_blockchain_api: {
    max_block_range: 5,
    name: "Google Blockchain API",
    identifier: "blockchain.googleapis.com",
  },
  alchemy: {
    max_block_range: 2000,
    name: "Alchemy",
    identifier: "alchemyapi.io",
  },
  infura: {
    max_block_range: 10000,
    name: "Infura",
    identifier: "infura.io",
  },
  quicknode: {
    max_block_range: 10000,
    name: "QuickNode",
    identifier: "quiknode.pro",
  },
  default: {
    max_block_range: 1000,
    name: "Default RPC",
    identifier: "unknown",
  },
} as const;

export const ANALYSIS_CONFIG = {
  default_block_range: 5,
  max_display_results: 1000,
  top_participants_limit: 20,
  top_flows_limit: 50,
  distribution_buckets: 10,
  time_series_interval: "hour",

  performance_warnings: {
    large_dataset_threshold: 500,
    slow_query_threshold_ms: 10000,
    memory_usage_warning_mb: 100,
  },

  charts: {
    max_data_points: 1000,
    default_colors: ["#00bfff", "#0099cc", "#66d9ff", "#004d66", "#33ccff"],
    sankey_opacity: 0.3,
    histogram_bins: 50,
  },
} as const;

export const EXPORT_FORMATS = {
  csv: {
    extension: ".csv",
    mime_type: "text/csv",
    description: "Comma-separated values",
  },
  json: {
    extension: ".json",
    mime_type: "application/json",
    description: "JavaScript Object Notation",
  },
  xlsx: {
    extension: ".xlsx",
    mime_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    description: "Excel spreadsheet",
  },
} as const;

export const ERROR_CODES = {
  INVALID_BLOCK_RANGE: "INVALID_BLOCK_RANGE",
  RPC_ERROR: "RPC_ERROR",
  PARSING_ERROR: "PARSING_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_BLOCK_RANGE]: "Invalid block range specified",
  [ERROR_CODES.RPC_ERROR]: "RPC request failed",
  [ERROR_CODES.PARSING_ERROR]: "Failed to parse log data",
  [ERROR_CODES.NETWORK_ERROR]: "Network connection error",
  [ERROR_CODES.VALIDATION_ERROR]: "Data validation failed",
  [ERROR_CODES.TIMEOUT_ERROR]: "Request timed out",
  [ERROR_CODES.RATE_LIMIT_ERROR]: "Rate limit exceeded",
} as const;

export const BLOCK_PATTERNS = {
  hex: /^0x[0-9a-fA-F]+$/,
  decimal: /^\d+$/,
  tags: ["latest", "pending", "earliest", "finalized", "safe"],
} as const;

export const ADDRESS_PATTERNS = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
} as const;

export const DEFAULT_QUERIES = {
  recent_transfers: {
    description: "Recent PYUSD transfers (last 5 blocks)",
    from_block: "latest-4" as any,
    to_block: "latest",
    analysis_depth: "full" as const,
  },
  single_block: {
    description: "Single block analysis",
    analysis_depth: "basic" as const,
  },
  custom_range: {
    description: "Custom block range (respects RPC limits)",
    analysis_depth: "advanced" as const,
  },
} as const;

export const CHART_THEMES = {
  default: {
    background: "rgba(25,28,40,0.8)",
    text_color: "#8b9dc3",
    primary_color: "#00bfff",
    secondary_color: "#0099cc",
    accent_color: "#66d9ff",
    border_color: "rgba(0,191,255,0.2)",
    grid_color: "rgba(0,191,255,0.1)",
  },
  dark: {
    background: "#0f1419",
    text_color: "#ffffff",
    primary_color: "#00bfff",
    secondary_color: "#0099cc",
    accent_color: "#66d9ff",
    border_color: "rgba(0,191,255,0.3)",
    grid_color: "rgba(0,191,255,0.15)",
  },
} as const;

export const getContractConfig = (network: "mainnet" | "sepolia") => {
  return network === "mainnet" ? PYUSD_CONFIG.ethereum : PYUSD_CONFIG.sepolia;
};

export const getRpcLimits = (rpcUrl: string) => {
  for (const [key, config] of Object.entries(RPC_LIMITS)) {
    if (key !== "default" && rpcUrl.includes(config.identifier)) {
      return config;
    }
  }
  return RPC_LIMITS.default;
};

export const formatPyusdValue = (
  value: number,
  decimals: number = 6,
): string => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const shortenAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4,
): string => {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};
