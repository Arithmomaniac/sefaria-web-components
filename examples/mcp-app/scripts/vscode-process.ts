import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface VscodeProcess {
  readonly pid: number;
  kill(): Promise<void>;
  waitForExit(): Promise<void>;
}

interface LaunchOptions {
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly scratchDirectory: string;
}

const CREATE_NEW_PROCESS_GROUP = 0x0000_0200;
const SW_SHOWMINIMIZED = 2;

export function quoteWindowsArgument(value: string): string {
  if (value.length > 0 && !/[\s"]/u.test(value)) return value;

  let quoted = '"';
  let backslashes = 0;
  for (const character of value) {
    if (character === "\\") {
      backslashes += 1;
      continue;
    }
    if (character === '"') {
      quoted += `${"\\".repeat(backslashes * 2 + 1)}"`;
      backslashes = 0;
      continue;
    }
    quoted += `${"\\".repeat(backslashes)}${character}`;
    backslashes = 0;
  }
  return `${quoted}${"\\".repeat(backslashes * 2)}"`;
}

export function createWindowsCommandLine(
  executable: string,
  arguments_: readonly string[],
): string {
  return [executable, ...arguments_].map(quoteWindowsArgument).join(" ");
}

export async function launchVscodeProcess(
  executable: string,
  arguments_: readonly string[],
  options: LaunchOptions,
): Promise<VscodeProcess> {
  if (process.platform !== "win32") {
    const child = spawn(executable, arguments_, {
      cwd: options.cwd,
      detached: true,
      env: options.environment,
      stdio: "ignore",
    });
    await once(child, "spawn");
    return createProcessHandle(child.pid ?? 0);
  }

  const requestDirectory = path.join(
    options.scratchDirectory,
    "launcher",
    crypto.randomUUID(),
  );
  const requestPath = path.join(requestDirectory, "request.json");
  const responsePath = path.join(requestDirectory, "response.json");
  await mkdir(requestDirectory, { recursive: true });
  await writeFile(
    requestPath,
    `${JSON.stringify({
      executable,
      commandLine: createWindowsCommandLine(executable, arguments_),
      cwd: options.cwd,
      environment: options.environment,
    })}\n`,
    "utf8",
  );

  const helper = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(import.meta.dirname, "launch-vscode-minimized.ps1"),
      requestPath,
      responsePath,
    ],
    { stdio: "ignore", windowsHide: true },
  );
  const [exitCode] = (await once(helper, "exit")) as [number | null];
  try {
    if (exitCode !== 0) {
      throw new Error(`The minimized Windows launcher exited ${exitCode}.`);
    }
    const response = JSON.parse(
      (await readFile(responsePath, "utf8")).replace(/^\uFEFF/u, ""),
    ) as {
      readonly pid?: unknown;
      readonly creationFlags?: unknown;
      readonly showWindow?: unknown;
    };
    if (
      !Number.isSafeInteger(response.pid) ||
      (response.pid as number) <= 0 ||
      response.creationFlags !== (CREATE_NEW_PROCESS_GROUP | 0x0000_0400) ||
      response.showWindow !== SW_SHOWMINIMIZED
    ) {
      throw new Error(
        `The minimized Windows launcher returned an invalid result: ${JSON.stringify(response)}`,
      );
    }
    return createProcessHandle(response.pid as number);
  } finally {
    await rm(requestDirectory, { recursive: true, force: true });
  }
}

function createProcessHandle(pid: number): VscodeProcess {
  return {
    pid,
    kill: async () => {
      if (process.platform === "win32") {
        await stopWindowsProcessTree(pid);
        return;
      }
      try {
        process.kill(-pid, "SIGTERM");
      } catch {
        // The process already exited.
      }
    },
    waitForExit: async () => {
      while (processExists(pid)) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    },
  };
}

async function stopWindowsProcessTree(pid: number): Promise<void> {
  const script = `
$root = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
if ($null -eq $root) { exit 0 }
$all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId)
$ids = [System.Collections.Generic.List[int]]::new()
$ids.Add(${pid})
for ($index = 0; $index -lt $ids.Count; $index++) {
  $parent = $ids[$index]
  foreach ($child in $all | Where-Object ParentProcessId -eq $parent) {
    if (-not $ids.Contains([int]$child.ProcessId)) { $ids.Add([int]$child.ProcessId) }
  }
}
[void]$root.CloseMainWindow()
[void]$root.WaitForExit(5000)
$orderedIds = $ids.ToArray()
[array]::Reverse($orderedIds)
foreach ($id in $orderedIds) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
`;
  const cleanup = spawn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { stdio: "ignore", windowsHide: true },
  );
  await once(cleanup, "exit");
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
