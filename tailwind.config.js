/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Emerald "Balanced" palette (mirrors the CSS vars in src/index.css).
      // sap* token names retained from the template; values are now emerald.
      colors: {
        bg0: "#06100b",
        bg1: "#0c1f16",
        bg2: "#123026",
        sap: "#1f9d57",
        "sap-bright": "#57db93",
        "sap-deep": "#0c5a33",
        "sap-glow": "#34c878",
        ice: "#cdf3df",
        gold: "#e9bd4c",
        "gold-bright": "#f7da86",
        "gold-deep": "#a9781d",
        ink: "#e9fcf1",
        mut: "#8fc4a8",
        mut2: "#6c9e83",
        lock: "#2a4438",
        "lock-ink": "#5e9a78",
        // damage-type chip colours
        poison: "#a779ff",
        acid: "#b6e34a",
        cold: "#7fd4e0",
        heal: "#7fe0b0",
      },
      fontFamily: {
        // brief §5.4
        title: ["'Cinzel Decorative'", "serif"],
        cinzel: ["'Cinzel'", "serif"],
        body: ["'Spectral'", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
