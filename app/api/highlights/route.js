import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";

export async function GET() {
  try {
    const [lastCard, lastCollection, totalCards] = await Promise.all([
      prisma.card.findFirst({
        orderBy: { createdAt: "desc" },
        include: { collection: { select: { nom: true } } },
      }),
      prisma.collection.findFirst({
        orderBy: { createdAt: "desc" },
        include: { cards: { select: { numero: true, image: true } } },
      }),
      prisma.card.count(),
    ]);

    let lastCollectionWithPreview = null;
    if (lastCollection) {
      const sorted = [...lastCollection.cards].sort(naturalSortByNumero);
      const { cards, ...rest } = lastCollection;
      lastCollectionWithPreview = { ...rest, previewImage: sorted[0]?.image || lastCollection.cover || null };
    }

    return NextResponse.json({ lastCard, lastCollection: lastCollectionWithPreview, totalCards });
  } catch (e) {
    console.error("Erreur GET /api/highlights :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
