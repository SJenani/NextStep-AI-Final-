/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#f3f7f6",
        tide: "#0f766e",
        coral: "#fb923c",
        night: "#082f49",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Manrope'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 24px 80px rgba(8, 47, 73, 0.18)",
      },
      backgroundImage: {
        "hero-radial": "radial-gradient(circle at top left, rgba(251,146,60,0.35), transparent 32%), radial-gradient(circle at bottom right, rgba(15,118,110,0.28), transparent 30%)",
      },
    },
  },
  plugins: [],
};
