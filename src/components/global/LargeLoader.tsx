import { cn } from "@/lib/utils";
import loaderSvg from "@/assets/loader.svg";

interface LargeLoaderProps {
  className?: string;
}

export function LargeLoader({ className = "" }: LargeLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src={loaderSvg}
        alt="Loading"
        className="w-80 h-80 max-w-full max-h-full"
      />
    </div>
  );
}
