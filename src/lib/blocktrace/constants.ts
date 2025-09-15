// Network Configuration
export const NETWORKS = {
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
    blockExplorer: "https://etherscan.io",
  },
  sepolia: {
    name: "Sepolia Testnet",
    chainId: 11155111,
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
    blockExplorer: "https://sepolia.etherscan.io",
  },
  holesky: {
    name: "Holesky Testnet",
    chainId: 17000,
    rpcUrl: "https://ethereum-holesky.publicnode.com",
    blockExplorer: "https://holesky.etherscan.io",
  },
} as const;

// PYUSD Contract Addresses
export const PYUSD_CONTRACTS = {
  mainnet: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
  sepolia: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // Same address on testnet
  holesky: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // Same address on testnet
} as const;

// Function Signatures
export const FUNCTION_SIGNATURES = {
  // ERC-20 Standard
  transfer: "0xa9059cbb",
  transferFrom: "0x23b872dd",
  approve: "0x095ea7b3",
  balanceOf: "0x70a08231",
  allowance: "0xdd62ed3e",

  // PYUSD Specific
  mint: "0x40c10f19",
  burn: "0x42966c68",
  burnFrom: "0x79cc6790",
  increaseAllowance: "0x39509351",
  decreaseAllowance: "0xa457c2d7",

  // Common Contract Functions
  constructor: "0x",
  fallback: "0x",
  receive: "0x",
} as const;

// Event Signatures
export const EVENT_SIGNATURES = {
  Transfer:
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  Approval:
    "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
  Mint: "0x0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d4121396885",
  Burn: "0xcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca5",
} as const;

