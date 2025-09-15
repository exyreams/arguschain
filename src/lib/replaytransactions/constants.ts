import type { ReplayTracer, TokenConfig } from "./types";

export const REPLAY_CONFIG = {
  defaultTracers: ["trace", "stateDiff"] as ReplayTracer[],
  maxRetries: 3,
  timeout: 30000,
  cacheEnabled: true,
  cacheTTL: 300000,
  maxBlockSize: 100,
} as const;

export const ERC20_STORAGE_SLOTS = {
  TOTAL_SUPPLY: 0,
  BALANCES: 1,
  ALLOWANCES: 2,
  OWNER: 3,
  PAUSED: 4,
  NAME: 5,
  SYMBOL: 6,
  DECIMALS: 7,
} as const;

export const ERC20_SIGNATURES = {
  "0xa9059cbb": { name: "transfer", category: "transfer" },
  "0x23b872dd": { name: "transferFrom", category: "transfer" },
  "0x095ea7b3": { name: "approve", category: "approval" },
  "0x70a08231": { name: "balanceOf", category: "view" },
  "0xdd62ed3e": { name: "allowance", category: "view" },
  "0x18160ddd": { name: "totalSupply", category: "view" },

  "0x40c10f19": { name: "mint", category: "admin" },
  "0x42966c68": { name: "burn", category: "admin" },
  "0x79cc6790": { name: "burnFrom", category: "admin" },

  "0x8da5cb5b": { name: "owner", category: "view" },
  "0xf2fde38b": { name: "transferOwnership", category: "admin" },
  "0x715018a6": { name: "renounceOwnership", category: "admin" },

  "0x5c975abb": { name: "paused", category: "view" },
  "0x8456cb59": { name: "pause", category: "admin" },
  "0x3f4ba83a": { name: "unpause", category: "admin" },

  "0x313ce567": { name: "decimals", category: "view" },
  "0x95d89b41": { name: "symbol", category: "view" },
  "0x06fdde03": { name: "name", category: "view" },

  "0xd505accf": { name: "permit", category: "approval" },
  "0x7ecebe00": { name: "nonces", category: "view" },

  "0x8d80ff0a": { name: "multiSend", category: "batch" },
  "0x6a761202": { name: "execTransaction", category: "batch" },
} as const;

export const KNOWN_TOKENS: TokenConfig[] = [
  {
    address: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
    symbol: "PYUSD",
    decimals: 6,
    name: "PayPal USD",
    isStablecoin: true,
    category: "stablecoin",
  },
  {
    address: "0xa0b86a33e6441e6c8d3c1c4b0b8b4b8b8b8b8b8b",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
    isStablecoin: true,
    category: "stablecoin",
  },
  {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    symbol: "USDT",
    decimals: 6,
    name: "Tether USD",
    isStablecoin: true,
    category: "stablecoin",
  },
  {
    address: "0xa0b86a33e6441e6c8d3c1c4b0b8b4b8b8b8b8b8b",
    symbol: "WETH",
    decimals: 18,
    name: "Wrapped Ether",
    category: "wrapped",
  },
] as const;

export const GAS_PROFILES = {
  transfer: { low: 21000, typical: 65000, high: 80000 },
  transferFrom: { low: 21000, typical: 80000, high: 100000 },
  mint: { low: 50000, typical: 120000, high: 150000 },
  burn: { low: 30000, typical: 90000, high: 120000 },
  approve: { low: 21000, typical: 46000, high: 60000 },
  pause: { low: 25000, typical: 35000, high: 50000 },
  unpause: { low: 25000, typical: 35000, high: 50000 },
  transferOwnership: { low: 25000, typical: 35000, high: 50000 },
} as const;

export const SECURITY_THRESHOLDS = {
  largeTransfer: 1000000,
  highGasUsage: 500000,
  suspiciousPatterns: {
    rapidTransfers: 10,
    circularTransfers: 3,
    zeroValueTransfers: 5,
  },
} as const;

