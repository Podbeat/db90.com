import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const collectionId = searchParams.get("collectionId");
  const rarete = searchParams.get("rarete");
  const personnage = searchParams.get("personnage");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "40", 10)));

  const where = {
    AND: [
      collectionId && collectionId !== "all" ? { collectionId } : {},
      rarete && rarete !== "all" ? { rarete } : {},
      personnage && personnage !== "all" ? { personnage } : {},
      q
        ? {
            OR: [
              { personnage: { contains: q, mode: "insensitive" } },
              { numero: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      include: { collection: { select: { nom: true } } },
      orderBy: [{ collectionId: "asc" }, { numero: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.card.count({ where }),
  ]);

  return NextResponse.json({ cards, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await request.json();
  if (!body.personnage || !body.numero || !body.collectionId) {
    return NextResponse.json({ error: "Référence, personnage et collection sont obligatoires." }, { status: 400 });
  }

  const card = await prisma.card.create({
    data: {
      numero: body.numero,
      personnage: body.personnage,
      rarete: body.rarete || "Commune",
      description: body.description || null,
      image: body.image || null,
      imageHD: body.imageHD || body.image || null,
      collectionId: body.collectionId,
    },
  });
  return NextResponse.json(card, { status: 201 });
}
