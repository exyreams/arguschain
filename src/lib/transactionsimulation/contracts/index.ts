export interface ContractConfig {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  type: "ERC20" | "ERC721" | "ERC1155" | "Custom";
  abi?: any[];
  functions: Record<string, FunctionSignature>;
  events: Record<string, EventSignature>;
  network: string;
}

export interface FunctionSignature {
  selector: string;
  name: string;
  paramTypes: string[];
  returnType?: string;
  stateMutability: "view" | "pure" | "nonpayable" | "payable";
  category:
    | "transfer"
    | "approval"
    | "mint"
    | "burn"
    | "admin"
    | "view"
    | "other";
}

export interface EventSignature {
  topic: string;
  name: string;
  inputs: Array<{
    name: string;
    type: string;
    indexed: boolean;
  }>;
}

export class ContractRegistry {
  private static contracts = new Map<string, ContractConfig>();

  static registerContract(config: ContractConfig) {
    const key = `${config.network}-${config.address.toLowerCase()}`;
    this.contracts.set(key, config);
  }

  static getContract(address: string, network: string): ContractConfig | null {
    const key = `${network}-${address.toLowerCase()}`;
    return this.contracts.get(key) || null;
  }

  static getAllContracts(network?: string): ContractConfig[] {
    const contracts = Array.from(this.contracts.values());
    return network ? contracts.filter((c) => c.network === network) : contracts;
  }

  static getContractsByType(
    type: ContractConfig["type"],
    network?: string,
  ): ContractConfig[] {
    return this.getAllContracts(network).filter((c) => c.type === type);
  }
}

export * from "./pyusd";
export * from "./usdc";
export * from "./usdt";
export * from "./weth";
export * from "./erc721";
