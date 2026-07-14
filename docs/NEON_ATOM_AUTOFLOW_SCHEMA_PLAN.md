# Neon Schema Plan: Annaator / ATOM + Autoflow + Loan Cases

Status: design-only draft  
Scope: Neon/Postgres target schema planning for Annaator local-to-cloud data persistence  
Rules: do not connect to Neon, do not modify any database, do not create migrations yet, do not store secrets in this document

## Goals

This plan defines the first stable relational shape for:

- Core identity, organizations, profiles, and audit trail.
- Loan/capital readiness case flow.
- Luuna Autoflow task planning and safe mock execution history.
- PDF editor/orchestrator jobs, templates, extractions, redactions, and exports.

The v0.1 implementation can continue using JSON memory and local fallback responses. Neon starts as the durable source in v0.2 after the API contracts are stable.

## Conventions

- Primary keys: `id uuid primary key default gen_random_uuid()`.
- Timestamps: `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- Soft delete where useful: `deleted_at timestamptz`.
- Tenant boundary: `organization_id uuid references organizations(id)` on business data.
- Actor tracking: `created_by uuid references users(id)`, `updated_by uuid references users(id)` where user actions matter.
- Flexible provider/model data can use `jsonb`, but only for details that are not frequently filtered.
- Status fields should use text initially with CHECK constraints; Postgres enums can come later if statuses stabilize.

## Environment Variables Needed

Do not place real values in the repo. These are names only.

| Variable | Purpose | Used by |
|---|---|---|
| `DATABASE_URL` | Server-side pooled Neon/Postgres connection string | Backend API, migrations, background workers |
| `DIRECT_DATABASE_URL` | Direct Neon connection for migrations, if pooling is enabled | Migration CLI only |
| `NEXTAUTH_URL` | Auth callback/site URL | NextAuth frontend/backend |
| `NEXTAUTH_SECRET` | NextAuth signing secret | Auth |
| `DATABASE_SSLMODE` | Optional explicit SSL setting, usually `require` | Backend DB client |
| `LANCEDB_PATH` | Local/vector document index path while not fully in Neon | Document search v0.1 |
| `AUTOFLOW_MEMORY_BACKEND` | `json` or `neon`, controls Autoflow persistence switch | Autoflow service |
| `PDF_STORAGE_BACKEND` | `local`, `s3`, `netlify-blobs`, or future storage target | PDF jobs/exports |
| `AUDIT_LOG_LEVEL` | Controls audit verbosity for local/dev/prod | Audit service |

## Migration Order

1. Enable extensions: `pgcrypto` or `uuid-ossp`, plus optional `citext`.
2. Core identity: `users`, `organizations`, `profiles`.
3. Core audit: `audit_logs`.
4. Loan case root: `loan_applications`.
5. Loan applicant detail tables: `applicant_personal_data`, `applicant_company_data`, `applicant_income`, `applicant_liabilities`, `applicant_assets`.
6. Loan workflow support: `bank_checklists`, `document_metadata`, `missing_documents`, `risk_assessments`, `lender_routes`, `admin_notes`.
7. Autoflow root: `autoflow_tasks`, `autoflow_executions`.
8. Autoflow detail: `autoflow_plans`, `autoflow_provider_runs`, `autoflow_approvals`.
9. PDF root: `pdf_templates`, `pdf_jobs`.
10. PDF detail: `pdf_extractions`, `pdf_redactions`, `pdf_exports`.
11. Add indexes, RLS policies, and read-model views after initial inserts and endpoint smoke tests.

## Core Tables

### users

Purpose: canonical application user record for login identity, ownership, and audit actors.

Important columns:

- `id uuid primary key`
- `email citext unique not null`
- `display_name text`
- `auth_provider text`
- `auth_provider_user_id text`
- `role text default 'user'`
- `status text default 'active'`
- `last_login_at timestamptz`
- `created_at`, `updated_at`, `deleted_at`

Relations:

- One user can own many `profiles`.
- One user can create/update many domain records via `created_by` and `updated_by`.
- Referenced by `audit_logs.actor_user_id`, `autoflow_approvals.requested_by`, `autoflow_approvals.approved_by`, `admin_notes.author_user_id`.

Frontend/backend endpoint usage:

- `GET /api/users/me`
- auth/session loaders
- admin user management
- audit actor display

### profiles

Purpose: per-organization user profile, preferences, and operational role.

Important columns:

- `id uuid primary key`
- `user_id uuid references users(id)`
- `organization_id uuid references organizations(id)`
- `title text`
- `phone text`
- `locale text default 'et-EE'`
- `timezone text default 'Europe/Tallinn'`
- `preferences jsonb default '{}'`
- `permissions jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Belongs to `users`.
- Belongs to `organizations`.
- Used by loan/admin screens to determine case access and UI preferences.

