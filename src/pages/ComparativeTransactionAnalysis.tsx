import React from "react";
import { ComparativeAnalysis } from "@/components/tracetransaction";
import { useSearchParams } from "react-router-dom";

export const ComparativeTransactionAnalysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTransaction = searchParams.get("tx1") || undefined;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#00bfff] mb-2">
            Comparative Transaction Analysis
          </h1>
          <p className="text-gray-400">
            Compare two Ethereum transactions side-by-side to identify
            differences in patterns, gas usage, security, and performance.
          </p>
        </div>

        <ComparativeAnalysis initialTransaction={initialTransaction} />
      </div>
    </div>
  );
};
