/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        ink: "#171A21",
        rule: "#DBD7CC",
        indigo: {
          DEFAULT: "#2B3A67",
          dark: "#1C2749",
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
        display: ["Fraunces", "serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
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
