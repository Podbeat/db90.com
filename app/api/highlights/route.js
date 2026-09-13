import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";

export async function GET() {
  try {
    const [lastCard, lastCollection] = await Promise.all([
      // On ne met en avant que des cartes avec un vrai scan : pas d'intérêt à afficher le
      // visuel "recherchée" en vitrine de la page d'accueil.
      prisma.card.findFirst({
        where: { image: { not: null } },
        orderBy: { createdAt: "desc" },
        include: { collection: { select: { nom: true } } },
      }),
      prisma.collection.findFirst({
        orderBy: { createdAt: "desc" },
        include: { cards: { select: { numero: true, image: true } } },
      }),
    ]);

    let lastCollectionWithPreview = null;
    if (lastCollection) {
      const sorted = [...lastCollection.cards].sort(naturalSortByNumero);
      const firstWithImage = sorted.find((c) => c.image);
      const { cards, ...rest } = lastCollection;
      lastCollectionWithPreview = { ...rest, previewImage: firstWithImage?.image || lastCollection.cover || null };
    }

    return NextResponse.json({ lastCard, lastCollection: lastCollectionWithPreview });
  } catch (e) {
    console.error("Erreur GET /api/highlights :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
