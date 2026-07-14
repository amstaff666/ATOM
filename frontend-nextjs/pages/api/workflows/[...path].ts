import type { NextApiRequest, NextApiResponse } from "next";
import { getServerApiBaseUrl } from "@/lib/get-api-base-url";

const backendUrl = getServerApiBaseUrl();

function fallbackFor(path: string, status = 200, error?: string) {
  if (path === "executions") {
    return {
      status: 200,
      body: {
        success: true,
        executions: [],
        source: "fallback",
        ...(error ? { warning: error } : {}),
      },
    };
  }

  if (path === "services") {
    return {
      status: 200,
      body: {
        success: true,
        services: {},
        source: "fallback",
        ...(error ? { warning: error } : {}),
      },
    };
  }

  if (path === "definitions" || path === "") {
    return {
      status: 200,
      body: {
        success: true,
        workflows: [],
        source: "fallback",
        ...(error ? { warning: error } : {}),
      },
    };
  }

  return {
    status: status >= 400 ? status : 503,
    body: {
      success: false,
      error: error || "Workflow service unavailable",
      source: "fallback",
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [];
  const path = pathSegments.join("/");
  const targetUrl = new URL(`/api/v1/workflow-ui/${path}`, backendUrl);

  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path" || value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => targetUrl.searchParams.append(key, item));
    } else {
      targetUrl.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body:
        req.method && ["POST", "PUT", "PATCH"].includes(req.method)
          ? JSON.stringify(req.body || {})
          : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    const text = await response.text().catch(() => "");
    const fallback = fallbackFor(path, response.ok ? 200 : response.status, text || `HTTP ${response.status}`);
    return res.status(fallback.status).json(fallback.body);
  } catch (error) {
    const fallback = fallbackFor(
      path,
      200,
      error instanceof Error ? error.message : "Workflow service unavailable",
    );
    return res.status(fallback.status).json(fallback.body);
  }
}
