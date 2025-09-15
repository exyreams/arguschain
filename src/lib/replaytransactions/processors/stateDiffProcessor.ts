import type {
  BalanceChange,
  CodeChange,
  NonceChange,
  SecurityFlag,
  StateDiffAnalysis,
  StateDiffResult,
  StorageChange,
  StorageInterpretation,
  TokenStateChange,
} from "../types";
import { ERC20_STORAGE_SLOTS, getTokenConfig } from "../constants";

export class StateDiffProcessor {
  static processStateDiff(
    stateDiff: StateDiffResult,
    txHash: string,
  ): StateDiffAnalysis {
    const balanceChanges: BalanceChange[] = [];
    const storageChanges: StorageChange[] = [];
    const codeChanges: CodeChange[] = [];
    const nonceChanges: NonceChange[] = [];
    const tokenStateChanges: TokenStateChange[] = [];
    const contractsAffected: string[] = [];
    const securityFlags: SecurityFlag[] = [];

    let totalChanges = 0;

    Object.entries(stateDiff).forEach(([address, changes]) => {
      contractsAffected.push(address);
      const tokenConfig = getTokenConfig(address);
      const contractName =
        tokenConfig?.name || `Contract ${address.slice(0, 8)}...`;

      if (changes.balance?.["*"]) {
        const balanceChange = this.processBalanceChange(
          address,
          contractName,
          changes.balance["*"],
        );
        balanceChanges.push(balanceChange);
        totalChanges++;

        if (Math.abs(balanceChange.changeEth) > 100) {
          securityFlags.push({
            level: "info",
            type: "suspicious_pattern",
            description: `Large balance change: ${balanceChange.changeEth.toFixed(6)} ETH`,
            details: {
              address,
              change: balanceChange.changeEth,
              contractName,
            },
            txHash,
          });
        }
      }

      if (changes.nonce?.["*"]) {
        const nonceChange = this.processNonceChange(
          address,
          changes.nonce["*"],
        );
        nonceChanges.push(nonceChange);
        totalChanges++;
      }

      if (changes.code?.["*"]) {
        const codeChange = this.processCodeChange(
          address,
          contractName,
          changes.code["*"],
        );
        codeChanges.push(codeChange);
        totalChanges++;

        securityFlags.push({
          level: "critical",
          type: "code_change",
          description: `Contract code was ${codeChange.changeType}`,
          details: {
            address,
            changeType: codeChange.changeType,
            contractName,
          },
          txHash,
        });
      }

      if (changes.storage) {
        Object.entries(changes.storage).forEach(([slot, slotChange]) => {
          if (slotChange["*"]) {
            const storageChange = this.processStorageChange(
              address,
              contractName,
              slot,
              slotChange["*"],
              tokenConfig,
            );
            storageChanges.push(storageChange);
            totalChanges++;

            if (tokenConfig) {
              const tokenStateChange = this.processTokenStorageChange(
                address,
                tokenConfig.symbol,
                slot,
                slotChange["*"],
                tokenConfig,
              );
              if (tokenStateChange) {
                tokenStateChanges.push(tokenStateChange);

                const tokenSecurityFlag = this.checkTokenSecurityFlag(
                  tokenStateChange,
                  txHash,
                );
                if (tokenSecurityFlag) {
                  securityFlags.push(tokenSecurityFlag);
                }
              }
            }
          }
        });
      }
    });

    return {
      totalChanges,
      balanceChanges,
      storageChanges,
      codeChanges,
      nonceChanges,
      contractsAffected,
      tokenStateChanges,
    };
  }

  private static processBalanceChange(
    address: string,
    contractName: string,
    balanceChange: { from: string; to: string },
  ): BalanceChange {
    const fromBalance = BigInt(balanceChange.from);
    const toBalance = BigInt(balanceChange.to);
    const change = toBalance - fromBalance;
    const changeEth = Number(change) / 1e18;

    return {
      address,
      contractName,
      fromBalance,
      toBalance,
      change,
      changeEth,
    };
  }

