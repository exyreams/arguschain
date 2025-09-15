import { PYUSD_SIGNATURES } from "./constants";
import type { DecodedFunction, FunctionParameters } from "./types";

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatValuePyusd(amount: number): string {
  const pyusdAmount = amount / 10 ** 6;
  if (pyusdAmount >= 1000000) {
    return `${(pyusdAmount / 1000000).toFixed(2)}M PYUSD`;
  } else if (pyusdAmount >= 1000) {
    return `${(pyusdAmount / 1000).toFixed(2)}K PYUSD`;
  } else {
    return `${pyusdAmount.toFixed(6)} PYUSD`;
  }
}

export function formatValueEth(weiAmount: number): string {
  const ethAmount = weiAmount / 10 ** 18;
  if (ethAmount >= 1000) {
    return `${(ethAmount / 1000).toFixed(3)}K ETH`;
  } else if (ethAmount >= 1) {
    return `${ethAmount.toFixed(6)} ETH`;
  } else {
    return `${ethAmount.toFixed(9)} ETH`;
  }
}

export function extractParamsFromInput(
  inputData: string,
  methodSig: string,
  paramTypes: string[],
): any[] {
  try {
    if (!inputData || inputData.length < 10) return [];

    const paramsHex = inputData.slice(10);
    const decodedParams: any[] = [];
    let pos = 0;

    for (const paramType of paramTypes) {
      if (pos + 64 > paramsHex.length) break;

      if (paramType === "address") {
        const paramVal = "0x" + paramsHex.slice(pos + 24, pos + 64);
        decodedParams.push(paramVal);
      } else if (paramType.startsWith("uint")) {
        const paramVal = parseInt(paramsHex.slice(pos, pos + 64), 16);
        decodedParams.push(paramVal);
      } else if (paramType === "bool") {
        const paramVal = parseInt(paramsHex.slice(pos, pos + 64), 16) !== 0;
        decodedParams.push(paramVal);
      } else if (paramType === "bytes32") {
        const paramVal = "0x" + paramsHex.slice(pos, pos + 64);
        decodedParams.push(paramVal);
      }

      pos += 64;
    }

    return decodedParams;
  } catch (error) {
    console.warn("Error extracting parameters:", error);
    return [];
  }
}

export function decodePyusdFunction(inputData: string): DecodedFunction {
  if (!inputData || inputData === "0x") {
    return {
      name: "Unknown",
      category: "other",
      params: {},
    };
  }

  const methodSig = inputData.slice(0, 10);

  if (methodSig in PYUSD_SIGNATURES) {
    const sigInfo =
      PYUSD_SIGNATURES[methodSig as keyof typeof PYUSD_SIGNATURES];
    const functionName = sigInfo.name;
    const functionCategory = sigInfo.category;
    const paramTypes = sigInfo.paramTypes;
    const params: FunctionParameters = {};

    try {
      const decoded = extractParamsFromInput(inputData, methodSig, paramTypes);

      if (methodSig === "0xa9059cbb" && decoded.length === 2) {
        params.to = decoded[0];
        params.to_address = shortenAddress(decoded[0]);
        params.amount = decoded[1];
        params.amount_formatted = formatValuePyusd(decoded[1]);
      } else if (methodSig === "0x23b872dd" && decoded.length === 3) {
        params.from = decoded[0];
        params.from_address = shortenAddress(decoded[0]);
        params.to = decoded[1];
        params.to_address = shortenAddress(decoded[1]);
        params.amount = decoded[2];
        params.amount_formatted = formatValuePyusd(decoded[2]);
      } else if (methodSig === "0x095ea7b3" && decoded.length === 2) {
        params.spender = decoded[0];
        params.spender_address = shortenAddress(decoded[0]);
        params.amount = decoded[1];
        params.amount_formatted = formatValuePyusd(decoded[1]);
      } else if (methodSig === "0x40c10f19" && decoded.length === 2) {
        params.to = decoded[0];
        params.to_address = shortenAddress(decoded[0]);
        params.amount = decoded[1];
        params.amount_formatted = formatValuePyusd(decoded[1]);
      } else if (methodSig === "0x42966c68" && decoded.length === 1) {
        params.amount = decoded[0];
        params.amount_formatted = formatValuePyusd(decoded[0]);
      } else if (methodSig === "0x70a08231" && decoded.length === 1) {
        params.account = decoded[0];
        params.account_address = shortenAddress(decoded[0]);
      } else if (methodSig === "0xdd62ed3e" && decoded.length === 2) {
        params.owner = decoded[0];
        params.owner_address = shortenAddress(decoded[0]);
        params.spender = decoded[1];
        params.spender_address = shortenAddress(decoded[1]);
      } else if (methodSig === "0xf2fde38b" && decoded.length === 1) {
        params.newOwner = decoded[0];
        params.newOwner_address = shortenAddress(decoded[0]);
      }
    } catch (error) {
      console.warn("Error decoding PYUSD function parameters:", error);
    }

    return {
      name: functionName,
      category: functionCategory,
      params,
    };
  }

  return {
    name: "Unknown",
    category: "other",
    params: {},
  };
}

export function getFunctionDescription(
  inputData: string,
  isPyusd: boolean,
  contractName: string,
): string {
  if (!inputData || inputData === "0x") {
    return "Contract Interaction / ETH Transfer";
  }

  if (
    typeof inputData === "string" &&
    inputData.startsWith("0x") &&
    inputData.length >= 10
  ) {
    const selector = inputData.slice(0, 10);

    return `Function (${selector})`;
  }

  return "Unknown Interaction";
}

export function categorizeFunctionCall(
  functionName: string,
  contractAddress: string,
): {
  category: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
} {
  if (functionName.includes("transfer") || functionName.includes("approve")) {
    return {
      category: "token_operation",
      riskLevel: "low",
      description: "Standard token operation",
    };
  }

  if (functionName.includes("mint") || functionName.includes("burn")) {
    return {
      category: "supply_change",
      riskLevel: "high",
      description: "Token supply modification",
    };
  }

  if (functionName.includes("Owner") || functionName.includes("pause")) {
    return {
      category: "administrative",
      riskLevel: "high",
      description: "Administrative function",
    };
  }

  if (functionName.includes("selfdestruct")) {
    return {
      category: "destructive",
      riskLevel: "critical",
      description: "Contract destruction",
    };
  }

  return {
    category: "other",
    riskLevel: "low",
    description: "General contract interaction",
  };
}

export function extractFunctionParameters(
  inputData: string,
  signature: string,
): FunctionParameters {
  const decoded = decodePyusdFunction(inputData);
  return decoded.params;
}
