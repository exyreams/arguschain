export function normalizeBlockIdentifier(
  identifier: string | number,
): string | number {
  if (typeof identifier === "number") {
    return identifier;
  }

  if (typeof identifier === "string") {
    const trimmed = identifier.trim();

    if (
      trimmed.startsWith("0x") ||
      ["latest", "pending", "earliest", "safe", "finalized"].includes(
        trimmed.toLowerCase(),
      )
    ) {
      return trimmed;
    }

    const blockNum = parseInt(trimmed, 10);
    if (!isNaN(blockNum) && blockNum >= 0) {
      return blockNum;
    }

    return trimmed;
  }

  return String(identifier);
}

export function validateBlockIdentifier(blockId: string): string | null {
  if (!blockId || blockId.trim() === "") {
    return "Please enter a block number or hash";
  }

  const trimmed = blockId.trim();

  if (
    ["latest", "pending", "earliest", "safe", "finalized"].includes(
      trimmed.toLowerCase(),
    )
  ) {
    return null;
  }

  if (trimmed.startsWith("0x")) {
    if (trimmed.length === 66) {
      if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
        return "Invalid hash format";
      }

      return "⚠️ If this is a transaction hash, please use the Transaction Trace page instead. Block analysis requires a block identifier.";
    } else {
      if (!/^0x[a-fA-F0-9]+$/.test(trimmed)) {
        return "Invalid hex block number format";
      }
      return null;
    }
  }

  const blockNum = parseInt(trimmed, 10);
  if (isNaN(blockNum) || blockNum < 0) {
    return "Block number must be a positive integer";
  }

  return null;
}

export function looksLikeTransactionHash(identifier: string): boolean {
  return (
    identifier.startsWith("0x") &&
    identifier.length === 66 &&
    /^0x[a-fA-F0-9]{64}$/.test(identifier)
  );
}

export function describeBlockIdentifier(identifier: string | number): string {
  if (typeof identifier === "number") {
    return `Block #${identifier}`;
  }

  if (typeof identifier === "string") {
    const trimmed = identifier.trim();

    if (["latest", "pending", "earliest"].includes(trimmed.toLowerCase())) {
      return `${trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()} Block`;
    }

    if (trimmed.startsWith("0x")) {
      if (trimmed.length === 66) {
        return looksLikeTransactionHash(trimmed)
          ? `Transaction Hash: ${trimmed.slice(0, 10)}...${trimmed.slice(-8)}`
          : `Block Hash: ${trimmed.slice(0, 10)}...${trimmed.slice(-8)}`;
      } else {
        const blockNum = parseInt(trimmed, 16);
        return isNaN(blockNum) ? `Hex: ${trimmed}` : `Block #${blockNum}`;
      }
    }

    const blockNum = parseInt(trimmed, 10);
    return isNaN(blockNum) ? `Identifier: ${trimmed}` : `Block #${blockNum}`;
  }

  return `Identifier: ${String(identifier)}`;
}
