#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "server"


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


def start_app(start: bool) -> None:
    if not start:
        print("[done] Setup complete. Start manually with: npm start")
        return
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
    args = parser.parse_args()

    try:
        ensure_node_modules(force_install=args.force_install)
        ensure_server_env()
        setup_database(skip_setup=args.skip_setup)
        start_app(start=not args.no_start)
        return 0
    except RuntimeError as err:
        print(f"\n[error] {err}")
        return 1
    except KeyboardInterrupt:
        print("\n[stop] Interrupted by user.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
