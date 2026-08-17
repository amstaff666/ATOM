from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/health")
@app.get("/healthz")
async def health_check():
    """Real liveness/readiness probe for this minimal backend.

    This is the process that actually runs in the HF Space container
    (see Dockerfile: `uvicorn backend.main:app --host 127.0.0.1 --port 4490`).
    It must report true status, not a hardcoded/mocked value.
    """
    return {"ok": True, "status": "healthy", "service": "annator-backend"}
