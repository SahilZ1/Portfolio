import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration.
 *
 * In development the SPA runs on :5173 and proxies /api to the Express server
 * on :3000. The proxy matters for more than convenience: it keeps the browser
 * on a single origin, so the HttpOnly `portfolio_visitor` cookie and the admin
 * session cookie behave in development exactly as they will in the
 * single-origin production deployment. Pointing fetch() straight at :3000
 * would make every request cross-origin and hide cookie problems until deploy.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: false },
      "/robots.txt": { target: "http://localhost:3000" },
      "/sitemap.xml": { target: "http://localhost:3000" },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Split the vendor libraries out of the app chunk so a content edit does
    // not invalidate the cached React/router/motion bundle for return visitors.
    //
    // The function form is used rather than the object form because the object
    // form only matches the named entry modules, which left react-dom's own
    // internal modules in the app chunk.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
            return "motion";
          }
          if (id.includes("react-router") || id.includes("/react-dom/") || id.includes("/react/") ||
              id.includes("scheduler")) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
});
