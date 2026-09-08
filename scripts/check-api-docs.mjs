import { spawn } from "node:child_process";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseSync } from "oxc-parser";

const repository = path.resolve(import.meta.dirname, "..");
const outputDirectory = path.join(repository, ".toolchain", "api-docs");
const maximumFiles = 500;
const maximumBytes = 5 * 1024 * 1024;
const requiredOutputPrefixes = [
  "packages/client/scripts/",
  "packages/client/src/",
  "packages/components/src/",
  "packages/text-transform/src/",
];

export async function runApiDocumentationCheck({
  compile = compileDeclarations,
  output = outputDirectory,
  log = writeLine,
} = {}) {
  await rm(output, { force: true, recursive: true });
  await compile();

  const files = await listDeclarationFiles(output);
  if (files.length === 0) {
    throw new Error("TypeScript emitted no API declaration files.");
  }
  if (files.length > maximumFiles) {
    throw new Error(
      `API documentation check found ${files.length} files; limit is ${maximumFiles}.`,
    );
  }

  const relativeFiles = files.map((file) => relativePath(output, file));
  for (const prefix of requiredOutputPrefixes) {
    if (!relativeFiles.some((file) => file.startsWith(prefix))) {
      throw new Error(`API declaration output is missing ${prefix}.`);
    }
  }

  let bytes = 0;
  const failures = [];
  for (const file of files) {
    const fileStat = await stat(file);
    bytes += fileStat.size;
    if (bytes > maximumBytes) {
      throw new Error(
        `API declaration output exceeds ${maximumBytes} retained bytes.`,
      );
    }

    const relativeFile = relativePath(output, file);
    if (relativeFile.includes("/generated/")) {
      continue;
    }
    const source = await readFile(file, "utf8");
    for (const declaration of findUndocumentedDeclarations(
      relativeFile,
      source,
    )) {
      failures.push(`${relativeFile}:${declaration.line} ${declaration.name}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Missing JSDoc in emitted API declarations:\n${failures.join("\n")}`,
    );
  }

  log(`API documentation: ${files.length} files, ${bytes} bytes`);
}

export function findUndocumentedDeclarations(filename, source) {
  const parsed = parseSync(filename, source, {
    astType: "ts",
    lang: "dts",
    sourceType: "module",
  });
  if (parsed.errors.length > 0) {
    throw new Error(
      `Could not parse ${filename}: ${parsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const comments = [...parsed.comments].sort(
    (left, right) => left.end - right.end,
  );
  const exportedLocals = collectExportedLocals(parsed.program.body);
  const failures = [];

  for (const statement of parsed.program.body) {
    if (
      statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportDefaultDeclaration"
    ) {
      if (statement.declaration) {
        inspectDeclaration(statement.declaration, statement);
      }
      continue;
    }

    const names = declarationNames(statement);
    if (names.some((name) => exportedLocals.has(name))) {
      inspectDeclaration(statement, statement);
    }
  }

  return failures;

  function inspectDeclaration(declaration, commentTarget) {
    const name = declarationNames(declaration).join(", ") || declaration.type;
    if (
      [
        "ClassDeclaration",
        "FunctionDeclaration",
        "TSDeclareFunction",
        "TSEnumDeclaration",
        "TSInterfaceDeclaration",
        "TSTypeAliasDeclaration",
        "VariableDeclaration",
      ].includes(declaration.type) &&
      !hasLeadingJsDoc(commentTarget, comments, source)
    ) {
      failures.push(describeDeclaration(commentTarget, name, source));
    }

    if (declaration.type === "TSInterfaceDeclaration") {
      for (const member of declaration.body.body) {
        if (
          member.type === "TSPropertySignature" &&
          !hasLeadingJsDoc(member, comments, source)
        ) {
          failures.push(
            describeDeclaration(member, propertyName(member.key), source),
          );
        }
      }
    }

    if (declaration.type === "ClassDeclaration") {
      for (const member of declaration.body.body) {
        if (
          member.type === "PropertyDefinition" &&
          member.key?.type !== "PrivateIdentifier" &&
          member.accessibility !== "private" &&
          !hasLeadingJsDoc(member, comments, source)
        ) {
          failures.push(
            describeDeclaration(member, propertyName(member.key), source),
          );
        }
      }
    }
  }
}

async function compileDeclarations() {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const args = windows
    ? ["/d", "/s", "/c", "pnpm exec tsc -p tsconfig.api-docs.json"]
    : ["exec", "tsc", "-p", "tsconfig.api-docs.json"];

  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: repository,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`API declaration compilation exited with ${code}.`));
      }
    });
  });
}

async function listDeclarationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listDeclarationFiles(entryPath)));
    } else if (entry.name.endsWith(".d.ts")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function collectExportedLocals(statements) {
  const names = new Set();
  for (const statement of statements) {
    if (
      statement.type !== "ExportNamedDeclaration" ||
      statement.source !== null ||
      statement.declaration
    ) {
      continue;
    }
    for (const specifier of statement.specifiers) {
      if (specifier.local?.name) {
        names.add(specifier.local.name);
      }
    }
  }
  return names;
}

function declarationNames(declaration) {
  if (declaration.id?.name) {
    return [declaration.id.name];
  }
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations
      .map((item) => item.id?.name)
      .filter((name) => typeof name === "string");
  }
  return [];
}

function hasLeadingJsDoc(node, comments, source) {
  const preceding = comments
    .filter((comment) => comment.end <= node.start)
    .at(-1);
  return (
    preceding?.type === "Block" &&
    source.slice(preceding.start, preceding.start + 3) === "/**" &&
    source.slice(preceding.end, node.start).trim().length === 0
  );
}

function propertyName(key) {
  if (key?.name) {
    return key.name;
  }
  if (typeof key?.value === "string" || typeof key?.value === "number") {
    return String(key.value);
  }
  return "property";
}

function describeDeclaration(node, name, source) {
  return {
    line: source.slice(0, node.start).split(/\r?\n/u).length,
    name,
  };
}

function relativePath(root, file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function writeLine(message) {
  process.stdout.write(`${message}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runApiDocumentationCheck();
}
