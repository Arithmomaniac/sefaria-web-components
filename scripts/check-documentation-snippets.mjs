import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const compiler = path.join(root, "node_modules", "typescript", "lib", "tsc.js");
const snippets = [
  ["packages/client/README.md", "## Ordinary use"],
  ["packages/web-components/README.md", "## Prebuilt Reader"],
  ["docs/learn/04-reader.md", "## Try it"],
  ["docs/learn/05-customization.md", "For a headless path"],
];

const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "sefaria-documentation-snippets-"),
);
try {
  const scopeDirectory = path.join(
    temporaryDirectory,
    "node_modules",
    "@sefaria",
  );
  await mkdir(scopeDirectory, { recursive: true });
  for (const packageName of ["client", "text-transform", "web-components"]) {
    await symlink(
      path.join(root, "packages", packageName),
      path.join(scopeDirectory, packageName),
      "junction",
    );
  }
  await writeFile(
    path.join(temporaryDirectory, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  await writeFile(
    path.join(temporaryDirectory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        lib: ["ES2022", "DOM"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
      },
      include: ["*.ts"],
    }),
  );
  for (const [index, [filename, marker]] of snippets.entries()) {
    const source = await readFile(path.join(root, filename), "utf8");
    await writeFile(
      path.join(temporaryDirectory, `snippet-${index + 1}.ts`),
      extractTypeScriptFence(source, marker),
    );
  }

  execFileSync(
    process.execPath,
    [compiler, "--project", temporaryDirectory, "--pretty", "false"],
    { cwd: root, stdio: "inherit" },
  );
  process.stdout.write(
    `Documentation snippets: ${snippets.length} TypeScript fences\n`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function extractTypeScriptFence(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) throw new Error(`Missing Markdown marker: ${marker}`);
  const match = /```ts\r?\n([\s\S]*?)\r?\n```/u.exec(source.slice(markerIndex));
  if (match?.[1] === undefined) {
    throw new Error(`Missing TypeScript fence after: ${marker}`);
  }
  return `${match[1]}\n`;
}
