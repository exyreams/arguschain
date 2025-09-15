import { useBlockchainStatus, useNetworkSwitcher } from "@/hooks/blockchain";
import { useIsMobile } from "@/hooks/global";
import { useEffect, useRef, useState } from "react";

export default function Statusbar() {
  const { isConnected, currentBlock, gasPrice, networkName, isLoading, error } =
    useBlockchainStatus();

  const { currentNetwork } = useNetworkSwitcher();
  const isMobile = useIsMobile();

  const [blockHighlight, setBlockHighlight] = useState(false);
  const [gasHighlight, setGasHighlight] = useState("");
  const [gasUpdatedFlash, setGasUpdatedFlash] = useState(false);
  const prevBlockRef = useRef(currentBlock);
  const prevGasPriceRef = useRef(gasPrice);

  useEffect(() => {
    if (
      currentBlock > 0 &&
      prevBlockRef.current > 0 &&
      currentBlock !== prevBlockRef.current
    ) {
      setBlockHighlight(true);
      const timer = setTimeout(() => setBlockHighlight(false), 2000);
      prevBlockRef.current = currentBlock;
      return () => clearTimeout(timer);
    }
    prevBlockRef.current = currentBlock;
  }, [currentBlock]);

  useEffect(() => {
    if (
      gasPrice > 0 &&
      prevGasPriceRef.current > 0 &&
      gasPrice !== prevGasPriceRef.current
    ) {
      const difference = gasPrice - prevGasPriceRef.current;
      const percentChange =
        Math.abs(difference / prevGasPriceRef.current) * 100;

      if (percentChange > 10) {
        setGasHighlight(difference > 0 ? "high-increase" : "");
      } else if (percentChange > 5) {
        setGasHighlight(difference > 0 ? "moderate-increase" : "");
      } else {
        setGasHighlight("minor-change");
      }

      setGasUpdatedFlash(true);
      const timer = setTimeout(() => setGasUpdatedFlash(false), 2000);

      prevGasPriceRef.current = gasPrice;
      return () => clearTimeout(timer);
    } else if (gasPrice > 0) {
      prevGasPriceRef.current = gasPrice;
    }
  }, [gasPrice]);

  const getConnectionStatus = () => {
    if (isLoading)
      return { text: "Connecting...", color: "bg-yellow-500 animate-pulse" };
    if (isConnected)
      return { text: "Connected", color: "bg-green-500 animate-pulse" };
    return { text: "Disconnected", color: "bg-red-500" };
  };

  const getGasHighlightColor = () => {
    switch (gasHighlight) {
      case "high-increase":
        return "text-red-400";
      case "moderate-increase":
        return "text-yellow-400";
      case "minor-change":
        return "text-blue-400";
      default:
        return "text-text-secondary";
    }
  };

  const connectionStatus = getConnectionStatus();

  const getNetworkDisplayName = () => {
    if (currentNetwork === "sepolia")
      return isMobile ? "Sepolia" : "Sepolia Testnet";
    if (currentNetwork === "mainnet")
      return isMobile ? "Mainnet" : "Ethereum Mainnet";
    return networkName || "Unknown";
  };

  if (isMobile) {
    return (
      <div className="flex justify-between items-center px-4 py-2 bg-[rgba(15,20,25,0.9)] backdrop-blur-[15px] border-b border-[rgba(0,191,255,0.1)] text-[10px] font-medium tracking-[0.5px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${connectionStatus.color}`}
            ></div>
            <span className="text-text-secondary">
              {getNetworkDisplayName()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-text-secondary">
          <div className="flex items-center gap-0.5">
            <span>Block</span>
            <span
              className={`transition-colors duration-500 ${blockHighlight ? "text-green-400 font-semibold" : ""}`}
            >
              {isLoading ? "..." : `#${(currentBlock / 1000000).toFixed(1)}M`}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <span>Gas:</span>
            <span
              className={`transition-colors duration-500 ${gasUpdatedFlash ? "text-green-400 font-semibold" : getGasHighlightColor()}`}
            >
              {isLoading ? "..." : `${gasPrice}Gw`}
            </span>
          </div>

          {error && (
            <div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              title="Connection Error"
            ></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-center flex-wrap gap-6 px-6 py-2 bg-[rgba(15,20,25,0.9)] backdrop-blur-[15px] border-b border-[rgba(0,191,255,0.1)] text-[11px] font-medium tracking-[0.5px] z-20">
      <div className="flex items-center gap-2 text-text-secondary">
        <div className={`w-2 h-2 rounded-full ${connectionStatus.color}`}></div>
        <span>{connectionStatus.text}</span>
      </div>

      <div className="flex items-center gap-1 text-text-secondary">
        <span>Network:</span>
        <span className="text-text-secondary">
          {currentNetwork === "sepolia"
            ? "Sepolia Testnet"
            : currentNetwork === "mainnet"
              ? "Ethereum Mainnet"
              : networkName || "Unknown"}
        </span>
      </div>

      <div className="flex items-center gap-1 text-text-secondary">
        <span>Block:</span>
        <span
          className={`transition-colors duration-500 ${blockHighlight ? "text-green-400 font-semibold" : ""}`}
        >
          {isLoading ? "Loading..." : `#${currentBlock.toLocaleString()}`}
        </span>
      </div>

      <div className="flex items-center gap-1 text-text-secondary">
        <span>Gas:</span>
        <span
          className={`transition-colors duration-500 ${gasUpdatedFlash ? "text-green-400 font-semibold" : getGasHighlightColor()}`}
        >
          {isLoading ? "Loading..." : `${gasPrice} Gwei`}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-red-400 text-[10px]">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          <span title={error}>Connection Error</span>
        </div>
      )}
    </div>
  );
}
