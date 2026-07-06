/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // SmartSoko Design System Colors
        primary: {
          DEFAULT: "#012d1d",
          light: "#1a4d3a",
          dark: "#001f14",
        },
        secondary: {
          DEFAULT: "#c1ecd4",
          light: "#e0f5ea",
          dark: "#a5d0b9",
        },
        accent: {
          gold: "#d4a574",
          terra: "#c17b5f",
          cream: "#f5f0e8",
          taupe: "#e8e0d5",
        },
        // Category Colors
        category: {
          fishing: "#4a90a4",
          fruits: "#e07b39",
          dairy: "#5d8aa8",
          vegetables: "#6b8e23",
          bakery: "#c17b5f",
          honey: "#daa520",
          artisan: "#8b7355",
        },
        // Semantic Colors
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["System"],
        display: ["System"],
      },
    },
  },
  plugins: [],
};
