import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(root, "host"),
  build: {
    outDir: path.join(root, "dist", "host"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.join(root, "host", "index.html"),
        sandbox: path.join(root, "host", "sandbox.html"),
      },
    },
  },
});
