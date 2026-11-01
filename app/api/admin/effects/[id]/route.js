import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { renameEverywhere } from "@/lib/effects";

// Renommer un effet : toutes les cartes qui l'utilisent suivent.
export async function PATCH(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const { name } = await request.json();
    const trimmed = (name || "").trim();
    if (!trimmed) return NextResponse.json({ error: "Nom manquant." }, { status: 400 });
    if (trimmed.length > 60) return NextResponse.json({ error: "Nom trop long (60 caractères au plus)." }, { status: 400 });

    const effect = await prisma.effect.findUnique({ where: { id } });
    if (!effect) return NextResponse.json({ error: "Effet introuvable." }, { status: 404 });
    const clash = await prisma.effect.findFirst({ where: { id: { not: id }, name: { equals: trimmed, mode: "insensitive" } } });
    if (clash) return NextResponse.json({ error: `« ${clash.name} » existe déjà : utilisez plutôt la fusion.` }, { status: 409 });

    await prisma.$transaction([prisma.effect.update({ where: { id }, data: { name: trimmed } }), ...renameEverywhere(effect.name, trimmed)]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur PATCH /api/admin/effects/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

// Supprimer un effet : les cartes qui l'utilisaient repassent à « effet à définir ».
export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const effect = await prisma.effect.findUnique({ where: { id } });
    if (!effect) return NextResponse.json({ error: "Effet introuvable." }, { status: 404 });

    await prisma.$transaction([...renameEverywhere(effect.name, null), prisma.effect.delete({ where: { id } })]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/admin/effects/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
