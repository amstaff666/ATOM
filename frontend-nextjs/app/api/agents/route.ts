export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    agents: [
      { id: "annator", name: "Annaator", status: "online", role: "orchestrator" },
      { id: "pdf-agent", name: "PDF Agent", status: "ready", role: "pdf_tools" },
      { id: "llm-router", name: "LLM Router", status: "ready", role: "planning" }
    ]
  });
}
