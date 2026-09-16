import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const characters = await prisma.character.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { primaryCards: true, secondaryCards: true } },
      },
    });
    return NextResponse.json(characters);
  } catch (e) {
    console.error("Erreur GET /api/admin/characters :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { name } = await request.json();
    const trimmed = (name || "").trim();
    if (!trimmed) return NextResponse.json({ error: "Nom manquant." }, { status: 400 });

    const existing = await prisma.character.findFirst({ where: { name: { equals: trimmed, mode: "insensitive" } } });
    if (existing) return NextResponse.json({ error: "Ce personnage existe déjà." }, { status: 409 });

    const character = await prisma.character.create({ data: { name: trimmed } });
    return NextResponse.json(character, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/admin/characters :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
