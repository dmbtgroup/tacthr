import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // DMBT logo colours: brand-500 is the logo orange, ink the logo's dark grey. Buttons use brand-600
        // and links brand-700 so white or body text on them stays readable.
        brand: {
          50: "#fff5ec",
          100: "#ffe6cf",
          200: "#ffcc9f",
          300: "#fbad66",
          400: "#f8973f",
          500: "#f5821f",
          600: "#e0701a",
          700: "#c05c12",
          800: "#9a4a10",
        },
        ink: "#474747",
      },
    },
  },
  plugins: [],
} satisfies Config;
