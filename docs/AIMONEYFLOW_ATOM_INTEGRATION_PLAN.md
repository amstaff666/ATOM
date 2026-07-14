# aimoneyflow + Annaator / ATOM Integration Plan

Status: design-only integration plan  
Scope: public client portal + admin/operator portal + shared backend API + shared Neon database  
Rules: no deploy, no secrets, no aimoneyflow repo changes, no database changes

## Architecture

```text
aimoneyflow.netlify.app
  Public/client portal
  - intake forms
  - company addon
  - bank checklist
  - mobile step flow
  - manager feedback/status view
  - document upload

Shared Backend API
  - validates client intake
  - stores cases in Neon
  - accepts documents
  - runs PDF extraction / Autoflow / risk analysis
  - exposes separate client/admin routes

Neon
  Shared durable database
  - loan cases
  - applicant data
  - document metadata
  - missing documents
  - risk assessments
  - lender paths
  - admin notes
  - Autoflow/PDF execution history

ATOM / Annaator
  Admin/operator portal
  - case queue
  - documents
  - risk review
  - lender routing
  - notes
  - AI analysis
  - Autoflow execution
```

## Portal Responsibilities

### aimoneyflow.netlify.app

The client portal should stay focused on user-facing intake and status:

- Collect personal data.
- Collect company data when relevant.
- Collect income, liabilities, and assets.
- Show required bank checklist.
- Upload client documents.
- Show current case status.
- Show missing documents.
- Show simplified risk summary after manager/AI review.

It should not expose internal agent logs, raw AI prompts, backend credentials, Neon identifiers beyond safe public case ids, or admin-only decision metadata.

### ATOM / Annaator

The admin/operator portal should handle internal work:

- Review all submitted cases.
- Inspect applicant data.
- Inspect documents and PDF extraction results.
- Run AI analysis.
- Run Autoflow planning.
- Trigger PDF Orkester jobs.
- Maintain admin notes.
- Review risk, lender paths, and missing documents.
- Approve sensitive actions before sending anything externally.

## Required Client Endpoints

### POST /api/intake/submit

Purpose: create or update a client loan application from the public portal.

Input data:

- personal data
- company data
- income
- liabilities
- assets
- consent flags
- source metadata

Writes:

- `loan_applications`
- `applicant_personal_data`
- `applicant_company_data`
- `applicant_income`
- `applicant_liabilities`
- `applicant_assets`
- `bank_checklists`
- `audit_logs`

Response:

- `case_id`
- `public_case_reference`
- `status`
- `next_step`
- `required_banks`

Notes:

- Validate required consent before storing sensitive fields.
- Return safe public case id, not internal debug data.
- Should be idempotent if a client resumes a draft.

### GET /api/client/case/:id

Purpose: return safe client-visible case overview.

Reads:

- `loan_applications`
- applicant summary tables
- `document_metadata`
- `missing_documents`
- latest `risk_assessments` summary

Response:

- case status
- submitted sections
- upload status
- missing document count
- manager feedback if visible
- next client action

### GET /api/client/status

Purpose: lightweight status endpoint for client portal dashboard/session.

Reads:

- case by token/session/public reference
- `loan_applications.status`
- latest audit/status events

Response:

- `status`
- `case_id`
- `stage`
- `message`
- `updated_at`

### POST /api/documents/upload

Purpose: upload client documents and attach them to a case.

Input:

- file
- `case_id` or public case reference
- document type
- bank name if bank statement
- optional checklist item id

Writes:

- file storage object outside Neon
- `document_metadata`
- possibly `pdf_jobs`
- `audit_logs`

Response:

- `document_id`
- upload status
- extraction queued flag
- matched checklist item

Notes:

- Endpoint may already exist for admin documents; public use needs scoped auth/token.
- Neon should store metadata only, not raw file bytes.

### GET /api/client/missing-documents

Purpose: show client what is still missing.

Reads:

- `missing_documents`
- `bank_checklists`
- `document_metadata`

Response:

- required item list
- bank/lender association
- severity
- upload hints
- resolved/missing state

### GET /api/client/risk-summary

Purpose: show a safe, simplified risk/feedback summary.

Reads:

- latest visible `risk_assessments`
- `loan_applications`
- selected `lender_routes`
- manager-approved notes if public

Response:

- risk level
- broad score band, not necessarily raw score
- top missing items
- lender readiness summary
- next recommended action

Notes:

- Do not expose internal model prompts or hidden risk factors.
- Admin must control what becomes client-visible.

## Required Admin Endpoints

### GET /api/admin/cases

Purpose: admin case queue.

Reads:

- `loan_applications`
- applicant summary
- `missing_documents`
- latest `risk_assessments`
- latest `admin_notes`

Response:

- case list
- filters: status, assigned manager, risk level, created date
- counts for documents/missing items

### GET /api/admin/cases/:id

Purpose: full admin case detail.

Reads:

- `loan_applications`
- all applicant tables
- `bank_checklists`
- `missing_documents`
- `lender_routes`
- `risk_assessments`
- `admin_notes`

Response:

- full structured case
- admin-only fields
- AI/risk/lender summaries
- current workflow stage

