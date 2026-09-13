import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const { name } = await request.json();
    const trimmed = (name || "").trim();
    if (!trimmed) return NextResponse.json({ error: "Nom manquant." }, { status: 400 });

    const existing = await prisma.character.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" }, NOT: { id } },
    });
    if (existing) return NextResponse.json({ error: "Ce personnage existe déjà." }, { status: 409 });

    const character = await prisma.character.update({ where: { id }, data: { name: trimmed } });
    return NextResponse.json(character);
  } catch (e) {
    console.error("Erreur PUT /api/admin/characters/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// La suppression est autorisée même si le personnage est déjà utilisé sur des cartes : le
// principal repasse à "non défini" (SetNull), les liens secondaires disparaissent avec lui
// (cascade). L'admin voit le nombre de cartes concernées avant de confirmer (voir la page).
export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    await prisma.character.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/admin/characters/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
