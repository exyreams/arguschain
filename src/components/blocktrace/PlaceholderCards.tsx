import React from "react";
import { BarChart3, Flame, Network } from "lucide-react";

export const PlaceholderCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Block Overview
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            Block statistics and transaction summary will appear here
          </p>
        </div>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Gas Analytics
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Flame className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            Gas usage patterns and optimization insights
          </p>
        </div>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Network className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">Token Flow</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Network className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            Token transfer patterns and network analysis
          </p>
        </div>
      </div>
    </div>
  );
};
