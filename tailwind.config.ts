import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#05060e",
        surface: "#0a0c1a",
        aurora: {
          violet: "#8b5cf6",
          indigo: "#6366f1",
          cyan: "#22d3ee",
          magenta: "#e879f9",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "orb-drift": "orb-drift 24s ease-in-out infinite alternate",
        "orb-drift-slow": "orb-drift 36s ease-in-out infinite alternate-reverse",
        shimmer: "shimmer 8s ease-in-out infinite",
      },
      keyframes: {
        "orb-drift": {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(6%, -4%, 0) scale(1.08)" },
          "100%": { transform: "translate3d(-5%, 5%, 0) scale(0.95)" },
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