// Gas Limits and Thresholds
export const GAS_LIMITS = {
  SIMPLE_TRANSFER: 21000,
  ERC20_TRANSFER: 65000,
  CONTRACT_INTERACTION: 100000,
  COMPLEX_TRANSACTION: 200000,
  HIGH_GAS_THRESHOLD: 500000,
  VERY_HIGH_GAS_THRESHOLD: 1000000,
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  FAST_EXECUTION: 1000, // 1 second
  MEDIUM_EXECUTION: 5000, // 5 seconds
  SLOW_EXECUTION: 15000, // 15 seconds
  TIMEOUT: 30000, // 30 seconds

  SMALL_BLOCK: 50, // transactions
  MEDIUM_BLOCK: 200, // transactions
  LARGE_BLOCK: 500, // transactions
  VERY_LARGE_BLOCK: 1000, // transactions

  MEMORY_WARNING: 100 * 1024 * 1024, // 100MB
  MEMORY_CRITICAL: 500 * 1024 * 1024, // 500MB
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  BLOCK_TRACE_TTL: 10 * 60 * 1000, // 10 minutes
  ANALYSIS_TTL: 15 * 60 * 1000, // 15 minutes
  MAX_CACHE_SIZE: 100, // entries
  MAX_MEMORY_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: "#00bfff",
  SECONDARY: "#8b9dc3",
  SUCCESS: "#10b981",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  INFO: "#3b82f6",

  CATEGORIES: [
    "#00bfff", // Primary blue
    "#10b981", // Green
    "#f59e0b", // Orange
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange-red
    "#ec4899", // Pink
    "#6366f1", // Indigo
  ],

  GAS_EFFICIENCY: {
    EXCELLENT: "#10b981",
    GOOD: "#84cc16",
    AVERAGE: "#f59e0b",
    POOR: "#ef4444",
  },

  TRANSACTION_TYPES: {
    eth_transfer: "#00bfff",
    contract_call: "#10b981",
    contract_creation: "#f59e0b",
    pyusd_transaction: "#8b5cf6",
    token_transfer: "#06b6d4",
    defi_interaction: "#ec4899",
    other: "#6b7280",
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_BLOCK_ID:
    "Invalid block identifier. Please provide a valid block number, hash, or tag.",
  BLOCK_NOT_FOUND:
    "Block not found. Please check the block identifier and try again.",
  NETWORK_ERROR:
    "Network error occurred. Please check your connection and try again.",
  RPC_ERROR: "RPC call failed. The node may be unavailable or overloaded.",
  TIMEOUT_ERROR:
    "Request timed out. The block may be too large or the network is slow.",
  PROCESSING_ERROR:
    "Error processing block data. The data may be corrupted or incomplete.",
  CACHE_ERROR: "Cache operation failed. Analysis will proceed without caching.",
  EXPORT_ERROR:
    "Export operation failed. Please try again or use a different format.",
  VALIDATION_ERROR:
    "Data validation failed. The analysis results may be incomplete.",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ANALYSIS_COMPLETE: "Block analysis completed successfully!",
  EXPORT_COMPLETE: "Data exported successfully!",
  CACHE_HIT: "Using cached analysis results.",
  VALIDATION_PASSED: "All data validation checks passed.",
} as const;

// Analysis Categories
export const TRANSACTION_CATEGORIES = {
  ETH_TRANSFER: {
    type: "eth_transfer",
    description: "Simple ETH transfer between addresses",
    color: CHART_COLORS.TRANSACTION_TYPES.eth_transfer,
  },
  CONTRACT_CALL: {
    type: "contract_call",
    description: "Smart contract function call",
    color: CHART_COLORS.TRANSACTION_TYPES.contract_call,
  },
  CONTRACT_CREATION: {
    type: "contract_creation",
    description: "New smart contract deployment",
    color: CHART_COLORS.TRANSACTION_TYPES.contract_creation,
  },
  PYUSD_TRANSACTION: {
    type: "pyusd_transaction",
    description: "PYUSD token interaction",
    color: CHART_COLORS.TRANSACTION_TYPES.pyusd_transaction,
  },
  TOKEN_TRANSFER: {
    type: "token_transfer",
    description: "ERC-20 token transfer",
    color: CHART_COLORS.TRANSACTION_TYPES.token_transfer,
  },
  DEFI_INTERACTION: {
    type: "defi_interaction",
    description: "DeFi protocol interaction",
    color: CHART_COLORS.TRANSACTION_TYPES.defi_interaction,
  },
  OTHER: {
    type: "other",
    description: "Other transaction type",
    color: CHART_COLORS.TRANSACTION_TYPES.other,
  },
} as const;

// PYUSD Function Types
export const PYUSD_FUNCTION_TYPES = {
  TRANSFER: {
    signature: FUNCTION_SIGNATURES.transfer,
    name: "transfer",
    description: "Transfer PYUSD tokens",
    gasEstimate: 65000,
  },
  TRANSFER_FROM: {
    signature: FUNCTION_SIGNATURES.transferFrom,
    name: "transferFrom",
    description: "Transfer PYUSD tokens on behalf of another address",
    gasEstimate: 70000,
  },
  APPROVE: {
    signature: FUNCTION_SIGNATURES.approve,
    name: "approve",
    description: "Approve PYUSD token spending",
    gasEstimate: 45000,
  },
  MINT: {
    signature: FUNCTION_SIGNATURES.mint,
    name: "mint",
    description: "Mint new PYUSD tokens",
    gasEstimate: 80000,
  },
  BURN: {
    signature: FUNCTION_SIGNATURES.burn,
    name: "burn",
    description: "Burn PYUSD tokens",
    gasEstimate: 60000,
  },
} as const;

// Export Formats
export const EXPORT_FORMATS = {
  CSV: {
    extension: "csv",
    mimeType: "text/csv",
    description: "Comma-separated values",
  },
  JSON: {
    extension: "json",
    mimeType: "application/json",
    description: "JavaScript Object Notation",
  },
  GOOGLE_SHEETS: {
    extension: "sheets",
    mimeType: "application/vnd.google-apps.spreadsheet",
    description: "Google Sheets",
  },
} as const;

// Accessibility
export const ACCESSIBILITY = {
  ARIA_LABELS: {
    BLOCK_INPUT: "Enter block number, hash, or tag",
    NETWORK_SELECTOR: "Select blockchain network",
    ANALYZE_BUTTON: "Start block analysis",
    EXPORT_BUTTON: "Export analysis results",
    CHART_CONTAINER: "Analysis chart container",
    TABLE_CONTAINER: "Transaction data table",
  },

  KEYBOARD_SHORTCUTS: {
    ANALYZE: "Enter",
    EXPORT: "Ctrl+E",
    FOCUS_INPUT: "Ctrl+I",
    FOCUS_RESULTS: "Ctrl+R",
  },

  SCREEN_READER_MESSAGES: {
    ANALYSIS_STARTED: "Block analysis started",
    ANALYSIS_COMPLETE: "Block analysis completed",
    EXPORT_STARTED: "Export started",
    EXPORT_COMPLETE: "Export completed",
    ERROR_OCCURRED: "An error occurred",
  },
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_CACHING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ADVANCED_CHARTS: true,
  ENABLE_EXPORT: true,
  ENABLE_GOOGLE_SHEETS: false, // Disabled by default
  ENABLE_GRAPHVIZ_DIAGRAMS: true,
  ENABLE_ACCESSIBILITY_FEATURES: true,
  ENABLE_DEBUG_LOGGING: false,
} as const;
