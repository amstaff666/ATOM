# Hugging Face Backend Runtime Plan

## Purpose

Hugging Face Space is the production backend/runtime layer for Annator / ATOM.
It is not the frontend host. Netlify serves the frontend, while Hugging Face
owns API runtime, AI orchestration, PDF work, background jobs, Autoflow
adapters and controlled access to Neon PostgreSQL.

## Runtime Role

The HF backend should run a Python FastAPI service responsible for:

- FastAPI backend endpoints used by the frontend and admin/operator UI.
- AI orchestration and controlled execution planning.
- PDF processing pipelines such as OCR, templates, redaction, merge/split,
  signing and loan pack generation.
- Background jobs for long-running document and agent tasks.
- Autoflow adapters, including PDF Orchestrator and ATOM Tools planning.
- Neon PostgreSQL access through backend-only service code.
- Stable JSON API responses for frontend and client portals.

The frontend must never connect directly to Neon or provider APIs. All client
and operator actions should flow through the HF backend API.

## Required Environment

Set these values as Hugging Face Space environment variables or secrets:

- `DATABASE_URL`
  - Neon PostgreSQL connection string.
  - Must be stored as a HF secret, never committed to the repo.
- `ENVIRONMENT=production`
- `HOST=0.0.0.0`
- `PORT=7860`
  - Hugging Face Spaces commonly expose the app on port `7860`.
- `CORS_ORIGINS`
  - Comma-separated allowlist for production frontend origins.
  - Include the Netlify production URL and any approved preview/admin URLs.
- Provider API keys
  - OpenAI, Gemini, Anthropic, Hugging Face tokens, OCR providers or other
    runtime keys must be HF secrets only.
  - Do not store provider keys in `.env`, source files, Dockerfile, docs or
    frontend code.

Recommended operational env values:

- `LOG_LEVEL=info`
- `ENABLE_AUTOFLOW=true`
- `ENABLE_PDF_RUNTIME=true`
- `ENABLE_BACKGROUND_JOBS=true`

## Required API Surface

The HF backend should expose these stable endpoints:

- `GET /health`
- `GET /healthz`
- `GET /api/documents`
- `GET /api/agents/`
- `GET /api/workflows/executions`
- `GET /api/autoflow/health`
- `GET /api/autoflow/providers`
- `POST /api/autoflow/tasks`

API requirements:

- Return JSON for success and error cases.
- Do not return plain text `Internal Server Error` to frontend callers.
- Include safe fallback responses when optional services are unavailable.
- Keep secrets and internal stack traces out of public responses.
- Use backend-controlled auth/approval gates for dangerous or costly actions.

## Docker Approach

Use a Python FastAPI container for the HF Space.

Target runtime command:

```bash
uvicorn main_api_app:app --host 0.0.0.0 --port 7860
```

The final Dockerfile should:

- Install Python dependencies from the backend requirements file.
- Start the FastAPI app with uvicorn.
- Expose port `7860`.
- Include only backend/runtime requirements needed for API, Autoflow,
  AI orchestration and PDF processing.
- Avoid frontend-only build steps.
- Avoid embedding secrets or local `.env` files.

Do not overwrite the current Dockerfile until the backend entrypoint and
dependency list are confirmed.

## Current Risks

- The current `hf-space` Dockerfile may be frontend-only or not aligned with
  the FastAPI backend runtime.
- Backend dependency files may be incomplete for production HF startup.
- Secrets must not be committed or copied into images.
- CORS must explicitly allow Netlify production and approved preview origins.
- PDF file storage needs a clear production strategy.
- Long-running OCR/PDF/AI jobs may exceed request timeouts without a worker or
  queue model.
- Frontend routes must not assume localhost API URLs in production.

## File Storage

Before enabling real PDF processing, choose a production storage pattern:

- HF ephemeral storage only for temporary processing.
- Durable object storage for uploaded and generated PDFs.
- Database records in Neon for metadata, job status, audit logs and ownership.

Never store sensitive client documents in frontend-accessible public paths.

## Future Runtime Work

Planned backend/runtime extensions:

- Queue worker for long-running Autoflow and agent jobs.
- Dedicated PDF worker for rendering, merging, OCR, redaction and signing.
- OCR dependencies such as Tesseract, Poppler or provider-specific SDKs.
- ComfyUI or external image/video workers for media generation workloads.
- Job status polling and audit trail endpoints.
- Approval-gated execution for high-risk actions.
- Structured Neon tables for documents, jobs, agents, approvals and events.

## Safe Next Steps

1. Confirm the actual backend entrypoint for production.
2. Audit backend requirements and identify missing FastAPI/PDF/OCR packages.
3. Smoke test the local backend endpoints before touching HF deploy config.
4. Draft a backend-only Dockerfile separately for review.
5. Add HF secrets manually in the HF Space settings.
6. Configure CORS for the Netlify production URL.
7. Deploy only after local backend smoke tests pass.
