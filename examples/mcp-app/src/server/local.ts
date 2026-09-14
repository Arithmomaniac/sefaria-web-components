import { startLocalEnvironment } from "./local-environment.js";

const environment = await startLocalEnvironment();
process.stdout.write(`Host: ${environment.hostUrl.href}\n`);
process.stdout.write(`Sandbox: ${environment.sandboxUrl.href}\n`);
process.stdout.write(`MCP: ${environment.mcpUrl.href}\n`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void environment.close().finally(() => process.exit());
  });
}
