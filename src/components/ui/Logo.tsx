import { cn } from "@/lib/utils";
import logoSvg from "@/assets/logo.svg";

interface LogoProps {
  className?: string;
  alt?: string;
}

export function Logo({ className = "", alt = "ArgusChain Logo" }: LogoProps) {
  return <img src={logoSvg} alt={alt} className={cn("", className)} />;
}