Frontend/backend endpoint usage:

- `GET /api/users/me`
- onboarding status/profile completion
- settings/profile page
- Annaator role-aware navigation

### organizations

Purpose: tenant/business entity boundary for Annaator data.

Important columns:

- `id uuid primary key`
- `name text not null`
- `registry_code text`
- `country_code text default 'EE'`
- `default_currency text default 'EUR'`
- `industry text`
- `website text`
- `settings jsonb default '{}'`
- `created_at`, `updated_at`, `deleted_at`

Relations:

- Has many `profiles`.
- Owns `loan_applications`, `autoflow_tasks`, `pdf_jobs`, and related tables.

Frontend/backend endpoint usage:

- onboarding organization creation/status
- `GET /api/admin/business-facts`
- tenant-aware dashboard metrics
- loan case ownership

### audit_logs

Purpose: append-only activity trail for sensitive workflow, approval, PDF, and loan events.

Important columns:

- `id uuid primary key`
- `organization_id uuid references organizations(id)`
- `actor_user_id uuid references users(id)`
- `entity_type text not null`
- `entity_id uuid`
- `action text not null`
- `severity text default 'info'`
- `summary text`
- `before jsonb`
- `after jsonb`
- `metadata jsonb default '{}'`
- `ip_address inet`
- `user_agent text`
- `created_at timestamptz default now()`

Relations:

- Optional actor via `users`.
- Optional tenant via `organizations`.
- Links by `entity_type` and `entity_id` to domain tables.

Frontend/backend endpoint usage:

- admin audit log views
- JIT verification
- Autoflow approvals/history
- PDF redaction/export trace

## Loan Flow Tables

### loan_applications

Purpose: root record for a loan/capital readiness case.

Important columns:

- `id uuid primary key`
- `organization_id uuid references organizations(id)`
- `case_number text unique`
- `applicant_type text check in ('personal','company','mixed')`
- `status text default 'draft'`
- `requested_amount numeric(14,2)`
- `currency text default 'EUR'`
- `purpose text`
- `source_channel text`
- `assigned_manager_id uuid references users(id)`
- `created_by uuid references users(id)`
- `submitted_at timestamptz`
- `decision_due_at timestamptz`
- `created_at`, `updated_at`, `deleted_at`

Relations:

- Parent for all applicant, checklist, document, risk, lender, and admin note tables.
- Can link to Autoflow tasks through `autoflow_tasks.loan_application_id`.
- Can link to PDF jobs through `pdf_jobs.loan_application_id`.

Frontend/backend endpoint usage:

- Laenu Haldur dashboard
- future `GET /api/loan-applications`
- future `POST /api/loan-applications`
- capital-ready intake pages

### applicant_personal_data

Purpose: personal applicant information for consumer or mixed applications.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `first_name text`
- `last_name text`
- `personal_code text`
- `date_of_birth date`
- `citizenship text`
- `email citext`
- `phone text`
- `address jsonb`
- `marital_status text`
- `dependents_count integer`
- `consent_flags jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- One-to-one or one-to-many with `loan_applications` depending on co-applicants.
- Referenced by `risk_assessments` evidence metadata.

Frontend/backend endpoint usage:

- personal intake screen
- manager review
- document request generation

### applicant_company_data

Purpose: company applicant or employer/business data.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `company_name text`
- `registry_code text`
- `vat_number text`
- `legal_form text`
- `industry text`
- `website text`
- `founded_at date`
- `employees_count integer`
- `annual_revenue numeric(14,2)`
- `address jsonb`
- `beneficial_owners jsonb default '[]'`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- Used by `lender_routes` and `risk_assessments`.

Frontend/backend endpoint usage:

- company addon screen
- lender checklist generation
- business loan routing

### applicant_income

Purpose: normalized income streams for personal/company affordability analysis.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `income_type text`
- `source_name text`
- `amount numeric(14,2)`
- `currency text default 'EUR'`
- `frequency text`
- `verified boolean default false`
- `verification_source text`
- `period_start date`
- `period_end date`
- `metadata jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- Can be derived from `pdf_extractions`.

