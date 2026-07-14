const DEFAULT_BACKEND_URL = "http://127.0.0.1:4490";

export function getServerApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.PYTHON_API_SERVICE_BASE_URL ||
    process.env.PYTHON_BACKEND_URL ||
    process.env.BACKEND_URL ||
    DEFAULT_BACKEND_URL
  ).replace(/\/$/, "");
}

/**
 * Resolve API base URL.
 * Browser: same-origin (Next.js rewrites proxy to Python backend, avoiding CORS).
 * Server: direct backend URL for SSR/API routes.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }

  return getServerApiBaseUrl();
}
