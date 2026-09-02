import { runCompatibilityQualification } from "./qualification.js";

const runtime = globalThis as typeof globalThis & {
  process?: { exitCode?: number };
};
if (!runtime.process) {
  throw new Error("The compatibility qualification command requires Node.js.");
}
runtime.process.exitCode = runCompatibilityQualification();
