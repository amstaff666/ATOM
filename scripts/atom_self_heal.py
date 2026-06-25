#!/usr/bin/env python3
"""
Atom Self-Heal — diagnose and auto-fix common platform errors.

Scans backend, frontend, env files, and data directories; applies safe fixes;
re-verifies until clean or reports remaining manual steps.

Usage:
    python scripts/atom_self_heal.py              # diagnose + fix + verify
    python scripts/atom_self_heal.py --check-only   # diagnose only
    python scripts/atom_self_heal.py --max-rounds 3 # limit fix iterations
    python scripts/atom_self_heal.py --json           # machine-readable report
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, List, Optional

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend-nextjs"
REPORT_DIR = ROOT / "logs"
REPORT_FILE = REPORT_DIR / "self_heal_report.json"


@dataclass
class Issue:
    id: str
    category: str
    severity: str  # error | warning | info
    message: str
    fixable: bool = False
    fixed: bool = False
    fix_action: Optional[str] = None


@dataclass
class HealReport:
    started_at: str
    platform: str
    python: str
    issues: List[Issue] = field(default_factory=list)
    fixes_applied: List[str] = field(default_factory=list)
    verification: dict = field(default_factory=dict)
    success: bool = False
    finished_at: Optional[str] = None

    def add(self, issue: Issue) -> None:
        self.issues.append(issue)

    def log_fix(self, action: str) -> None:
        self.fixes_applied.append(action)


def _resolve_cmd(cmd: List[str]) -> List[str]:
    """Resolve executable path (required on Windows for npm etc.)."""
    if not cmd:
        return cmd
    resolved = shutil.which(cmd[0])
    if resolved:
        return [resolved, *cmd[1:]]
    return cmd


def _run(
    cmd: List[str],
    cwd: Optional[Path] = None,
    timeout: int = 600,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        _resolve_cmd(cmd),
        cwd=str(cwd or ROOT),
        capture_output=True,
        text=True,
        timeout=timeout,
        shell=False,
    )


def _which(name: str) -> Optional[str]:
    return shutil.which(name)


def _log(msg: str, quiet: bool = False) -> None:
    if not quiet:
        print(msg, flush=True)


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------

def check_python_tools(report: HealReport) -> None:
    if not _which("python") and not _which("python3"):
        report.add(
            Issue(
                id="python_missing",
                category="runtime",
                severity="error",
                message="Python not found on PATH",
                fixable=False,
            )
        )


def check_backend_import(report: HealReport) -> Optional[str]:
    """Return stderr if import fails."""
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND)
    result = subprocess.run(
        [sys.executable, "-c", "import main_api_app"],
        cwd=str(BACKEND),
        capture_output=True,
        text=True,
        env=env,
        timeout=120,
    )
    if result.returncode != 0:
        stderr = (result.stderr or result.stdout or "").strip()
        report.add(
            Issue(
                id="backend_import_failed",
                category="backend",
                severity="error",
                message=stderr.splitlines()[-1] if stderr else "Backend import failed",
                fixable=True,
                fix_action="install_python_deps",
            )
        )
        return stderr
    return None


def check_python_packages(report: HealReport, import_error: Optional[str]) -> List[str]:
    """Map import errors to pip package names."""
    missing: List[str] = []
    patterns = {
        r"No module named 'jose'": "python-jose[cryptography]",
        r"No module named 'aiosqlite'": "aiosqlite",
        r"No module named 'asyncpg'": "asyncpg",
        r"No module named 'fastapi'": "fastapi",
        r"No module named 'uvicorn'": "uvicorn",
        r"No module named 'sqlalchemy'": "sqlalchemy",
        r"No module named 'alembic'": "alembic",
        r"No module named 'lancedb'": "lancedb>=0.5.3,<1.0.0",
        r"No module named 'fastembed'": "fastembed>=0.2.0",
        r"FastEmbed package not installed": "fastembed>=0.2.0",
        r"No module named 'redis'": "redis",
        r"No module named 'passlib'": "passlib[bcrypt]",
        r"email-validator is not installed": "email-validator",
    }
    text = import_error or ""
    for pattern, package in patterns.items():
        if re.search(pattern, text):
            missing.append(package)

    if not missing and import_error and "No module named" in import_error:
        match = re.search(r"No module named '([^']+)'", import_error)
        if match:
            missing.append(match.group(1))

    for pkg in missing:
        report.add(
            Issue(
                id=f"missing_pkg_{pkg.replace('[', '_').replace(']', '')}",
                category="backend",
                severity="error",
                message=f"Missing Python package: {pkg}",
                fixable=True,
                fix_action="install_python_deps",
            )
        )
    return missing


def check_node_modules(report: HealReport) -> None:
    if not (FRONTEND / "node_modules").is_dir():
        report.add(
            Issue(
                id="frontend_node_modules_missing",
                category="frontend",
                severity="error",
                message="frontend-nextjs/node_modules not found",
                fixable=True,
                fix_action="npm_install",
            )
        )


def check_env_files(report: HealReport) -> None:
    templates = [
        (ROOT / ".env", ROOT / ".env.example"),
        (ROOT / ".env", ROOT / ".env.personal"),
        (BACKEND / ".env", BACKEND / ".env.example"),
        (FRONTEND / ".env.local", FRONTEND / ".env.example"),
    ]
    for target, source in templates:
        if target.exists() or not source.exists():
            continue
        report.add(
            Issue(
                id=f"env_missing_{target.name}",
                category="config",
                severity="warning",
                message=f"Missing {target.relative_to(ROOT)} — can copy from {source.relative_to(ROOT)}",
                fixable=True,
                fix_action=f"copy_env:{target}:{source}",
            )
        )


def check_data_dirs(report: HealReport) -> None:
    dirs = [
        ROOT / "data" / "lancedb",
        ROOT / "backend" / "data" / "lancedb",
        ROOT / "logs",
    ]
    for d in dirs:
        if not d.exists():
            report.add(
                Issue(
                    id=f"dir_missing_{d.name}",
                    category="data",
                    severity="warning",
                    message=f"Missing directory: {d.relative_to(ROOT)}",
                    fixable=True,
                    fix_action=f"mkdir:{d}",
                )
            )


def check_known_code_issues(report: HealReport) -> None:
    """Detect known fixable code patterns."""
    checks: List[tuple[Path, str, str, str]] = [
        (
            FRONTEND / "components" / "ui" / "__tests__" / "navigation.test.tsx",
            "</Description>",
            "</DialogDescription>",
            "navigation_dialog_tag",
        ),
        (
            FRONTEND / "src-tauri" / "src-types" / "api-generated.ts",
            "../../src/types/api-generated.ts",
            "export * from '../../src/types/api-generated'",
            "tauri_api_types_stub",
        ),
    ]
    for path, bad, good, issue_id in checks:
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8")
        if bad in content and good not in content:
            report.add(
                Issue(
                    id=issue_id,
                    category="frontend",
                    severity="error",
                    message=f"Known code issue in {path.relative_to(ROOT)}",
                    fixable=True,
                    fix_action=f"code_fix:{path}:{bad}:{good}",
                )
            )

    recovery_test = FRONTEND / "tests" / "mocks" / "__tests__" / "error-recovery.test.ts"
    if recovery_test.exists():
        content = recovery_test.read_text(encoding="utf-8")
        if "describe('Error Recovery MSW Handlers'" not in content and content.count("});") > content.count("describe("):
            report.add(
                Issue(
                    id="error_recovery_missing_describe",
                    category="frontend",
                    severity="error",
                    message="error-recovery.test.ts missing top-level describe wrapper",
                    fixable=True,
                    fix_action="fix_error_recovery_test",
                )
            )


def fix_reactflow_install(report: HealReport, quiet: bool) -> bool:
    """Reinstall @reactflow if dist/esm/index.mjs is missing (webpack build failure)."""
    mjs = (
        FRONTEND
        / "node_modules"
        / "@reactflow"
        / "core"
        / "dist"
        / "esm"
        / "index.mjs"
    )
    js = mjs.with_suffix(".js")
    if mjs.exists():
        return False
    if js.exists():
        import shutil
        shutil.copy2(js, mjs)
        _log("  → restored @reactflow/core/dist/esm/index.mjs", quiet)
        report.log_fix("reactflow index.mjs restore")
        return True
    _log("  → npm install reactflow@11.11.4 (missing @reactflow/core)", quiet)
    result = _run(["npm", "install", "reactflow@11.11.4"], cwd=FRONTEND, timeout=300)
    if result.returncode == 0:
        report.log_fix("npm install reactflow@11.11.4")
        return True
    return False


def check_reactflow_install(report: HealReport) -> None:
    mjs = (
        FRONTEND
        / "node_modules"
        / "@reactflow"
        / "core"
        / "dist"
        / "esm"
        / "index.mjs"
    )
    if (FRONTEND / "node_modules" / "reactflow").exists() and not mjs.exists():
        report.add(
            Issue(
                id="reactflow_core_corrupt",
                category="frontend",
                severity="error",
                message="@reactflow/core missing dist/esm/index.mjs — automations build fails",
                fixable=True,
                fix_action="fix_reactflow_install",
            )
        )


def fix_reactflow_types(report: HealReport, quiet: bool) -> bool:
    """Ensure reactflow type shim exists when @reactflow/core .d.ts files are missing."""
    core_types = FRONTEND / "node_modules" / "@reactflow" / "core" / "dist" / "esm" / "index.d.ts"
    shim = FRONTEND / "types" / "reactflow.d.ts"
    if core_types.exists():
        return False
    if shim.exists():
        return False
    shim.parent.mkdir(parents=True, exist_ok=True)
    shim.write_text(
        'declare module "reactflow" { export * from "reactflow/dist/esm/index"; }\n',
        encoding="utf-8",
    )
    _log("  → created types/reactflow.d.ts shim", quiet)
    report.log_fix("reactflow type shim")
    return True


def fix_typescript_patterns(report: HealReport, quiet: bool) -> bool:
    fix_script = ROOT / "scripts" / "atom_fix_typescript.py"
    if not fix_script.exists():
        return False
    _log("  → atom_fix_typescript.py", quiet)
    result = subprocess.run(
        [sys.executable, str(fix_script)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode == 0 and (result.stdout or "").strip():
        for line in (result.stdout or "").splitlines():
            if line.startswith("  •"):
                report.log_fix(line.replace("  • ", ""))
        return True
    return result.returncode == 0


def check_api_proxy_config(report: HealReport) -> None:
    """Ensure documents API rewrite and browser proxy base URL exist."""
    next_config = FRONTEND / "next.config.js"
    api_ts = FRONTEND / "lib" / "api.ts"
    if next_config.exists():
        content = next_config.read_text(encoding="utf-8")
        if "/api/documents" not in content:
            report.add(
                Issue(
                    id="missing_documents_rewrite",
                    category="frontend",
                    severity="error",
                    message="next.config.js missing /api/documents proxy rewrite",
                    fixable=True,
                    fix_action="fix_api_proxy",
                )
            )
    if api_ts.exists():
        content = api_ts.read_text(encoding="utf-8")
        if "getApiBaseUrl" not in content:
            report.add(
                Issue(
                    id="api_cors_direct_url",
                    category="frontend",
                    severity="error",
                    message="lib/api.ts uses direct backend URL (CORS errors in browser)",
                    fixable=True,
                    fix_action="fix_api_proxy",
                )
            )


def fix_api_proxy_config(report: HealReport, quiet: bool) -> bool:
    next_config = FRONTEND / "next.config.js"
    if not next_config.exists():
        return False
    content = next_config.read_text(encoding="utf-8")
    changed = False
    if "/api/documents" not in content and "/api/chat/:path*" in content:
        block = """      // Documents API
      {
        source: "/api/documents/:path*",
        destination: `${backendUrl}/api/documents/:path*`,
      },
      {
        source: "/api/documents",
        destination: `${backendUrl}/api/documents`,
      },
