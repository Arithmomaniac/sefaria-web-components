import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, expect, test, vi } from "vitest";

import linksFixture from "../../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json";
import textFixture from "../../../../packages/client/test/fixtures/v3-text-spanning-2026-08-29.json";
import { startMcpHttpServer, type StartedHttpServer } from "./http-server.js";
import { buildCspHeader } from "./local-environment.js";
import { createMcpServer } from "./server.js";
import {
  MAX_LINKS,
  MAX_LINKS_RESPONSE_BYTES,
  MAX_TEXT_LEAVES,
  RESOURCE_URI,
  createToolLogic,
  versionParams,
} from "./tool-logic.js";

const activeServers: StartedHttpServer[] = [];

afterEach(async () => {
  await Promise.all(activeServers.splice(0).map((server) => server.close()));
});

test("serves both tools and the packaged App resource through the base SDK", async () => {
  const server = createMcpServer({
    appHtml: async () => "<!doctype html><p>Waiting for a tool result</p>",
    fetch: fixtureFetch(),
  });
  const client = new Client({ name: "plain-test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const tools = await client.listTools();
  expect(tools.tools.map((tool) => tool.name)).toEqual([
    "get_text",
    "get_links_between_texts",
  ]);
  expect(tools.tools[0]?._meta?.ui).toEqual({ resourceUri: RESOURCE_URI });
  const resource = await client.readResource({ uri: RESOURCE_URI });
  expect(resource.contents).toEqual([
    expect.objectContaining({
      uri: RESOURCE_URI,
      mimeType: "text/html;profile=mcp-app",
      text: expect.stringContaining("Waiting for a tool result"),
    }),
  ]);

  await client.close();
  await server.close();
});

test("keeps omitted with_text capability defaults isolated by HTTP session", async () => {
  const requests: string[] = [];
  const server = await startMcpHttpServer({
    appHtml: async () => "<!doctype html>",
    fetch: fixtureFetch(requests),
  });

  activeServers.push(server);
  const appsClient = new Client(
    { name: "apps", version: "0.0.0" },
    {
      capabilities: {
        extensions: {
          "io.modelcontextprotocol/ui": {
            mimeTypes: ["text/html;profile=mcp-app"],
          },
        },
      },
    },
  );
  const plainClient = new Client({ name: "plain", version: "0.0.0" });
  await Promise.all([
    appsClient.connect(new StreamableHTTPClientTransport(server.url)),
    plainClient.connect(new StreamableHTTPClientTransport(server.url)),
  ]);

  const plainFirst = await plainClient.callTool({
    name: "get_links_between_texts",
    arguments: { reference: "Micah 6:8" },
  });
  const appsSecond = await appsClient.callTool({
    name: "get_links_between_texts",
    arguments: { reference: "Micah 6:8" },
  });
  await appsClient.callTool({
    name: "get_links_between_texts",
    arguments: { reference: "Micah 6:8", with_text: "0" },
  });
  await plainClient.callTool({
    name: "get_links_between_texts",
    arguments: { reference: "Micah 6:8", with_text: "1" },
  });

  expect(plainFirst._meta?.["sefaria/connections"]).toMatchObject({
    request: { withText: false },
  });
  expect(appsSecond._meta?.["sefaria/connections"]).toMatchObject({
    request: { withText: true },
  });
  expect(
    requests.map((request) => new URL(request).searchParams.get("with_text")),
  ).toEqual(["0", "1", "0", "1"]);

  await Promise.all([appsClient.close(), plainClient.close()]);
});

test("rejects browser origins outside the configured reference host", async () => {
  const allowedOrigin = "http://127.0.0.1:4173";
  const server = await startMcpHttpServer({ allowedOrigins: [allowedOrigin] });
  activeServers.push(server);

  const rejected = await fetch(server.url, {
    method: "OPTIONS",
    headers: { origin: "http://evil.example" },
  });
  expect(rejected.status).toBe(403);
  expect(rejected.headers.get("access-control-allow-origin")).toBeNull();

  const accepted = await fetch(server.url, {
    method: "OPTIONS",
    headers: { origin: allowedOrigin },
  });
  expect(accepted.status).toBe(204);
  expect(accepted.headers.get("access-control-allow-origin")).toBe(
    allowedOrigin,
  );
});

test("falls back to the restrictive default CSP for malformed metadata", () => {
  expect(buildCspHeader("not-json")).toBe(buildCspHeader(null));
});

test("preserves repeated v3 version query values", () => {
  expect(versionParams("both")).toEqual([
    ["version", "primary"],
    ["version", "translation"],
    ["return_format", "default"],
  ]);
});

test("validates corrected payloads before returning structured content", async () => {
  const logic = createToolLogic({
    fetch: async () => Response.json({ versions: "wrong" }, { status: 200 }),
  });

  await expect(logic.getText("Micah 6:8", "both")).rejects.toThrow("/versions");
});

test("rejects text and links beyond synchronous bounds without truncating accepted links", async () => {
  const oversizedText = micahTextPayload();
  oversizedText.versions[0]!.text = Array.from(
    { length: MAX_TEXT_LEAVES + 1 },
    () => "segment",
  );
  const textLogic = createToolLogic({
    fetch: async () => Response.json(oversizedText),
  });
  await expect(textLogic.getText("Micah 6:8", "both")).rejects.toThrow(
    `${MAX_TEXT_LEAVES}`,
  );

  const tooManyLinks = Array.from({ length: MAX_LINKS + 1 }, () => null);
  const linksLogic = createToolLogic({
    fetch: async () => Response.json(tooManyLinks),
  });
  await expect(linksLogic.getLinks("Micah 6:8", "1")).rejects.toThrow(
    `${MAX_LINKS}`,
  );

  const largeBody = JSON.stringify([
    { ...linksFixture[0], text: "x".repeat(MAX_LINKS_RESPONSE_BYTES) },
  ]);
  const bodyLogic = createToolLogic({
    fetch: async () =>
      new Response(largeBody, {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  await expect(bodyLogic.getLinks("Micah 6:8", "1")).rejects.toThrow(
    "decoded bytes",
  );

  const accepted = await createToolLogic({
    fetch: async () => Response.json(linksFixture),
  }).getLinks("Micah 6:8", "1");
  expect(accepted.structuredContent).toEqual({ payload: linksFixture });
});

function fixtureFetch(requests: string[] = []) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    requests.push(url.href);
    if (url.pathname.startsWith("/api/v3/texts/")) {
      return Response.json(micahTextPayload());
    }
    if (url.pathname.startsWith("/api/links/")) {
      return Response.json(linksFixture);
    }
    throw new Error(`Unexpected request: ${url.href}`);
  });
}

function micahTextPayload() {
  const payload = structuredClone(textFixture);
  return {
    ...payload,
    ref: "Micah 6:8",
    heRef: "Micah 6:8",
    sections: ["6", "8"],
    toSections: ["6", "8"],
    sectionRef: "Micah 6",
    heSectionRef: "Micah 6",
    firstAvailableSectionRef: "Micah 6:8",
    isSpanning: false,
    spanningRefs: [],
    next: null,
    prev: null,
    title: "Micah 6",
    book: "Micah",
    heTitle: "Micah",
    indexTitle: "Micah",
    heIndexTitle: "Micah",
    order: [14, 6],
    titleVariants: ["Micah"],
    heTitleVariants: ["Micah"],
    versions: payload.versions.map((version, index) => ({
      ...version,
      versionTitle: index === 0 ? "Micah source fixture" : version.versionTitle,
      text: ["What is good: do justice, love mercy, and walk humbly."],
    })),
  };
}
