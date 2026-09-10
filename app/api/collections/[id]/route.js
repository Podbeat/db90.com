import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateCollectionDescription } from "@/lib/translate";

export async function GET(request, { params }) {
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { cards: { orderBy: { numero: "asc" } } },
  });
  if (!collection) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(collection);
}

export async function PUT(request, { params }) {
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
}

export async function DELETE(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  await prisma.collection.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
