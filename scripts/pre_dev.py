#!/usr/bin/env python3
"""Fast pre-dev hook.

By default this must not run the full self-heal cycle: that scan is too slow
for normal frontend/backend startup. Set ATOM_RUN_SELF_HEAL=1 to opt in.
"""

from __future__ import annotations

import subprocess
import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SELF_HEAL = ROOT / "scripts" / "atom_self_heal.py"


def main() -> int:
    if not SELF_HEAL.exists():
        print("pre_dev: self-heal script not found, skipping")
        return 0

    if os.environ.get("ATOM_RUN_SELF_HEAL") != "1":
        print("pre_dev: self-heal skipped; set ATOM_RUN_SELF_HEAL=1 to run it")
        return 0

    timeout = int(os.environ.get("ATOM_SELF_HEAL_TIMEOUT_SECONDS", "45"))
    print(f"pre_dev: running Atom self-heal check-only, timeout={timeout}s...")
    try:
        result = subprocess.run(
            [sys.executable, str(SELF_HEAL), "--check-only", "-q"],
            cwd=str(ROOT),
            timeout=timeout,
        )
        if result.returncode != 0:
            print("pre_dev: self-heal reported issues (continuing with dev start)")
    except subprocess.TimeoutExpired:
        print("pre_dev: self-heal timed out (continuing with dev start)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
