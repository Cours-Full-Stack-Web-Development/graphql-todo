import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/graphql-todo/",
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**"],
    setupFiles: "./src/test/setup.js",
  },
});
