# Annator Command Center Design

## Goal

Create a separate private online command center for Annator/ATOM where humans and agents share one persistent source of truth for projects, tasks, ownership, progress, work logs, approvals, and produced artifacts.

## Scope

The first release is an MVP. It provides:

- project list;
- Kanban task board;
- task creation and editing;
- agent registry;
- manual and orchestrator assignment;
- task claim, heartbeat, complete, fail, and release operations;
- immutable task event log;
- comments and artifact links;
- GitHub commit and pull request references;
- human approval gates;
- private Hugging Face Docker Space deployment;
- Neon PostgreSQL persistence.

The MVP does not run autonomous agents continuously. It coordinates work and exposes an API that external agents can poll or call.

## Architecture

Annator Command Center is a separate application from the current ATOM monorepo runtime. The source may live in the ATOM repository under a self-contained `command-center/` directory, but its build, database schema, deployment, and runtime remain isolated from the existing desktop, Tauri, backend, and frontend applications.

```text
Private Hugging Face Docker Space
  ├── Next.js user interface
  ├── REST API
  ├── human authentication
  ├── agent API-key authentication
  └── orchestrator controls

Neon PostgreSQL
  ├── projects
  ├── tasks
  ├── agents
  ├── assignments
  ├── locks and heartbeats
  ├── comments
  ├── events
  ├── artifacts
  └── approvals

GitHub
  ├── source code
  ├── branches
  ├── commits
  └── pull requests

ATOM and external agents
  └── use the Command Center REST API
```

## Technology

- Next.js with TypeScript;
- React;
- PostgreSQL through Neon;
- SQL migrations committed to the repository;
- Docker deployment for Hugging Face Spaces;
- server-side database access only;
- API-key authentication for agents;
- session-based authentication for humans.

## Repository isolation

Create the application under:

```text
command-center/
```

The directory must contain its own:

- `package.json`;
- lock file;
- `Dockerfile`;
- `.dockerignore`;
- `.gitignore` additions where needed;
- environment example without secrets;
- database migrations;
- tests;
- Hugging Face Space README metadata.

The implementation must not modify or relocate existing desktop or Tauri files. It must not depend on existing ATOM build outputs, `node_modules`, `.next`, `dist`, or local databases.

## Core domain model

### Projects

A project groups related work. Initial projects include `Annator Command Center`, `ATOM`, and `Hugging Face Deployment`.

Fields:

- `id` UUID;
- `key` short unique identifier;
- `name`;
- `description`;
- `status`;
- `created_at`;
- `updated_at`.

### Tasks

Task statuses are fixed to:

```text
inbox
ready
assigned
in_progress
blocked
review
done
cancelled
```

Fields:

- `id` UUID;
- `project_id`;
- `title`;
- `description`;
- `status`;
- `priority`: `low`, `normal`, `high`, or `urgent`;
- `assigned_agent_id` nullable;
- `orchestrator_agent_id` nullable;
- `requires_human_approval` boolean;
- `created_by`;
- `created_at`;
- `updated_at`;
- `completed_at` nullable.

### Agents

Fields:

- `id` UUID;
- `slug` unique machine name;
- `name`;
- `role`;
- `status`: `offline`, `idle`, `busy`, `paused`, or `disabled`;
- `max_parallel_tasks`;
- `last_heartbeat_at`;
- `created_at`;
- `updated_at`.

Capabilities are stored separately so that matching remains queryable.

### Locks

A task may have one active lock.

Fields:

- `task_id` unique;
- `agent_id`;
- `locked_at`;
- `heartbeat_at`;
- `expires_at`.

Claiming must be atomic. A task is claimable only when no active lock exists or the existing lock has expired.

Default lock duration: 5 minutes.

Default heartbeat interval: 60 seconds.

### Events

Every state-changing action creates an append-only event.

Event types include:

```text
task_created
task_updated
task_assigned
task_claimed
task_started
task_blocked
task_released
heartbeat_received
comment_added
artifact_added
approval_requested
approval_granted
approval_rejected
review_requested
review_approved
task_completed
task_failed
```

Events are never edited or deleted through the application API.

### Artifacts

Artifacts reference work products without storing large binary files in PostgreSQL.

Supported references:

- GitHub commit;
- GitHub pull request;
- Hugging Face file or Space;
- report URL;
- external file URL;
- plain text result summary.

## API

All API responses use JSON and a consistent envelope:

```json
{
  "ok": true,
  "data": {}
}
```

Errors use:

```json
{
  "ok": false,
  "error": {
    "code": "TASK_LOCKED",
    "message": "Task is already claimed by another agent"
  }
}
```

Required endpoints:

```text
GET    /api/projects
POST   /api/projects
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
POST   /api/tasks/:id/assign
POST   /api/tasks/:id/claim
POST   /api/tasks/:id/heartbeat
POST   /api/tasks/:id/release
POST   /api/tasks/:id/complete
POST   /api/tasks/:id/fail
POST   /api/tasks/:id/comments
POST   /api/tasks/:id/artifacts
GET    /api/tasks/:id/events
GET    /api/agents
POST   /api/agents
PATCH  /api/agents/:id
POST   /api/approvals/:id/approve
POST   /api/approvals/:id/reject
GET    /api/health
```

