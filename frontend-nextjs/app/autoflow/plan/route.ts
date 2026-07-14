export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const prompt = body?.prompt || body?.task || body?.message || "PDF editor orchestration plan";
  return Response.json({
    ok: true,
    execution_id: "annator-plan-" + Date.now(),
    mode: "plan_only",
    prompt,
    providers: ["mock-llm", "pdf-orchestrator", "atom-tools"],
    steps: [
      {
        id: "intake",
        title: "Sisendi analüüs",
        provider: "mock-llm",
        status: "planned",
        description: "Loen kasutaja käsu ja määran PDF töö eesmärgi."
      },
      {
        id: "pdf_pipeline",
        title: "PDF orkestreerimine",
        provider: "pdf-orchestrator",
        status: "planned",
        description: "Valin tööriistad: OCR, väljade lugemine, redigeerimine, annotatsioon, redaktsioon, eksport."
      },
      {
        id: "validation",
        title: "Kontroll ja risk",
        provider: "atom-tools",
        status: "planned",
        description: "Kontrollin, kas tegevus vajab halduri kinnitust."
      },
      {
        id: "approval_gate",
        title: "Halduri kinnituse värav",
        provider: "atom-tools",
        status: "waiting_approval",
        description: "Midagi päriselt ei käivitata enne kinnitust."
      }
    ],
    risks: [
      "Dev-shim režiim: päris väliseid providereid ei kutsuta.",
      "PDF execution peab järgmises sammus ühenduma päris PDF tööriistadega."
    ],
    next_action: "approve_or_edit_plan"
  });
}
export async function GET() {
  return Response.json({
    ok: true,
    message: "Autoflow plan endpoint ready. Use POST with { prompt }."
  });
}
