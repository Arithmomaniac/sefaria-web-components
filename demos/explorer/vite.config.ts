import path from "node:path";

import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(root, "index.html"),
        authored: path.resolve(root, "authored.html"),
        "ref-label": path.resolve(root, "ref-label.html"),
        "text-segment": path.resolve(root, "text-segment.html"),
        "bilingual-segment": path.resolve(root, "bilingual-segment.html"),
        "source-card": path.resolve(root, "source-card.html"),
        connections: path.resolve(root, "connections.html"),
      },
    },
  },
});
