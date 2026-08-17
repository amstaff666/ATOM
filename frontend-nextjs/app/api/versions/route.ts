export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    versions: [
      { id: "annator-local", name: "Annator Local", active: true }
    ]
  });
}
