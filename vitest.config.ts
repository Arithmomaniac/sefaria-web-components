import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: [
            "packages/**/*.test.ts",
            "demos/**/*.test.ts",
            "tests/**/*.test.ts",
          ],
          exclude: ["**/*.browser.test.ts", "**/dist/**", "**/node_modules/**"],
        },
      },
      {
        test: {
          name: "browser",
          include: ["**/*.browser.test.ts"],
          exclude: ["**/dist/**", "**/node_modules/**"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
