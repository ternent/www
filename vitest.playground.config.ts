import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@ternent/seal-cli": resolve(__dirname, "node_modules/@ternent/seal-cli/dist/proof.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/tests/runtime/playground.test.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
