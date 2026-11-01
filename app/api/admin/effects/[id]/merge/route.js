import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { renameEverywhere } from "@/lib/effects";

// Fusionne un effet dans un autre (doublon type « Feu d'artifices » / « Feu d'Artifice ») :
// toutes ses cartes et propositions passent sur la cible, puis l'effet source est supprimé.
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id: sourceId } = await params;
    const { targetId } = await request.json();
    if (!targetId) return NextResponse.json({ error: "Effet cible manquant." }, { status: 400 });
    if (targetId === sourceId) return NextResponse.json({ error: "Choisissez un effet différent." }, { status: 400 });

    const [source, target] = await Promise.all([
      prisma.effect.findUnique({ where: { id: sourceId } }),
      prisma.effect.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) return NextResponse.json({ error: "Effet introuvable." }, { status: 404 });

    const [moved] = await prisma.$transaction([...renameEverywhere(source.name, target.name), prisma.effect.delete({ where: { id: sourceId } })]);
    return NextResponse.json({ ok: true, cards: moved?.count ?? 0 });
  } catch (e) {
    console.error("Erreur POST /api/admin/effects/[id]/merge :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
