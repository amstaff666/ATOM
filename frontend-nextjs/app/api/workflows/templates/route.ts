import { templates } from "../data";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ ok: true, templates, items: templates, data: templates });
}
