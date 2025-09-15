import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      sans: ["Monaco", "Menlo", "Ubuntu Mono", "monospace"],
      mono: ["Monaco", "Menlo", "Ubuntu Mono", "monospace"],
      mulish: ["Mulish", "sans-serif"],
      audiowide: ["Audiowide", "monospace"],
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ArgusChain design colors
        "bg-dark-primary": "#0f1419",
        "bg-dark-secondary": "#1a1f2e",
        "text-primary": "#e1e5f2",
        "text-secondary": "#8b9dc3",
        "accent-primary": "#00bfff",
        "accent-secondary": "#00ff7f",
        "border-color": "rgba(0, 191, 255, 0.2)",
        "card-bg": "rgba(25, 28, 40, 0.6)",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-10px)" },
        },
        "highlight-pulse": {
          "0%, 100%": { backgroundColor: "rgba(255, 51, 102, 0.1)" },
          "50%": { backgroundColor: "rgba(255, 51, 102, 0.3)" },
        },
        pulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(0, 255, 127, 0.7)" },
          "70%": { boxShadow: "0 0 0 10px rgba(0, 255, 127, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0, 255, 127, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(5deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "highlight-pulse": "highlight-pulse 2s ease-in-out infinite",
        pulse: "pulse 2s infinite ease-in-out",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out infinite 2s",
      },
      fontFamily: {
        space: ["Space Grotesk", "sans-serif"],
        mono: ["Monaco", "Menlo", "Ubuntu Mono", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addVariant }) {
      addVariant("theme-light", ".theme-light &");
    },
  ],
} satisfies Config;