Frontend/backend endpoint usage:

- affordability calculator
- bank statement reader output
- risk assessment input

### applicant_liabilities

Purpose: applicant debts and recurring financial obligations.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `liability_type text`
- `creditor_name text`
- `outstanding_amount numeric(14,2)`
- `monthly_payment numeric(14,2)`
- `currency text default 'EUR'`
- `interest_rate numeric(6,3)`
- `maturity_date date`
- `verified boolean default false`
- `metadata jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- Used by `risk_assessments`.
- Can be extracted from bank statements and credit reports.

Frontend/backend endpoint usage:

- liability intake step
- risk calculation
- manager feedback screen

### applicant_assets

Purpose: assets, collateral, and financial reserves.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `asset_type text`
- `description text`
- `estimated_value numeric(14,2)`
- `currency text default 'EUR'`
- `ownership_share numeric(5,2)`
- `collateral_eligible boolean default false`
- `verified boolean default false`
- `metadata jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- Used by `lender_routes` and collateral-backed offers.

Frontend/backend endpoint usage:

- assets intake
- collateral lender routing
- manager review

### bank_checklists

Purpose: required document/checklist rules per lender, case type, and application.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `lender_name text`
- `checklist_type text`
- `required_items jsonb not null default '[]'`
- `completed_items jsonb not null default '[]'`
- `status text default 'open'`
- `generated_by text`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- Drives `missing_documents`.
- Can be generated by `autoflow_tasks`.

Frontend/backend endpoint usage:

- bank checklist screen
- Laenu Haldur checklist cards
- missing document generator

### document_metadata

Purpose: domain metadata for uploaded documents without storing file bytes in Neon.

Important columns:

- `id uuid primary key`
- `organization_id uuid references organizations(id)`
- `loan_application_id uuid references loan_applications(id)`
- `uploaded_by uuid references users(id)`
- `document_type text`
- `file_name text`
- `mime_type text`
- `storage_backend text`
- `storage_key text`
- `sha256 text`
- `page_count integer`
- `status text default 'uploaded'`
- `extraction_status text`
- `metadata jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Belongs to organization and optional loan application.
- Parent for `pdf_extractions`, `pdf_redactions`, `pdf_exports`.
- Referenced by `missing_documents.matched_document_id`.

Frontend/backend endpoint usage:

- `GET /api/documents`
- `POST /api/documents/upload`
- Laenu Haldur documents tab
- PDF Orkester file registry

### missing_documents

Purpose: track gaps found by checklist, manager, or agent.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `checklist_id uuid references bank_checklists(id)`
- `matched_document_id uuid references document_metadata(id)`
- `document_type text not null`
- `reason text`
- `severity text default 'medium'`
- `status text default 'missing'`
- `requested_from text`
- `requested_at timestamptz`
- `resolved_at timestamptz`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- Optionally tied to checklist and document metadata.

Frontend/backend endpoint usage:

- missing items/warnings dashboard block
- bank checklist screen
- client document request flow

### risk_assessments

Purpose: store affordability, credit, document, and policy risk outputs.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `assessment_type text`
- `risk_level text`
- `score numeric(8,3)`
- `summary text`
- `factors jsonb default '[]'`
- `evidence jsonb default '{}'`
- `model_version text`
- `assessed_by text`
- `requires_manual_review boolean default false`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- May be produced by `autoflow_provider_runs` or PDF extractions.

Frontend/backend endpoint usage:

- manager feedback screen
- risk control center
- lender route recommendation

### lender_routes

Purpose: lender/provider routing options for a loan case.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `lender_name text`
- `route_type text`
- `fit_score numeric(8,3)`
- `max_amount numeric(14,2)`
- `currency text default 'EUR'`
- `requirements jsonb default '{}'`
- `decision_status text default 'draft'`
- `recommended boolean default false`
- `rationale text`
- `created_at`, `updated_at`

Relations:

- Belongs to `loan_applications`.
- Can be created by Autoflow provider runs.

Frontend/backend endpoint usage:

- Laenu Haldur provider matrix
- bank shortlist generation
- package optimizer

### admin_notes

Purpose: manager/admin comments, decisions, and feedback for a loan case.

Important columns:

- `id uuid primary key`
- `loan_application_id uuid references loan_applications(id)`
- `author_user_id uuid references users(id)`
- `note_type text default 'general'`
- `visibility text default 'internal'`
- `body text not null`
- `attachments jsonb default '[]'`
- `created_at`, `updated_at`, `deleted_at`

Relations:

- Belongs to `loan_applications`.
- Authored by `users`.

Frontend/backend endpoint usage:

- manager feedback screen
- admin review pane
- audit/helpdesk handoff

## Autoflow Tables

### autoflow_tasks

Purpose: persisted user/system request submitted to Luuna Autoflow.

Important columns:

- `id uuid primary key`
- `organization_id uuid references organizations(id)`
- `loan_application_id uuid references loan_applications(id)`
- `created_by uuid references users(id)`
- `goal text not null`
- `mode text check in ('plan_only','execute_mock')`
- `domain text check in ('pdf','workflow','agent','document','general')`
- `approval_required boolean default true`
- `status text default 'submitted'`
- `source text default 'workbench'`
- `metadata jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Parent for `autoflow_executions` and `autoflow_approvals`.
- Optional link to a loan case.

