import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Résumé "par collection" des cartes possédées/recherchées de l'utilisateur connecté —
// une ligne par collection avec une fraction (ex. 22/25), plutôt que la liste exhaustive de
// chaque carte : reste lisible même avec plusieurs centaines de cartes suivies.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const entries = await prisma.userCard.findMany({
      where: { userId: session.sub },
      select: { status: true, card: { select: { collectionId: true } } },
    });

    const collectionIds = [...new Set(entries.map((e) => e.card.collectionId))];
    const collections = collectionIds.length
      ? await prisma.collection.findMany({
          where: { id: { in: collectionIds } },
          select: { id: true, nom: true, total: true, cover: true, _count: { select: { cards: true } } },
        })
      : [];
    const collectionById = new Map(collections.map((c) => [c.id, c]));

    function summarize(status) {
      const counts = new Map();
      for (const e of entries) {
        if (e.status !== status) continue;
        const cId = e.card.collectionId;
        counts.set(cId, (counts.get(cId) || 0) + 1);
      }
      return [...counts.entries()]
        .map(([collectionId, count]) => {
          const col = collectionById.get(collectionId);
          return {
            collectionId,
            nom: col?.nom || "",
            cover: col?.cover || null,
            count,
            total: col?.total || null,
            catalogued: col?._count.cards || count,
          };
        })
        .sort((a, b) => a.nom.localeCompare(b.nom));
    }

    return NextResponse.json({ owned: summarize("owned"), wanted: summarize("wanted") });
  } catch (e) {
    console.error("Erreur GET /api/users/me/collections-summary :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
