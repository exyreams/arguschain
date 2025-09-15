import * as React from "react";
import { useState, createContext, useContext, useMemo } from "react";
import { cn } from "@/lib/utils";

type ImageStatus = "loading" | "loaded" | "error";

interface AvatarContextType {
  imageStatus: ImageStatus;
  setImageStatus: React.Dispatch<React.SetStateAction<ImageStatus>>;
}

const AvatarContext = createContext<AvatarContextType | null>(null);

const useAvatarContext = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error("Avatar components must be used within an <Avatar>");
  }
  return context;
};

const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const [imageStatus, setImageStatus] = useState<ImageStatus>("loading");

  const contextValue = useMemo(
    () => ({ imageStatus, setImageStatus }),
    [imageStatus]
  );

  return (
    <AvatarContext.Provider value={contextValue}>
      <span
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => {
  const { imageStatus, setImageStatus } = useAvatarContext();

  return (
    <img
      ref={ref}
      className={cn(
        "aspect-square h-full w-full object-cover transition-opacity",
        imageStatus !== "loaded" && "opacity-0",
        className
      )}
      onLoad={() => setImageStatus("loaded")}
      onError={() => setImageStatus("error")}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => {
  const { imageStatus } = useAvatarContext();

  if (imageStatus === "loaded") {
    return null;
  }

  return (
    <span
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-[rgba(139,157,195,0.1)] text-sm font-medium text-[#8b9dc3]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
