import * as React from "react";
import { cn } from "@/lib/utils";

const buttonStyles = {
  base: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(15,20,25,0.95)] focus-visible:ring-[#00bfff] disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      default:
        "bg-[#00bfff] text-[#0A192F] hover:bg-[#00bfff]/90 active:scale-95",
      destructive: "bg-red-600 text-red-50 hover:bg-red-600/90 active:scale-95",
      outline:
        "border border-[rgba(0,191,255,0.3)] bg-transparent text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.08)] hover:text-[#00bfff] active:scale-95",
      secondary:
        "bg-[rgba(139,157,195,0.1)] text-[#8b9dc3] hover:bg-[rgba(139,157,195,0.2)] active:scale-95",
      ghost:
        "text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.08)] hover:text-[#00bfff] active:scale-95",
      link: "text-[#00bfff] underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
};

type Variant = keyof typeof buttonStyles.variants.variant;
type Size = keyof typeof buttonStyles.variants.size;

export const buttonVariants = ({
  variant,
  size,
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) => {
  const v = variant || buttonStyles.defaultVariants.variant;
  const s = size || buttonStyles.defaultVariants.size;

  return cn(
    buttonStyles.base,
    buttonStyles.variants.variant[v],
    buttonStyles.variants.size[s],
    className
  );
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      const child = React.Children.only(children);

      if (
        !React.isValidElement<
          React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>
        >(child)
      ) {
        return null;
      }

      return React.cloneElement(child, {
        ref,
        ...props,
        className: cn(
          buttonVariants({ variant, size }),
          child.props.className,
          className
        ),
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
