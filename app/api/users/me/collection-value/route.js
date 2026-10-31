import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// En dessous de ce nombre de cartes cotées, la « valeur » ne voudrait rien dire : on ne
// l'affiche pas.
const MIN_PRICED_CARDS = 5;
const TOP = 3;

const cardSelect = {
  id: true,
  numero: true,
  image: true,
  personnagePrincipal: { select: { name: true } },
  collection: { select: { nom: true } },
};

// Valeur estimée de la collection du membre connecté : somme de la dernière cote connue
// (lib/cote.js, tirée des annonces du Marché en Très bon état ou Neuve) de chacune de ses
// cartes possédées qui en a une, et ses cartes les mieux cotées. Une indication, pas un
// prix de vente.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const userId = session.sub;

    const [ownedCount, latest] = await Promise.all([
      prisma.userCard.count({ where: { userId, status: "owned" } }),
      prisma.$queryRaw`
        SELECT DISTINCT ON (ph."cardId") ph."cardId" AS "cardId", ph.cote AS cote, ph."sampleSize" AS "sampleSize"
        FROM "PriceHistory" ph
        JOIN "UserCard" uc ON uc."cardId" = ph."cardId"
        WHERE uc."userId" = ${userId} AND uc.status = 'owned'
        ORDER BY ph."cardId", ph."createdAt" DESC`,
    ]);

    const priced = latest
      .map((r) => ({ cardId: r.cardId, cote: Number(r.cote), sampleSize: Number(r.sampleSize) }))
      .filter((p) => Number.isFinite(p.cote) && p.cote > 0);
    const base = { ownedCount, pricedCount: priced.length, minPriced: MIN_PRICED_CARDS };
    if (priced.length < MIN_PRICED_CARDS) return NextResponse.json({ ...base, enough: false });

    const topRows = [...priced].sort((a, b) => b.cote - a.cote).slice(0, TOP);
    const cards = await prisma.card.findMany({ where: { id: { in: topRows.map((r) => r.cardId) } }, select: cardSelect });
    const byId = new Map(cards.map((c) => [c.id, c]));

    return NextResponse.json({
      ...base,
      enough: true,
      total: Math.round(priced.reduce((sum, p) => sum + p.cote, 0)),
      top: topRows
        .map((r) => ({ card: byId.get(r.cardId), cote: Math.round(r.cote), sampleSize: r.sampleSize }))
        .filter((x) => x.card),
    });
  } catch (e) {
    console.error("Erreur GET /api/users/me/collection-value :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
