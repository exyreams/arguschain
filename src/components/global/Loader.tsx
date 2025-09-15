import { cn } from "@/lib/utils";
import loaderSvg from "@/assets/loader.svg";

interface LoaderProps {
  className?: string;
}

export function Loader({ className = "" }: LoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img src={loaderSvg} alt="Loading" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-bg-dark-primary flex flex-col items-center justify-center">
      <Loader />
      <p className="text-lg text-accent-primary mt-4 font-audiowide">
        Initializing arguschain...
      </p>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader />
    </div>
  );
}

export function ButtonLoader() {
  return <img src={loaderSvg} alt="Loading" />;
}

export function TransactionLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader />
      <p className="text-sm text-gray-400 mt-3">Tracing transaction...</p>
    </div>
  );
}

export function NetworkLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <Loader />
      <p className="text-sm text-gray-400 mt-3">Connecting to network...</p>
    </div>
  );
}

export function AnalysisLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <Loader />
      <p className="text-sm text-gray-400 mt-3">Analyzing call traces...</p>
    </div>
  );
}

export function OpcodeAnalyticsLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader />
      <p className="text-sm text-gray-400 mt-3">
        Processing opcode analytics...
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Analyzing execution patterns and gas usage
      </p>
    </div>
  );
}
