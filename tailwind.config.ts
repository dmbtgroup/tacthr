import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // House Of Management Engineering logo colours: brand-500 is the logo blue; buttons use brand-600 and
        // links brand-700 so white or body text on them stays readable. Grey is the logo roof, ink its dark text.
        brand: {
          50: "#eef6fe",
          100: "#d9ebfd",
          200: "#b3d7fb",
          300: "#7dbcf7",
          400: "#45a0f5",
          500: "#1488f2",
          600: "#0f72d1",
          700: "#0d5ca8",
          800: "#0b4682",
        },
        roof: "#9c9c9c",
        ink: "#3a3a3a",
      },
    },
  },
  plugins: [],
} satisfies Config;