"""
        content = content.replace(
            "      // Add general API rewrite for other endpoints",
            block + "      // Add general API rewrite for other endpoints",
            1,
        )
        changed = True
    if "eslint:" in content and "ignoreDuringBuilds" in content:
        content = re.sub(
            r"\s*eslint:\s*\{\s*ignoreDuringBuilds:\s*true,\s*\},?\n",
            "\n",
            content,
        )
        changed = True
    if changed:
        next_config.write_text(content, encoding="utf-8")
        _log("  → patched next.config.js API proxy", quiet)
        report.log_fix("next.config.js documents proxy")
    get_url = FRONTEND / "lib" / "get-api-base-url.ts"
    if not get_url.exists():
        get_url.write_text(
            'export function getApiBaseUrl(): string {\n'
            "  const serverUrl = process.env.NEXT_PUBLIC_API_URL || "
            'process.env.API_BASE_URL || process.env.PYTHON_BACKEND_URL || '
            '"http://127.0.0.1:4490";\n'
            '  if (typeof window !== "undefined") return "";\n'
            "  return serverUrl.replace(/\\/$/, \"\");\n"
            "}\n",
            encoding="utf-8",
        )
        report.log_fix("created lib/get-api-base-url.ts")
        changed = True
    return changed


def check_frontend_typescript(report: HealReport) -> dict:
    if not _which("npm"):
        report.add(
            Issue(
                id="npm_missing",
                category="frontend",
                severity="error",
                message="npm not found on PATH",
                fixable=False,
            )
        )
        return {"ok": False, "syntax_errors": 0, "total_errors": 0}

    result = _run(["npm", "run", "type-check"], cwd=FRONTEND, timeout=300)
    # type-check uses tsconfig.app.json (excludes test files)
    output = (result.stdout or "") + (result.stderr or "")

    syntax_patterns = [
        "TS1128",
        "TS17002",
        "TS1005",
        "TS1109",
    ]
    syntax_errors = sum(output.count(p) for p in syntax_patterns)
    total_errors = len(re.findall(r"error TS\d+", output))

    if result.returncode != 0:
        severity = "error" if syntax_errors > 0 else "warning"
        report.add(
            Issue(
                id="frontend_typecheck",
                category="frontend",
                severity=severity,
                message=(
                    f"TypeScript check: {syntax_errors} syntax error(s), "
                    f"{total_errors} total error(s)"
                ),
                fixable=syntax_errors > 0,
                fix_action="code_fixes" if syntax_errors > 0 else None,
            )
        )

    return {
        "ok": result.returncode == 0,
        "syntax_errors": syntax_errors,
        "total_errors": total_errors,
        "output_tail": output[-2000:] if output else "",
    }


def _alembic_cmd() -> Optional[List[str]]:
    exe = _resolve_cmd(["alembic"])
    if exe and Path(exe[0]).exists():
        return exe
    scripts_dir = Path(sys.executable).parent / "Scripts"
    for name in ("alembic.exe", "alembic.cmd", "alembic"):
        candidate = scripts_dir / name
        if candidate.exists():
            return [str(candidate)]
    return None


def check_alembic(report: HealReport) -> None:
    if not (BACKEND / "alembic.ini").exists():
        return
    alembic = _alembic_cmd()
    if not alembic:
        report.add(
            Issue(
                id="alembic_cli_missing",
                category="database",
                severity="warning",
                message="Alembic CLI not found — install with: pip install alembic",
                fixable=True,
                fix_action="install_python_deps",
            )
        )
        return
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND)
    result = subprocess.run(
        [*alembic, "current"],
        cwd=str(BACKEND),
        capture_output=True,
        text=True,
        env=env,
        timeout=60,
    )
    if result.returncode != 0:
        err = (result.stderr or result.stdout or "").strip()
        report.add(
            Issue(
                id="alembic_not_current",
                category="database",
                severity="warning",
                message=f"Alembic check failed: {err[:200]}",
                fixable=True,
                fix_action="alembic_upgrade",
            )
        )


# ---------------------------------------------------------------------------
# Fixes
# ---------------------------------------------------------------------------

def fix_install_python_deps(report: HealReport, quiet: bool) -> bool:
    """Install deps: targeted missing packages → personal → full requirements."""
    missing_pkgs = [
        i.message.split(": ", 1)[-1]
        for i in report.issues
        if i.id.startswith("missing_pkg_") and not i.fixed
    ]

    if missing_pkgs:
        _log(f"  → pip install {' '.join(missing_pkgs)}", quiet)
        result = _run(
            [sys.executable, "-m", "pip", "install", *missing_pkgs],
            cwd=BACKEND,
            timeout=600,
        )
        if result.returncode == 0:
            report.log_fix(f"pip install {' '.join(missing_pkgs)}")
            return True

    for req_name in ("requirements-personal.txt", "requirements.txt"):
        req = BACKEND / req_name
        if not req.exists():
            continue
        _log(f"  → pip install -r backend/{req_name}", quiet)
        result = _run(
            [sys.executable, "-m", "pip", "install", "-r", str(req)],
            cwd=BACKEND,
            timeout=900,
        )
        if result.returncode == 0:
            report.log_fix(f"pip install backend/{req_name}")
            return True
        _log(f"  ✗ {req_name} failed: {(result.stderr or result.stdout)[-400:]}", quiet)

    return False


def fix_npm_install(report: HealReport, quiet: bool) -> bool:
    if not _which("npm"):
        return False
    _log("  → npm install (frontend-nextjs)", quiet)
    result = _run(["npm", "install"], cwd=FRONTEND, timeout=900)
    if result.returncode == 0:
        report.log_fix("npm install frontend-nextjs")
        return True
    _log(f"  ✗ npm install failed: {(result.stderr or result.stdout)[-500:]}", quiet)
    return False


def fix_copy_env(report: HealReport, target: Path, source: Path, quiet: bool) -> bool:
    if target.exists():
        return True
    _log(f"  → copy {source.relative_to(ROOT)} → {target.relative_to(ROOT)}", quiet)
    shutil.copy2(source, target)
    report.log_fix(f"copy env {target.name}")
    return True


def fix_mkdir(report: HealReport, path: Path, quiet: bool) -> bool:
    _log(f"  → mkdir {path.relative_to(ROOT)}", quiet)
    path.mkdir(parents=True, exist_ok=True)
    report.log_fix(f"mkdir {path.relative_to(ROOT)}")
    return True


def fix_code_replace(report: HealReport, path: Path, bad: str, good: str, quiet: bool) -> bool:
    if not path.exists():
        return False
    content = path.read_text(encoding="utf-8")
    if bad not in content:
        return True
    path.write_text(content.replace(bad, good), encoding="utf-8")
    _log(f"  → patched {path.relative_to(ROOT)}", quiet)
    report.log_fix(f"code patch {path.relative_to(ROOT)}")
    return True


def fix_tauri_api_types(report: HealReport, quiet: bool) -> bool:
    path = FRONTEND / "src-tauri" / "src-types" / "api-generated.ts"
    stub = (
        "/**\n"
        " * Re-export API types for Tauri desktop build.\n"
        " * Source of truth: src/types/api-generated.ts\n"
        " */\n"
        "export * from '../../src/types/api-generated';\n"
    )
    if path.exists() and path.read_text(encoding="utf-8").strip() == stub.strip():
        return True
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(stub, encoding="utf-8")
    _log("  → fixed src-tauri/src-types/api-generated.ts", quiet)
    report.log_fix("tauri api-generated re-export")
    return True


def fix_error_recovery_test(report: HealReport, quiet: bool) -> bool:
    path = FRONTEND / "tests" / "mocks" / "__tests__" / "error-recovery.test.ts"
    if not path.exists():
        return False
    content = path.read_text(encoding="utf-8")
    if "describe('Error Recovery MSW Handlers'" in content:
        return True

    needle = "import { server } from '../server';\n\n"
    replacement = (
        "import { server } from '../server';\n\n"
        "describe('Error Recovery MSW Handlers', () => {\n"
    )
    if needle not in content:
        return False
    content = content.replace(needle, replacement, 1)
    # Remove unused rest import if present
    content = content.replace("import { rest } from 'msw';\n", "")
    path.write_text(content, encoding="utf-8")
    _log("  → fixed error-recovery.test.ts describe wrapper", quiet)
    report.log_fix("error-recovery.test.ts describe wrapper")
    return True


def fix_alembic_upgrade(report: HealReport, quiet: bool) -> bool:
    alembic = _alembic_cmd()
    if not alembic:
        return fix_install_python_deps(report, quiet)
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND)
    _log("  → alembic upgrade head", quiet)
    result = subprocess.run(
        [*alembic, "upgrade", "head"],
        cwd=str(BACKEND),
        capture_output=True,
        text=True,
        env=env,
        timeout=120,
    )
    if result.returncode == 0:
        report.log_fix("alembic upgrade head")
        return True
    _log(f"  ✗ alembic failed: {(result.stderr or result.stdout)[-300:]}", quiet)
    return False


FIX_HANDLERS: dict[str, Callable[..., bool]] = {}


def apply_fixes(report: HealReport, quiet: bool = False) -> int:
    """Apply fixes for open issues. Returns number of fixes attempted."""
    applied = 0
    seen_actions: set[str] = set()

    for issue in report.issues:
        if not issue.fixable or issue.fixed:
            continue
        action = issue.fix_action
        if not action or action in seen_actions:
            continue
        seen_actions.add(action)
        ok = False

        if action == "install_python_deps":
            ok = fix_install_python_deps(report, quiet)
        elif action == "npm_install":
            ok = fix_npm_install(report, quiet)
        elif action == "alembic_upgrade":
            ok = fix_alembic_upgrade(report, quiet)
        elif action == "fix_error_recovery_test":
            ok = fix_error_recovery_test(report, quiet)
        elif action.startswith("copy_env:"):
            _, target_s, source_s = action.split(":", 2)
            ok = fix_copy_env(report, Path(target_s), Path(source_s), quiet)
        elif action.startswith("mkdir:"):
            ok = fix_mkdir(report, Path(action.split(":", 1)[1]), quiet)
        elif action.startswith("code_fix:"):
            parts = action.split(":", 3)
            if len(parts) == 4:
                _, path_s, bad, good = parts
                if "api-generated" in path_s:
                    ok = fix_tauri_api_types(report, quiet)
                else:
                    ok = fix_code_replace(report, Path(path_s), bad, good, quiet)
        elif action == "code_fixes":
            ok = (
                fix_typescript_patterns(report, quiet)
                or fix_reactflow_types(report, quiet)
                or fix_tauri_api_types(report, quiet)
                or fix_error_recovery_test(report, quiet)
            )
        elif action == "fix_api_proxy":
            ok = fix_api_proxy_config(report, quiet)
        elif action == "fix_reactflow_install":
            ok = fix_reactflow_install(report, quiet)
        elif action == "fix_typescript":
            ok = fix_typescript_patterns(report, quiet) or fix_reactflow_types(report, quiet)

        if ok:
            issue.fixed = True
            applied += 1

    return applied


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def diagnose(report: HealReport) -> None:
    report.issues.clear()
    check_python_tools(report)
    check_env_files(report)
    check_data_dirs(report)
    check_known_code_issues(report)
    check_node_modules(report)
    check_api_proxy_config(report)
    check_reactflow_install(report)

    import_err = check_backend_import(report)
    check_python_packages(report, import_err)
    check_alembic(report)
    report.verification["typescript"] = check_frontend_typescript(report)


def has_blocking_errors(report: HealReport) -> bool:
    for issue in report.issues:
        if issue.severity == "error" and not issue.fixed:
            return True
    ts = report.verification.get("typescript", {})
    if ts.get("syntax_errors", 0) > 0:
        return True
    return False


def run_self_heal(
    check_only: bool = False,
    max_rounds: int = 5,
    quiet: bool = False,
    json_out: bool = False,
) -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    report = HealReport(
        started_at=datetime.now(timezone.utc).isoformat(),
        platform=sys.platform,
        python=sys.version.split()[0],
    )

    _log("=" * 60, quiet)
    _log("ATOM SELF-HEAL", quiet)
    _log("=" * 60, quiet)

    for round_num in range(1, max_rounds + 1):
        _log(f"\n[Round {round_num}] Diagnosing...", quiet)
        diagnose(report)

        errors = [i for i in report.issues if i.severity == "error" and not i.fixed]
        warnings = [i for i in report.issues if i.severity == "warning" and not i.fixed]

        _log(f"  Found {len(errors)} error(s), {len(warnings)} warning(s)", quiet)
        for issue in report.issues:
            if issue.fixed:
                continue
            icon = "✗" if issue.severity == "error" else "⚠"
            _log(f"  {icon} [{issue.category}] {issue.message}", quiet)

        if check_only:
            break

        fixable = [i for i in report.issues if i.fixable and not i.fixed]
        if not fixable:
            _log("  No auto-fixable issues remaining.", quiet)
            break

        _log(f"\n[Round {round_num}] Applying {len(fixable)} fix(es)...", quiet)
        applied = apply_fixes(report, quiet=quiet)
        if applied == 0:
            _log("  No fixes could be applied this round.", quiet)
            break

        # Re-verify backend after dependency installs
        import_err = check_backend_import(report)
        if import_err:
            check_python_packages(report, import_err)

    _log("\n[Verify] Final checks...", quiet)
    diagnose(report)

    import_ok = not any(
        i.id == "backend_import_failed" and not i.fixed for i in report.issues
    )
    ts = report.verification.get("typescript", {})
    syntax_ok = ts.get("syntax_errors", 0) == 0

    report.verification["backend_import_ok"] = import_ok
    report.verification["typescript_syntax_ok"] = syntax_ok
    report.success = import_ok and syntax_ok and not has_blocking_errors(report)
    report.finished_at = datetime.now(timezone.utc).isoformat()

    _log("\n" + "=" * 60, quiet)
    _log("SUMMARY", quiet)
    _log("=" * 60, quiet)
    _log(f"  Backend import:  {'OK' if import_ok else 'FAILED'}", quiet)
    _log(
        f"  TS syntax:       {'OK' if syntax_ok else 'FAILED'} "
        f"({ts.get('syntax_errors', 0)} syntax / {ts.get('total_errors', 0)} total)",
        quiet,
    )
    _log(f"  Fixes applied:   {len(report.fixes_applied)}", quiet)
    for fix in report.fixes_applied:
        _log(f"    • {fix}", quiet)

    if report.success:
        _log("\n✅ Self-heal complete — no blocking errors.", quiet)
    else:
        _log("\n⚠️  Some issues need manual attention (see report).", quiet)
        remaining = [i for i in report.issues if not i.fixed and i.severity == "error"]
        for issue in remaining[:10]:
            _log(f"    ✗ {issue.message}", quiet)

    report_dict = asdict(report)
    REPORT_FILE.write_text(json.dumps(report_dict, indent=2), encoding="utf-8")
    _log(f"\nReport saved: {REPORT_FILE.relative_to(ROOT)}", quiet)

    if json_out:
        print(json.dumps(report_dict, indent=2))

    return 0 if report.success else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Atom platform self-heal utility")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Diagnose only, do not apply fixes",
    )
    parser.add_argument(
        "--max-rounds",
        type=int,
        default=5,
        help="Maximum diagnose/fix iterations (default: 5)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print JSON report to stdout",
    )
    parser.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="Minimal console output",
    )
    args = parser.parse_args()
    sys.exit(
        run_self_heal(
            check_only=args.check_only,
            max_rounds=args.max_rounds,
            quiet=args.quiet,
            json_out=args.json,
        )
    )


if __name__ == "__main__":
    main()