  private static processNonceChange(
    address: string,
    nonceChange: { from: string; to: string },
  ): NonceChange {
    const fromNonce = parseInt(nonceChange.from, 16);
    const toNonce = parseInt(nonceChange.to, 16);

    return {
      address,
      fromNonce,
      toNonce,
      change: toNonce - fromNonce,
    };
  }

  private static processCodeChange(
    address: string,
    contractName: string,
    codeChange: { from?: string; to?: string },
  ): CodeChange {
    let changeType: "created" | "destroyed" | "modified";

    if (!codeChange.from && codeChange.to) {
      changeType = "created";
    } else if (codeChange.from && !codeChange.to) {
      changeType = "destroyed";
    } else {
      changeType = "modified";
    }

    return {
      address,
      contractName,
      changeType,
      fromCodeHash: codeChange.from
        ? this.hashCode(codeChange.from)
        : undefined,
      toCodeHash: codeChange.to ? this.hashCode(codeChange.to) : undefined,
    };
  }

  private static processStorageChange(
    address: string,
    contractName: string,
    slot: string,
    storageChange: { from: string; to: string },
    tokenConfig?: any,
  ): StorageChange {
    const interpretation = this.interpretStorageSlot(
      slot,
      storageChange.to,
      tokenConfig,
    );

    return {
      address,
      contractName,
      slot,
      fromValue: storageChange.from,
      toValue: storageChange.to,
      interpretation,
    };
  }

  private static processTokenStorageChange(
    tokenAddress: string,
    tokenSymbol: string,
    slot: string,
    storageChange: { from: string; to: string },
    tokenConfig: any,
  ): TokenStateChange | null {
    const slotInt = parseInt(slot, 16);
    const fromValue = BigInt(storageChange.from);
    const toValue = BigInt(storageChange.to);
    const change = toValue - fromValue;

    let changeType: "balance" | "allowance" | "supply" | "metadata";
    let formattedChange: string;

    if (slotInt === ERC20_STORAGE_SLOTS.TOTAL_SUPPLY) {
      changeType = "supply";
      const changeFormatted =
        Number(change) / Math.pow(10, tokenConfig.decimals);
      formattedChange = `${changeFormatted.toFixed(6)} ${tokenSymbol}`;
    } else if (this.isBalanceSlot(slot)) {
      changeType = "balance";
      const changeFormatted =
        Number(change) / Math.pow(10, tokenConfig.decimals);
      formattedChange = `${changeFormatted.toFixed(6)} ${tokenSymbol}`;
    } else if (this.isAllowanceSlot(slot)) {
      changeType = "allowance";
      const changeFormatted =
        Number(change) / Math.pow(10, tokenConfig.decimals);
      formattedChange = `${changeFormatted.toFixed(6)} ${tokenSymbol}`;
    } else {
      changeType = "metadata";
      formattedChange = `${change.toString()}`;
    }

    return {
      tokenAddress,
      tokenSymbol,
      changeType,
      fromValue: storageChange.from,
      toValue: storageChange.to,
      change: change.toString(),
      formattedChange,
    };
  }

  private static interpretStorageSlot(
    slot: string,
    value: string,
    tokenConfig?: any,
  ): StorageInterpretation {
    const slotInt = parseInt(slot, 16);
    const valueInt = BigInt(value);

    if (slotInt === ERC20_STORAGE_SLOTS.TOTAL_SUPPLY && tokenConfig) {
      const formattedValue = (
        Number(valueInt) / Math.pow(10, tokenConfig.decimals)
      ).toFixed(6);
      return {
        type: "total_supply",
        description: "Total token supply",
        formattedValue: `${formattedValue} ${tokenConfig.symbol}`,
        metadata: { rawValue: valueInt.toString(), tokenConfig },
      };
    }

    if (slotInt === ERC20_STORAGE_SLOTS.OWNER) {
      const address = `0x${value.slice(-40)}`;
      return {
        type: "owner",
        description: "Contract owner address",
        formattedValue: address,
        metadata: { rawValue: value, address },
      };
    }

    if (slotInt === ERC20_STORAGE_SLOTS.PAUSED) {
      const isPaused = valueInt > 0n;
      return {
        type: "paused",
        description: "Contract pause state",
        formattedValue: isPaused ? "Paused" : "Active",
        metadata: { rawValue: valueInt.toString(), isPaused },
      };
    }

    if (this.isBalanceSlot(slot) && tokenConfig) {
      const formattedValue = (
        Number(valueInt) / Math.pow(10, tokenConfig.decimals)
      ).toFixed(6);
      return {
        type: "balance",
        description: "Token balance",
        formattedValue: `${formattedValue} ${tokenConfig.symbol}`,
        metadata: { rawValue: valueInt.toString(), tokenConfig },
      };
    }

    return {
      type: "unknown",
      description: "Unknown storage slot",
      formattedValue: value,
      metadata: { rawValue: value, slot },
    };
  }

