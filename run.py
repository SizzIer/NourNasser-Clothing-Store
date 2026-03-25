#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "server"
PREFERRED_BROWSERS = ("chrome", "google-chrome", "windows-default")


def resolve_executable(name: str) -> str:
    """Resolve cross-platform executable names (notably npm on Windows)."""
    candidates = [name]
    if sys.platform.startswith("win"):
        candidates = [f"{name}.cmd", f"{name}.exe", name]
    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    raise RuntimeError(
        f"Could not find '{name}' in PATH. Install Node.js and reopen terminal."
    )


def run_cmd(cmd: list[str], cwd: Path) -> None:
    print(f"\n[run] {' '.join(cmd)} (cwd={cwd})")
    command = [resolve_executable(cmd[0]), *cmd[1:]]
    result = subprocess.run(command, cwd=str(cwd))
    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(cmd)}")


def ensure_node_modules(force_install: bool) -> None:
    root_nm = ROOT / "node_modules"
    server_nm = SERVER_DIR / "node_modules"

    needs_root_install = force_install or not root_nm.exists()
    needs_server_install = force_install or not server_nm.exists()

    if needs_root_install:
        run_cmd(["npm", "install"], ROOT)
    else:
        print("[ok] Root dependencies already installed.")

    if needs_server_install:
        run_cmd(["npm", "install"], SERVER_DIR)
    else:
        print("[ok] Server dependencies already installed.")


def ensure_server_env() -> None:
    env_file = SERVER_DIR / ".env"
    env_example = SERVER_DIR / ".env.example"

    if env_file.exists():
        print("[ok] server/.env already exists.")
        return

    if not env_example.exists():
        print("[warn] server/.env is missing and no .env.example was found.")
        return

    shutil.copyfile(env_example, env_file)
    print("[ok] Copied server/.env.example -> server/.env")


def setup_database(skip_setup: bool) -> None:
    if skip_setup:
        print("[skip] Skipping DB setup (--skip-setup).")
        return
    run_cmd(["npm", "run", "setup"], ROOT)


def try_open_chrome_windows(url: str) -> bool:
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    program_files = os.environ.get("PROGRAMFILES", "")
    program_files_x86 = os.environ.get("PROGRAMFILES(X86)", "")
    candidates = [
        Path(local_app_data) / "Google/Chrome/Application/chrome.exe",
        Path(program_files) / "Google/Chrome/Application/chrome.exe",
        Path(program_files_x86) / "Google/Chrome/Application/chrome.exe",
    ]
    for exe in candidates:
        if exe.exists():
            subprocess.Popen([str(exe), url])
            print(f"[ok] Opened {url} in Chrome: {exe}")
            return True
    return False


def open_browser(url: str) -> bool:
    if sys.platform.startswith("win") and try_open_chrome_windows(url):
        return True

    for browser_name in PREFERRED_BROWSERS:
        try:
            controller = webbrowser.get(browser_name)
            if controller.open(url):
                print(f"[ok] Opened {url} in preferred browser: {browser_name}")
                return True
        except webbrowser.Error:
            continue
    if webbrowser.open(url):
        print(f"[ok] Opened {url} in default browser.")
        return True
    return False


def wait_and_open_browser(url: str, timeout_seconds: int = 90) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urlopen(url, timeout=2):
                opened = open_browser(url)
                if opened:
                    return
                else:
                    print("[warn] Could not open browser automatically.")
                return
        except (OSError, URLError):
            time.sleep(1)
    print(f"[warn] App did not become ready at {url} within {timeout_seconds}s.")


def start_app(start: bool, auto_open_browser: bool, app_url: str) -> None:
    if not start:
        print("[done] Setup complete. Start manually with: npm start")
        return
    if auto_open_browser:
        opener = threading.Thread(target=wait_and_open_browser, args=(app_url,), daemon=True)
        opener.start()
    run_cmd(["npm", "start"], ROOT)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Bootstrap and run the app: install deps, ensure server/.env, "
            "prepare DB, then start dev servers."
        )
    )
    parser.add_argument(
        "--force-install",
        action="store_true",
        help="Run npm install even if node_modules exists.",
    )
    parser.add_argument(
        "--skip-setup",
        action="store_true",
        help="Skip npm run setup (DB migrate/seed).",
    )
    parser.add_argument(
        "--no-start",
        action="store_true",
        help="Do setup only; do not run npm start.",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not auto-open the app in browser when starting.",
    )
    parser.add_argument(
        "--open-url",
        default="http://localhost:5173",
        help="URL to open automatically when app is ready.",
    )
    args = parser.parse_args()

    try:
        ensure_node_modules(force_install=args.force_install)
        ensure_server_env()
        setup_database(skip_setup=args.skip_setup)
        start_app(
            start=not args.no_start,
            auto_open_browser=not args.no_open,
            app_url=args.open_url,
        )
        return 0
    except RuntimeError as err:
        print(f"\n[error] {err}")
        return 1
    except KeyboardInterrupt:
        print("\n[stop] Interrupted by user.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
