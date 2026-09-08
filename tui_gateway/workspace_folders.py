"""Multi-root workspace context for desktop projects with more than one folder."""

from __future__ import annotations

import os
from pathlib import Path


def normalize_workspace_folders(raw, primary_cwd: str = "") -> list[str]:
    """Keep existing directories, unique, primary first."""
    seen: set[str] = set()
    out: list[str] = []
    candidates = list(raw or [])
    if primary_cwd:
        candidates = [primary_cwd, *candidates]
    for item in candidates:
        path = os.path.abspath(os.path.expanduser(str(item or "").strip()))
        if not path or path in seen:
            continue
        try:
            if not os.path.isdir(path):
                continue
        except Exception:
            continue
        seen.add(path)
        out.append(path)
    return out


def _folder_context_excerpt(root: str, limit: int = 2500) -> str:
    for name in ("AGENTS.md", "agents.md", ".hermes.md", "HERMES.md"):
        file_path = Path(root) / name
        try:
            if file_path.is_file():
                text = file_path.read_text(encoding="utf-8", errors="replace").strip()
                if not text:
                    continue
                if len(text) > limit:
                    text = text[:limit].rstrip() + "\n…"
                return f"### {name} from `{root}`\n\n{text}"
        except Exception:
            continue
    return ""


def project_folders_for_cwd(cwd: str) -> list[str]:
    """Sibling folders from the named project that owns ``cwd``, if any."""
    path = str(cwd or "").strip()
    if not path:
        return []
    try:
        from hermes_cli import projects_db as pdb

        with pdb.connect_closing() as conn:
            project = pdb.project_for_path(conn, path)
        if project is None:
            return []
        raw = [getattr(folder, "path", "") for folder in (project.folders or [])]
        if project.primary_path:
            raw = [project.primary_path, *raw]
        return normalize_workspace_folders(raw, path)
    except Exception:
        return []


def resolve_workspace_folders(raw, primary_cwd: str = "") -> list[str]:
    """Client folders plus any siblings from the project that owns ``cwd``."""
    return normalize_workspace_folders(
        list(raw or []) + project_folders_for_cwd(primary_cwd),
        primary_cwd,
    )


def build_workspace_folders_prompt(folders: list[str], primary_cwd: str = "") -> str:
    """System-prompt block so the agent treats several repos as one workspace."""
    if len(folders) < 2:
        return ""
    primary = os.path.abspath(os.path.expanduser(primary_cwd or folders[0]))
    lines = [
        "# Multi-root workspace",
        "",
        "This chat is the parent of a multi-folder workspace (same idea as a Cursor multi-root workspace).",
        "All folders below belong to ONE workspace. Use them together when answering.",
        "",
        "Workspace folders:",
    ]
    for path in folders:
        name = Path(path).name
        suffix = " — primary (default cwd / tools start here)" if os.path.normcase(path) == os.path.normcase(primary) else ""
        lines.append(f"- `{path}` ({name}){suffix}")
    lines.extend(
        [
            "",
            "When the user says the workspace, both repos, or the parent project, consider every folder above.",
            "Use absolute paths so tools open the correct repo.",
            "",
        ]
    )
    excerpts = [excerpt for path in folders if (excerpt := _folder_context_excerpt(path))]
    if excerpts:
        lines.append("Per-folder project context:")
        lines.append("")
        lines.extend(excerpts)
    return "\n".join(lines).strip()
