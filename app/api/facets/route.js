import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Renvoie les valeurs distinctes utilisées pour peupler les filtres du catalogue
// (personnages, variantes/raretés, pays d'origine), sans avoir à charger toutes les cartes côté client.
export async function GET() {
  try {
    const [personnages, raretes, collections] = await Promise.all([
      prisma.card.findMany({ distinct: ["personnage"], select: { personnage: true }, orderBy: { personnage: "asc" } }),
      prisma.card.findMany({ distinct: ["rarete"], select: { rarete: true }, orderBy: { rarete: "asc" } }),
      prisma.collection.findMany({ select: { pays: true }, orderBy: { pays: "asc" } }),
    ]);

    const paysSet = Array.from(new Set(collections.map((c) => c.pays).filter(Boolean))).sort();

    return NextResponse.json({
      personnages: personnages.map((p) => p.personnage).filter(Boolean),
      raretes: raretes.map((r) => r.rarete).filter(Boolean),
      pays: paysSet,
    });
  } catch (e) {
    console.error("Erreur GET /api/facets :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
