FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ca-certificates \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

# Install frontend dependencies from the real application directory.
# The repository currently contains an empty package-lock.json, so npm ci
# cannot be used until the lockfile is regenerated.
COPY frontend-nextjs/package.json ./frontend-nextjs/package.json
RUN cd frontend-nextjs \
    && npm pkg delete dependencies.@next/swc-win32-x64-msvc \
    && npm install --legacy-peer-deps --ignore-scripts

# prebuild calls ../scripts/pre_dev.py, so scripts must exist before build.
COPY scripts ./scripts
COPY frontend-nextjs ./frontend-nextjs

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true
RUN cd frontend-nextjs && npm run build


FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv gcc g++ libpq-dev ca-certificates \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=7860
ENV BACKEND_URL=http://127.0.0.1:4490
ENV API_BASE_URL=http://127.0.0.1:4490
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_BREAK_SYSTEM_PACKAGES=1

# Full production backend (main_api_app.py) instead of the dev stub.
COPY backend ./backend
RUN pip3 install --no-cache-dir --upgrade pip \
    && pip3 install --no-cache-dir -r backend/requirements.txt

# Next.js standalone output keeps runtime dependencies small.
COPY --from=frontend-builder /workspace/frontend-nextjs/.next/standalone ./
COPY --from=frontend-builder /workspace/frontend-nextjs/.next/static ./.next/static
COPY --from=frontend-builder /workspace/frontend-nextjs/public ./public

EXPOSE 7860

# Hugging Face exposes one public port. Keep FastAPI internal on 4490 and
# the Next.js frontend public on 7860.
CMD ["sh", "-c", "cd backend && uvicorn main_api_app:app --host 127.0.0.1 --port 4490 & cd /app && exec node server.js"]
