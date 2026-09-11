import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateCollectionDescription } from "@/lib/translate";
import { naturalSortByNumero } from "@/lib/naturalSort";

export async function GET(request, { params }) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: { cards: true },
    });
    if (!collection) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    collection.cards.sort(naturalSortByNumero);
    return NextResponse.json(collection);
  } catch (e) {
    console.error("Erreur GET /api/collections/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const body = await request.json();

    // On ne relance la traduction que si le texte de présentation a réellement changé,
    // pour éviter un appel (et un coût) inutile à chaque modification d'un autre champ.
    const existing = await prisma.collection.findUnique({ where: { id: params.id }, select: { description: true } });
    const descriptionChanged = (body.description || null) !== (existing?.description || null);
    const translations = descriptionChanged
      ? await translateCollectionDescription(body.description)
      : null;

    const collection = await prisma.collection.update({
      where: { id: params.id },
      data: {
        nom: body.nom,
        annee: body.annee || null,
        editeur: body.editeur || null,
        pays: body.pays || null,
        total: body.total ? parseInt(body.total, 10) : null,
        cover: body.cover || null,
        dos: body.dos || undefined,
        dosHD: body.dosHD || body.dos || undefined,
        description: body.description || null,
        ...(descriptionChanged
          ? {
              descriptionEn: translations.en,
              descriptionZhTW: translations.zhTW,
              descriptionZhCN: translations.zhCN,
            }
          : {}),
      },
    });
    return NextResponse.json(collection);
  } catch (e) {
    console.error("Erreur PUT /api/collections/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    await prisma.collection.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/collections/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
