import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const collections = await prisma.collection.findMany({
    orderBy: { annee: "asc" },
    include: { _count: { select: { cards: true } } },
  });
  return NextResponse.json(collections);
}

export async function POST(request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await request.json();
  if (!body.nom) {
    return NextResponse.json({ error: "Le nom de la collection est obligatoire." }, { status: 400 });
  }

  const collection = await prisma.collection.create({
    data: {
      nom: body.nom,
      annee: body.annee || null,
      editeur: body.editeur || null,
      pays: body.pays || null,
      total: body.total ? parseInt(body.total, 10) : null,
      cover: body.cover || null,
      dos: body.dos || null,
      dosHD: body.dosHD || body.dos || null,
    },
  });
  return NextResponse.json(collection, { status: 201 });
}
