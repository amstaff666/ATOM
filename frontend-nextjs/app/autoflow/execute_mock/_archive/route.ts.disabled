export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  return Response.json({
    ok: true,
    execution_id: "annator-exec-" + Date.now(),
    status: "mock_completed",
    mode: "execute_mock",
    received: body,
    message: "Mock execution completed. No external provider was called."
  });
}
export async function GET() {
  return Response.json({
    ok: true,
    message: "Autoflow execute_mock endpoint ready."
  });
}
