/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        premium: {
          gold: "#D4AF37",
          pearl: "#FAF9F6",
          ink: "#1A1A1A",
          anthracite: "#333333",
        },
      },
      boxShadow: {
        soft: "0 8px 26px rgba(26, 26, 26, 0.08)",
        gold: "0 10px 30px rgba(212, 175, 55, 0.28)",
      },
      borderRadius: {
        premium: "8px",
      },
      fontFamily: {
        title: ["Playfair Display", "serif"],
        body: ["Montserrat", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