Task list filters:

- project;
- status;
- priority;
- assigned agent;
- capability;
- approval requirement.

## Authentication and authorization

### Human access

The Hugging Face Space is private. The application additionally requires a human session before exposing task data.

Initial human roles:

- `admin`;
- `manager`;
- `viewer`.

### Agent access

Each agent has:

- `AGENT_ID`;
- a unique API key stored only as a salted hash in PostgreSQL;
- allowed capabilities;
- an enabled or disabled state.

Raw keys are shown only once when created. They are never returned by list endpoints.

Agent API keys may:

- read eligible tasks;
- claim tasks;
- update heartbeats;
- add logs, comments, and artifacts;
- mark assigned work complete or failed.

Agents may not:

- delete tasks or events;
- change human roles;
- read other agents' raw credentials;
- bypass approval gates;
- reassign arbitrary tasks unless they are the orchestrator.

## Orchestrator behavior

The MVP orchestrator is controlled manually from the UI or through an authenticated API call.

For each run it:

1. reads `ready` tasks without unresolved dependencies;
2. finds enabled agents with required capabilities and available capacity;
3. assigns the best matching agent;
4. records `task_assigned`;
5. leaves task claiming to the selected agent;
6. does not execute external commands itself.

Selection order:

1. explicit preferred agent;
2. capability match;
3. lowest active task count;
4. oldest idle timestamp;
5. stable agent slug ordering.

## User interface

### Dashboard

Shows:

- task counts by status;
- active agents;
- blocked tasks;
- tasks awaiting review;
- tasks awaiting human approval;
- recent events.

### Kanban

Columns:

- Inbox;
- Ready;
- Assigned;
- In Progress;
- Blocked;
- Review;
- Done.

Cancelled tasks are available through a filter rather than a permanent column.

### Task detail

Shows:

- editable task metadata;
- assignee and orchestrator;
- lock state and expiration;
- dependencies;
- comments;
- append-only event timeline;
- artifacts;
- approvals;
- GitHub links.

### Agent registry

Shows:

- name and role;
- capabilities;
- state;
- last heartbeat;
- active task count;
- maximum parallel work;
- enable, pause, and disable controls.

### Orchestrator panel

Provides:

- dry-run preview;
- assignment run button;
- result summary;
- rejected assignment reasons;
- pause switch.

## Persistence and concurrency

Neon PostgreSQL is the only source of truth.

Task claim uses a transaction and row-level locking. Two agents attempting to claim the same task must result in exactly one success.

Status transitions are validated server-side. Invalid transitions return `INVALID_TASK_TRANSITION`.

All timestamps are stored as UTC `TIMESTAMPTZ`.

## Error handling

- Database failures return a generic client error and a server-side structured log entry.
- Authentication failures return `401`.
- Authorization failures return `403`.
- Missing resources return `404`.
- Lock conflicts return `409`.
- Validation failures return `422`.
- No API response exposes database credentials, API keys, stack traces, or environment variables.

## Deployment

The Hugging Face Space uses Docker and listens on port `7860` unless the repository README explicitly declares another supported `app_port`. The application binds to `0.0.0.0`.

Required secrets:

```text
DATABASE_URL
AUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
```

Optional integration secrets are added only when their integration is implemented.

The Space must not rely on local disk persistence.

## Testing

Required automated tests:

- schema and migration test;
- task creation validation;
- valid and invalid status transitions;
- atomic claim race test;
- expired lock recovery;
- heartbeat extension;
- agent authorization;
- human role authorization;
- immutable event creation;
- orchestrator deterministic selection;
- health endpoint;
- basic Kanban rendering.

Required deployment checks:

- production build succeeds;
- Docker image builds;
- container starts;
- `/api/health` reports success;
- Space runs without local persistent storage;
- no secret is committed.

## Initial seed data

Projects:

- `ANNATOR`: Annator Command Center;
- `ATOM`: ATOM application;
- `HF`: Hugging Face deployment.

Agents:

- `orchestrator`;
- `github-agent`;
- `huggingface-agent`;
- `frontend-agent`;
- `backend-agent`;
- `review-agent`;
- `security-agent`.

The seed process must be idempotent.

## Acceptance criteria

The MVP is accepted when:

1. a private deployed Space displays the Kanban board;
2. tasks persist across Space restarts;
3. a human can create, edit, assign, and review a task;
4. an agent can authenticate, claim one eligible task, heartbeat, attach a result, and complete it;
5. two agents cannot claim the same task simultaneously;
6. every mutation appears in the event timeline;
7. an orchestrator dry run and assignment run are available;
8. GitHub commit and PR artifacts can be attached;
9. approval-required tasks cannot be completed before approval;
10. existing ATOM desktop and web builds remain unchanged.

## Explicit non-goals for MVP

- continuous background agent execution;
- chat interface;
- binary file hosting in PostgreSQL;
- billing;
- public anonymous access;
- replacing GitHub issues;
- modifying the current ATOM desktop runtime;
- automatic execution of shell commands from task descriptions.
