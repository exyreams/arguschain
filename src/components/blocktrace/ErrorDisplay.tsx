import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  return (
    <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-6">
      <div className="flex items-center gap-3 text-red-400 mb-2">
        <AlertCircle className="h-6 w-6" />
        <span className="font-semibold text-[18px]">Analysis Failed</span>
      </div>
      <p className="text-red-300 text-[15px] leading-[1.6]">{error}</p>
    </div>
  );
};
