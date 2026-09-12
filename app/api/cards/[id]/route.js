import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateFreeText } from "@/lib/translate";
import { cleanupCardFiles } from "@/lib/cardFileCleanup";

export async function GET(request, { params }) {
  try {
    const card = await prisma.card.findUnique({
      where: { id: params.id },
      include: { collection: true },
    });
    if (!card) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    return NextResponse.json(card);
  } catch (e) {
    console.error("Erreur GET /api/cards/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const body = await request.json();

    // On ne retraduit que si la description a réellement changé.
    const existing = await prisma.card.findUnique({ where: { id: params.id }, select: { description: true } });
    const descriptionChanged = (body.description || null) !== (existing?.description || null);
    const translations = descriptionChanged ? await translateFreeText(body.description) : null;

    const card = await prisma.card.update({
      where: { id: params.id },
      data: {
        numero: body.numero,
        personnage: body.personnage,
        rarete: body.rarete || "Commune",
        description: body.description || null,
        image: body.image || undefined,
        imageHD: body.imageHD || body.image || undefined,
        dos: body.dos !== undefined ? body.dos || null : undefined,
        dosHD: body.dosHD || body.dos || undefined,
        contributeur: body.contributeur || null,
        collectionId: body.collectionId,
        ...(descriptionChanged
          ? {
              descriptionEn: translations.en,
              descriptionZhTW: translations.zhTW,
              descriptionZhCN: translations.zhCN,
            }
          : {}),
      },
    });
    return NextResponse.json(card);
  } catch (e) {
    console.error("Erreur PUT /api/cards/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const deleted = await prisma.card.delete({ where: { id: params.id } });
    await cleanupCardFiles([deleted]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/cards/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
