import { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { Logo } from "@/components/ui/Logo";

interface MobileNavbarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
}

export function MobileNavbar({
  open,
  onOpenChange,
  trigger,
  children,
}: MobileNavbarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent
        side="right"
        className="w-[300px] sm:w-[350px] bg-[rgba(25,28,40,0.98)] backdrop-blur-[20px] border-l border-[rgba(0,191,255,0.3)] p-0 custom-scrollbar"
      >
        <SheetHeader className="border-b border-[rgba(0,191,255,0.2)] p-4 pb-4">
          <SheetTitle className="flex items-center gap-3 text-xl text-[#00bfff] tracking-wide font-audiowide justify-start">
            <Logo className="w-7 h-7" alt="arguschain Logo" />
            <span className="font-regular">arguschain</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
