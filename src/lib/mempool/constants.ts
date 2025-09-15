export const PYUSD_CONTRACTS = {
  mainnet: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
  sepolia: "0x",
} as const;

export const PYUSD_SIGNATURES = {
  "0xa9059cbb": "transfer",
  "0x23b872dd": "transferFrom",
  "0x095ea7b3": "approve",
  "0xa0712d68": "mint",
  "0x42966c68": "burn",
  "0x8da5cb5b": "owner",
  "0x70a08231": "balanceOf",
  "0xdd62ed3e": "allowance",
} as const;

export const CONGESTION_THRESHOLDS = {
  LOW: 1000,
  MODERATE: 5000,
  HIGH: 15000,
} as const;

export const GAS_MULTIPLIERS = {
  slow: 1.0,
  standard: 1.1,
  fast: 1.25,
  rapid: 1.5,

  highCongestion: {
    standard: 1.2,
    fast: 1.5,
    rapid: 2.0,
  },

  moderateCongestion: {
    standard: 1.15,
    fast: 1.35,
    rapid: 1.7,
  },
} as const;

export const ETHEREUM_CONSTANTS = {
  AVERAGE_BLOCK_TIME: 12,
  AVERAGE_TX_PER_BLOCK: 250,
  AVERAGE_TX_PER_SECOND: 15,
} as const;

export const RPC_METHODS = {
  txpool_status: {
    cost_multiplier: 50,
    description: "Get transaction pool status (pending/queued counts)",
    cache_ttl: 30000,
  },
  txpool_content: {
    cost_multiplier: 100,
    description: "Get full transaction pool content (very expensive)",
    cache_ttl: 60000,
    warning:
      "This method is extremely expensive and may be restricted on many RPC endpoints",
  },
} as const;

export const CONGESTION_COLORS = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#f97316",
  extreme: "#ef4444",
} as const;

export const EXPORT_FORMATS = {
  CSV: "csv",
  JSON: "json",
  PDF: "pdf",
} as const;

export const CACHE_KEYS = {
  TXPOOL_STATUS: "mempool:txpool_status",
  TXPOOL_CONTENT: "mempool:txpool_content",
  BASE_FEE: "mempool:base_fee",
  GAS_RECOMMENDATIONS: "mempool:gas_recommendations",
} as const;

export const DEFAULTS = {
  BASE_FEE_GWEI: 15.0,
  REFRESH_INTERVAL: 30000,
  MAX_TRANSACTIONS_DISPLAY: 1000,
  PAGINATION_SIZE: 50,
} as const;
