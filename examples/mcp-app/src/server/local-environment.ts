import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startMcpHttpServer, type StartedHttpServer } from "./http-server.js";
import type { ServerOptions } from "./server.js";

export interface LocalEnvironment {
  readonly hostUrl: URL;
  readonly sandboxUrl: URL;
  readonly mcpUrl: URL;
  close(): Promise<void>;
}

export async function startLocalEnvironment(
  options: ServerOptions = {},
): Promise<LocalEnvironment> {
  const distributionRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const hostRoot = path.join(distributionRoot, "host");

  const sandbox = await startStaticServer(hostRoot, (response, requestUrl) => {
    const requestPath = requestUrl.pathname;
    if (requestPath === "/" || requestPath === "/sandbox.html") {
      response.setHeader(
        "Content-Security-Policy",
        buildCspHeader(requestUrl.searchParams.get("csp")),
      );
      response.setHeader("Cache-Control", "no-store");
    }
  });
  const sandboxUrl = new URL("/sandbox.html", sandbox.url);

  let mcp: StartedHttpServer | undefined;
  const host = await startStaticServer(hostRoot, (response, requestUrl) => {
    const requestPath = requestUrl.pathname;
    if (requestPath === "/api/config") {
      if (!mcp) {
        response.writeHead(503).end("MCP server is not ready.");
        return true;
      }
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          mcpUrl: mcp.url.href,
          sandboxUrl: sandboxUrl.href,
        }),
      );
      return true;
    }
    if (requestPath === "/sandbox.html") {
      response.writeHead(404).end("Sandbox is served on another origin.");
      return true;
    }
    return false;
  });
  try {
    mcp = await startMcpHttpServer({
      ...options,
      allowedOrigins: [host.url.origin],
    });
  } catch (error) {
    await Promise.all([host.close(), sandbox.close()]);
    throw error;
  }

  return {
    hostUrl: new URL("/", host.url),
    sandboxUrl,
    mcpUrl: mcp.url,
    close: async () => {
      await Promise.all([host.close(), sandbox.close(), mcp.close()]);
    },
  };
}

interface StaticServer {
  readonly url: URL;
  close(): Promise<void>;
}

async function startStaticServer(
  root: string,
  beforeServe: (response: ServerResponse, requestUrl: URL) => boolean | void,
): Promise<StaticServer> {
  const server = createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      const requestPath = requestUrl.pathname;
      if (
        beforeServe(response, requestUrl) === true ||
        response.writableEnded
      ) {
        return;
      }
      const relative =
        requestPath === "/" ? "index.html" : requestPath.slice(1);
      const file = path.resolve(root, relative);
      if (
        !file.startsWith(`${path.resolve(root)}${path.sep}`) ||
        !existsSync(file)
      ) {
        response.writeHead(404).end("Not found");
        return;
      }
      const candidate = statSync(file).isDirectory()
        ? path.join(file, "index.html")
        : file;
      response.setHeader("content-type", contentType(candidate));
      createReadStream(candidate).pipe(response);
    } catch (error) {
      response.writeHead(400).end(errorMessage(error));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The local host did not expose a TCP address.");
  }
  return {
    url: new URL(`http://127.0.0.1:${address.port}/`),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

export function buildCspHeader(value: string | null): string {
  let csp: {
    resourceDomains?: string[];
    connectDomains?: string[];
    frameDomains?: string[];
  } = {};
  if (value) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) csp = parsed;
    } catch {
      return buildCspHeader(null);
    }
  }

  const resources = safeDomains(csp.resourceDomains).join(" ");
  const connections = safeDomains(csp.connectDomains).join(" ");
  const frames = safeDomains(csp.frameDomains).join(" ");
  return [
    "default-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: ${resources}`.trim(),
    `style-src 'self' 'unsafe-inline' blob: data: ${resources}`.trim(),
    `img-src 'self' data: blob: ${resources}`.trim(),
    `font-src 'self' data: blob: ${resources}`.trim(),
    `connect-src 'self' ${connections}`.trim(),
    frames ? `frame-src ${frames}` : "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeDomains(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && !/[;\r\n'" ]/.test(item),
      )
    : [];
}

function contentType(file: string): string {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}
