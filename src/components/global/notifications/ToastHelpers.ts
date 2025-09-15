import { toast } from "./UseToast";

export const toastHelpers = {
  transactionSuccess: (txHash: string) => {
    toast.success("Transaction Analyzed Successfully", {
      description: `Transaction ${txHash.slice(0, 10)}... has been processed and is ready for review.`,
    });
  },

  transactionError: (error: string) => {
    toast.error("Transaction Analysis Failed", {
      description:
        error ||
        "Unable to fetch transaction data. Please check your connection and try again.",
      action: {
        label: "Retry",
        onClick: () => window.location.reload(),
      },
    });
  },

  networkConnected: (network: string) => {
    toast.info("Network Connected", {
      description: `Successfully connected to ${network}.`,
    });
  },

  networkError: () => {
    toast.error("Network Connection Failed", {
      description:
        "Unable to connect to the RPC endpoint. Please check your network settings.",
    });
  },

  highGasWarning: (gasUsed: string) => {
    toast.warning("High Gas Usage Detected", {
      description: `This transaction consumed ${gasUsed} gas units, which is above the recommended threshold.`,
    });
  },

  dataProcessing: (message: string = "Processing blockchain data...") => {
    return toast.loading("Processing", {
      description: message,
    });
  },

  dataProcessed: (loadingToastId: string | number) => {
    toast.dismiss(loadingToastId);
    toast.success("Data Processed", {
      description:
        "Blockchain data has been successfully processed and analyzed.",
    });
  },

  copiedToClipboard: (item: string) => {
    toast.success("Copied to Clipboard", {
      description: `${item} has been copied to your clipboard.`,
    });
  },

  operationSuccess: (operation: string) => {
    toast.success("Operation Successful", {
      description: `${operation} completed successfully.`,
    });
  },

  operationError: (operation: string, error?: string) => {
    toast.error("Operation Failed", {
      description:
        error || `Failed to ${operation.toLowerCase()}. Please try again.`,
    });
  },
};
