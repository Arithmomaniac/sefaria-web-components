import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        preview: "preview.html",
        workspace: "workspace-preview.html",
      },
    },
  },
  server: { open: false },
});
