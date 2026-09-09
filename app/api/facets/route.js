import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Renvoie les valeurs distinctes utilisées pour peupler les filtres du catalogue
// (personnages et variantes/raretés), sans avoir à charger toutes les cartes côté client.
export async function GET() {
  const [personnages, raretes] = await Promise.all([
    prisma.card.findMany({ distinct: ["personnage"], select: { personnage: true }, orderBy: { personnage: "asc" } }),
    prisma.card.findMany({ distinct: ["rarete"], select: { rarete: true }, orderBy: { rarete: "asc" } }),
  ]);

  return NextResponse.json({
    personnages: personnages.map((p) => p.personnage).filter(Boolean),
    raretes: raretes.map((r) => r.rarete).filter(Boolean),
  });
}
