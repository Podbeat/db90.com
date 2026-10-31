import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { FOR_TRADE_WHERE } from "@/lib/cardStatus";

const cardSelect = {
  id: true,
  numero: true,
  image: true,
  personnagePrincipal: { select: { name: true } },
  collection: { select: { nom: true } },
};

// Croise ce que l'utilisateur connecté a mis à l'échange et recherche avec ce que les autres
// membres recherchent et ont mis à l'échange (une carte simplement possédée n'est pas
// proposée : on ne l'échange pas forcément) :
// - "mutuel" : un autre membre a mis à l'échange une carte que je cherche ET cherche une
//   carte que j'ai mise à l'échange — l'échange idéal, mis en avant en premier.
// - à sens unique : quelqu'un cherche une carte que j'ai à l'échange, ou quelqu'un a mis à
//   l'échange une carte que je cherche.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const myCards = await prisma.userCard.findMany({
      where: { userId: session.sub },
      select: { cardId: true, status: true, forTrade: true },
    });
    const myForTradeIds = myCards.filter((c) => c.status === "owned" && c.forTrade).map((c) => c.cardId);
    const myWantedIds = myCards.filter((c) => c.status === "wanted").map((c) => c.cardId);
    const counts = { forTrade: myForTradeIds.length, wanted: myWantedIds.length };

    if (myForTradeIds.length === 0 && myWantedIds.length === 0) {
      return NextResponse.json({ mutual: [], theyWantMine: [], theyHaveMine: [], counts });
    }

    const [othersWantMine, othersOwnWanted] = await Promise.all([
      myForTradeIds.length
        ? prisma.userCard.findMany({
            where: { cardId: { in: myForTradeIds }, status: "wanted", userId: { not: session.sub } },
            select: { userId: true, card: { select: cardSelect }, user: { select: { username: true, avatar: true } } },
          })
        : [],
      myWantedIds.length
        ? prisma.userCard.findMany({
            where: { cardId: { in: myWantedIds }, ...FOR_TRADE_WHERE, userId: { not: session.sub } },
            select: { userId: true, card: { select: cardSelect }, user: { select: { username: true, avatar: true } } },
          })
        : [],
    ]);

    // Regroupe par membre en face pour détecter les échanges à double sens.
    const byUser = new Map();
    function bucket(userId, user) {
      if (!byUser.has(userId)) byUser.set(userId, { user, iOffer: [], iReceive: [] });
      return byUser.get(userId);
    }
    for (const w of othersWantMine) bucket(w.userId, w.user).iOffer.push(w.card);
    for (const o of othersOwnWanted) bucket(o.userId, o.user).iReceive.push(o.card);

    const mutual = [];
    const theyWantMine = [];
    const theyHaveMine = [];
    for (const entry of byUser.values()) {
      if (entry.iOffer.length > 0 && entry.iReceive.length > 0) {
        mutual.push(entry);
      } else if (entry.iOffer.length > 0) {
        for (const card of entry.iOffer) theyWantMine.push({ card, user: entry.user });
      } else if (entry.iReceive.length > 0) {
        for (const card of entry.iReceive) theyHaveMine.push({ card, user: entry.user });
      }
    }

    return NextResponse.json({ mutual, theyWantMine, theyHaveMine, counts });
  } catch (e) {
    console.error("Erreur GET /api/users/me/matches :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
