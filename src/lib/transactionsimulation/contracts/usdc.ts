import type { ContractConfig } from "./index";

export const USDC_CONTRACT: ContractConfig = {
  address: "0xA0b86a33E6441b8435b662303c0f479c7e1d5916",
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  type: "ERC20",
  network: "mainnet",

  functions: {
    transfer: {
      selector: "0xa9059cbb",
      name: "transfer(address,uint256)",
      paramTypes: ["address", "uint256"],
      stateMutability: "nonpayable",
      category: "transfer",
    },
    transferFrom: {
      selector: "0x23b872dd",
      name: "transferFrom(address,address,uint256)",
      paramTypes: ["address", "address", "uint256"],
      stateMutability: "nonpayable",
      category: "transfer",
    },
    approve: {
      selector: "0x095ea7b3",
      name: "approve(address,uint256)",
      paramTypes: ["address", "uint256"],
      stateMutability: "nonpayable",
      category: "approval",
    },
    balanceOf: {
      selector: "0x70a08231",
      name: "balanceOf(address)",
      paramTypes: ["address"],
      returnType: "uint256",
      stateMutability: "view",
      category: "view",
    },
    allowance: {
      selector: "0xdd62ed3e",
      name: "allowance(address,address)",
      paramTypes: ["address", "address"],
      returnType: "uint256",
      stateMutability: "view",
      category: "view",
    },
    totalSupply: {
      selector: "0x18160ddd",
      name: "totalSupply()",
      paramTypes: [],
      returnType: "uint256",
      stateMutability: "view",
      category: "view",
    },

    name: {
      selector: "0x06fdde03",
      name: "name()",
      paramTypes: [],
      returnType: "string",
      stateMutability: "view",
      category: "view",
    },
    symbol: {
      selector: "0x95d89b41",
      name: "symbol()",
      paramTypes: [],
      returnType: "string",
      stateMutability: "view",
      category: "view",
    },
    decimals: {
      selector: "0x313ce567",
      name: "decimals()",
      paramTypes: [],
      returnType: "uint8",
      stateMutability: "view",
      category: "view",
    },

    mint: {
      selector: "0x40c10f19",
      name: "mint(address,uint256)",
      paramTypes: ["address", "uint256"],
      stateMutability: "nonpayable",
      category: "mint",
    },
    burn: {
      selector: "0x42966c68",
      name: "burn(uint256)",
      paramTypes: ["uint256"],
      stateMutability: "nonpayable",
      category: "burn",
    },
    blacklist: {
      selector: "0xf9f92be4",
      name: "blacklist(address)",
      paramTypes: ["address"],
      stateMutability: "nonpayable",
      category: "admin",
    },
    unBlacklist: {
      selector: "0x1a895266",
      name: "unBlacklist(address)",
      paramTypes: ["address"],
      stateMutability: "nonpayable",
      category: "admin",
    },
    isBlacklisted: {
      selector: "0xfe575a87",
      name: "isBlacklisted(address)",
      paramTypes: ["address"],
      returnType: "bool",
      stateMutability: "view",
      category: "view",
    },
    pause: {
      selector: "0x8456cb59",
      name: "pause()",
      paramTypes: [],
      stateMutability: "nonpayable",
      category: "admin",
    },
    unpause: {
      selector: "0x3f4ba83a",
      name: "unpause()",
      paramTypes: [],
      stateMutability: "nonpayable",
      category: "admin",
    },
    paused: {
      selector: "0x5c975abb",
      name: "paused()",
      paramTypes: [],
      returnType: "bool",
      stateMutability: "view",
      category: "view",
    },
  },

  events: {
    Transfer: {
      topic:
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      name: "Transfer",
      inputs: [
        { name: "from", type: "address", indexed: true },
        { name: "to", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
    },
    Approval: {
      topic:
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
      name: "Approval",
      inputs: [
        { name: "owner", type: "address", indexed: true },
        { name: "spender", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
    },
    Blacklisted: {
      topic:
        "0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855",
      name: "Blacklisted",
      inputs: [{ name: "_account", type: "address", indexed: true }],
    },
    UnBlacklisted: {
      topic:
        "0x117e3210bb9aa7d9baff172026820255c6f6c30ba8999d1c2fd88e2848137c4e",
      name: "UnBlacklisted",
      inputs: [{ name: "_account", type: "address", indexed: true }],
    },
  },
};
