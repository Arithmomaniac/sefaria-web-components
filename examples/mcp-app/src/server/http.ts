import { startMcpHttpServer } from "./http-server.js";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const server = await startMcpHttpServer({ port });
process.stdout.write(`Sefaria MCP server: ${server.url.href}\n`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void server.close().finally(() => process.exit());
  });
}
