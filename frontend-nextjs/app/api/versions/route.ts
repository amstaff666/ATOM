export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    versions: [
      { id: "dev-shim", name: "Dev Shim", active: true },
      { id: "annator-local", name: "Annator Local", active: false }
    ]
  });
}
