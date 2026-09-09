import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
