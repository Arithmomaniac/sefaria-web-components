import { rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

await rm(path.join(process.cwd(), "dist"), { force: true, recursive: true });
