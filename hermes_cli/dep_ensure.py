"""Lazy dependency bootstrapper for non-Python runtime deps.

Detection and prompting live here in Python — not in install.sh — because:
  1. shutil.which() works on every platform; install.sh needs bash.
  2. Detection is instant; spawning bash for a "is node installed?" check is waste.
  3. Python controls the UX (rich prompts, non-interactive fallback, TTY detection).

install.sh is still the *installation* backend because it has 1900 lines of
battle-tested OS detection and package-manager logic (apt/brew/pacman/dnf/
zypper/Termux/…).  Reimplementing that in Python would be huge duplication.

Deps that degrade gracefully (ripgrep → grep fallback, ffmpeg → skip conversion)
don't need ensure_dependency wired in — only hard-fail sites do (TUI needs node,
browser tool needs agent-browser).
"""
from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

_IS_WINDOWS = platform.system() == "Windows"

_DEP_CHECKS = {
    "node": lambda: shutil.which("node") is not None,
    "browser": lambda: (
        shutil.which("agent-browser") is not None
        or _has_system_browser()
        or _has_hermes_agent_browser()
    ),
    "ripgrep": lambda: shutil.which("rg") is not None,
    "ffmpeg": lambda: shutil.which("ffmpeg") is not None,
}

_DEP_DESCRIPTIONS = {
    "node": "Node.js (required for browser tools and TUI)",
    "browser": "Browser engine (Chromium, for web browsing tools)",
    "ripgrep": "ripgrep (fast file search)",
    "ffmpeg": "ffmpeg (TTS voice messages)",
}


def _has_system_browser() -> bool:
    if _IS_WINDOWS:
        names = ("chrome", "msedge", "chromium")
    else:
        names = ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome")
    for name in names:
        if shutil.which(name):
            return True
    return False


def _has_hermes_agent_browser() -> bool:
    from hermes_constants import get_hermes_home
    home = get_hermes_home()
    bin_name = "agent-browser.cmd" if _IS_WINDOWS else "agent-browser"
    # Canonical: npm -g --prefix ~/.hermes/node (ACP bootstrap + install.ps1)
    # Windows npm global puts shims at prefix root; POSIX at prefix/bin/
    if _IS_WINDOWS:
        if (home / "node" / bin_name).is_file():
            return True
    else:
        if (home / "node" / "bin" / bin_name).is_file():
            return True
    # Legacy: install.sh uses npm --prefix ~/.hermes → node_modules/.bin/
    if (home / "node_modules" / ".bin" / bin_name).is_file():
        return True
    return False


def _find_install_script(
    package_dir: Path | None = None,
    repo_root: Path | None = None,
) -> tuple[Path | None, str | None]:
    """Locate the install script — bundled in wheel or in git checkout.

    On Windows, prefers install.ps1; on POSIX, prefers install.sh.
    Returns a (path, shell) tuple, or (None, None) if neither is found.
    """
    if package_dir is None:
        package_dir = Path(__file__).parent
    if repo_root is None:
        repo_root = package_dir.parent

    if _IS_WINDOWS:
        script_name, shell = "install.ps1", "powershell"
    else:
        script_name, shell = "install.sh", "bash"

    bundled = package_dir / "scripts" / script_name
    if bundled.is_file():
        return bundled, shell
    repo = repo_root / "scripts" / script_name
    if repo.is_file():
        return repo, shell

    return None, None


def ensure_dependency(dep: str, interactive: bool = True) -> bool:
    """Ensure a non-Python dependency is available. Returns True if available."""
    check = _DEP_CHECKS.get(dep)
    if check and check():
        return True

    script, shell = _find_install_script()
    if script is None:
        if interactive:
            desc = _DEP_DESCRIPTIONS.get(dep, dep)
            print(f"  {desc} is not installed and no install script was found.")
            print(f"  Install {dep} manually and try again.")
        return False

    if interactive and sys.stdin.isatty():
        desc = _DEP_DESCRIPTIONS.get(dep, dep)
        try:
            reply = input(f"{desc} is not installed. Install now? [Y/n] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            return False
        if reply not in ("", "y", "yes"):
            return False

    if shell == "powershell":
        from hermes_constants import get_hermes_home
        ps_bin = shutil.which("powershell") or shutil.which("pwsh")
        if not ps_bin:
            if interactive:
                print("  PowerShell not found. Install PowerShell or run install.ps1 manually.")
            return False
        cmd = [
            ps_bin,
            "-ExecutionPolicy", "Bypass",
            "-File", str(script),
            "-Ensure", dep,
            "-HermesHome", str(get_hermes_home()),
        ]
    else:
        cmd = ["bash", str(script), "--ensure", dep]

    result = subprocess.run(
        cmd,
        env={**os.environ, "IS_INTERACTIVE": "false"},
    )
    if result.returncode != 0:
        return False

    if check:
        return check()
    # Unknown dep name — script ran but we have no way to verify success.
    return False
