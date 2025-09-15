import React from "react";
import { Loader2 } from "lucide-react";

interface ProgressIndicatorProps {
  progress: {
    stage: string;
    progress: number;
    message: string;
  };
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
}) => {
  return (
    <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="h-5 w-5 animate-spin text-[#00bfff]" />
        <span className="font-medium text-[#8b9dc3] text-[16px]">
          {progress.message}
        </span>
      </div>
      <div className="w-full bg-[rgba(15,20,25,0.8)] rounded-full h-3 border border-[rgba(0,191,255,0.2)]">
        <div
          className="bg-gradient-to-r from-[#00bfff] to-[#0099cc] h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,191,255,0.5)]"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
};
