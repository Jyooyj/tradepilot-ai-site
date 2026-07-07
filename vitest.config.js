import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/utils/**/*.test.js", "api/**/*.test.js"],
    globals: false,
  },
});
