export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    executions: [
      {
        id: "exec-demo-001",
        workflow_id: "wf-pdf-editor-llm",
        status: "mock_ready",
        mode: "plan_only",
        started_at: new Date().toISOString()
      }
    ],
    items: []
  });
}
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  return Response.json({
    ok: true,
    execution_id: "exec-" + Date.now(),
    status: "mock_completed",
    received: body
  });
}
