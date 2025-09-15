import {
  useConnectionStatus,
  useCurrentBlock,
  useGasPrice,
  useNetworkInfo,
} from "./useBlockchainQueries";

export function useBlockchainStatus() {
  const {
    data: connectionData,
    isLoading: connectionLoading,
    error: connectionError,
  } = useConnectionStatus();
  const {
    data: currentBlock,
    isLoading: blockLoading,
    error: blockError,
  } = useCurrentBlock();
  const {
    data: gasPrice,
    isLoading: gasPriceLoading,
    error: gasPriceError,
  } = useGasPrice();
  const {
    data: networkInfo,
    isLoading: networkLoading,
    error: networkError,
  } = useNetworkInfo();

  const isLoading =
    connectionLoading || blockLoading || gasPriceLoading || networkLoading;
  const hasError =
    connectionError || blockError || gasPriceError || networkError;

  const error = hasError
    ? hasError instanceof Error
      ? hasError.message
      : "Connection failed"
    : null;

  return {
    isConnected: connectionData?.isConnected ?? false,
    currentBlock: currentBlock ?? 0,
    gasPrice: gasPrice ?? 0,
    networkName: networkInfo?.name ?? "Unknown",
    chainId: networkInfo?.chainId ?? null,
    isLoading,
    error,
  };
}
