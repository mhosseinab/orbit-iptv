import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Static SPA built to dist/; Cloudflare Pages serves dist/ and auto-detects
// the repo-root functions/ directory (the /proxy stream fallback).
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2021",
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 600, // hls.js is an intentional lazy ~520kB chunk
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
