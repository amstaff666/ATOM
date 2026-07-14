# Repo Cleanup Guard Report

Repo: `I:\Devdrive\PDFEDITOR\ATOM\ATOM\atom`  
Mode: report only, no deletion, no moves, no commit, no `git clean`, no `git add .`  
Generated: 2026-07-02

## Command Results

### `git status --short`

The requested full command was run:

```bash
git status --short
```

On this Windows-mounted worktree it did not complete within the initial 50 second observation window and was interrupted once to avoid blocking the cleanup audit.

A narrower status command was then run for high-signal areas:

```bash
git status --short -- docs reports backend/api/autoflow_routes.py backend/autoflow/execution_bus.py backend/scripts/robust_backend.py frontend-nextjs/components/workbench frontend-nextjs/lib/safe-fetch.ts .gitignore
```

Observed high-signal dirty state:

```text
 M .gitignore
 M backend/scripts/robust_backend.py
 M many docs/** files
?? docs/AIMONEYFLOW_ATOM_INTEGRATION_PLAN.md
?? docs/NEON_ATOM_AUTOFLOW_SCHEMA_PLAN.md
```

Note: `docs/**` already contains a very large set of modified files unrelated to this cleanup audit. Do not bulk stage docs without reviewing intent.

## Categorized Dirty / Untracked Files

### Safe Source Candidates

These look like intentional source changes and may be future commit candidates after review:

- `backend/scripts/robust_backend.py`
- `backend/api/autoflow_routes.py`
- `backend/autoflow/execution_bus.py`
- `frontend-nextjs/components/workbench/AiWorkbenchDashboard.tsx`
- `frontend-nextjs/components/workbench/LuunaAutoflowPanel.tsx`
- `frontend-nextjs/components/layout/Sidebar.tsx`
- `frontend-nextjs/components/layout/Layout.tsx`
- `frontend-nextjs/pages/_app.tsx`
- `frontend-nextjs/pages/index.tsx`
- `frontend-nextjs/pages/laenu-haldur.tsx`
- `frontend-nextjs/pages/center/[slug].tsx`

Review before committing:

- Make sure these are still part of the current Annaator/Autoflow direction.
- Avoid staging unrelated frontend snapshot or generated files.

### Docs Candidates

These are likely useful future commit candidates if documentation work is desired:

- `docs/AIMONEYFLOW_ATOM_INTEGRATION_PLAN.md`
- `docs/NEON_ATOM_AUTOFLOW_SCHEMA_PLAN.md`
- `docs/HF_BACKEND_RUNTIME_PLAN.md`

Warning:

- `docs/**` has many modified files already. Treat the two schema/integration plans as targeted candidates, not a reason to stage all docs.

### Forbidden Secrets

Currently present in the working tree scan:

```text
./.env
./.env.personal
./ai-influencer-main/ai-influencer-main/.env.local
./AuroraMultimedia/.env
./AuroraMultimedia/frontend/.env
./backend/.secrets.json
./config/.env.integrations
./config/.env.notion
./config/.env.trello.test
./frontend-nextjs/.env.local
```

Template/example files are usually safe only if they contain no real values:

```text
./.env.example
./.env.oauth.template
./.env.production.template
./ai-influencer-main/ai-influencer-main/.env.example
./AuroraMultimedia/.env.example
./backend/.env.example
./backend/.env.template
./config/.env.credentials.template
./config/.env.development.template
./config/.env.example
./config/.env.production.example
./config/.env.production.template
./config/.env.unified.template
./frontend-nextjs/.env.example
./frontend-nextjs/.env.production.example
./frontend-nextjs/.env.template
./hf-space/frontend-nextjs/.env.example
./mobile/.env.example
```

Never commit:

- `.env`
- `.env.personal`
- `.env.local`
- real integration env files
- `.secrets.json`
- credential exports
- OAuth tokens
- database URLs with usernames/passwords
- API keys

### Generated / Cache

Currently present:

