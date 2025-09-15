export const PYUSD_CONTRACTS: Record<string, string> = {
  "0x6c3ea9036406852006290770bedfcaba0e23a0e8": "PYUSD Token",
};

export const PYUSD_CONTRACT_ADDRESSES = Object.keys(PYUSD_CONTRACTS).map(
  (addr) => addr.toLowerCase(),
);

export const PYUSD_SIGNATURES: Record<
  string,
  { name: string; category: string }
> = {
  "0xa9059cbb": { name: "transfer", category: "token_movement" },
  "0x23b872dd": { name: "transferFrom", category: "token_movement" },

  "0x40c10f19": { name: "mint", category: "supply_change" },
  "0x42966c68": { name: "burn", category: "supply_change" },
  "0x79cc6790": { name: "burnFrom", category: "supply_change" },

  "0x095ea7b3": { name: "approve", category: "allowance" },
  "0x39509351": { name: "increaseAllowance", category: "allowance" },
  "0xa457c2d7": { name: "decreaseAllowance", category: "allowance" },

  "0x8456cb59": { name: "pause", category: "control" },
  "0x3f4ba83a": { name: "unpause", category: "control" },
  "0xf2fde38b": { name: "transferOwnership", category: "control" },

  "0x2f2ff15d": { name: "grantRole", category: "admin" },
  "0xd547741f": { name: "revokeRole", category: "admin" },
  "0x36568abe": { name: "renounceRole", category: "admin" },

  "0x70a08231": { name: "balanceOf", category: "view" },
  "0xdd62ed3e": { name: "allowance", category: "view" },
  "0x18160ddd": { name: "totalSupply", category: "view" },
  "0x95d89b41": { name: "symbol", category: "view" },
  "0x06fdde03": { name: "name", category: "view" },
  "0x313ce567": { name: "decimals", category: "view" },
};

export const DEBUG_TRACE_CONFIGS = {
  callTracer: {
    onlyTopCall: false,
    withLog: true,
  },
  default: {
    tracer: "callTracer" as const,
    tracerConfig: {
      onlyTopCall: false,
      withLog: true,
    },
  },
};

export const VALID_BLOCK_TAGS = [
  "latest",
  "pending",
  "earliest",
  "safe",
  "finalized",
];

export const BLOCK_IDENTIFIER_PATTERNS = {
  blockNumber: /^\d+$/,
  hexBlockNumber: /^0x[0-9a-fA-F]+$/,
  blockHash: /^0x[0-9a-fA-F]{64}$/,
  transactionHash: /^0x[0-9a-fA-F]{64}$/,
};

export const CACHE_CONFIG = {
  DEBUG_BLOCK_TRACE_TTL: 30 * 60 * 1000,
  BLOCK_INFO_TTL: 5 * 60 * 1000,

  MAX_CACHE_ENTRIES: 50,

  CACHE_KEYS: {
    DEBUG_BLOCK_TRACE: "debug_block_trace",
    BLOCK_INFO: "block_info",
    PROCESSED_DATA: "processed_debug_block_data",
  },
};

export const RPC_METHODS = {
  DEBUG_TRACE_BLOCK_BY_NUMBER: "debug_traceBlockByNumber",
  DEBUG_TRACE_BLOCK_BY_HASH: "debug_traceBlockByHash",
  ETH_GET_BLOCK_BY_NUMBER: "eth_getBlockByNumber",
  ETH_GET_BLOCK_BY_HASH: "eth_getBlockByHash",
} as const;

export const ERROR_MESSAGES = {
  INVALID_BLOCK_IDENTIFIER: "Invalid block identifier format",
  BLOCK_NOT_FOUND: "Block not found",
  NETWORK_ERROR: "Network connection error",
  RPC_ERROR: "RPC method call failed",
  PARSING_ERROR: "Failed to parse trace data",
  TIMEOUT_ERROR: "Request timed out",
  INSUFFICIENT_DATA: "Insufficient trace data for analysis",
  PYUSD_CONTRACT_NOT_FOUND: "PYUSD contract interaction not found",
};

