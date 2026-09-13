import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Fil d'activité public de la page d'accueil : derniers scans validés, collections
// complétées et nouvelles mises en vente — donne une impression de site vivant.
export async function GET() {
  try {
    const events = await prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        user: { select: { username: true, avatar: true } },
        card: { select: { id: true, personnagePrincipal: { select: { name: true } } } },
        collection: { select: { id: true, nom: true } },
      },
    });
    // On ignore silencieusement un événement dont l'utilisateur/la carte/la collection a
    // depuis été supprimé(e) (relations optionnelles avec onDelete: SetNull).
    return NextResponse.json(events.filter((e) => e.user));
  } catch (e) {
    console.error("Erreur GET /api/activity :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
