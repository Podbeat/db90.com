import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request, { params }) {
  const card = await prisma.card.findUnique({
    where: { id: params.id },
    include: { collection: true },
  });
  if (!card) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(card);
}

export async function PUT(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await request.json();
  const card = await prisma.card.update({
    where: { id: params.id },
    data: {
      numero: body.numero,
      personnage: body.personnage,
      rarete: body.rarete || "Commune",
      description: body.description || null,
      image: body.image || undefined,
      imageHD: body.imageHD || body.image || undefined,
      collectionId: body.collectionId,
    },
  });
  return NextResponse.json(card);
}

export async function DELETE(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  await prisma.card.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