export const DISPLAY_CONFIG = {
  MAX_DISPLAY_TRANSACTIONS: 15,
  MAX_DISPLAY_INTERNAL_CALLS: 10,

  ETH_DECIMAL_PLACES: 6,
  PYUSD_DECIMAL_PLACES: 2,
  PERCENTAGE_DECIMAL_PLACES: 1,

  ADDRESS_DISPLAY_LENGTH: 10,

  CHART_COLORS: {
    PYUSD_TRANSACTION: "#10B981",
    OTHER_TRANSACTION: "#6B7280",
    SUCCESS: "#10B981",
    FAILED: "#EF4444",
    PRIMARY: "#3B82F6",
    SECONDARY: "#8B5CF6",
  },
};

export const EXPORT_CONFIG = {
  CSV_HEADERS: {
    TRANSACTIONS: [
      "tx_index",
      "tx_hash",
      "from",
      "to",
      "value_eth",
      "gas_used",
      "failed",
      "pyusd_interaction",
      "pyusd_function",
      "pyusd_function_category",
      "is_pyusd_transfer",
      "is_pyusd_mint",
      "is_pyusd_burn",
      "transfer_value",
    ],
    PYUSD_TRANSFERS: ["from", "to", "value", "tx_hash"],
    INTERNAL_TRANSACTIONS: [
      "tx_hash",
      "from",
      "to",
      "to_contract",
      "function",
      "call_type",
      "gas_used",
      "depth",
    ],
  },

  DEFAULT_FILENAMES: {
    CSV: "debug_block_trace_transactions",
    JSON: "debug_block_trace_analysis",
    SHEETS: "Debug Block Trace Analysis",
  },
};

export const PERFORMANCE_CONFIG = {
  DEBUG_TRACE_TIMEOUT: 300000,
  BLOCK_INFO_TIMEOUT: 30000,

  MAX_CONCURRENT_REQUESTS: 3,
  BATCH_SIZE: 10,

  MAX_TRACE_ITEMS_IN_MEMORY: 1000,
  CLEANUP_INTERVAL: 60000,
};

export const NETWORK_CONFIG = {
  SUPPORTED_NETWORKS: ["mainnet", "sepolia"],
  DEFAULT_NETWORK: "mainnet",

  LARGE_BLOCK_THRESHOLD: 200,
  VERY_LARGE_BLOCK_THRESHOLD: 500,

  HIGH_GAS_THRESHOLD: 50,
  VERY_HIGH_GAS_THRESHOLD: 100,
};

export const getContractName = (address: string): string => {
  return PYUSD_CONTRACTS[address.toLowerCase()] || "Unknown Contract";
};

export const isPyusdContract = (address: string): boolean => {
  return PYUSD_CONTRACT_ADDRESSES.includes(address.toLowerCase());
};

export const getFunctionInfo = (methodSig: string) => {
  return PYUSD_SIGNATURES[methodSig] || { name: "Unknown", category: "other" };
};

export const isValidBlockTag = (tag: string): boolean => {
  return VALID_BLOCK_TAGS.includes(tag.toLowerCase());
};

export const getBlockIdentifierType = (identifier: string): string => {
  if (VALID_BLOCK_TAGS.includes(identifier.toLowerCase())) {
    return "block_tag";
  }

  if (BLOCK_IDENTIFIER_PATTERNS.blockHash.test(identifier)) {
    return "block_hash_or_tx_hash";
  }

  if (/^0x[0-9a-fA-F]{40}$/.test(identifier)) {
    return "contract_address";
  }

  if (BLOCK_IDENTIFIER_PATTERNS.hexBlockNumber.test(identifier)) {
    return "hex_block_number";
  }

  if (BLOCK_IDENTIFIER_PATTERNS.blockNumber.test(identifier)) {
    return "block_number";
  }

  return "invalid";
};
