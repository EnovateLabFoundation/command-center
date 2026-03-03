import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      // Content Security Policy — restricts resource loading to trusted origins
      "Content-Security-Policy": [
        "default-src 'self'",
        // Supabase API + Realtime WebSocket
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
        // Scripts: self + inline React (removed in prod build)
        "script-src 'self' 'unsafe-inline'",
        // Styles: self + Google Fonts
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Fonts
        "font-src 'self' https://fonts.gstatic.com data:",
        // Images: self + data URIs (for charts/exports)
        "img-src 'self' data: blob: https://*.supabase.co",
        // Media
        "media-src 'self' blob: https://*.supabase.co",
        // Frames: none
        "frame-src 'none'",
        // Objects: none
        "object-src 'none'",
        // Upgrade insecure
        "upgrade-insecure-requests",
      ].join("; "),

      // Prevent clickjacking
      "X-Frame-Options": "DENY",

      // XSS protection (legacy browsers)
      "X-XSS-Protection": "1; mode=block",

      // Prevent MIME sniffing
      "X-Content-Type-Options": "nosniff",

      // Referrer policy
      "Referrer-Policy": "strict-origin-when-cross-origin",

      // Permissions policy
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split large chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: React core
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Vendor: Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // Vendor: Charts
          "vendor-recharts": ["recharts"],
          // Vendor: Forms
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Vendor: Query
          "vendor-query": ["@tanstack/react-query"],
          // Vendor: UI
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
        },
      },
    },
    // Increase warning threshold slightly (app is expected to be large)
    chunkSizeWarningLimit: 600,
  },
}));
