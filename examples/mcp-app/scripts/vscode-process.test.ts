import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createWindowsCommandLine,
  launchVscodeProcess,
  quoteWindowsArgument,
} from "./vscode-process.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("VS Code process launcher", () => {
  it("quotes Windows arguments without losing spaces, quotes, or slashes", () => {
    expect(quoteWindowsArgument("plain")).toBe("plain");
    expect(quoteWindowsArgument("space value")).toBe('"space value"');
    expect(quoteWindowsArgument('quote"value')).toBe('"quote\\"value"');
    expect(quoteWindowsArgument("trailing \\")).toBe('"trailing \\\\"');
    expect(createWindowsCommandLine("C:\\Program Files\\Code.exe", [""])).toBe(
      '"C:\\Program Files\\Code.exe" ""',
    );
  });

  it.runIf(process.platform === "win32")(
    "preserves native minimized startup, arguments, PID, environment, and cleanup",
    async () => {
      const root = path.join(
        process.cwd(),
        ".artifacts",
        `vscode-launcher-test-${crypto.randomUUID()}`,
      );
      roots.push(root);
      await mkdir(root, { recursive: true });
      const resultPath = path.join(root, "probe result.json");
      const probePath = path.join(root, "probe.ps1");
      await writeFile(
        probePath,
        `param([string]$Output,[string]$One,[string]$Two,[string]$Three)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class StartupProbe {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct SI {
    public int cb; public string a; public string b; public string c;
    public int x; public int y; public int xs; public int ys;
    public int xc; public int yc; public int fill; public int flags;
    public short show; public short cb2; public IntPtr r2;
    public IntPtr input; public IntPtr output; public IntPtr error;
  }
  [DllImport("kernel32.dll")] public static extern void GetStartupInfo(ref SI si);
}
"@
$si = New-Object StartupProbe+SI
$si.cb = [Runtime.InteropServices.Marshal]::SizeOf($si)
[StartupProbe]::GetStartupInfo([ref]$si)
$child = Start-Process -FilePath "$env:SystemRoot\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -ArgumentList "-NoProfile","-Command","Start-Sleep -Seconds 120" -PassThru
@{ pid=$PID; childPid=$child.Id; args=@($One,$Two,$Three); marker=$env:VSCODE_PARITY_MARKER; startupFlags=$si.flags; showWindow=$si.show } |
  ConvertTo-Json -Compress |
  Set-Content -Encoding UTF8 -LiteralPath $Output
Start-Sleep -Seconds 120
`,
        "utf8",
      );

      const executable = path.join(
        process.env.SystemRoot ?? "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      );
      const launched = await launchVscodeProcess(
        executable,
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          probePath,
          resultPath,
          "space value",
          'quote"value',
          "trailing\\",
        ],
        {
          cwd: process.cwd(),
          environment: {
            ...process.env,
            VSCODE_PARITY_MARKER: "isolated marker",
          },
          scratchDirectory: root,
        },
      );
      let childPid: number | undefined;
      try {
        const deadline = Date.now() + 10_000;
        let result: string | undefined;
        while (Date.now() < deadline) {
          result = await readFile(resultPath, "utf8").catch(() => undefined);
          if (result !== undefined) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        expect(result).toBeDefined();
        const probe = JSON.parse(result!.replace(/^\uFEFF/u, "")) as {
          readonly pid: number;
          readonly childPid: number;
          readonly args: string[];
          readonly marker: string;
          readonly startupFlags: number;
          readonly showWindow: number;
        };
        childPid = probe.childPid;
        expect(probe).toMatchObject({
          pid: launched.pid,
          args: ["space value", 'quote"value', "trailing\\"],
          marker: "isolated marker",
          showWindow: 2,
        });
        expect(probe.startupFlags & 1).toBe(1);
      } finally {
        await launched.kill();
        await launched.waitForExit();
      }
      expect(childPid).toBeDefined();
      expect(() => process.kill(childPid!, 0)).toThrow();
    },
    30_000,
  );
});