```text
./backend/backend/coverage.json
./backend/coverage.json
./backend/coverage_actual.json
./backend/coverage_apar_engine.json
./backend/coverage_cache_aware_extend.json
./backend/coverage_cache_aware_router.json
./backend/coverage_combined.json
./backend/coverage_final.json
./backend/coverage_ocr.json
./backend/coverage_phase_202_final.json
./backend/coverage_phase_206_baseline.json
./backend/coverage_wave_1_baseline.json
./backend/coverage_wave_2.json
./backend/coverage_wave_2_aggregate.json
./backend/coverage_wave_3_baseline.json
./backend/coverage_wave_3_medium_services.json
./backend/coverage_wave_3_plan02.json
./backend/coverage_wave_3_plan03.json
./backend/coverage_wave_3_plan06.json
./backend/coverage_wave_3_plan08.json
./backend/coverage_wave_4_plan09.json
./backend/coverage_wave_4_plan10.json
./backend/coverage_workflow_analytics_before.json
./backend/coverage_workflow_analytics_extended.json
./frontend-nextjs/tsconfig.app.tsbuildinfo
./frontend-nextjs/tsconfig.test.tsbuildinfo
./frontend-nextjs/tsconfig.tsbuildinfo
./hf-space/frontend-nextjs/tsconfig.app.tsbuildinfo
./hf-space/frontend-nextjs/tsconfig.test.tsbuildinfo
./hf-space/frontend-nextjs/tsconfig.tsbuildinfo
```

Tracked generated/cache files detected:

```text
frontend-nextjs/tsconfig.app.tsbuildinfo
frontend-nextjs/tsconfig.test.tsbuildinfo
frontend-nextjs/tsconfig.tsbuildinfo
logs/self_heal_report.json
```

These should not be committed in future unless there is a very specific reason.

### Backups

Currently present:

```text
./frontend-nextjs/.next.temp-backup/.next.backup-20260626-180801
./frontend-nextjs/pages/_app.tsx.backup-20260628-160434
./frontend-nextjs/pages/_app.tsx.backup-20260628-214307
./netlify.toml.backup-20260625-171350
```

Backup files should generally remain untracked and should not be committed.

### Local Reports

Currently present:

```text
./logs/self_heal_report.json
```

Also created by this task:

```text
reports/REPO_CLEANUP_GUARD_REPORT.md
```

`reports/REPO_CLEANUP_GUARD_REPORT.md` is a documentation/report candidate. `logs/self_heal_report.json` is local generated output and should not be committed.

### Build Artifacts

Currently present:

- `.next/` is ignored by current `.gitignore`.
- `dist/` is ignored by current `.gitignore`.
- `build/` is ignored by current `.gitignore`.
- `frontend-nextjs/.next.temp-backup/` is present but not explicitly ignored.
- TypeScript build info files are present and not ignored by current `.gitignore`.

## `.gitignore` Coverage Check

Required pattern coverage:

```text
present .env
present .env.*
missing .secrets.json
missing dev.db
missing *.db
missing *.sqlite
missing coverage*.json
missing logs/
missing _restore_backups/
present .next/
missing .next.temp-backup/
missing node_modules/
present build/
present dist/
missing tmp/
missing temp/
missing *.tsbuildinfo
missing *.backup*
```

Important nuance:

- `node_modules/` exists in `.gitignore` as the first line, but the exact check reported missing because the file begins with a UTF-8 BOM before `node_modules/`. The rule is visually present, but cleaning the BOM later would make exact tooling happier.
- `.gitignore` is already modified in the worktree. Do not overwrite it without reviewing the existing diff.

## Forbidden Files Currently Present

High risk:

```text
./.env
./.env.personal
./ai-influencer-main/ai-influencer-main/.env.local
./AuroraMultimedia/.env
./AuroraMultimedia/frontend/.env
./backend/.secrets.json
./config/.env.integrations
./config/.env.notion
./config/.env.trello.test
./frontend-nextjs/.env.local
```

Local DB files:

```text
./backend/analytics.db
./backend/atom.db
./backend/dev.db
```

Local logs:

```text
./logs/backend-4490.log
./logs/backend-8000.log
./logs/backend_robust.log
./logs/frontend-4491.log
./logs/self_heal_report.json
```

## Should Never Commit List

Never commit these patterns:

```gitignore
.env
.env.*
!.env.example
!.env.*.example
*.local
.secrets.json
**/.secrets.json
*.db
*.sqlite
*.sqlite3
dev.db
logs/
*.log
coverage*.json
**/coverage*.json
.next/
.next.temp-backup/
node_modules/
build/
dist/
out/
tmp/
temp/
*.tsbuildinfo
*.backup*
```

