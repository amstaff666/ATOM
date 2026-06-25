#!/usr/bin/env python3
"""Fast pre-dev hook: run Atom self-heal before starting dev servers."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SELF_HEAL = ROOT / "scripts" / "atom_self_heal.py"


def main() -> int:
    if not SELF_HEAL.exists():
        print("pre_dev: self-heal script not found, skipping")
        return 0

    print("pre_dev: running Atom self-heal...")
    result = subprocess.run(
        [sys.executable, str(SELF_HEAL), "--max-rounds", "2", "-q"],
        cwd=str(ROOT),
    )
    if result.returncode != 0:
        print("pre_dev: self-heal reported issues (continuing with dev start)")
    return 0


if __name__ == "__main__":
    sys.exit(main())