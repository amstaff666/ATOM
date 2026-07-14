export const dynamic = "force-dynamic";
const providers = [
  { id: "mock-llm", name: "Mock LLM", status: "ready", mode: "plan_only", capabilities: ["planning", "reasoning"] },
  { id: "pdf-orchestrator", name: "PDF Orchestrator", status: "ready", mode: "plan_only", capabilities: ["pdf", "ocr", "redaction", "export"] },
  { id: "atom-tools", name: "ATOM Tools", status: "ready", mode: "plan_only", capabilities: ["workflow", "approval", "audit"] }
];
export async function GET() {
  return Response.json({
    ok: true,
    providers,
    count: providers.length
  });
}
