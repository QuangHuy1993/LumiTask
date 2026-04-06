import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      path.resolve(__dirname, "Testcase/**/*.test.ts"),
      path.resolve(__dirname, "src/**/*.test.ts"),
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/../generated": path.resolve(__dirname, "./generated"),
    },
  },
});
