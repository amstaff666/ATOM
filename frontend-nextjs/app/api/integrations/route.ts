export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    integrations: [
      { id: "ollama", name: "Ollama", status: "available" },
      { id: "openclaw", name: "OpenClaw", status: "available" },
      { id: "pdf-tools", name: "PDF Tools", status: "connected" }
    ]
  });
}
