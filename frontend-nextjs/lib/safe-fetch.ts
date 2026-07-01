export type SafeJsonResult<T> = {
  ok: boolean;
  data: T;
  error?: string;
  status?: number;
};

export async function safeJson<T>(
  input: RequestInfo | URL,
  fallback: T,
  init?: RequestInit,
): Promise<SafeJsonResult<T>> {
  try {
    const response = await fetch(input, init);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        data: fallback,
        error: text || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        data: fallback,
        error: text || "Non-JSON response",
        status: response.status,
      };
    }

    return {
      ok: true,
      data: await response.json(),
      status: response.status,
    };
  } catch (error: any) {
    return {
      ok: false,
      data: fallback,
      error: error?.message || String(error),
    };
  }
}