export const OPCODE_CATEGORIES = {
  arithmetic: [
    "ADD",
    "SUB",
    "MUL",
    "DIV",
    "MOD",
    "ADDMOD",
    "MULMOD",
    "EXP",
    "SIGNEXTEND",
  ],
  comparison: [
    "LT",
    "GT",
    "SLT",
    "SGT",
    "EQ",
    "ISZERO",
    "AND",
    "OR",
    "XOR",
    "NOT",
  ],
  bitwise: ["BYTE", "SHL", "SHR", "SAR"],
  keccak: ["KECCAK256"],
  environment: [
    "ADDRESS",
    "BALANCE",
    "ORIGIN",
    "CALLER",
    "CALLVALUE",
    "CALLDATALOAD",
    "CALLDATASIZE",
    "CALLDATACOPY",
    "CODESIZE",
    "CODECOPY",
    "GASPRICE",
    "EXTCODESIZE",
    "EXTCODECOPY",
    "RETURNDATASIZE",
    "RETURNDATACOPY",
    "EXTCODEHASH",
  ],
  block: [
    "BLOCKHASH",
    "COINBASE",
    "TIMESTAMP",
    "NUMBER",
    "DIFFICULTY",
    "GASLIMIT",
    "CHAINID",
    "SELFBALANCE",
    "BASEFEE",
  ],
  storage: ["SLOAD", "SSTORE"],
  memory: ["MLOAD", "MSTORE", "MSTORE8", "MSIZE"],
  stack: [
    "POP",
    "PUSH1",
    "PUSH2",
    "PUSH3",
    "PUSH4",
    "PUSH5",
    "PUSH6",
    "PUSH7",
    "PUSH8",
    "PUSH9",
    "PUSH10",
    "PUSH11",
    "PUSH12",
    "PUSH13",
    "PUSH14",
    "PUSH15",
    "PUSH16",
    "PUSH17",
    "PUSH18",
    "PUSH19",
    "PUSH20",
    "PUSH21",
    "PUSH22",
    "PUSH23",
    "PUSH24",
    "PUSH25",
    "PUSH26",
    "PUSH27",
    "PUSH28",
    "PUSH29",
    "PUSH30",
    "PUSH31",
    "PUSH32",
    "DUP1",
    "DUP2",
    "DUP3",
    "DUP4",
    "DUP5",
    "DUP6",
    "DUP7",
    "DUP8",
    "DUP9",
    "DUP10",
    "DUP11",
    "DUP12",
    "DUP13",
    "DUP14",
    "DUP15",
    "DUP16",
    "SWAP1",
    "SWAP2",
    "SWAP3",
    "SWAP4",
    "SWAP5",
    "SWAP6",
    "SWAP7",
    "SWAP8",
    "SWAP9",
    "SWAP10",
    "SWAP11",
    "SWAP12",
    "SWAP13",
    "SWAP14",
    "SWAP15",
    "SWAP16",
  ],
  flow: ["JUMP", "JUMPI", "PC", "GAS", "JUMPDEST"],
  system: [
    "CREATE",
    "CALL",
    "CALLCODE",
    "RETURN",
    "DELEGATECALL",
    "CREATE2",
    "STATICCALL",
    "REVERT",
    "INVALID",
    "SELFDESTRUCT",
  ],
  log: ["LOG0", "LOG1", "LOG2", "LOG3", "LOG4"],
} as const;

export const VISUALIZATION_COLORS = {
  primary: "#00bfff",
  secondary: "#8b9dc3",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#ef4444",
  info: "#3b82f6",

  tokenFlow: {
    mint: "#10b981",
    burn: "#ef4444",
    transfer: "#3b82f6",
    approve: "#f59e0b",
  },

  security: {
    critical: "#dc2626",
    high: "#ea580c",
    warning: "#d97706",
    info: "#2563eb",
  },

  chart: [
    "#00bfff",
    "#8b9dc3",
    "#4ade80",
    "#fbbf24",
    "#ef4444",
    "#a855f7",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
  ],

  background: {
    primary: "rgba(25,28,40,0.8)",
    secondary: "rgba(15,20,25,0.8)",
    accent: "rgba(0,191,255,0.1)",
    border: "rgba(0,191,255,0.2)",
  },
} as const;

