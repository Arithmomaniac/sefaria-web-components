param(
  [Parameter(Mandatory = $true)]
  [string]$RequestPath,
  [Parameter(Mandatory = $true)]
  [string]$ResponsePath
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class SefariaNativeProcess
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string applicationName,
        string commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        string environment,
        string currentDirectory,
        ref STARTUPINFO startupInfo,
        out PROCESS_INFORMATION processInformation);

    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr handle);
}
"@

$request = Get-Content -Raw -LiteralPath $RequestPath | ConvertFrom-Json
$environmentEntries = @(
  foreach ($property in ($request.environment.PSObject.Properties | Sort-Object Name)) {
    "$($property.Name)=$($property.Value)"
  }
)
$environmentBlock = [string]::Join("`0", $environmentEntries) + "`0`0"
$startupInfo = New-Object SefariaNativeProcess+STARTUPINFO
$startupInfo.cb = [Runtime.InteropServices.Marshal]::SizeOf($startupInfo)
$startupInfo.dwFlags = 0x00000001
$startupInfo.wShowWindow = 2
$processInformation = New-Object SefariaNativeProcess+PROCESS_INFORMATION
$creationFlags = 0x00000200 -bor 0x00000400

$created = [SefariaNativeProcess]::CreateProcess(
  [string]$request.executable,
  [string]$request.commandLine,
  [IntPtr]::Zero,
  [IntPtr]::Zero,
  $false,
  $creationFlags,
  $environmentBlock,
  [string]$request.cwd,
  [ref]$startupInfo,
  [ref]$processInformation
)

if (-not $created) {
  throw [ComponentModel.Win32Exception]::new(
    [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  )
}

[SefariaNativeProcess]::CloseHandle($processInformation.hThread) | Out-Null
[SefariaNativeProcess]::CloseHandle($processInformation.hProcess) | Out-Null

@{
  pid = $processInformation.dwProcessId
  creationFlags = $creationFlags
  showWindow = $startupInfo.wShowWindow
} | ConvertTo-Json -Compress | Set-Content -Encoding UTF8 -LiteralPath $ResponsePath
