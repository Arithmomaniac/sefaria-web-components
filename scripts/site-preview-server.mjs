import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { preview } from "vite";

export const siteIdentity =
  '<meta name="sefaria-docs-site" content="local-docs-site-wave-3">';

export async function startSitePreview({ root }) {
  const server = await preview({
    root,
    configFile: false,
    cacheDir: path.join(root, "dist", "site-preview-cache"),
    build: {
      outDir: path.join(root, "dist", "site"),
    },
    preview: {
      host: "127.0.0.1",
      port: 0,
      strictPort: true,
    },
  });
  const address = server.httpServer.address();
  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("The owned site preview did not expose an assigned port.");
  }
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    origin,
    async waitUntilReady() {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        try {
          const response = await globalThis.fetch(origin);
          const html = await response.text();
          if (response.ok && html.includes(siteIdentity)) return;
        } catch {
          // The owned Vite preview is still starting.
        }
        await delay(100);
      }
      throw new Error(
        `The owned preview at ${origin} did not serve the expected site identity.`,
      );
    },
    async close() {
      await server.close();
    },
  };
}
