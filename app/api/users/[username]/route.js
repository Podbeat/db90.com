import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";

// Page profil publique (voir /u/[username]) : tout ce qui est renvoyé ici est visible par
// n'importe quel visiteur, connecté ou non — jamais l'e-mail ni aucune donnée privée.
export async function GET(request, { params }) {
  try {
    const { username } = await params;
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true, avatar: true, bio: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    const entries = await prisma.userCard.findMany({
      where: { userId: user.id },
      include: { card: { include: { collection: { select: { id: true, nom: true } } } } },
    });

    const owned = entries.filter((e) => e.status === "owned").map((e) => e.card).sort(naturalSortByNumero);
    const wanted = entries.filter((e) => e.status === "wanted").map((e) => e.card).sort(naturalSortByNumero);

    return NextResponse.json({
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      memberSince: user.createdAt,
      owned,
      wanted,
    });
  } catch (e) {
    console.error("Erreur GET /api/users/[username] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
