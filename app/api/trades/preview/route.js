import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { TRADE_CARD_SELECT, eitherBlocked, sortTradeCards, traderStats } from "@/lib/trades";
import { displayStatus } from "@/lib/cardStatus";

// Préparer une proposition d'échange avec un membre (?with=pseudo) : les cartes qu'il
// recherche et que j'ai mises à l'échange (je peux les donner), celles qu'il a mises à
// l'échange et que je recherche (je peux les recevoir), sa réputation, et une éventuelle
// proposition déjà en attente entre nous.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const me = session.sub;

    const username = new URL(request.url).searchParams.get("with") || "";
    const partner = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true, avatar: true },
    });
    if (!partner) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    if (partner.id === me) return NextResponse.json({ error: "Vous ne pouvez pas échanger avec vous-même." }, { status: 400 });

    const [mine, theirs, blocked, pending, stats] = await Promise.all([
      prisma.userCard.findMany({ where: { userId: me }, select: { cardId: true, status: true, forTrade: true } }),
      prisma.userCard.findMany({ where: { userId: partner.id }, select: { cardId: true, status: true, forTrade: true } }),
      eitherBlocked(me, partner.id),
      prisma.trade.findFirst({
        where: {
          status: "proposed",
          OR: [
            { proposerId: me, recipientId: partner.id },
            { proposerId: partner.id, recipientId: me },
          ],
        },
        select: { id: true },
      }),
      traderStats([partner.id]),
    ]);

    const idsWith = (rows, status) => new Set(rows.filter((r) => displayStatus(r) === status).map((r) => r.cardId));
    const myForTrade = idsWith(mine, "trade");
    const myWanted = idsWith(mine, "wanted");
    const giveIds = [...idsWith(theirs, "wanted")].filter((id) => myForTrade.has(id));
    const receiveIds = [...idsWith(theirs, "trade")].filter((id) => myWanted.has(id));

    const cards = giveIds.length + receiveIds.length
      ? await prisma.card.findMany({ where: { id: { in: [...giveIds, ...receiveIds] } }, select: TRADE_CARD_SELECT })
      : [];
    const byId = new Map(cards.map((c) => [c.id, c]));

    return NextResponse.json({
      partner: { username: partner.username, avatar: partner.avatar, ...stats.get(partner.id) },
      give: sortTradeCards(giveIds.map((id) => byId.get(id)).filter(Boolean)),
      receive: sortTradeCards(receiveIds.map((id) => byId.get(id)).filter(Boolean)),
      pendingTradeId: pending?.id || null,
      blocked,
    });
  } catch (e) {
    console.error("Erreur GET /api/trades/preview :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
