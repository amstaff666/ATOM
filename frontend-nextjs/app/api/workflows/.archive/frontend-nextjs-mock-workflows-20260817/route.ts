import { workflows } from "./data";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ ok: true, workflows, items: workflows, data: workflows });
}
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  return Response.json({
    ok: true,
    workflow: {
      id: "wf-created-" + Date.now(),
      status: "created_mock",
      ...body
    }
  });
}
