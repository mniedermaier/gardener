import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["locales/**/*.json"],
      manifest: {
        name: "Gardener - Garden Planner",
        short_name: "Gardener",
        description: "Self-sufficiency garden planner for vegetables, fruit, berries and herbs",
        theme_color: "#15803d",
        background_color: "#f0fdf0",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,png,svg}"],
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /assets\/.*\.(js|css)$/,
            handler: "CacheFirst",
            options: { cacheName: "assets-cache", expiration: { maxEntries: 60, maxAgeSeconds: 86400 * 30 } },
          },
          {
            urlPattern: /locales\/.*\.json$/,
            handler: "CacheFirst",
            options: { cacheName: "translations-cache", expiration: { maxEntries: 10, maxAgeSeconds: 86400 * 30 } },
          },
          {
            urlPattern: /api\.openweathermap\.org/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "weather-cache", expiration: { maxEntries: 5, maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
