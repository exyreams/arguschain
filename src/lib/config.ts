import { ethers } from "ethers";

export const RPC_CONFIG = {
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl:
      import.meta.env.VITE_MAINNET_RPC_URL ||
      "https://your-mainnet-rpc-endpoint.com",
    blockExplorer: "https://etherscan.io",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  },
  sepolia: {
    name: "Sepolia Testnet",
    chainId: 11155111,
    rpcUrl:
      import.meta.env.VITE_SEPOLIA_RPC_URL ||
      "https://your-sepolia-rpc-endpoint.com",
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  },
} as const;

export const TRACE_CONFIG = {
  callTracer: {
    tracer: "callTracer",
    timeout: "120s",
    tracerConfig: {
      onlyTopCall: false,
      withLog: true,
      enableReturnData: true,
      enableMemory: false,
      enableStack: false,
    },
  },
  structLog: {
    tracer: "structLog",
    timeout: "120s",
    tracerConfig: {
      disableStorage: false,
      disableMemory: false,
      disableStack: false,
      fullStorage: false,
    },
  },
} as const;

export const KNOWN_CONTRACTS = {
  "0x6c3ea9036406852006290770bedfcaba0e23a0e8": "PYUSD Token",
  "0x8ecae0b0402e29694b3af35d5943d4631ee568dc": "PYUSD Implementation",
  "0x31d9bdea6f104606c954f8fe6ba614f1bd347ec3": "Supply Control",

  "0xa0b86a33e6411b3036c0b5b8b8b8b8b8b8b8b8b8": "Uniswap V3 Router",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2 Router",
  "0x1f98431c8ad98523631ae4a59f267346ea31f984": "Uniswap V3 Factory",
} as const;

export const FUNCTION_SIGNATURES = {
  "0xa9059cbb": { name: "transfer(address,uint256)", category: "token" },
  "0x095ea7b3": { name: "approve(address,uint256)", category: "token" },
  "0x23b872dd": {
    name: "transferFrom(address,address,uint256)",
    category: "token",
  },
  "0x70a08231": { name: "balanceOf(address)", category: "view" },
  "0x18160ddd": { name: "totalSupply()", category: "view" },
  "0xdd62ed3e": { name: "allowance(address,address)", category: "view" },

  "0x38ed1739": { name: "swapExactTokensForTokens", category: "swap" },
  "0x7ff36ab5": { name: "swapExactETHForTokens", category: "swap" },
  "0x18cbafe5": { name: "swapExactTokensForETH", category: "swap" },
  "0xfb3bdb41": { name: "swapETHForExactTokens", category: "swap" },

  "0xac9650d8": { name: "multicall(bytes[])", category: "multicall" },
  "0x5ae401dc": { name: "multicall(uint256,bytes[])", category: "multicall" },
} as const;

export const EVENT_TOPICS = {
  TRANSFER: ethers.id("Transfer(address,address,uint256)"),
  APPROVAL: ethers.id("Approval(address,address,uint256)"),

  SWAP: ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)"),
  MINT: ethers.id("Mint(address,uint256,uint256)"),
  BURN: ethers.id("Burn(address,uint256,uint256)"),

  SWAP_V3: ethers.id(
    "Swap(address,address,int256,int256,uint160,uint128,int24)"
  ),
} as const;

export const EVENT_DECODERS = {
  [EVENT_TOPICS.TRANSFER]: {
    name: "Transfer",
    decode: (topics: string[], data: string) => ({
      from: ethers.getAddress("0x" + topics[1].slice(-40)),
      to: ethers.getAddress("0x" + topics[2].slice(-40)),
      value: BigInt(data),
    }),
  },
  [EVENT_TOPICS.APPROVAL]: {
    name: "Approval",
    decode: (topics: string[], data: string) => ({
      owner: ethers.getAddress("0x" + topics[1].slice(-40)),
      spender: ethers.getAddress("0x" + topics[2].slice(-40)),
      value: BigInt(data),
    }),
  },
} as const;

export const OPCODE_CATEGORIES = {
  arithmetic: [
    "ADD",
    "MUL",
    "SUB",
    "DIV",
    "SDIV",
    "MOD",
    "SMOD",
    "ADDMOD",
    "MULMOD",
    "EXP",
    "SIGNEXTEND",
  ],
  comparison: ["LT", "GT", "SLT", "SGT", "EQ", "ISZERO"],
  bitwise: ["AND", "OR", "XOR", "NOT", "BYTE", "SHL", "SHR", "SAR"],
  memory: ["MLOAD", "MSTORE", "MSTORE8", "MSIZE", "MCOPY"],
  storage: ["SLOAD", "SSTORE"],
  flow: ["JUMP", "JUMPI", "JUMPDEST", "PC", "STOP", "RETURN", "REVERT"],
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
  contract: [
    "CREATE",
    "CREATE2",
    "CALL",
    "CALLCODE",
    "DELEGATECALL",
    "STATICCALL",
    "SELFDESTRUCT",
  ],
  logging: ["LOG0", "LOG1", "LOG2", "LOG3", "LOG4"],
  gas: ["GAS"],
  other: [],
} as const;

export const APP_CONFIG = {
  refreshInterval: 30000, // 30 seconds
  cacheExpiry: 3600000, // 1 hour
  maxTraceDepth: 50,
  maxCallsToDisplay: 1000,
  defaultGasLimit: 21000,
  traceTimeout: 120000, // 2 minutes
  maxBlocksToAnalyze: 100,
} as const;

export function getContractName(address: string): string {
  const addr = address.toLowerCase();
  return (
    KNOWN_CONTRACTS[addr as keyof typeof KNOWN_CONTRACTS] || "Unknown Contract"
  );
}

export function getFunctionName(signature: string): string {
  const sig =
    FUNCTION_SIGNATURES[signature as keyof typeof FUNCTION_SIGNATURES];
  return sig ? sig.name : `Unknown (${signature})`;
}

export function getFunctionCategory(signature: string): string {
  const sig =
    FUNCTION_SIGNATURES[signature as keyof typeof FUNCTION_SIGNATURES];
  return sig ? sig.category : "unknown";
}

export function getOpcodeCategory(opcode: string): string {
  for (const [category, opcodes] of Object.entries(OPCODE_CATEGORIES)) {
    if (opcodes.includes(opcode)) {
      return category;
    }
  }
  return "other";
}

export function formatEther(wei: string | number | bigint): string {
  try {
    return ethers.formatEther(wei.toString());
  } catch {
    return "0.0";
  }
}

export function formatGwei(wei: string | number | bigint): string {
  try {
    return ethers.formatUnits(wei.toString(), "gwei");
  } catch {
    return "0.0";
  }
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatGas(gas: string | number): string {
  try {
    const gasNum =
      typeof gas === "string" && gas.startsWith("0x")
        ? parseInt(gas, 16)
        : Number(gas);
    return gasNum.toLocaleString();
  } catch {
    return "0";
  }
}
