import * as React from "react";
import { cn } from "@/lib/utils";

const separatorVariants = {
  default: "bg-[rgba(0,191,255,0.3)]",
  solid: "bg-[#00bfff]",
  thick: "bg-[rgba(0,191,255,0.3)]",
  gradient: "bg-gradient-to-r from-transparent via-[#00bfff] to-transparent",
  dashed: "border-t border-dashed border-[#00bfff] bg-transparent",
  muted: "bg-[rgba(139,157,195,0.2)]",
  accent: "bg-[#00bfff]",
};

const separatorSizes = {
  thin: "h-[1px]",
  default: "h-[1px]",
  thick: "h-[2px]",
  bold: "h-[3px]",
};

type SeparatorVariant = keyof typeof separatorVariants;
type SeparatorSize = keyof typeof separatorSizes;

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  variant?: SeparatorVariant;
  size?: SeparatorSize;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      variant = "default",
      size = "default",
      ...props
    },
    ref,
  ) => {
    const isHorizontal = orientation === "horizontal";
    const variantClass = separatorVariants[variant];
    const sizeClass = isHorizontal ? separatorSizes[size] : "w-[1px]";

    const isDashed = variant === "dashed";
    const baseClass = isDashed ? "h-0" : sizeClass;

    return (
      <div
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={!decorative ? orientation : undefined}
        className={cn(
          "shrink-0",
          variantClass,
          isHorizontal
            ? `${baseClass} w-full`
            : `h-full ${isDashed ? "border-l border-dashed border-[#00bfff] bg-transparent w-0" : "w-[1px]"}`,
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = "Separator";

const HorizontalSeparator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorProps, "orientation">
>((props, ref) => <Separator ref={ref} orientation="horizontal" {...props} />);
HorizontalSeparator.displayName = "HorizontalSeparator";

const VerticalSeparator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorProps, "orientation">
>((props, ref) => <Separator ref={ref} orientation="vertical" {...props} />);
VerticalSeparator.displayName = "VerticalSeparator";

const SolidSeparator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorProps, "variant">
>((props, ref) => <Separator ref={ref} variant="solid" {...props} />);
SolidSeparator.displayName = "SolidSeparator";

const ThickSeparator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorProps, "size">
>((props, ref) => <Separator ref={ref} size="thick" {...props} />);
ThickSeparator.displayName = "ThickSeparator";

const GradientSeparator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorProps, "variant">
>((props, ref) => <Separator ref={ref} variant="gradient" {...props} />);
GradientSeparator.displayName = "GradientSeparator";

const DashedSeparator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorProps, "variant">
>((props, ref) => <Separator ref={ref} variant="dashed" {...props} />);
DashedSeparator.displayName = "DashedSeparator";

const MutedSeparator = React.forwardRef<
  HTMLDivElement,
  Omit<SeparatorProps, "variant">
>((props, ref) => <Separator ref={ref} variant="muted" {...props} />);
MutedSeparator.displayName = "MutedSeparator";

export {
  Separator,
  HorizontalSeparator,
  VerticalSeparator,
  SolidSeparator,
  ThickSeparator,
  GradientSeparator,
  DashedSeparator,
  MutedSeparator,
  type SeparatorProps,
  type SeparatorVariant,
  type SeparatorSize,
};
