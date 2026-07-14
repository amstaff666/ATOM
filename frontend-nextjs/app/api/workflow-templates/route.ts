export const dynamic = "force-dynamic";
const templates = [
  {
    id: "tpl-pdf-editor-orchestrator",
    name: "PDF Editor LLM Orchestrator",
    description: "LLM planeerib PDF töö, valib PDF skillid ja ootab halduri kinnitust.",
    category: "pdf",
    skills: ["pdf-ocr", "pdf-editor", "pdf-redaction", "llm-orchestrator"],
    services: ["ollama", "openclaw", "pdf-orchestrator", "atom-tools"]
  },
  {
    id: "tpl-bank-statement-flow",
    name: "Bank Statement Reader Flow",
    description: "Loeb pangaväljavõtte PDF-ist, teeb OCR/parseri ja riskikontrolli.",
    category: "finance",
    skills: ["pdf-ocr", "bank-statement-reader", "llm-orchestrator"],
    services: ["ollama", "pdf-orchestrator"]
  }
];
export async function GET() {
  return Response.json({
    ok: true,
    templates,
    items: templates,
    data: templates
  });
}
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  return Response.json({
    ok: true,
    status: "mock_completed",
    received: body,
    templates
  });
}
