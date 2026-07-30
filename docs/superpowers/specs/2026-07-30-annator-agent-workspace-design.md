# Annator Agent Workspace – Neon MVP Design

**Date:** 2026-07-30  
**Repository:** `amstaff666/ATOM`  
**Branch:** `luuna/agent-workspace-neon-mvp`  
**Status:** Approved for implementation planning

## 1. Objective

Build a private Annator control workspace inside the existing ATOM repository. The workspace provides one shared operational view for AI agents and human managers.

The first release is a control plane, not a replacement for the agent runtimes. Local and cloud agents continue to execute in their own environments while the workspace stores assignments, progress, ETA, blockers, approvals, and audit history in Neon PostgreSQL.

The system must preserve the existing ATOM desktop and web applications. Changes are isolated to new workspace modules, database models, routes, UI components, runner adapters, tests, and deployment configuration.

## 2. Locked Product Roles

### 2.1 AI Money Flow client frontend

Purpose:

- collect client and application data;
- upload document metadata through the backend;
- show client-facing readiness and next steps;
- never connect directly to Neon.

### 2.2 Annator / ATOM admin frontend

Purpose:

- show cases, tasks, documents, risks, agent activity, approvals, progress, ETA, and audit history;
- allow managers to assign work to agents or people;
- use the existing ATOM JWT and RBAC system.

### 2.3 ATOM FastAPI backend

Purpose:

- validate requests;
- enforce permissions;
- write and read Neon data;
- authenticate agent runners;
- expose task, case, progress, approval, and audit APIs;
- keep database and signing secrets out of browsers.

### 2.4 Neon PostgreSQL

Purpose:

- act as the authoritative store for workspace cases, tasks, assignments, runner status, approvals, events, and audit logs.

Document files are stored in an external object store. Neon stores file metadata, checksums, ownership, case association, status, and storage references.

## 3. Existing ATOM Components Reused

The implementation extends these existing capabilities instead of rebuilding them:

- FastAPI backend and router structure;
- SQLAlchemy database layer;
- PostgreSQL and Neon-compatible `DATABASE_URL` handling;
- JWT authentication;
- RBAC permission dependencies;
- agent registry and agent governance services;
- HITL approval concepts;
- WebSocket event delivery;
- Next.js frontend and existing agent dashboard components;
- local SQLite fallback for development and test isolation;
- pytest and Jest test infrastructure;
- Docker deployment on port `7860`.

## 4. Scope

### 4.1 Included in MVP

- case list and case detail view;
- task creation, editing, assignment, progress, ETA, blocking, completion, and failure states;
- assignment to an ATOM user or registered AI agent;
- local and cloud runner registration;
- runner heartbeat and online/offline status;
- runner queue polling;
- task event reporting;
- human review and approval flow;
- audit logging for all task mutations;
- dashboard KPIs;
- WebSocket updates with polling fallback;
- Neon migrations;
- private Hugging Face Docker deployment;
- synthetic end-to-end validation case.

### 4.2 Excluded from MVP

- automatic credit decisioning;
- autonomous customer communication;
- direct bank integrations;
- storage of raw document binaries in Neon;
- billing and subscription management;
- replacement of LuunaOS, OpenClaw, HF Jobs, or other agent runtimes;
- public self-registration for admin users;
- automatic execution of destructive or external actions without human approval.

## 5. Repository Layout

New work follows the existing repository structure.

```text
amstaff666/ATOM
├─ frontend-nextjs/
│  ├─ pages/agent-workspace/
│  ├─ components/agent-workspace/
│  ├─ hooks/useWorkspaceEvents.ts
│  └─ lib/workspace-api.ts
│
├─ backend/
│  ├─ api/workspace_routes.py
│  ├─ core/workspace_models.py
│  ├─ core/workspace_service.py
│  ├─ core/workspace_permissions.py
│  ├─ core/runner_auth.py
│  ├─ schemas/workspace.py
│  └─ migrations/
│
├─ runners/
│  ├─ local-runner/
│  └─ cloud-runner/
│
├─ deploy/hf-agent-workspace/
├─ backend/tests/workspace/
└─ frontend-nextjs/__tests__/agent-workspace/
```

