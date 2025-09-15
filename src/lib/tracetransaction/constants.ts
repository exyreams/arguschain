export const PYUSD_CONTRACTS = {
  "0x6c3ea9036406852006290770bedfcaba0e23a0e8": "PYUSD Token",
  "0x8ecae0b0402e29694b3af35d5943d4631ee568dc": "PYUSD Implementation",
  "0x31d9bdea6f104606c954f8fe6ba614f1bd347ec3": "Supply Control",
  "0x123456789abcdef123456789abcdef123456789a": "Supply Control Impl",
} as const;

export const PYUSD_CONFIG = {
  ethereum: {
    decimals: 6,
    symbol: "PYUSD",
    name: "PayPal USD",
  },
} as const;

export const PYUSD_SIGNATURES = {
  "0xa9059cbb": {
    name: "transfer(address,uint256)",
    category: "token_movement",
    paramTypes: ["address", "uint256"],
  },
  "0x23b872dd": {
    name: "transferFrom(address,address,uint256)",
    category: "token_movement",
    paramTypes: ["address", "address", "uint256"],
  },

  "0x095ea7b3": {
    name: "approve(address,uint256)",
    category: "allowance",
    paramTypes: ["address", "uint256"],
  },
  "0xdd62ed3e": {
    name: "allowance(address,address)",
    category: "view",
    paramTypes: ["address", "address"],
  },

  "0x40c10f19": {
    name: "mint(address,uint256)",
    category: "supply_change",
    paramTypes: ["address", "uint256"],
  },
  "0x42966c68": {
    name: "burn(uint256)",
    category: "supply_change",
    paramTypes: ["uint256"],
  },

  "0x70a08231": {
    name: "balanceOf(address)",
    category: "view",
    paramTypes: ["address"],
  },
  "0x18160ddd": {
    name: "totalSupply()",
    category: "view",
    paramTypes: [],
  },

  "0xf2fde38b": {
    name: "transferOwnership(address)",
    category: "admin",
    paramTypes: ["address"],
  },
  "0x8da5cb5b": {
    name: "owner()",
    category: "view",
    paramTypes: [],
  },

  "0x8456cb59": {
    name: "pause()",
    category: "control",
    paramTypes: [],
  },
  "0x3f4ba83a": {
    name: "unpause()",
    category: "control",
    paramTypes: [],
  },
} as const;

export const PYUSD_TRANSACTION_PATTERNS = {
  simple_transfer: {
    description: "Simple PYUSD transfer between addresses",
    signatures: ["transfer(address,uint256)"],
    contracts: 1,
    calls_min: 1,
    calls_max: 3,
  },
  swap_operation: {
    description: "PYUSD swap through DEX",
    signatures: [
      "transfer(address,uint256)",
      "swapExactTokensForTokens",
      "swapTokensForExactTokens",
    ],
    contracts_min: 2,
    has_external_calls: true,
  },
  liquidity_provision: {
    description: "Adding/removing liquidity with PYUSD",
    signatures: ["transfer(address,uint256)", "mint", "addLiquidity"],
    contracts_min: 2,
  },
  bridge_operation: {
    description: "PYUSD bridge operation (cross-chain)",
    signatures: ["transfer(address,uint256)", "deposit", "lock"],
    gas_intensive: true,
  },
  multi_transfer: {
    description: "Multiple PYUSD transfers in one transaction",
    signatures: ["transfer(address,uint256)"],
    min_transfers: 2,
  },
  approval_flow: {
    description: "PYUSD approval for future spending",
    signatures: ["approve(address,uint256)"],
    calls_min: 1,
    calls_max: 3,
  },
  supply_change: {
    description: "Minting or burning of PYUSD supply",
    signatures: ["mint(address,uint256)", "burn(uint256)"],
    admin_operation: true,
  },
} as const;

export const MEV_PATTERNS = {
  sandwich_attack: {
    description: "Transaction sandwiched between two related transactions",
    indicators: ["swap before and after", "price impact"],
  },
  arbitrage: {
    description: "Multi-step operation exploiting price differences",
    indicators: ["multiple DEX interactions", "circular flow"],
  },
  front_running: {
    description: "Transaction potentially front-run by a MEV bot",
    indicators: ["unusual gas price", "similar operation before"],
  },
} as const;

export const SECURITY_RISK_LEVELS = {
  "transferOwnership(address)": "high",
  "pause()": "medium",
  "unpause()": "medium",
  blacklist: "medium",
  upgrade: "high",
  initialize: "high",
  selfdestruct: "critical",
  "mint(address,uint256)": "high",
  "burn(uint256)": "medium",
  "renounceOwnership()": "high",
} as const;

export const PYUSD_GAS_BENCHMARKS = {
  "transfer(address,uint256)": {
    median: 65000,
    p25: 52000,
    p75: 78000,
  },
  "approve(address,uint256)": {
    median: 46000,
    p25: 42000,
    p75: 58000,
  },
  "transferFrom(address,address,uint256)": {
    median: 75000,
    p25: 65000,
    p75: 90000,
  },
  "mint(address,uint256)": {
    median: 110000,
    p25: 95000,
    p75: 130000,
  },
  "burn(uint256)": {
    median: 90000,
    p25: 80000,
    p75: 105000,
  },
} as const;

export const VISUALIZATION_COLORS = {
  pyusd_token: "rgba(144, 238, 144, 0.9)",
  supply_control: "rgba(135, 206, 250, 0.9)",
  other_pyusd: "rgba(224, 255, 255, 0.9)",
  external_contract: "rgba(211, 211, 211, 0.9)",
  error: "rgba(255, 99, 71, 0.9)",
  success: "rgba(50, 205, 50, 0.9)",
  transfer_edge: "rgba(50, 150, 50, 0.8)",
  call_edge: "rgba(128, 128, 128, 0.7)",
  delegatecall_edge: "rgba(0, 0, 255, 0.7)",
  staticcall_edge: "rgba(0, 128, 0, 0.7)",
  create_edge: "rgba(255, 165, 0, 0.8)",
} as const;
