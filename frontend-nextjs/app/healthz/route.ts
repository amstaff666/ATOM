export const dynamic = "force-dynamic";

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  process.env.PYTHON_BACKEND_URL ||
  "http://127.0.0.1:4490";

// Real proxy to the FastAPI backend's /healthz endpoint.
// This MUST report the actual backend status, not a hardcoded/mocked value.
export async function GET() {
  try {
    const res = await fetch(`${backendUrl}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        status: "unhealthy",
        service: "annator-backend",
        error: err instanceof Error ? err.message : "Backend unreachable",
      },
      { status: 503 }
    );
  }
}