Existing files are patched only where required to register routes, models, permissions, navigation, build output, and deployment entrypoints.

## 6. Domain Model

### 6.1 `workspace_cases`

Represents one client, application, internal project, or operational case.

Required fields:

- `id`: UUID primary key;
- `organisation_id`: nullable UUID for future multi-organisation separation;
- `external_reference`: nullable unique business reference;
- `title`;
- `case_type`: `personal_credit`, `business_credit`, `document_review`, `internal_project`, or `other`;
- `status`: `new`, `active`, `blocked`, `review`, `completed`, `cancelled`;
- `readiness_percent`: integer from 0 to 100;
- `owner_user_id`;
- `created_by_user_id`;
- `created_at`;
- `updated_at`;
- `closed_at`.

### 6.2 `workspace_tasks`

Represents one measurable unit of work.

Required fields:

- `id`: UUID primary key;
- `case_id`: foreign key;
- `title`;
- `description`;
- `status`;
- `priority`: `low`, `normal`, `high`, `critical`;
- `progress_percent`: integer from 0 to 100;
- `completed_steps`: non-negative integer;
- `total_steps`: positive integer;
- `assigned_agent_id`: nullable;
- `assigned_user_id`: nullable;
- `runner_type`: nullable `local`, `hf_job`, `cloud_api`, or `manual`;
- `runner_id`: nullable;
- `started_at`;
- `estimated_finish_at`;
- `completed_at`;
- `blocked_reason`;
- `failure_reason`;
- `requires_human_review`: boolean;
- `review_status`: `not_required`, `pending`, `approved`, `rejected`;
- `version`: integer for optimistic concurrency control;
- `created_by_user_id`;
- `created_at`;
- `updated_at`.

Task statuses:

```text
backlog
queued
running
blocked
review
done
failed
cancelled
```

Review outcomes are stored separately from task execution status. Approval does not overwrite execution history.

### 6.3 `workspace_task_events`

Append-only operational event stream.

Fields:

- `id`;
- `task_id`;
- `event_type`;
- `source_type`: `user`, `agent`, `runner`, `system`;
- `source_id`;
- `message`;
- `payload_json`;
- `created_at`.

Event types include:

```text
created
assigned
queued
started
progress
eta_updated
blocked
unblocked
review_requested
approved
rejected
completed
failed
cancelled
heartbeat_timeout
```

### 6.4 `workspace_runners`

Represents a local or cloud execution node.

Fields:

- `id`;
- `name`;
- `runner_type`;
- `status`: `online`, `busy`, `degraded`, `offline`, `disabled`;
- `capabilities_json`;
- `max_concurrency`;
- `active_jobs`;
- `last_heartbeat_at`;
- `secret_hash`;
- `created_at`;
- `updated_at`.

Runner secrets are never stored in plaintext.

### 6.5 `workspace_approvals`

Stores human decisions for high-risk or externally visible actions.

Fields:

- `id`;
- `task_id`;
- `requested_by_type`;
- `requested_by_id`;
- `action_type`;
- `action_payload_json`;
- `reason`;
- `status`: `pending`, `approved`, `rejected`, `expired`;
- `reviewed_by_user_id`;
- `review_feedback`;
- `created_at`;
- `reviewed_at`.

### 6.6 `workspace_documents`

Stores document metadata only.

Fields:

- `id`;
- `case_id`;
- `task_id`;
- `document_type`;
- `original_filename`;
- `storage_provider`;
- `storage_key`;
- `sha256`;
- `mime_type`;
- `size_bytes`;
- `status`;
- `uploaded_by_user_id`;
- `created_at`.

### 6.7 `workspace_audit_logs`

Append-only audit record.

Fields:

- `id`;
- `actor_type`;
- `actor_id`;
- `action`;
- `entity_type`;
- `entity_id`;
- `before_json`;
- `after_json`;
- `request_id`;
- `ip_address`;
- `created_at`.

