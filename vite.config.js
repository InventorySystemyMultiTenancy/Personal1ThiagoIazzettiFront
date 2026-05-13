import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/i18n-api": {
        target: "https://tradudor-i8n-languages.onrender.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/i18n-api/, ""),
      },
    },
  },
});
