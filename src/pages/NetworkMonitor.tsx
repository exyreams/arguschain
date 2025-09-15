import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/global/Button";
import { Alert } from "@/components/global/Alert";
import { Badge } from "@/components/global/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  CheckCircle,
  Network,
  Pause,
  Play,
  RefreshCw,
  Settings,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Statusbar from "@/components/status/Statusbar";
import {
  CongestionGauge,
  NetworkComparisonChart,
  NetworkStatusCard,
} from "@/components/mempool";
import {
  useAutoRefresh,
  useMempoolMethodAvailability,
  useNetworkComparison,
  useNetworkConditions,
  useRefreshNetworkConditions,
} from "@/hooks/mempool";
import { DEFAULTS } from "@/lib/mempool/constants";

export default function NetworkMonitor() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(
    searchParams.get("networks")?.split(",") || ["mainnet", "sepolia"],
  );
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(
    searchParams.get("autoRefresh") === "true",
  );
  const [refreshInterval, setRefreshInterval] = useState(
    parseInt(
      searchParams.get("interval") || DEFAULTS.REFRESH_INTERVAL.toString(),
    ),
  );
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const mainnetConditions = useNetworkConditions("mainnet", {
    enabled: selectedNetworks.includes("mainnet"),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
  });

  const sepoliaConditions = useNetworkConditions("sepolia", {
    enabled: selectedNetworks.includes("sepolia"),
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
  });

  const networkComparison = useNetworkComparison(selectedNetworks, {
    enabled: selectedNetworks.length > 1,
    refetchInterval: autoRefreshEnabled ? refreshInterval : false,
  });

  const methodAvailability = useMempoolMethodAvailability();
  const refreshMutation = useRefreshNetworkConditions();

  useAutoRefresh(autoRefreshEnabled, refreshInterval, selectedNetworks);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("networks", selectedNetworks.join(","));
    params.set("autoRefresh", autoRefreshEnabled.toString());
    params.set("interval", refreshInterval.toString());
    setSearchParams(params);
  }, [selectedNetworks, autoRefreshEnabled, refreshInterval, setSearchParams]);

  const toggleNetwork = (network: string) => {
    setSelectedNetworks((prev) => {
      if (prev.includes(network)) {
        return prev.filter((n) => n !== network);
      } else {
        return [...prev, network];
      }
    });
  };

  const handleRefresh = async () => {
    for (const network of selectedNetworks) {
      await refreshMutation.mutateAsync(network);
    }
  };

  const allNetworkConditions = [
    ...(mainnetConditions.data ? [mainnetConditions.data] : []),
    ...(sepoliaConditions.data ? [sepoliaConditions.data] : []),
  ].filter((condition) => selectedNetworks.includes(condition.network));

  const isLoading =
    mainnetConditions.isLoading ||
    sepoliaConditions.isLoading ||
    networkComparison.isLoading;
  const hasError =
    mainnetConditions.error ||
    sepoliaConditions.error ||
    networkComparison.error;

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
      <header className="fixed top-0 left-0 w-full z-20 border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-40 pb-16 px-6">
        <div className="container mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-[#00bfff] tracking-wide">
              Network Monitor
            </h1>
            <p className="text-[#8b9dc3] text-lg">
              Real-time transaction pool monitoring and congestion analysis
            </p>
          </div>

          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                Network Monitoring
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending || isLoading}
                  className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-4"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[#8b9dc3]">
                  Networks:
                </span>
                <div className="flex gap-2">
                  {["mainnet", "sepolia"].map((network) => (
                    <Button
                      key={network}
                      variant={
                        selectedNetworks.includes(network)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleNetwork(network)}
                      className={
                        selectedNetworks.includes(network)
                          ? "bg-[#00bfff] text-[#0f1419]"
                          : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      }
                    >
                      <Network className="h-3 w-3 mr-1" />
                      {network.charAt(0).toUpperCase() + network.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[#8b9dc3]">
                  Auto-refresh:
                </span>
                <Button
                  variant={autoRefreshEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={
                    autoRefreshEnabled
                      ? "bg-[#00bfff] text-[#0f1419]"
                      : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  }
                >
                  {autoRefreshEnabled ? (
                    <Pause className="h-3 w-3 mr-1" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  {autoRefreshEnabled ? "Enabled" : "Disabled"}
                </Button>
                {autoRefreshEnabled && (
                  <Badge
                    variant="outline"
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff]"
                  >
                    Every {refreshInterval / 1000}s
                  </Badge>
                )}
              </div>

              {showAdvancedSettings && (
                <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-[#00bfff]">
                    Advanced Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[#8b9dc3]">
                        Refresh Interval (seconds)
                      </label>
                      <select
                        value={refreshInterval / 1000}
                        onChange={(e) =>
                          setRefreshInterval(parseInt(e.target.value) * 1000)
                        }
                        className="w-full p-2 rounded border border-[rgba(0,191,255,0.3)] bg-[rgba(25,28,40,0.8)] text-[#8b9dc3]"
                      >
                        <option value={15}>15 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={300}>5 minutes</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {methodAvailability.data &&
            !methodAvailability.data.txpool_status && (
              <Alert variant="destructive">
                <div>
                  <div className="font-medium">
                    Mempool Methods Not Available
                  </div>
                  <div className="text-sm mt-1">
                    The current RPC endpoint doesn't support txpool methods.
                    Network monitoring features will be limited.
                  </div>
                </div>
              </Alert>
            )}

          {hasError && (
            <Alert variant="destructive">
              <div>
                <div className="font-medium">Error Loading Network Data</div>
                <div className="text-sm mt-1">
                  {mainnetConditions.error?.message ||
                    sepoliaConditions.error?.message ||
                    networkComparison.error?.message}
                </div>
              </div>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="comparison"
                className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
              >
                Comparison
              </TabsTrigger>
              <TabsTrigger
                value="congestion"
                className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff]"
              >
                Congestion
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {selectedNetworks.includes("mainnet") && (
                  <NetworkStatusCard
                    networkConditions={mainnetConditions.data}
                    loading={mainnetConditions.isLoading}
                    error={mainnetConditions.error}
                    onRefresh={() => refreshMutation.mutate("mainnet")}
                  />
                )}
                {selectedNetworks.includes("sepolia") && (
                  <NetworkStatusCard
                    networkConditions={sepoliaConditions.data}
                    loading={sepoliaConditions.isLoading}
                    error={sepoliaConditions.error}
                    onRefresh={() => refreshMutation.mutate("sepolia")}
                  />
                )}
              </div>

              {allNetworkConditions.length > 0 && (
                <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                    Network Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#00bfff]">
                        {allNetworkConditions
                          .reduce((sum, n) => sum + n.txPoolStatus.pending, 0)
                          .toLocaleString()}
                      </div>
                      <div className="text-sm text-[#8b9dc3] mt-1">
                        Total Pending
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#00bfff]">
                        {allNetworkConditions
                          .reduce((sum, n) => sum + n.txPoolStatus.queued, 0)
                          .toLocaleString()}
                      </div>
                      <div className="text-sm text-[#8b9dc3] mt-1">
                        Total Queued
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#00bfff]">
                        {(
                          allNetworkConditions.reduce(
                            (sum, n) => sum + n.baseFee,
                            0,
                          ) / allNetworkConditions.length
                        ).toFixed(2)}
                      </div>
                      <div className="text-sm text-[#8b9dc3] mt-1">
                        Avg Base Fee (Gwei)
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#00bfff]">
                        {
                          allNetworkConditions.filter(
                            (n) => n.congestionAnalysis.level === "low",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-[#8b9dc3] mt-1">
                        Low Congestion
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-6 mt-6">
              {selectedNetworks.length > 1 ? (
                <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                    Network Comparison
                  </h3>
                  <NetworkComparisonChart networks={allNetworkConditions} />

                  {networkComparison.data && (
                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.8)]">
                          <div className="text-sm text-[#8b9dc3] mb-1">
                            Most Congested
                          </div>
                          <div className="text-lg font-semibold text-[#00bfff] capitalize">
                            {networkComparison.data.comparison.mostCongested}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.8)]">
                          <div className="text-sm text-[#8b9dc3] mb-1">
                            Least Congested
                          </div>
                          <div className="text-lg font-semibold text-[#00bfff] capitalize">
                            {networkComparison.data.comparison.leastCongested}
                          </div>
                        </div>
                      </div>

                      {networkComparison.data.comparison.recommendations
                        .length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-[#8b9dc3] mb-2">
                            Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {networkComparison.data.comparison.recommendations.map(
                              (rec, index) => (
                                <li
                                  key={index}
                                  className="text-sm text-[#6b7280] flex items-start gap-2"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 text-center">
                  <p className="text-[#8b9dc3]">
                    Select multiple networks to see comparison
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="congestion" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {allNetworkConditions.map((network) => (
                  <div
                    key={network.network}
                    className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6"
                  >
                    <CongestionGauge
                      congestionAnalysis={network.congestionAnalysis}
                      title={`${network.network.charAt(0).toUpperCase() + network.network.slice(1)} Congestion`}
                      size="md"
                      showDetails={true}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
