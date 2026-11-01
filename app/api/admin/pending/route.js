import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPendingCounts } from "@/lib/adminOverview";

// Compteurs « à traiter » du menu de l'administration. Jamais mis en cache.
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    return NextResponse.json(await getPendingCounts(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Erreur GET /api/admin/pending :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
