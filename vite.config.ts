import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: "./" so the static build works from file:// or any sub-path host
// (GitHub Pages / Netlify / Vercel), per the brief.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["Emerald.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Fia's Emerald",
        short_name: "Emerald",
        description: "Companion app for the homebrew item Fia's Emerald.",
        theme_color: "#06100b",
        background_color: "#06100b",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // precache the whole static build so it runs fully offline
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff,woff2}"],
      },
    }),
  ],
  server: { port: 5180, strictPort: true },
});
