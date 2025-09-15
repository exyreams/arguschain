import { ERC20_STORAGE_SLOTS, getTokenConfig } from "../constants";
import type { StorageInterpretation, TokenConfig } from "../types";

export class StorageSlotInterpreter {
  static calculateMappingSlot(
    mappingPosition: number,
    key: string,
    secondKey?: string,
  ): string {
    const Web3 = require("web3");

    const keyBytes = Web3.utils.padLeft(key, 64);
    const positionBytes = Web3.utils.padLeft(
      Web3.utils.numberToHex(mappingPosition),
      64,
    );

    if (secondKey) {
      const secondKeyBytes = Web3.utils.padLeft(secondKey, 64);
      const firstSlot = Web3.utils.keccak256(keyBytes + positionBytes.slice(2));
      return Web3.utils.keccak256(secondKeyBytes + firstSlot.slice(2));
    } else {
      return Web3.utils.keccak256(keyBytes + positionBytes.slice(2));
    }
  }

  static interpretPYUSDStorageSlot(
    slot: string,
    value: string,
    contractAddress: string,
  ): StorageInterpretation {
    const tokenConfig = getTokenConfig(contractAddress);
    if (!tokenConfig) {
      return this.createUnknownInterpretation(slot, value);
    }

    const slotInt = parseInt(slot, 16);
    const valueInt = BigInt(value);

    switch (slotInt) {
      case ERC20_STORAGE_SLOTS.TOTAL_SUPPLY:
        return this.interpretTotalSupply(valueInt, tokenConfig);

      case ERC20_STORAGE_SLOTS.OWNER:
        return this.interpretOwner(value);

      case ERC20_STORAGE_SLOTS.PAUSED:
        return this.interpretPausedState(valueInt);

      case ERC20_STORAGE_SLOTS.NAME:
        return this.interpretStringStorage(value, "Token Name");

      case ERC20_STORAGE_SLOTS.SYMBOL:
        return this.interpretStringStorage(value, "Token Symbol");

      case ERC20_STORAGE_SLOTS.DECIMALS:
        return this.interpretDecimals(valueInt);

      default:
        return this.interpretMappingSlot(slot, value, tokenConfig);
    }
  }

  private static interpretTotalSupply(
    value: bigint,
    tokenConfig: TokenConfig,
  ): StorageInterpretation {
    const formattedValue = this.formatTokenAmount(value, tokenConfig);

    return {
      type: "total_supply",
      description: "Total Supply",
      formattedValue: `${formattedValue} ${tokenConfig.symbol}`,
      metadata: {
        rawValue: value.toString(),
        tokenAddress: tokenConfig.address,
        tokenSymbol: tokenConfig.symbol,
        decimals: tokenConfig.decimals,
      },
    };
  }

  private static interpretOwner(value: string): StorageInterpretation {
    const address = "0x" + value.slice(-40);

    return {
      type: "owner",
      description: "Contract Owner",
      formattedValue: this.shortenAddress(address),
      metadata: {
        rawValue: value,
        ownerAddress: address,
      },
    };
  }

  private static interpretPausedState(value: bigint): StorageInterpretation {
    const isPaused = value > 0n;

    return {
      type: "paused",
      description: "Paused State",
      formattedValue: isPaused ? "Paused" : "Active",
      metadata: {
        rawValue: value.toString(),
        isPaused,
      },
    };
  }

  private static interpretStringStorage(
    value: string,
    description: string,
  ): StorageInterpretation {
    const decodedString = this.decodeStorageString(value);

    return {
      type: "metadata",
      description,
      formattedValue: decodedString,
      metadata: {
        rawValue: value,
        stringValue: decodedString,
      },
    };
  }

  private static interpretDecimals(value: bigint): StorageInterpretation {
    return {
      type: "metadata",
      description: "Token Decimals",
      formattedValue: value.toString(),
      metadata: {
        rawValue: value.toString(),
        decimals: Number(value),
      },
    };
  }

