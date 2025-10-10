import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "./ai-coding-tutor",
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/__tests__/**/*.test.ts?(x)", "src/**/__tests__/**/*.spec.ts?(x)"],
  },
  resolve: {
    alias: {
      "@/src": "/ai-coding-tutor/src",
      "@/": "/ai-coding-tutor/",
    },
  },
});
