/**
 * Resolve API base URL.
 * Browser: same-origin (Next.js rewrites proxy to Python backend — no CORS).
 * Server: direct backend URL for SSR/API routes.
 */
export function getApiBaseUrl(): string {
  const serverUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    process.env.PYTHON_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://127.0.0.1:4490";

  if (typeof window !== "undefined") {
    return "";
  }

  return serverUrl.replace(/\/$/, "");
}