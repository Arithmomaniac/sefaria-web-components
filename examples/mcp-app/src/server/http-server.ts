import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { createMcpServer, type ServerOptions } from "./server.js";

export interface StartedHttpServer {
  readonly url: URL;
  close(): Promise<void>;
}

interface HttpServerOptions extends ServerOptions {
  readonly allowedOrigins?: readonly string[];
  readonly port?: number;
}

export async function startMcpHttpServer(
  options: HttpServerOptions = {},
): Promise<StartedHttpServer> {
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const servers = new Map<string, ReturnType<typeof createMcpServer>>();
  const allowedOrigins = new Set(options.allowedOrigins ?? []);
  const listener = createServer(async (request, response) => {
    const origin = singleHeader(request, "origin");
    const expectedHost = `127.0.0.1:${request.socket.localPort}`;
    if (singleHeader(request, "host") !== expectedHost) {
      response.writeHead(421).end("Misdirected request");
      return;
    }
    if (origin !== undefined && !allowedOrigins.has(origin)) {
      response.writeHead(403).end("Origin not allowed");
      return;
    }
    setCors(response, origin);
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    if (new URL(request.url ?? "/", "http://localhost").pathname !== "/mcp") {
      response.writeHead(404).end("Not found");
      return;
    }
    try {
      const sessionId = singleHeader(request, "mcp-session-id");
      const body =
        request.method === "POST" ? await readJsonBody(request) : undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;
      if (
        !transport &&
        request.method === "POST" &&
        isInitializeRequest(body)
      ) {
        const protocolServer = createMcpServer(options);
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          onsessioninitialized: (createdSessionId) => {
            transports.set(createdSessionId, transport!);
            servers.set(createdSessionId, protocolServer);
          },
        });
        transport.onclose = () => {
          const id = transport?.sessionId;
          if (id) deleteSession(id);
        };
        await protocolServer.connect(
          transport as Parameters<typeof protocolServer.connect>[0],
        );
      }
      if (!transport) {
        writeJson(response, 400, {
          jsonrpc: "2.0",
          error: { code: -32_000, message: "Invalid or missing MCP session." },
          id: null,
        });
        return;
      }
      await transport.handleRequest(request, response, body);
    } catch (error) {
      if (!response.headersSent) {
        writeJson(response, 500, {
          jsonrpc: "2.0",
          error: { code: -32_603, message: errorMessage(error) },
          id: null,
        });
      } else {
        response.destroy(error instanceof Error ? error : undefined);
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(options.port ?? 0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  if (!address || typeof address === "string") {
    throw new Error("The MCP HTTP server did not expose a TCP address.");
  }
  return {
    url: new URL(`http://127.0.0.1:${address.port}/mcp`),
    close: async () => {
      await Promise.all([...transports.values()].map((item) => item.close()));
      await new Promise<void>((resolve, reject) =>
        listener.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };

  function deleteSession(sessionId: string): void {
    transports.delete(sessionId);
    servers.delete(sessionId);
  }
}

function setCors(response: ServerResponse, origin: string | undefined): void {
  if (origin !== undefined) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, mcp-protocol-version, mcp-session-id, last-event-id",
  );
  response.setHeader(
    "Access-Control-Expose-Headers",
    "mcp-session-id, mcp-protocol-version",
  );
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS",
  );
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error("MCP request body exceeds 2 MiB.");
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function singleHeader(
  request: IncomingMessage,
  name: string,
): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function writeJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
