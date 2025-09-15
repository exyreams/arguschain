import { Toaster as SonnerToaster } from "sonner";
import "./toast-styles.css";

export function ThemedToaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      offset={20}
      visibleToasts={5}
      expand={false}
      richColors={false}
      closeButton={false}
      toastOptions={{
        classNames: {
          toast: [
            "bg-[#1a1f2e]",
            "border border-[#00d4ff]/30",
            "text-white",
            "rounded-lg",
            "shadow-none",
          ].join(" "),
          title: ["text-[#00d4ff]", "font-semibold"].join(" "),
          description: ["text-[#8b9dc3]", "opacity-90"].join(" "),
          success: "border-green-400/30",
          error: "border-red-400/30",
          warning: "border-yellow-400/30",
          info: "border-[#00d4ff]/30",
          loading: "border-[#8b9dc3]/30",
        },
        style: {
          background: "#1a1f2e",
          border: "1px solid rgba(0, 212, 255, 0.3)",
          borderRadius: "8px",
          boxShadow: "none",
        },
      }}
    />
  );
}