  private static interpretMappingSlot(
    slot: string,
    value: string,
    tokenConfig: TokenConfig,
  ): StorageInterpretation {
    const valueInt = BigInt(value);

    if (this.looksLikeTokenAmount(valueInt, tokenConfig)) {
      const formattedValue = this.formatTokenAmount(valueInt, tokenConfig);

      return {
        type: "balance",
        description: "Token Balance",
        formattedValue: `${formattedValue} ${tokenConfig.symbol}`,
        metadata: {
          rawValue: value,
          tokenAddress: tokenConfig.address,
          tokenSymbol: tokenConfig.symbol,
          decimals: tokenConfig.decimals,
          storageSlot: slot,

          holderAddress: "0x...",
        },
      };
    }

    return {
      type: "allowance",
      description: "Token Allowance",
      formattedValue: `${this.formatTokenAmount(valueInt, tokenConfig)} ${tokenConfig.symbol}`,
      metadata: {
        rawValue: value,
        tokenAddress: tokenConfig.address,
        tokenSymbol: tokenConfig.symbol,
        decimals: tokenConfig.decimals,
        storageSlot: slot,
      },
    };
  }

  private static createUnknownInterpretation(
    slot: string,
    value: string,
  ): StorageInterpretation {
    return {
      type: "unknown",
      description: "Unknown Storage",
      formattedValue: value,
      metadata: {
        rawValue: value,
        storageSlot: slot,
      },
    };
  }

  private static formatTokenAmount(
    amount: bigint,
    tokenConfig: TokenConfig,
  ): string {
    const divisor = BigInt(10 ** tokenConfig.decimals);
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === 0n) {
      return wholePart.toString();
    }

    const fractionalStr = fractionalPart
      .toString()
      .padStart(tokenConfig.decimals, "0");
    const trimmedFractional = fractionalStr.replace(/0+$/, "");

    if (trimmedFractional === "") {
      return wholePart.toString();
    }