Normal API routes cannot update or delete audit rows.

## 7. Progress and ETA Rules

### 7.1 Progress

When `total_steps > 0`, the backend calculates:

```text
progress_percent = floor(completed_steps / total_steps × 100)
```

The backend clamps values to 0–100. A task marked `done` is forced to 100%. A task cannot report 100% while remaining in `running` or `blocked`.

Manual progress updates are allowed only for users with `workspace_manage` or runners currently assigned to the task.

### 7.2 ETA

ETA sources are stored in task event payloads:

- original runner estimate;
- updated runner estimate;
- system-adjusted estimate;
- actual completion duration.

MVP uses the latest valid estimate. Later versions may learn from historical duration by agent and task type.

An ETA cannot be earlier than the current time for an unfinished task. Invalid estimates are rejected with a validation error.

## 8. Authentication and Authorisation

### 8.1 Human users

Human managers use the existing ATOM JWT flow.

New permissions:

```text
workspace_view
workspace_manage
task_create
task_assign
task_review
task_approve
audit_view
runner_manage
```

Permission rules:

- viewing cases and tasks requires `workspace_view`;
- creating and editing tasks requires `task_create` or `workspace_manage`;
- assigning agents or people requires `task_assign`;
- approving or rejecting actions requires `task_approve`;
- viewing audit records requires `audit_view`;
- registering, disabling, or rotating runner credentials requires `runner_manage`.

### 8.2 Agent runners

Runners use an HMAC-signed service authentication scheme.

Request headers:

```text
X-Runner-Id
X-Runner-Timestamp
X-Runner-Nonce
X-Runner-Signature
```

The signature covers HTTP method, path, timestamp, nonce, and SHA-256 body hash.

Backend rules:

- reject timestamps outside a five-minute window;
- reject reused nonces;
- compare signatures in constant time;
- allow a runner to read only its own queue;
- allow updates only for tasks assigned to that runner;
- never allow runner approval, RBAC changes, user changes, or audit deletion;
- log every accepted and rejected runner mutation.

## 9. API Contract

### 9.1 Cases

```text
GET    /api/workspace/cases
POST   /api/workspace/cases
GET    /api/workspace/cases/{case_id}
PATCH  /api/workspace/cases/{case_id}
GET    /api/workspace/cases/{case_id}/timeline
```

### 9.2 Tasks

```text
GET    /api/workspace/tasks
POST   /api/workspace/tasks
GET    /api/workspace/tasks/{task_id}
PATCH  /api/workspace/tasks/{task_id}
POST   /api/workspace/tasks/{task_id}/assign
POST   /api/workspace/tasks/{task_id}/progress
POST   /api/workspace/tasks/{task_id}/events
POST   /api/workspace/tasks/{task_id}/request-review
POST   /api/workspace/tasks/{task_id}/cancel
```

### 9.3 Approvals

```text
GET    /api/workspace/approvals
POST   /api/workspace/approvals/{approval_id}/approve
POST   /api/workspace/approvals/{approval_id}/reject
```

### 9.4 Runners

```text
POST   /api/workspace/runners/register
POST   /api/workspace/runners/{runner_id}/rotate-secret
POST   /api/workspace/runners/{runner_id}/disable
POST   /api/workspace/runners/heartbeat
GET    /api/workspace/runners/{runner_id}/queue
POST   /api/workspace/runners/{runner_id}/claim
POST   /api/workspace/runners/{runner_id}/release
```

### 9.5 Dashboard and audit

```text
GET    /api/workspace/dashboard
GET    /api/workspace/audit
```

All responses use the existing ATOM success and error envelope where practical. Validation errors return field-level details. Mutation responses include the new entity version.

## 10. Concurrency and Task Claiming

A task may be assigned before a runner claims it. Claiming is atomic.

Claim rules:

