import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f4",
          100: "#d4ece4",
          500: "#0f9d78",
          600: "#0b7d60",
          700: "#0a6650",
        },
      },
    },
  },
  plugins: [],
};

export default config;
