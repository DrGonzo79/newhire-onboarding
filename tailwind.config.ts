import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7fa",
          100: "#e9edf2",
          200: "#cdd6e0",
          300: "#a7b6c6",
          400: "#7589a0",
          500: "#546479",
          600: "#3f4d5f",
          700: "#2f3a48",
          800: "#1f2733",
          900: "#141a22",
        },
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b6cdff",
          300: "#86a9ff",
          400: "#5b82f7",
          500: "#3a5fe0",
          600: "#2a48bd",
          700: "#233a97",
          800: "#21337a",
          900: "#1f2f63",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
