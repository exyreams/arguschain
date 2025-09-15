import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/global";

interface ExportActionsProps {
  onExportJson: () => void;
  onExportCsv: () => void;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  onExportJson,
  onExportCsv,
}) => {
  return (
    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportJson}
        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
      >
        <Download className="h-4 w-4 mr-2" />
        Export JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExportCsv}
        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  );
};
