import { checkCommittedArtifacts } from "./generate-openapi.js";

const stale = await checkCommittedArtifacts();
if (stale.length > 0) {
  console.error(`Generated OpenAPI artifacts are stale:\n${stale.join("\n")}`);
  process.exitCode = 1;
}
