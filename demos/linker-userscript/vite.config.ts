import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Sefaria Linker Web Components demo",
        namespace: "https://github.com/Arithmomaniac/sefaria-web-components",
        description:
          "Local development shell for the Sefaria Linker Web Components demonstration.",
        match: ["http://localhost/*", "https://example.com/*"],
        "run-at": "document-idle",
      },
      server: {
        open: false,
      },
      build: {
        fileName: "sefaria-linker-demo.user.js",
      },
    }),
  ],
});
