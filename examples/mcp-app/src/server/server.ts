import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  createToolLogic,
  RESOURCE_URI,
  type ToolLogicOptions,
} from "./tool-logic.js";

export interface ServerOptions extends ToolLogicOptions {
  readonly appHtml?: () => Promise<string>;
}

export function createMcpServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer({
    name: "Sefaria Frontend Toolkit MCP App",
    version: "0.0.0",
  });
  const logic = createToolLogic(options);
  const readApp = options.appHtml ?? readPackagedApp;

  registerAppResource(
    server,
    "Sefaria Reader App",
    RESOURCE_URI,
    { description: "Interactive Sefaria Reader" },
    async () => ({
      contents: [
        {
          uri: RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readApp(),
          _meta: {
            ui: {
              csp: {},
            },
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "get_text",
    {
      title: "Get Sefaria text",
      description:
        "Retrieve a Sefaria text and render it as an interactive reader.",
      inputSchema: {
        reference: z.string().min(1),
        version_language: z.enum(["source", "english", "both"]).default("both"),
      },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async ({ reference, version_language }, extra) =>
      logic.getText(reference, version_language, extra.signal),
  );

  registerAppTool(
    server,
    "get_links_between_texts",
    {
      title: "Get Sefaria text connections",
      description:
        "Retrieve Sefaria connections and render them in the interactive reader.",
      inputSchema: {
        reference: z.string().min(1),
        with_text: z.enum(["0", "1"]).nullish(),
      },
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async ({ reference, with_text }, extra) => {
      const explicit = with_text ?? undefined;
      const resolved =
        explicit ??
        (supportsApps(server.server.getClientCapabilities()) ? "1" : "0");
      return logic.getLinks(reference, resolved, extra.signal);
    },
  );

  return server;
}

function supportsApps(capabilities: unknown): boolean {
  if (!isRecord(capabilities) || !isRecord(capabilities.extensions)) {
    return false;
  }
  const extension = capabilities.extensions["io.modelcontextprotocol/ui"];
  return (
    isRecord(extension) &&
    Array.isArray(extension.mimeTypes) &&
    extension.mimeTypes.includes(RESOURCE_MIME_TYPE)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readPackagedApp(): Promise<string> {
  const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
  return readFile(
    path.resolve(serverDirectory, "..", "app", "mcp-app.html"),
    "utf8",
  );
}
