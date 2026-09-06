import subprocess
import sys

SW_SHOWMINIMIZED = 2


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: launch-vscode-minimized.py <executable> [argument ...]")

    startup_info = subprocess.STARTUPINFO()
    startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startup_info.wShowWindow = SW_SHOWMINIMIZED
    process = subprocess.Popen(
        sys.argv[1:],
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        startupinfo=startup_info,
    )
    print(process.pid, flush=True)


if __name__ == "__main__":
    main()
