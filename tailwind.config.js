/**
 * Keep in sync with frontend/src/app/globals.css and docs/DESIGN_SYSTEM.md.
 * Orange is the brand color; surface/border/semantic tokens match web values.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        orange: {
          50: "#fff8f1",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#dd6411",
          700: "#b8510d",
          800: "#923f0a",
          900: "#783208",
        },
        surface: {
          DEFAULT: "#fafafa",
          alt: "#f5f5f5",
          muted: "#f8fafc",
          tinted: "#fff8f1",
        },
        border: {
          subtle: "#e4e4e7",
          default: "#d4d4d8",
        },
        success: "#16a34a",
        warning: "#eab308",
        danger: "#dc2626",
        info: "#2563eb",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
