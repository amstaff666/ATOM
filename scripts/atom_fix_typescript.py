#!/usr/bin/env python3
"""
Atom TypeScript auto-fixer — patches common test and source patterns.

Run standalone or via atom_self_heal.py.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend-nextjs"

TEST_GLOBS = ("**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "tests/**")


def _iter_files() -> list[Path]:
    skip = {"node_modules", ".next", "project", "launcher-dist"}
    files: list[Path] = []
    for pattern in ("**/*.ts", "**/*.tsx"):
        for path in FRONTEND.glob(pattern):
            if skip.intersection(path.parts):
                continue
            files.append(path)
    return files


def _is_test(path: Path) -> bool:
    name = path.name
    parts = path.parts
    return (
        name.endswith(".test.ts")
        or name.endswith(".test.tsx")
        or "__tests__" in parts
        or "tests" in parts
    )


def fix_remove_connected_props(content: str) -> tuple[str, bool]:
    new = re.sub(r"\s+connected=\{(?:true|false)\}", "", content)
    return new, new != content


def fix_server_rest_export(path: Path) -> bool:
    if path.name != "server.ts" or "mocks" not in path.parts:
        return False
    text = path.read_text(encoding="utf-8")
    if "export { rest }" in text:
        return False
    if "import { rest }" not in text:
        text = text.replace(
            "import { setupServer",
            "import { rest } from 'msw';\nimport { setupServer",
            1,
        )
        anchor = "import { allHandlers } from './handlers';\n"
        if anchor in text:
            text = text.replace(
                anchor,
                anchor + "\nexport { rest };\n",
                1,
            )
        path.write_text(text, encoding="utf-8")
        return True
    return False


def run_fixes() -> list[str]:
    applied: list[str] = []

    server = FRONTEND / "tests" / "mocks" / "server.ts"
    if server.exists() and fix_server_rest_export(server):
        applied.append("export rest from tests/mocks/server.ts")

    for path in _iter_files():
        if not _is_test(path):
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except OSError:
            continue
        new_content, changed = fix_remove_connected_props(content)
        if changed:
            path.write_text(new_content, encoding="utf-8")
            applied.append(f"removed connected prop: {path.relative_to(FRONTEND)}")

    return applied


def main() -> int:
    applied = run_fixes()
    if applied:
        print(f"atom_fix_typescript: {len(applied)} patch(es)")
        for item in applied:
            print(f"  • {item}")
    else:
        print("atom_fix_typescript: no patches needed")
    return 0


if __name__ == "__main__":
    sys.exit(main())