- task must be `queued`;
- task must be assigned to the requesting runner or to a compatible runner pool;
- database update must include the current task version;
- successful claim changes status to `running`, sets `started_at`, increments version, and emits a `started` event;
- competing claims receive HTTP 409;
- stale updates receive HTTP 409 with the current task version.

## 11. Workspace UI

### 11.1 Dashboard

Displays:

- active cases;
- queued tasks;
- running tasks;
- blocked tasks;
- tasks waiting for review;
- overdue tasks;
- online and offline runners;
- recent failures;
- average completion progress.

### 11.2 Case list

Columns:

- case title;
- type;
- owner;
- status;
- readiness percent;
- active task count;
- blocked task count;
- next ETA;
- updated time.

### 11.3 Case detail

Sections:

- summary;
- documents;
- risks and blockers;
- task board;
- agent and runner activity;
- approvals;
- audit timeline.

### 11.4 Task card

Shows:

- title and priority;
- assigned agent or user;
- runner type and status;
- task status;
- progress bar and numeric percentage;
- ETA and elapsed time;
- last event;
- blocked reason;
- human review state.

### 11.5 Real-time behaviour

WebSocket events update tasks, runner status, and approvals. If WebSocket is unavailable, the UI falls back to polling every five seconds and displays `polling fallback` instead of falsely showing real-time status.

## 12. Runner Behaviour

### 12.1 Local runner

The local runner is a small process for LuunaOS, OpenClaw, Hermes, or other local execution environments.

Loop:

1. send heartbeat;
2. request queue;
3. atomically claim one compatible task;
4. invoke the configured local adapter;
5. send progress and ETA events;
6. request review when required;
7. report completion or failure;
8. continue polling.

The runner stores no Neon credentials.

### 12.2 Cloud runner

Cloud runners use the same protocol. An adapter translates the workspace task into HF Job, OpenAI, Gemini, or another provider request.

Provider-specific details remain outside the common workspace API.

## 13. Error Handling

### 13.1 API errors

The backend returns stable error codes:

```text
WORKSPACE_NOT_FOUND
WORKSPACE_PERMISSION_DENIED
TASK_INVALID_STATE
TASK_VERSION_CONFLICT
TASK_ALREADY_CLAIMED
RUNNER_AUTH_INVALID
RUNNER_OFFLINE
RUNNER_CAPABILITY_MISMATCH
APPROVAL_REQUIRED
APPROVAL_ALREADY_DECIDED
VALIDATION_FAILED
```

### 13.2 Runner timeout

A runner becomes `degraded` after two missed heartbeat intervals and `offline` after five.

Running tasks are not immediately reassigned. The backend emits `heartbeat_timeout`, marks the task `blocked`, and requires a manager or recovery service to requeue it. This prevents duplicate execution.

### 13.3 Audit safety

Audit failure is treated as a mutation failure for protected actions. Task state changes, assignments, approvals, runner registration, and credential rotation must not commit without an audit record in the same transaction.

## 14. Database Migration Strategy

- use the repository's existing Alembic setup;
- create additive migrations only;
- do not rename or delete existing tables in the MVP;
- provide downgrade operations for all new workspace objects;
- add indexes for task status, case ID, assigned runner, assigned agent, ETA, approval status, and heartbeat time;
- verify migrations on SQLite test mode and Neon PostgreSQL staging;
- production uses migrations, not `Base.metadata.create_all`, as the release mechanism.

## 15. Hugging Face Deployment

The current root Docker configuration must be replaced or isolated because it references a missing frontend directory and starts a demo backend.

The new HF deployment package will:

- build the existing Next.js frontend in standalone mode;
- start the actual ATOM FastAPI application;
- serve the private workspace on port `7860`;
- use a process supervisor or a single reverse-proxy entrypoint so both services terminate correctly;
- expose `/api/health` for platform checks;
- disable public API documentation in production;
- require ATOM authentication after the private Space access check.

Required secrets:

```text
DATABASE_URL
JWT_SECRET
RUNNER_SIGNING_SECRET
ALLOWED_ORIGINS
ALLOWED_HOSTS
ENVIRONMENT=production
```