### GET /api/admin/cases/:id/documents

Purpose: admin document registry for a case.

Reads:

- `document_metadata`
- `pdf_jobs`
- `pdf_extractions`
- `pdf_redactions`
- `pdf_exports`

Response:

- uploaded files
- bank/document type
- extraction status
- PDF job status
- missing checklist match

### GET /api/admin/cases/:id/risk

Purpose: full internal risk assessment view.

Reads:

- `risk_assessments`
- `applicant_income`
- `applicant_liabilities`
- `applicant_assets`
- `pdf_extractions`
- `lender_routes`

Response:

- raw score
- risk level
- factors
- evidence links
- recommended manual checks

### POST /api/admin/cases/:id/notes

Purpose: add admin/manager note.

Input:

- note type
- visibility: internal or client-visible
- body
- optional attachments

Writes:

- `admin_notes`
- `audit_logs`

Response:

- created note
- updated case timeline item

### POST /api/admin/cases/:id/run-analysis

Purpose: run internal AI/risk/PDF analysis for a case.

Actions:

- create analysis job
- read applicant data
- inspect uploaded documents
- run PDF extraction where needed
- calculate risk and missing items
- update lender routes

Writes:

- `risk_assessments`
- `missing_documents`
- `lender_routes`
- `pdf_jobs`
- `pdf_extractions`
- `audit_logs`

Response:

- analysis job id
- status
- generated risk summary
- missing documents
- lender path candidates

Notes:

- v0.1 can return mock/local analysis.
- v0.2 should persist analysis outputs to Neon.

### POST /api/admin/cases/:id/run-autoflow

Purpose: create an Autoflow task tied to a loan case.

Input:

- goal
- mode: `plan_only` or `execute_mock`
- domain: usually `pdf`, `workflow`, `agent`, `document`, or `general`
- approval required flag

Writes:

- `autoflow_tasks`
- `autoflow_executions`
- `autoflow_plans`
- `autoflow_approvals` when needed
- `audit_logs`

Response:

- execution id
- selected adapter
- plan steps
- warnings
- approval state

Notes:

- No real external provider execution in current phase.
- Use same policy as `/api/autoflow/tasks`.

## Required Data Coverage

### Personal Data

Source: client intake pages  
Target tables:

- `loan_applications`
- `applicant_personal_data`

Examples:

- name
- personal code/date of birth
- contact details
- address
- dependents
- consent flags

### Company Data

Source: company addon page  
Target tables:

- `applicant_company_data`

Examples:

- company name
- registry code
- VAT number
- industry
- revenue
- employees
- beneficial owners

### Income

Source: intake forms and bank statement extraction  
Target tables:

- `applicant_income`
- `pdf_extractions`

Examples:

- salary
- dividends
- business revenue
- rental income
- frequency and verification source

### Liabilities

Source: client input, bank statement extraction, manager review  
Target tables:

- `applicant_liabilities`

Examples:

- existing loans
- credit cards
- leases
- recurring payments
- monthly payment and outstanding balance

### Assets

Source: client input and document evidence  
Target tables:

- `applicant_assets`

Examples:

- real estate
- vehicles
- savings
- investments
- collateral eligibility

### Documents

Source: client upload and admin upload  
Target tables:

- `document_metadata`
- `pdf_jobs`
- `pdf_extractions`
- `pdf_exports`

Examples:

- bank statements
- annual reports
- balance sheets
- ID documents
- generated loan application PDF

### 6 Bank Checklist

Required banks:

- Swedbank
- SEB
- LHV
- Coop
- Luminor
- Citadele

Target tables:

- `bank_checklists`
- `missing_documents`
- `document_metadata`

Checklist should track:

- required statement period
- file received
- extraction done
- quality/confidence
- manager approval

### AI Analysis

Target tables:

- `risk_assessments`
- `autoflow_tasks`
- `autoflow_executions`
- `autoflow_plans`
- `pdf_extractions`

Output:

- summary
- factors
- evidence
- next actions
- warnings

### Risk Score

Target table:

- `risk_assessments`

Should include:

- score
- risk level
- affordability indicators
- missing data flags
- manual review flag

### Lender Paths

Target table:

- `lender_routes`

Should include:

- lender name
- fit score
- max amount
- requirements
- recommended flag
- rationale

### Admin Notes

Target table:

- `admin_notes`

Should include:

- note type
- visibility
- body
- author
- attachments

## Data Flow

### 1. Client starts intake

```text
aimoneyflow.netlify.app
  -> POST /api/intake/submit
  -> creates loan_applications + applicant data
  -> returns public case reference
```

### 2. Client uploads documents

```text
aimoneyflow.netlify.app
  -> POST /api/documents/upload
  -> stores file in storage backend
  -> writes document_metadata
  -> optionally queues pdf_jobs
```

### 3. Checklist and missing documents update

```text
Backend
  -> compares document_metadata against bank_checklists
  -> writes missing_documents
  -> client sees GET /api/client/missing-documents
```

### 4. Admin reviews case

```text
Annaator admin portal
  -> GET /api/admin/cases
  -> GET /api/admin/cases/:id
  -> GET /api/admin/cases/:id/documents
```

