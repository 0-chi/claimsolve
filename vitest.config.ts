import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // 統合テストは1つのSQLiteを共有するため、ファイル間の並列実行を無効化
    fileParallelism: false,
    globalSetup: ["tests/global-setup.ts"],
    env: {
      DATABASE_URL: "file:./test.db",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
