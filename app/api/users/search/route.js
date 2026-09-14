import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Recherche de membres par pseudo, utilisée pour la recherche de membres sur la page
// d'accueil. Publique (pas besoin d'être connecté pour trouver un profil). Sans texte
// saisi, renvoie une liste par défaut à parcourir (les membres les plus récents) — pratique
// pour quelqu'un qui arrive sur le site et ne connaît encore aucun pseudo précis.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: q ? { username: { contains: q, mode: "insensitive" } } : {},
      select: { username: true, avatar: true },
      take: 15,
      orderBy: q ? { username: "asc" } : { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("Erreur GET /api/users/search :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