  private static isBalanceSlot(slot: string): boolean {
    const slotInt = BigInt(slot);
    return slotInt > 1000n;
  }

  private static isAllowanceSlot(slot: string): boolean {
    const slotInt = BigInt(slot);
    return slotInt > 10000n;
  }

  private static checkTokenSecurityFlag(
    tokenChange: TokenStateChange,
    txHash: string,
  ): SecurityFlag | null {
    if (tokenChange.changeType === "supply") {
      const changeValue = Math.abs(parseFloat(tokenChange.formattedChange));
      if (changeValue > 1000000) {
        return {
          level: "warning",
          type: "supply_change",
          description: `Large token supply change: ${tokenChange.formattedChange}`,
          details: {
            tokenAddress: tokenChange.tokenAddress,
            tokenSymbol: tokenChange.tokenSymbol,
            change: tokenChange.formattedChange,
          },
          txHash,
        };
      }
    }

    if (
      tokenChange.changeType === "metadata" &&
      tokenChange.fromValue !== tokenChange.toValue
    ) {
      return {
        level: "critical",
        type: "ownership_change",
        description: "Token contract ownership or critical metadata changed",
        details: {
          tokenAddress: tokenChange.tokenAddress,
          tokenSymbol: tokenChange.tokenSymbol,
          from: tokenChange.fromValue,
          to: tokenChange.toValue,
        },
        txHash,
      };
    }

    return null;
  }

  static generateOptimizationSuggestions(analysis: StateDiffAnalysis): Array<{
    id: string;
    type: "gas" | "performance";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    recommendation: string;
  }> {
    const suggestions = [];

    if (analysis.storageChanges.length > 20) {
      suggestions.push({
        id: "excessive_storage_changes",
        type: "gas" as const,
        severity: "medium" as const,
        title: "High Number of Storage Changes",
        description: `${analysis.storageChanges.length} storage slots were modified`,
        recommendation:
          "Consider batching operations or using more efficient storage patterns",
      });
    }

    if (analysis.codeChanges.length > 0) {
      suggestions.push({
        id: "contract_upgrades",
        type: "performance" as const,
        severity: "high" as const,
        title: "Contract Code Changes Detected",
        description: `${analysis.codeChanges.length} contracts had code changes`,
        recommendation:
          "Verify that contract upgrades are intentional and properly tested",
      });
    }

    if (analysis.contractsAffected.length > 10) {
      suggestions.push({
        id: "multiple_contracts",
        type: "performance" as const,
        severity: "low" as const,
        title: "Multiple Contract Interactions",
        description: `Transaction affected ${analysis.contractsAffected.length} different contracts`,
        recommendation:
          "Consider if all interactions are necessary or if some can be optimized",
      });
    }

    return suggestions;
  }

  private static hashCode(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  static calculateMappingSlot(mappingPosition: number, key: string): string {
    const keyPadded = key.replace("0x", "").padStart(64, "0");
    const positionPadded = mappingPosition.toString(16).padStart(64, "0");

    return `0x${(BigInt(`0x${keyPadded}`) + BigInt(`0x${positionPadded}`)).toString(16)}`;
  }
}
