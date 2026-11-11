/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, /graphql se redirige al BFF local.
    proxy: { "/graphql": "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "cobertura"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/apollo.ts", "src/test/**", "src/**/*.test.tsx", "src/vite-env.d.ts"],
      thresholds: { lines: 60, statements: 60, functions: 60 },
    },
  },
});
