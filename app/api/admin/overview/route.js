import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/adminOverview";

// Tableau de bord de l'administration (voir lib/adminOverview.js). Jamais mis en cache.
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const overview = await getAdminOverview();
    return NextResponse.json({ admin: { nom: session.nom || null }, ...overview }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Erreur GET /api/admin/overview :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