    return `${wholePart}.${trimmedFractional}`;
  }

  private static looksLikeTokenAmount(
    value: bigint,
    tokenConfig: TokenConfig,
  ): boolean {
    if (value === 0n) return true;

    const maxSupply = BigInt(10 ** (tokenConfig.decimals + 12));
    const minAmount = BigInt(10 ** Math.max(0, tokenConfig.decimals - 6));

    return value >= minAmount && value <= maxSupply;
  }

  private static decodeStorageString(value: string): string {
    try {
      const hex = value.replace("0x", "");
      const bytes = hex.match(/.{2}/g) || [];
      const chars = bytes
        .map((byte) => parseInt(byte, 16))
        .filter((byte) => byte > 0 && byte < 128)
        .map((byte) => String.fromCharCode(byte));

      return chars.join("").trim();
    } catch {
      return value;
    }
  }

  private static shortenAddress(address: string): string {
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static analyzeBalanceChanges(
    storageChanges: Array<{
      slot: string;
      fromValue: string;
      toValue: string;
      address: string;
    }>,
  ): Array<{
    holderAddress: string;
    tokenAddress: string;
    fromBalance: bigint;
    toBalance: bigint;
    change: bigint;
    formattedChange: string;
  }> {
    const balanceChanges: any[] = [];

    storageChanges.forEach((change) => {
      const interpretation = this.interpretPYUSDStorageSlot(
        change.slot,
        change.toValue,
        change.address,
      );

      if (interpretation.type === "balance") {
        const fromValue = BigInt(change.fromValue);
        const toValue = BigInt(change.toValue);
        const tokenConfig = getTokenConfig(change.address);

        if (tokenConfig) {
          balanceChanges.push({
            holderAddress: interpretation.metadata?.holderAddress || "0x...",
            tokenAddress: change.address,
            fromBalance: fromValue,
            toBalance: toValue,
            change: toValue - fromValue,
            formattedChange: this.formatTokenAmount(
              toValue - fromValue,
              tokenConfig,
            ),
          });
        }
      }
    });

    return balanceChanges;
  }

  static analyzePYUSDPatterns(
    storageChanges: Array<{
      slot: string;
      fromValue: string;
      toValue: string;
      address: string;
    }>,
  ): {
    transferPatterns: Array<{
      type: "direct" | "allowance" | "mint" | "burn";
      participants: string[];
      amount: bigint;
      formattedAmount: string;
      confidence: number;
    }>;
    suspiciousActivity: Array<{
      type:
        | "large_transfer"
        | "rapid_changes"
        | "zero_balance"
        | "unusual_pattern";
      description: string;
      severity: "low" | "medium" | "high";
      affectedSlots: string[];
    }>;
    liquidityEvents: Array<{
      type: "add" | "remove" | "swap";
      amount: bigint;
      formattedAmount: string;
      poolAddress?: string;
    }>;
  } {
    const transferPatterns: any[] = [];
    const suspiciousActivity: any[] = [];
    const liquidityEvents: any[] = [];

    const changesByContract = new Map<string, typeof storageChanges>();
    storageChanges.forEach((change) => {
      if (!changesByContract.has(change.address)) {
        changesByContract.set(change.address, []);
      }
      changesByContract.get(change.address)!.push(change);
    });

    changesByContract.forEach((changes, contractAddress) => {
      const tokenConfig = getTokenConfig(contractAddress);
      if (!tokenConfig) return;

      const balanceChanges = changes.filter((change) => {
        const interpretation = this.interpretPYUSDStorageSlot(
          change.slot,
          change.toValue,
          contractAddress,
        );
        return interpretation.type === "balance";
      });

      for (let i = 0; i < balanceChanges.length; i++) {
        for (let j = i + 1; j < balanceChanges.length; j++) {
          const change1 = balanceChanges[i];
          const change2 = balanceChanges[j];

          const amount1 = BigInt(change1.toValue) - BigInt(change1.fromValue);
          const amount2 = BigInt(change2.toValue) - BigInt(change2.fromValue);

          if (amount1 + amount2 === 0n && amount1 !== 0n) {
            transferPatterns.push({
              type: "direct",
              participants: [change1.slot, change2.slot],
              amount: amount1 > 0n ? amount1 : -amount1,
              formattedAmount: this.formatTokenAmount(
                amount1 > 0n ? amount1 : -amount1,
                tokenConfig,
              ),
              confidence: 0.9,
            });
          }
        }
      }

      const largeChanges = balanceChanges.filter((change) => {
        const amount = BigInt(change.toValue) - BigInt(change.fromValue);
        const formattedAmount = parseFloat(
          this.formatTokenAmount(amount > 0n ? amount : -amount, tokenConfig),
        );
        return formattedAmount > 1000000;
      });

      if (largeChanges.length > 0) {
        suspiciousActivity.push({
          type: "large_transfer",
          description: `Large PYUSD transfer detected: ${largeChanges.length} transfers over $1M`,
          severity: "high" as const,
          affectedSlots: largeChanges.map((c) => c.slot),
        });
      }

      const zeroBalances = balanceChanges.filter(
        (change) => change.toValue === "0x0",
      );

      if (zeroBalances.length > 3) {
        suspiciousActivity.push({
          type: "zero_balance",
          description: `Multiple accounts zeroed out: ${zeroBalances.length} accounts`,
          severity: "medium" as const,
          affectedSlots: zeroBalances.map((c) => c.slot),
        });
      }

      const slotCounts = new Map<string, number>();
      changes.forEach((change) => {
        slotCounts.set(change.slot, (slotCounts.get(change.slot) || 0) + 1);
      });

      slotCounts.forEach((count, slot) => {
        if (count > 2) {
          suspiciousActivity.push({
            type: "rapid_changes",
            description: `Rapid state changes detected in slot ${slot}: ${count} changes`,
            severity: "low" as const,
            affectedSlots: [slot],
          });
        }
      });
    });

    return {
      transferPatterns,
      suspiciousActivity,
      liquidityEvents,
    };
  }

  static generateStorageReport(
    storageChanges: Array<{
      slot: string;
      fromValue: string;
      toValue: string;
      address: string;
    }>,
  ): {
    summary: {
      totalChanges: number;
      contractsAffected: number;
      tokenContracts: number;
      totalValueMoved: string;
    };
    balanceAnalysis: ReturnType<typeof this.analyzeBalanceChanges>;
    supplyAnalysis: ReturnType<typeof this.trackSupplyChanges>;
    patternAnalysis: ReturnType<typeof this.analyzePYUSDPatterns>;
    recommendations: Array<{
      type: "security" | "optimization" | "monitoring";
      priority: "low" | "medium" | "high";
      title: string;
      description: string;
      action: string;
    }>;
  } {
    const contractsAffected = new Set(storageChanges.map((c) => c.address))
      .size;
    const tokenContracts = new Set(
      storageChanges
        .filter((c) => this.isKnownTokenContract(c.address))
        .map((c) => c.address),
    ).size;

    const balanceAnalysis = this.analyzeBalanceChanges(storageChanges);
    const supplyAnalysis = this.trackSupplyChanges(storageChanges);
    const patternAnalysis = this.analyzePYUSDPatterns(storageChanges);

    const totalValueMoved = balanceAnalysis.reduce((sum, change) => {
      const amount = change.change > 0n ? change.change : -change.change;
      return sum + amount;
    }, 0n);

    const recommendations: any[] = [];

    if (patternAnalysis.suspiciousActivity.length > 0) {
      recommendations.push({
        type: "security",
        priority: "high",
        title: "Suspicious Activity Detected",
        description: `${patternAnalysis.suspiciousActivity.length} suspicious patterns found`,
        action:
          "Review flagged transactions and implement additional monitoring",
      });
    }

    if (supplyAnalysis.length > 0) {
      recommendations.push({
        type: "monitoring",
        priority: "medium",
        title: "Supply Changes Detected",
        description: `${supplyAnalysis.length} supply modification events`,
        action: "Monitor supply changes for compliance and audit purposes",
      });
    }

    if (balanceAnalysis.length > 10) {
      recommendations.push({
        type: "optimization",
        priority: "low",
        title: "High Transaction Complexity",
        description: `${balanceAnalysis.length} balance changes indicate complex transaction`,
        action: "Consider optimizing transaction structure to reduce gas costs",
      });
    }

    return {
      summary: {
        totalChanges: storageChanges.length,
        contractsAffected,
        tokenContracts,
        totalValueMoved: this.formatTokenAmount(
          totalValueMoved,
          getTokenConfig("0x6c3ea9036406852006290770bedfcaba0e23a0e8") ||
            ({
              decimals: 6,
              symbol: "PYUSD",
            } as any),
        ),
      },
      balanceAnalysis,
      supplyAnalysis,
      patternAnalysis,
      recommendations,
    };
  }

  private static isKnownTokenContract(address: string): boolean {
    return getTokenConfig(address) !== undefined;
  }

  static trackSupplyChanges(
    storageChanges: Array<{
      slot: string;
      fromValue: string;
      toValue: string;
      address: string;
    }>,
  ): Array<{
    tokenAddress: string;
    fromSupply: bigint;
    toSupply: bigint;
    change: bigint;
    changeType: "mint" | "burn";
    formattedChange: string;
  }> {
    const supplyChanges: any[] = [];

    storageChanges.forEach((change) => {
      const slotInt = parseInt(change.slot, 16);

      if (slotInt === ERC20_STORAGE_SLOTS.TOTAL_SUPPLY) {
        const tokenConfig = getTokenConfig(change.address);
        if (tokenConfig) {
          const fromSupply = BigInt(change.fromValue);
          const toSupply = BigInt(change.toValue);
          const changeAmount = toSupply - fromSupply;

          supplyChanges.push({
            tokenAddress: change.address,
            fromSupply,
            toSupply,
            change: changeAmount,
            changeType: changeAmount > 0n ? "mint" : "burn",
            formattedChange: this.formatTokenAmount(changeAmount, tokenConfig),
          });
        }
      }
    });

    return supplyChanges;
  }
}
