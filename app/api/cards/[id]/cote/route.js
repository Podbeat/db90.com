import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeCoteNeuve, coteByCondition } from "@/lib/cote";

// Côte de référence d'une carte (calculée à partir des annonces en Très bon état/Neuve
// uniquement) déclinée pour chaque état, plus l'historique de son évolution — sert à la
// fois à l'affichage de la grille de référence et au graphique sur la fiche carte.
export async function GET(request, { params }) {
  try {
    const { id: cardId } = await params;

    const [listings, history] = await Promise.all([
      prisma.cardListing.findMany({
        where: { cardId, type: "seller", condition: { in: ["Neuve", "Très bon état"] }, price: { not: null } },
        select: { condition: true, price: true },
      }),
      prisma.priceHistory.findMany({
        where: { cardId },
        orderBy: { createdAt: "asc" },
        select: { cote: true, sampleSize: true, createdAt: true },
      }),
    ]);

    const result = computeCoteNeuve(listings);

    return NextResponse.json({
      coteNeuve: result?.coteNeuve ?? null,
      sampleSize: result?.sampleSize ?? 0,
      byCondition: coteByCondition(result?.coteNeuve ?? null),
      history,
    });
  } catch (e) {
    console.error("Erreur GET /api/cards/[id]/cote :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
