import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateCollectionDescription } from "@/lib/translate";
import { naturalSortByNumero } from "@/lib/naturalSort";

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { annee: "asc" },
      include: {
        _count: { select: { cards: true } },
        cards: { select: { numero: true, image: true } },
      },
    });

    // Vignette = image de la première carte de la série (triée naturellement, en ignorant
    // celles sans scan), à défaut le visuel de couverture éventuellement défini à la main.
    // withImagesCount sert au calcul de complétude : une carte cataloguée sans scan (avis
    // de recherche) ne doit pas compter comme "archivée" tant qu'il lui manque son visuel.
    const withPreview = collections.map((col) => {
      const sorted = [...col.cards].sort(naturalSortByNumero);
      const firstWithImage = sorted.find((c) => c.image);
      const withImagesCount = col.cards.filter((c) => c.image).length;
      const { cards, ...rest } = col;
      return { ...rest, previewImage: firstWithImage?.image || col.cover || null, withImagesCount };
    });

    return NextResponse.json(withPreview);
  } catch (e) {
    console.error("Erreur GET /api/collections :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const body = await request.json();
    if (!body.nom) {
      return NextResponse.json({ error: "Le nom de la collection est obligatoire." }, { status: 400 });
    }

    const translations = await translateCollectionDescription(body.description);

    const collection = await prisma.collection.create({
      data: {
        nom: body.nom,
        annee: body.annee || null,
        editeur: body.editeur || null,
        pays: body.pays || null,
        total: body.total ? parseInt(body.total, 10) : null,
        cover: body.cover || null,
        dos: body.dos || null,
        dosHD: body.dosHD || null,
        description: body.description || null,
        descriptionEn: translations.en,
        descriptionZhTW: translations.zhTW,
        descriptionZhCN: translations.zhCN,
      },
    });
    return NextResponse.json(collection, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/collections :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
