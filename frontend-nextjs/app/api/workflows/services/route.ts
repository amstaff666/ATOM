import { services } from "../data";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ ok: true, services, items: services, data: services });
}
