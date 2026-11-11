import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "cobertura"],
      include: ["src/**/*.ts"],
      // index.ts solo cablea dependencias; redis-cache.ts requiere un Redis real.
      exclude: ["src/index.ts", "src/redis-cache.ts"],
      thresholds: { lines: 60, statements: 60, functions: 60 },
    },
  },
});
