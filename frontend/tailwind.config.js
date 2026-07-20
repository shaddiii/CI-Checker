/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF9",
        ink: "#15161A",
        rule: "#E2E0DC",
        // Estimated port-neo accent ("Data meets Empathy") - swap for the
        // real brand hex once you have it, this is the only place it lives.
        indigo: {
          DEFAULT: "#C2185B",
          dark: "#9A1148",
        },
        verdict: {
          green: "#1E7F4C",
          greenBg: "#E4F3EA",
          amber: "#B5720A",
          amberBg: "#FBEED9",
          red: "#B23A2E",
          redBg: "#F8E6E3",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
      },
    },
  },
  plugins: [],
};
