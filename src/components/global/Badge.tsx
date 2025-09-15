import * as React from "react";
import { cn } from "@/lib/utils";

const badgeStyles = {
  base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:ring-offset-2 focus:ring-offset-[rgba(15,20,25,0.95)]",
  variants: {
    variant: {
      default:
        "border-transparent bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/80",
      secondary:
        "border-transparent bg-[rgba(139,157,195,0.1)] text-[#8b9dc3] hover:bg-[rgba(139,157,195,0.15)]",
      destructive:
        "border-transparent bg-[rgba(255,71,87,0.2)] text-[#ff4757] hover:bg-[rgba(255,71,87,0.3)]",
      outline:
        "border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.05)]",
      success:
        "border-transparent bg-[rgba(50,205,50,0.2)] text-[#32cd32] hover:bg-[rgba(50,205,50,0.3)]",
      warning:
        "border-transparent bg-[rgba(255,165,0,0.2)] text-[#ffa500] hover:bg-[rgba(255,165,0,0.3)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
};

type Variant = keyof typeof badgeStyles.variants.variant;

export const badgeVariants = ({
  variant,
  className,
}: {
  variant?: Variant;
  className?: string;
}) => {
  const v = variant || badgeStyles.defaultVariants.variant;
  return cn(badgeStyles.base, badgeStyles.variants.variant[v], className);
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