Frontend/backend endpoint usage:

- `POST /api/autoflow/tasks`
- Annaator AI Workbench Autoflow panel
- future `GET /api/autoflow/tasks`

### autoflow_executions

Purpose: each run attempt for an Autoflow task.

Important columns:

- `id uuid primary key`
- `task_id uuid references autoflow_tasks(id)`
- `execution_id text unique not null`
- `selected_adapter text`
- `status text default 'pending'`
- `started_at timestamptz`
- `completed_at timestamptz`
- `duration_ms integer`
- `warnings jsonb default '[]'`
- `result jsonb default '{}'`
- `error text`
- `created_at`, `updated_at`

Relations:

- Belongs to `autoflow_tasks`.
- Parent for `autoflow_plans` and `autoflow_provider_runs`.

Frontend/backend endpoint usage:

- Autoflow result panel
- `GET /api/autoflow/tasks/{execution_id}`
- execution history table

### autoflow_plans

Purpose: normalized plan steps generated by Autoflow.

Important columns:

- `id uuid primary key`
- `execution_id uuid references autoflow_executions(id)`
- `step_index integer not null`
- `title text`
- `body text not null`
- `step_type text`
- `status text default 'planned'`
- `metadata jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Belongs to `autoflow_executions`.

Frontend/backend endpoint usage:

- Autoflow result panel plan steps
- plan review/approval screen
- future plan editing UI

### autoflow_provider_runs

Purpose: record individual adapter/provider interactions, even for mock execution.

Important columns:

- `id uuid primary key`
- `execution_id uuid references autoflow_executions(id)`
- `provider_id text not null`
- `provider_name text`
- `mode text check in ('plan_only','execute_mock')`
- `status text default 'completed'`
- `request_payload jsonb default '{}'`
- `response_payload jsonb default '{}'`
- `tokens_used jsonb default '{}'`
- `latency_ms integer`
- `error text`
- `created_at`, `updated_at`

Relations:

- Belongs to `autoflow_executions`.
- Can produce PDF jobs, lender routes, or risk assessments in later versions.

Frontend/backend endpoint usage:

- provider diagnostics
- Autoflow providers panel
- audit/debug view

### autoflow_approvals

Purpose: HITL approval records before real execution or sensitive actions.

Important columns:

- `id uuid primary key`
- `task_id uuid references autoflow_tasks(id)`
- `execution_id uuid references autoflow_executions(id)`
- `requested_by uuid references users(id)`
- `approved_by uuid references users(id)`
- `approval_type text`
- `status text default 'pending'`
- `reason text`
- `decision_note text`
- `requested_at timestamptz default now()`
- `decided_at timestamptz`
- `metadata jsonb default '{}'`

Relations:

- Belongs to `autoflow_tasks`.
- Optionally belongs to an execution.
- Uses `users` for approval actors.

Frontend/backend endpoint usage:

- Autoflow approval state in workbench
- JIT verification
- future approval queue

## PDF Tables

### pdf_jobs

Purpose: root job record for PDF editor/orchestrator work.

Important columns:

- `id uuid primary key`
- `organization_id uuid references organizations(id)`
- `loan_application_id uuid references loan_applications(id)`
- `document_id uuid references document_metadata(id)`
- `autoflow_task_id uuid references autoflow_tasks(id)`
- `job_type text`
- `status text default 'queued'`
- `priority integer default 100`
- `input_payload jsonb default '{}'`
- `output_payload jsonb default '{}'`
- `error text`
- `created_by uuid references users(id)`
- `started_at timestamptz`
- `completed_at timestamptz`
- `created_at`, `updated_at`

Relations:

- Belongs to organization and optional loan application/document.
- Can be triggered by Autoflow.
- Parent for extractions, redactions, and exports.

Frontend/backend endpoint usage:

- PDF Orkester center page
- future `POST /api/pdf/jobs`
- upload-to-processing pipeline

### pdf_templates

Purpose: reusable PDF/document templates for loan applications, checklists, and exports.

Important columns:

- `id uuid primary key`
- `organization_id uuid references organizations(id)`
- `name text not null`
- `template_type text`
- `version text default '1.0.0'`
- `status text default 'draft'`
- `schema jsonb default '{}'`
- `storage_key text`
- `preview_document_id uuid references document_metadata(id)`
- `created_by uuid references users(id)`
- `created_at`, `updated_at`, `deleted_at`

Relations:

- Owned by organization.
- Used by `pdf_jobs` and `pdf_exports`.

Frontend/backend endpoint usage:

- PDF template builder
- loan application form generator
- document package export

### pdf_extractions

Purpose: extracted OCR/text/table data from documents.

Important columns:

- `id uuid primary key`
- `pdf_job_id uuid references pdf_jobs(id)`
- `document_id uuid references document_metadata(id)`
- `extraction_type text`
- `status text default 'completed'`
- `confidence numeric(6,3)`
- `page_range text`
- `text_content text`
- `tables jsonb default '[]'`
- `entities jsonb default '[]'`
- `raw_output jsonb default '{}'`
- `created_at`, `updated_at`

Relations:

- Belongs to PDF job and document.
- Can feed `applicant_income`, `applicant_liabilities`, `risk_assessments`.

Frontend/backend endpoint usage:

- bank statement reader
- PDF Orkester extraction details
- document preview/search

### pdf_redactions

Purpose: track sensitive-data redaction operations and manual approvals.

Important columns:

- `id uuid primary key`
- `pdf_job_id uuid references pdf_jobs(id)`
- `document_id uuid references document_metadata(id)`
- `redaction_type text`
- `status text default 'proposed'`
- `regions jsonb default '[]'`
- `detected_entities jsonb default '[]'`
- `approved_by uuid references users(id)`
- `approved_at timestamptz`
- `audit_log_id uuid references audit_logs(id)`
- `created_at`, `updated_at`

Relations:

- Belongs to PDF job/document.
- Optional approval actor via `users`.
- Optional audit link.

Frontend/backend endpoint usage:

- PDF redaction review UI
- JIT/manual approval flow
- compliance audit

### pdf_exports

Purpose: final generated PDFs or document packages.

Important columns:

- `id uuid primary key`
- `pdf_job_id uuid references pdf_jobs(id)`
- `loan_application_id uuid references loan_applications(id)`
- `template_id uuid references pdf_templates(id)`
- `export_type text`
- `status text default 'created'`
- `file_name text`
- `mime_type text default 'application/pdf'`
- `storage_backend text`
- `storage_key text`
- `sha256 text`
- `created_by uuid references users(id)`
- `created_at`, `updated_at`

Relations:

- Belongs to PDF job and optional loan application/template.
- Can be registered in `document_metadata` if exports should be searchable.

Frontend/backend endpoint usage:

- PDF export/download button
- loan application package builder
- final document registry

## v0.1: What Stays JSON Memory

Keep these in local JSON/memory until route contracts and UI behavior settle:

- Autoflow `MemoryStore` execution history in `backend/data/autoflow_memory.json`.
- Provider registry for `mock-llm`, `pdf-orchestrator`, and `atom-tools`.
- Generated Autoflow plans returned directly from `POST /api/autoflow/tasks`.
- Workbench module cards and local module metadata.
- Laenu Haldur demo cases, provider matrix, and quick case rows.
- PDF Orkester module definitions and mock job plans.
- Temporary frontend fallback data for dashboard metrics and workflow executions.

Rationale: v0.1 is still shaping product behavior. JSON memory is enough for local demos and avoids premature migration churn.

## v0.2: What Moves to Neon

Move these first once endpoints are stable:

- `users`, `profiles`, `organizations`, `audit_logs`.
- Loan case root and applicant tables: `loan_applications`, `applicant_*`.
- `document_metadata`, `missing_documents`, `bank_checklists`.
- Autoflow durable history: `autoflow_tasks`, `autoflow_executions`, `autoflow_plans`.
- PDF durable job tracking: `pdf_jobs`, `pdf_extractions`, `pdf_exports`.

Move later after real execution and approval policies are stable:

- `autoflow_provider_runs` with full request/response payloads.
- `autoflow_approvals` tied to JIT verification.
- `pdf_redactions` after manual review workflow exists.
- advanced lender/risk models: `risk_assessments`, `lender_routes`.

## Suggested Indexes

- `users(email)`
- `profiles(user_id, organization_id)`
- `loan_applications(organization_id, status, created_at desc)`
- `loan_applications(case_number)`
- `document_metadata(organization_id, loan_application_id, document_type)`
- `missing_documents(loan_application_id, status)`
- `risk_assessments(loan_application_id, assessment_type, created_at desc)`
- `lender_routes(loan_application_id, recommended, fit_score desc)`
- `autoflow_tasks(organization_id, status, created_at desc)`
- `autoflow_executions(execution_id)`
- `autoflow_executions(task_id, status, created_at desc)`
- `pdf_jobs(organization_id, status, created_at desc)`
- `pdf_jobs(loan_application_id, job_type)`
- `pdf_extractions(document_id, extraction_type)`
- `audit_logs(organization_id, entity_type, entity_id, created_at desc)`

## Endpoint Mapping Summary

| Area | Endpoint | Tables |
|---|---|---|
| Auth/profile | `GET /api/users/me` | `users`, `profiles`, `organizations` |
| Business facts | `GET /api/admin/business-facts` | `organizations`, `profiles`, `audit_logs` |
| Dashboard | `GET /api/analytics/dashboard/kpis` | read models from loan/autoflow/pdf tables |
| Documents | `GET /api/documents` | `document_metadata`, `pdf_extractions` |
| Documents | `POST /api/documents/upload` | `document_metadata`, `pdf_jobs` |
| Autoflow | `GET /api/autoflow/health` | no DB required |
| Autoflow | `GET /api/autoflow/providers` | v0.1 memory, v0.2 optional provider catalog |
| Autoflow | `POST /api/autoflow/tasks` | `autoflow_tasks`, `autoflow_executions`, `autoflow_plans`, `autoflow_approvals` |
| Autoflow | `GET /api/autoflow/tasks/{execution_id}` | `autoflow_executions`, `autoflow_plans`, `autoflow_provider_runs` |
| Loan | future `GET /api/loan-applications` | `loan_applications`, applicant tables, risk/lender summaries |
| Loan | future `POST /api/loan-applications` | `loan_applications`, applicant tables |
| Loan checklist | future `GET /api/loan-applications/{id}/checklist` | `bank_checklists`, `missing_documents`, `document_metadata` |
| PDF Orkester | future `POST /api/pdf/jobs` | `pdf_jobs`, `document_metadata`, `autoflow_tasks` |
| PDF Orkester | future `GET /api/pdf/jobs/{id}` | `pdf_jobs`, `pdf_extractions`, `pdf_redactions`, `pdf_exports` |

## Open Design Questions

- Should personal applicant data be encrypted column-by-column before Neon persistence?
- Should `document_metadata` be shared across loan cases or duplicated per case?
- Should `lender_routes` store provider snapshots so recommendations remain auditable when provider rules change?
- Should Autoflow plan edits create new rows in `autoflow_plans` or versioned plan sets?
- Should `pdf_exports` become searchable documents automatically, or only when explicitly registered?

## Non-Goals For This Document

- No SQL migrations.
- No Neon connection setup.
- No secret handling.
- No RLS policy implementation.
- No production migration commands.
