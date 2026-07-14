export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    tables: [
      { id: "documents", name: "Documents", rows: 0 },
      { id: "workflows", name: "Workflows", rows: 2 },
      { id: "executions", name: "Executions", rows: 1 }
    ]
  });
}
