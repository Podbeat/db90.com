import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { SHOWCASE_SIZE } from "@/lib/showcase";

// « Mon classeur » du membre connecté : jusqu'à 9 cartes choisies parmi celles qu'il possède,
// affichées dans cet ordre sur son profil public et dans l'image de partage du profil.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { showcase: true } });
    return NextResponse.json({ cardIds: user?.showcase || [] });
  } catch (e) {
    console.error("Erreur GET /api/users/me/showcase :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

// Corps : { cardIds: ["…", …] } — 9 cartes au plus, sans doublon, toutes possédées.
export async function PUT(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const cardIds = Array.isArray(body?.cardIds) ? body.cardIds : null;
    if (!cardIds || cardIds.some((id) => typeof id !== "string" || id.length === 0 || id.length > 64)) {
      return NextResponse.json({ error: "Sélection invalide." }, { status: 400 });
    }
    if (cardIds.length > SHOWCASE_SIZE) {
      return NextResponse.json({ error: `${SHOWCASE_SIZE} cartes au maximum.` }, { status: 400 });
    }
    if (new Set(cardIds).size !== cardIds.length) {
      return NextResponse.json({ error: "Une même carte ne peut pas figurer deux fois." }, { status: 400 });
    }

    if (cardIds.length > 0) {
      const owned = await prisma.userCard.count({
        where: { userId: session.sub, status: "owned", cardId: { in: cardIds } },
      });
      if (owned !== cardIds.length) {
        return NextResponse.json({ error: "Seules vos cartes possédées peuvent entrer dans le classeur." }, { status: 400 });
      }
    }

    await prisma.user.update({ where: { id: session.sub }, data: { showcase: cardIds } });
    return NextResponse.json({ ok: true, cardIds });
  } catch (e) {
    console.error("Erreur PUT /api/users/me/showcase :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
