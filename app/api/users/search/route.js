import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Recherche de membres par pseudo, pour la zone de recherche de l'en-tête. Publique (pas
// besoin d'être connecté pour trouver un profil), résultats limités et légers.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) return NextResponse.json([]);

    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: "insensitive" } },
      select: { username: true, avatar: true },
      take: 8,
      orderBy: { username: "asc" },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("Erreur GET /api/users/search :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