Optional secrets are added only when a provider adapter is enabled.

## 16. Security Rules

- frontend never receives `DATABASE_URL` or runner secrets;
- raw secrets are never committed;
- runner secrets are hashed in the database;
- HTTPS is required in production;
- PostgreSQL requires SSL;
- all mutations are permission-checked;
- approval is mandatory before external communication, financial decisions, file deletion, credential changes, production deploy, or other protected actions;
- document metadata is separated from document binary storage;
- audit logs are append-only;
- organisation filtering is enforced server-side when multi-organisation mode is enabled;
- no endpoint accepts arbitrary Python, shell, PowerShell, or SQL for execution.

## 17. Testing Strategy

### 17.1 Backend unit tests

Cover:

- progress calculation;
- ETA validation;
- task state transitions;
- permission checks;
- HMAC verification;
- nonce replay protection;
- task claim concurrency;
- runner timeout state changes;
- approval decisions;
- audit transaction behaviour.

### 17.2 Backend integration tests

Cover:

- create case and tasks;
- assign agent and runner;
- runner heartbeat;
- runner queue and claim;
- progress update;
- review request;
- manager approval;
- completion;
- audit timeline;
- SQLite isolation;
- Neon staging migration and connection.

### 17.3 Frontend tests

Cover:

- dashboard KPI rendering;
- task filters;
- task card status and progress;
- blocked state;
- approval actions;
- WebSocket update;
- polling fallback;
- permission-based controls;
- API error display.

### 17.4 End-to-end validation

Synthetic case:

1. manager creates a case;
2. manager creates three tasks;
3. one task is assigned to a local runner;
4. one task is assigned to a cloud runner;
5. one task remains human-owned;
6. local runner reports progress and a blocker;
7. manager resolves and requeues it;
8. cloud task requests approval;
9. manager approves it;
10. all tasks finish;
11. case reaches 100% readiness;
12. audit log shows every transition.

## 18. Delivery Stages

### Stage 1 – Foundation

- branch and design specification;
- workspace SQLAlchemy models;
- Alembic migration;
- permissions;
- schemas;
- service layer;
- backend tests.

### Stage 2 – API and runner protocol

- workspace routes;
- runner HMAC authentication;
- queue and claim flow;
- events, progress, ETA, and approvals;
- API integration tests.

### Stage 3 – Admin workspace UI

- dashboard;
- case list;
- case detail;
- task board;
- approval queue;
- runner status;
- WebSocket and polling fallback;
- frontend tests.

### Stage 4 – Local and cloud runner adapters

- local runner reference implementation;
- cloud runner reference adapter;
- synthetic adapters for deterministic tests;
- timeout and recovery behaviour.

### Stage 5 – HF deployment and validation

- corrected Docker package;
- private Space secrets and configuration;
- Neon staging migration;
- health checks;
- synthetic end-to-end case;
- deployment report.

## 19. Acceptance Criteria

The MVP is accepted when:

- existing ATOM web and desktop paths still build;
- Neon migration succeeds without destructive changes;
- managers authenticate with existing ATOM JWT;
- RBAC hides unauthorised controls;
- local and cloud runners can register, heartbeat, claim, and update tasks without Neon credentials;
- task progress, ETA, blockers, and review states appear in the same workspace for humans and agents;
- approval-required actions cannot complete before manager approval;
- every protected mutation creates an audit record;
- runner loss does not produce duplicate execution;
- private HF Space starts on port `7860` and connects to Neon through secrets;
- the synthetic end-to-end case completes successfully;
- no secrets, `node_modules`, build output, or temporary database files are committed.

## 20. Implementation Constraints

- smallest safe changes first;
- no deletion or relocation of existing source without explicit approval and backup;
- preserve the desktop version;
- do not replace working agent governance or authentication components;
- new implementation must follow existing ATOM route, model, and UI conventions;
- run focused tests after each stage and full build validation before deployment;
- production deployment requires explicit approval after staging validation.
