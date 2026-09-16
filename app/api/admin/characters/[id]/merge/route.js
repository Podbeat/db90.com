import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Fusionne un personnage (typiquement un doublon créé par une faute de frappe à l'import)
// dans un autre : toutes les cartes qui l'avaient en principal ou en secondaire basculent
// sur la cible, puis le personnage source est supprimé.
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id: sourceId } = await params;
    const { targetId } = await request.json();
    if (!targetId) return NextResponse.json({ error: "Personnage cible manquant." }, { status: 400 });
    if (targetId === sourceId) return NextResponse.json({ error: "Choisissez un personnage différent." }, { status: 400 });

    const [source, target] = await Promise.all([
      prisma.character.findUnique({ where: { id: sourceId } }),
      prisma.character.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) return NextResponse.json({ error: "Personnage introuvable." }, { status: 404 });

    // Cartes où le personnage source est le principal : basculent directement sur la cible.
    await prisma.card.updateMany({
      where: { personnagePrincipalId: sourceId },
      data: { personnagePrincipalId: targetId },
    });

    // Cartes où le personnage source est un secondaire : bascule sur la cible, sauf si la
    // carte a déjà la cible en secondaire (ou en principal) — auquel cas on supprime juste
    // le lien source pour ne pas créer de doublon.
    const sourceLinks = await prisma.cardCharacter.findMany({ where: { characterId: sourceId } });
    for (const link of sourceLinks) {
      const alreadyLinked = await prisma.cardCharacter.findUnique({
        where: { cardId_characterId: { cardId: link.cardId, characterId: targetId } },
      });
      const card = await prisma.card.findUnique({ where: { id: link.cardId }, select: { personnagePrincipalId: true } });
      if (alreadyLinked || card?.personnagePrincipalId === targetId) {
        await prisma.cardCharacter.delete({ where: { id: link.id } });
      } else {
        await prisma.cardCharacter.update({ where: { id: link.id }, data: { characterId: targetId } });
      }
    }

    await prisma.character.delete({ where: { id: sourceId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/admin/characters/[id]/merge :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
