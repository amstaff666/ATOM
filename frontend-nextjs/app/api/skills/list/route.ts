export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    skills: [
      { id: "pdf-ocr", name: "PDF OCR", category: "pdf", status: "ready", actions: ["extract_text", "ocr_scan"] },
      { id: "pdf-editor", name: "PDF Editor", category: "pdf", status: "ready", actions: ["edit_text", "annotate", "merge", "split"] },
      { id: "pdf-redaction", name: "PDF Redaction", category: "pdf", status: "ready", actions: ["redact", "mask_sensitive"] },
      { id: "bank-statement-reader", name: "Bank Statement Reader", category: "finance", status: "ready", actions: ["parse_transactions", "detect_balance"] },
      { id: "llm-orchestrator", name: "LLM Orchestrator", category: "ai", status: "ready", actions: ["plan", "route", "approve"] }
    ]
  });
}