export const EXPORT_FORMATS = {
  csv: {
    extension: ".csv",
    mimeType: "text/csv",
    maxRows: 100000,
  },
  json: {
    extension: ".json",
    mimeType: "application/json",
    maxSize: 50 * 1024 * 1024,
  },
  xlsx: {
    extension: ".xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    maxRows: 1000000,
  },
} as const;

export const RPC_METHODS = {
  replayTransaction: {
    method: "trace_replayTransaction",
    costMultiplier: 100,
    timeout: 60000,
    maxRetries: 2,
  },
  replayBlockTransactions: {
    method: "trace_replayBlockTransactions",
    costMultiplier: 1000,
    timeout: 300000,
    maxRetries: 1,
  },
} as const;

export const CACHE_KEYS = {
  replayTransaction: (txHash: string, network: string, tracers: string[]) =>
    `replay_tx_${txHash}_${network}_${tracers.sort().join("_")}`,
  replayBlock: (blockId: string, network: string, tracers: string[]) =>
    `replay_block_${blockId}_${network}_${tracers.sort().join("_")}`,
  tokenConfig: (address: string) => `token_config_${address.toLowerCase()}`,
  gasPrice: (network: string) => `gas_price_${network}`,
} as const;

export const ERROR_CODES = {
  INVALID_TX_HASH: "INVALID_TX_HASH",
  INVALID_BLOCK_ID: "INVALID_BLOCK_ID",
  UNSUPPORTED_TRACER: "UNSUPPORTED_TRACER",
  RPC_ERROR: "RPC_ERROR",
  TIMEOUT: "TIMEOUT",
  RATE_LIMITED: "RATE_LIMITED",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  NETWORK_ERROR: "NETWORK_ERROR",
  PARSING_ERROR: "PARSING_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  OPERATION_CANCELLED: "OPERATION_CANCELLED",
} as const;

export const getTokenConfig = (address: string): TokenConfig | undefined => {
  return KNOWN_TOKENS.find(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
};

export const getFunctionSignature = (signature: string) => {
  return ERC20_SIGNATURES[signature as keyof typeof ERC20_SIGNATURES];
};

export const getOpcodeCategory = (opcode: string): string => {
  for (const [category, opcodes] of Object.entries(OPCODE_CATEGORIES)) {
    if (opcodes.includes(opcode)) {
      return category;
    }
  }
  return "unknown";
};

export const getGasProfile = (operation: string) => {
  return GAS_PROFILES[operation as keyof typeof GAS_PROFILES];
};

export const categorizeGasUsage = (
  gasUsed: number,
  operation: string,
): {
  category: "excellent" | "good" | "average" | "poor";
  efficiency: number;
} => {
  const profile = getGasProfile(operation);
  if (!profile) {
    return { category: "average", efficiency: 50 };
  }

  if (gasUsed <= profile.low) {
    return { category: "excellent", efficiency: 100 };
  } else if (gasUsed <= profile.typical) {
    const efficiency =
      100 - ((gasUsed - profile.low) / (profile.typical - profile.low)) * 20;
    return { category: "good", efficiency };
  } else if (gasUsed <= profile.high) {
    const efficiency =
      80 -
      ((gasUsed - profile.typical) / (profile.high - profile.typical)) * 30;
    return { category: "average", efficiency };
  } else {
    const excess = (gasUsed - profile.high) / profile.high;
    const efficiency = Math.max(0, 50 - excess * 50);
    return { category: "poor", efficiency };
  }
};
