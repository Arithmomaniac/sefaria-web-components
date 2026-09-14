import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const mcpAppPackage = new URL("./examples/mcp-app/", import.meta.url);
const mcpAppFromNodeModules = relative(
  fileURLToPath(new URL("./node_modules/", import.meta.url)),
  fileURLToPath(mcpAppPackage),
);

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: [
            "packages/**/*.test.ts",
            "examples/**/*.test.ts",
            "examples/**/*.test.tsx",
            "demos/**/*.test.ts",
            "demos/**/*.test.tsx",
            "tests/**/*.test.ts",
          ],
          exclude: [
            "**/*.browser.test.ts",
            "**/*.browser.test.tsx",
            "**/dist/**",
            "**/node_modules/**",
          ],
        },
      },
      {
        optimizeDeps: {
          include: [
            `${mcpAppFromNodeModules} > @modelcontextprotocol/ext-apps`,
          ],
        },
        test: {
          name: "browser",
          include: ["**/*.browser.test.ts", "**/*.browser.test.tsx"],
          exclude: ["**/dist/**", "**/node_modules/**"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            // Keep this below Windows' dynamic port range, where reserved ports fail with EACCES.
            api: 6338,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