### 5. Admin runs analysis

```text
Annaator admin portal
  -> POST /api/admin/cases/:id/run-analysis
  -> backend reads applicant data + documents
  -> PDF Orkester extracts bank data
  -> writes risk_assessments + lender_routes + missing_documents
```

### 6. Admin runs Autoflow

```text
Annaator admin portal
  -> POST /api/admin/cases/:id/run-autoflow
  -> backend creates Autoflow task/execution/plan
  -> returns plan_only or execute_mock result
```

### 7. Client sees safe status

```text
aimoneyflow.netlify.app
  -> GET /api/client/status
  -> GET /api/client/risk-summary
  -> shows only manager-approved/safe summary
```

## API Boundary Rules

- Client endpoints must be scoped by public case token, session, or signed link.
- Admin endpoints require admin/operator auth.
- Client never sees raw internal notes unless `visibility = client`.
- Client never sees full AI prompt, provider debug logs, or hidden risk factors.
- Document upload must validate file type, size, case ownership, and malware/PII policy where applicable.
- All endpoints must return JSON errors, not plain text.
- Long-running analysis should return job id/status instead of blocking.

## Shared Neon Tables

Use the schema plan in:

- `docs/NEON_ATOM_AUTOFLOW_SCHEMA_PLAN.md`

Most relevant tables for this integration:

- `loan_applications`
- `applicant_personal_data`
- `applicant_company_data`
- `applicant_income`
- `applicant_liabilities`
- `applicant_assets`
- `bank_checklists`
- `document_metadata`
- `missing_documents`
- `risk_assessments`
- `lender_routes`
- `admin_notes`
- `autoflow_tasks`
- `autoflow_executions`
- `autoflow_plans`
- `pdf_jobs`
- `pdf_extractions`
- `pdf_exports`
- `audit_logs`

## v0.1 Implementation Plan

Keep v0.1 intentionally narrow:

1. Client can submit intake.
2. Client can upload documents.
3. Admin can list cases.
4. Admin can open one case.
5. Admin can run mock analysis.
6. Admin can run Autoflow `plan_only`.
7. Client can see status and missing documents.

v0.1 can still use local JSON/fallback for some analysis outputs while API contracts settle.

## v0.2 Neon Persistence Plan

Move to durable Neon persistence in this order:

1. `loan_applications`
2. applicant personal/company/income/liability/asset tables
3. `document_metadata`
4. `bank_checklists` and `missing_documents`
5. `admin_notes`
6. `risk_assessments`
7. `lender_routes`
8. `autoflow_tasks`, `autoflow_executions`, `autoflow_plans`
9. `pdf_jobs`, `pdf_extractions`, `pdf_exports`
10. `audit_logs` as append-only cross-cutting layer

## Next Backend Tasks

1. Define Pydantic request/response models for client intake:
   - `IntakeSubmitRequest`
   - `ClientCaseResponse`
   - `MissingDocumentsResponse`
   - `ClientRiskSummaryResponse`

2. Define Pydantic request/response models for admin cases:
   - `AdminCaseListResponse`
   - `AdminCaseDetailResponse`
   - `AdminCaseDocumentsResponse`
   - `AdminCaseRiskResponse`
   - `AdminNoteCreateRequest`

3. Add route stubs returning stable JSON:
   - `POST /api/intake/submit`
   - `GET /api/client/case/:id`
   - `GET /api/client/status`
   - `GET /api/client/missing-documents`
   - `GET /api/client/risk-summary`
   - `GET /api/admin/cases`
   - `GET /api/admin/cases/:id`
   - `GET /api/admin/cases/:id/documents`
   - `GET /api/admin/cases/:id/risk`
   - `POST /api/admin/cases/:id/notes`
   - `POST /api/admin/cases/:id/run-analysis`
   - `POST /api/admin/cases/:id/run-autoflow`

4. Add a case service layer:
   - create/update case
   - attach documents
   - calculate missing documents
   - load admin case detail
   - append notes

5. Add bank checklist generator for six banks:
   - Swedbank
   - SEB
   - LHV
   - Coop
   - Luminor
   - Citadele

6. Add document upload adapter:
   - validate case access
   - write `document_metadata`
   - queue PDF extraction when relevant

7. Add analysis adapter:
   - mock v0.1 risk summary
   - later real PDF extraction + risk scoring

8. Add Autoflow bridge:
   - maps admin case to `POST /api/autoflow/tasks`
   - stores execution relation to case in v0.2

9. Add JSON error standard:
   - `{ "success": false, "error": "...", "details": ... }`

10. Add smoke tests:
    - intake submit
    - document upload fallback
    - admin case list/detail
    - run-analysis mock
    - run-autoflow plan_only

## Open Questions

- How should aimoneyflow authenticate returning clients: email magic link, signed case token, or full account login?
- Should personal code and sensitive applicant fields be encrypted before persistence?
- Should client risk summary be hidden until manager approval?
- Should document uploads go through the same endpoint for client and admin, or separate scoped endpoints?
- Which storage backend will hold original PDFs in v0.2?
- Should six-bank checklist requirements be fixed rules or admin-editable templates?
