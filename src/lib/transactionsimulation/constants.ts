export const PYUSD_CONFIG = {
  ethereum: {
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    decimals: 6,
    symbol: "PYUSD",
    name: "PayPal USD",
    transferEventTopic:
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    approvalEventTopic:
      "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
  },
};

export const FUNCTION_SIGNATURES: Record<string, FunctionSignature> = {
  transfer: {
    selector: "0xa9059cbb",
    name: "transfer(address,uint256)",
    paramTypes: ["address", "uint256"],
  },
  transferFrom: {
    selector: "0x23b872dd",
    name: "transferFrom(address,address,uint256)",
    paramTypes: ["address", "address", "uint256"],
  },
  approve: {
    selector: "0x095ea7b3",
    name: "approve(address,uint256)",
    paramTypes: ["address", "uint256"],
  },
  balanceOf: {
    selector: "0x70a08231",
    name: "balanceOf(address)",
    paramTypes: ["address"],
  },
  allowance: {
    selector: "0xdd62ed3e",
    name: "allowance(address,address)",
    paramTypes: ["address", "address"],
  },
  totalSupply: {
    selector: "0x18160ddd",
    name: "totalSupply()",
    paramTypes: [],
  },
  decimals: {
    selector: "0x313ce567",
    name: "decimals()",
    paramTypes: [],
  },
  name: {
    selector: "0x06fdde03",
    name: "name()",
    paramTypes: [],
  },
  symbol: {
    selector: "0x95d89b41",
    name: "symbol()",
    paramTypes: [],
  },
  mint: {
    selector: "0x40c10f19",
    name: "mint(address,uint256)",
    paramTypes: ["address", "uint256"],
  },
  burn: {
    selector: "0x42966c68",
    name: "burn(uint256)",
    paramTypes: ["uint256"],
  },
  burnFrom: {
    selector: "0x79cc6790",
    name: "burnFrom(address,uint256)",
    paramTypes: ["address", "uint256"],
  },
  increaseAllowance: {
    selector: "0x39509351",
    name: "increaseAllowance(address,uint256)",
    paramTypes: ["address", "uint256"],
  },
  decreaseAllowance: {
    selector: "0xa457c2d7",
    name: "decreaseAllowance(address,uint256)",
    paramTypes: ["address", "uint256"],
  },
  pause: {
    selector: "0x8456cb59",
    name: "pause()",
    paramTypes: [],
  },
  unpause: {
    selector: "0x3f4ba83a",
    name: "unpause()",
    paramTypes: [],
  },
  paused: {
    selector: "0x5c975abb",
    name: "paused()",
    paramTypes: [],
  },
};

export const GAS_CATEGORIES = {
  "Basic Transfer": ["transfer"],
  Authorization: ["approve", "increaseAllowance", "decreaseAllowance"],
  "Advanced Transfer": ["transferFrom"],
  "Supply Management": ["mint", "burn", "burnFrom"],
  Administrative: ["pause", "unpause"],
  Query: [
    "balanceOf",
    "allowance",
    "totalSupply",
    "decimals",
    "name",
    "symbol",
    "paused",
  ],
};

export const KNOWN_ERROR_CODES = {
  "0x08c379a0": "Error string",
  "0x356680b7": "ERC20: transfer amount exceeds balance",
  "0x4e487b71": "Panic/Arithmetic error",
  "0x01336cea": "ERC20: transfer from the zero address",
  "0xbbc67f8f": "ERC20: transfer to the zero address",
  "0x7939f424": "ERC20: approve from the zero address",
  "0xd505accf": "ERC20: permit expired",
  "0xdab70cb7": "ERC20: insufficient allowance",
  "0xd1bebf0c": "ERC20: transfer to the zero address",
  "0x8baa579f": "ERC20: invalid signature",
  "0x0827a183": "ERC20Permit: expired deadline",
  "0x8f4eb604": "ERC20Permit: invalid signature",
  "0x3b8da488": "AccessControl: account is missing role",
  "0x219f5d17": "Token operation is paused",
  "0xf0019fe6": "Address is blacklisted",
  "0x1bb2a6b6": "ERC20: cannot approve from the zero address",
  "0x710086b0": "ERC20: cannot approve to the zero address",
};

export const TRACE_CONFIG = {
  callTracer: {
    onlyTopCall: false,
    withLog: true,
  },
  structLog: {
    disableMemory: false,
    disableStack: false,
    disableStorage: false,
  },
};

export const DEFAULT_GAS_LIMITS = {
  transfer: 65000,
  transferFrom: 70000,
  approve: 50000,
  balanceOf: 30000,
  allowance: 30000,
  totalSupply: 30000,
  mint: 80000,
  burn: 60000,
  burnFrom: 70000,
  increaseAllowance: 55000,
  decreaseAllowance: 55000,
  pause: 45000,
  unpause: 45000,
};

export const SIMULATION_NETWORKS = {
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
};

import type { FunctionSignature } from "./types";