## Possible Future Commit Candidates

High confidence:

```text
reports/REPO_CLEANUP_GUARD_REPORT.md
docs/AIMONEYFLOW_ATOM_INTEGRATION_PLAN.md
docs/NEON_ATOM_AUTOFLOW_SCHEMA_PLAN.md
backend/api/autoflow_routes.py
backend/autoflow/execution_bus.py
backend/scripts/robust_backend.py
frontend-nextjs/components/workbench/LuunaAutoflowPanel.tsx
frontend-nextjs/components/workbench/AiWorkbenchDashboard.tsx
```

Needs careful review:

```text
.gitignore
frontend-nextjs/components/layout/Sidebar.tsx
frontend-nextjs/pages/index.tsx
frontend-nextjs/pages/laenu-haldur.tsx
frontend-nextjs/pages/center/[slug].tsx
large modified docs/** set
```

Do not bulk stage:

```bash
git add .
git add docs
git add frontend-nextjs
git add backend
```

Use explicit paths only.

## Proposed `.gitignore` Patch

Do not apply automatically. Review first because `.gitignore` already has local modifications.

```diff
 # Local Netlify folder
 .netlify
 
 # Autoflow execution data (dev-safe local storage)
 backend/.autoflow/
 .autoflow/
+
+# Secrets and local credentials
+.secrets.json
+**/.secrets.json
+*.local
+
+# Local databases
+dev.db
+*.db
+*.sqlite
+*.sqlite3
+
+# Generated reports and logs
+logs/
+coverage*.json
+**/coverage*.json
+
+# Framework/build temp
+.next.temp-backup/
+tmp/
+temp/
+*.tsbuildinfo
+*.backup*
```

## Exact Safe Commands For Later

Inspection only:

```bash
git status --short -- reports docs/AIMONEYFLOW_ATOM_INTEGRATION_PLAN.md docs/NEON_ATOM_AUTOFLOW_SCHEMA_PLAN.md
git status --short -- backend/api/autoflow_routes.py backend/autoflow/execution_bus.py backend/scripts/robust_backend.py
git status --short -- frontend-nextjs/components/workbench/LuunaAutoflowPanel.tsx frontend-nextjs/components/workbench/AiWorkbenchDashboard.tsx
git diff -- .gitignore
git diff -- reports/REPO_CLEANUP_GUARD_REPORT.md
```

Secret detection before any commit:

```bash
git ls-files .env '.env.*' '**/.env' '**/.env.*' '**/.secrets.json'
git status --short -- .env '.env.*' '**/.env' '**/.env.*' '**/.secrets.json'
```

Check whether generated files are tracked:

```bash
git ls-files '*.tsbuildinfo' 'logs/*' '*.db' '*.sqlite' 'coverage*.json' '**/coverage*.json'
```

If approved later, remove generated files from git index without deleting local files:

```bash
git rm --cached -- frontend-nextjs/tsconfig.app.tsbuildinfo frontend-nextjs/tsconfig.test.tsbuildinfo frontend-nextjs/tsconfig.tsbuildinfo
git rm --cached -- logs/self_heal_report.json
```

Targeted staging examples only after review:

```bash
git add reports/REPO_CLEANUP_GUARD_REPORT.md
git add docs/AIMONEYFLOW_ATOM_INTEGRATION_PLAN.md docs/NEON_ATOM_AUTOFLOW_SCHEMA_PLAN.md
git add backend/api/autoflow_routes.py backend/autoflow/execution_bus.py backend/scripts/robust_backend.py
git add frontend-nextjs/components/workbench/LuunaAutoflowPanel.tsx frontend-nextjs/components/workbench/AiWorkbenchDashboard.tsx
```

Never run for this repo state:

```bash
git add .
git clean -fd
git clean -fdx
rm -rf node_modules .next dist build logs tmp temp
```

## Recommended Next Step

Ask for one explicit cleanup action at a time:

1. Review `.gitignore` diff and decide whether to apply the proposed generated-file patterns.
2. Audit forbidden files with a secret scanner before any commit.
3. If generated tracked files are undesired, remove them from the index using `git rm --cached -- ...`.
4. Stage only the intentional Annaator/Autoflow source and docs files by explicit path.
