import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

const cardSelect = {
  id: true,
  numero: true,
  image: true,
  personnagePrincipal: { select: { name: true } },
  collection: { select: { nom: true } },
};

// Croise ce que l'utilisateur connecté possède/recherche avec ce que les autres membres
// recherchent/possèdent, pour proposer des échanges concrets :
// - "mutuel" : un autre membre a une carte que je cherche ET cherche une carte que j'ai —
//   l'échange idéal, mis en avant en premier.
// - à sens unique : quelqu'un cherche une carte que j'ai (je pourrais la lui céder), ou
//   quelqu'un a une carte que je cherche (je pourrais la lui demander).
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const myCards = await prisma.userCard.findMany({
      where: { userId: session.sub },
      select: { cardId: true, status: true },
    });
    const myOwnedIds = myCards.filter((c) => c.status === "owned").map((c) => c.cardId);
    const myWantedIds = myCards.filter((c) => c.status === "wanted").map((c) => c.cardId);

    if (myOwnedIds.length === 0 && myWantedIds.length === 0) {
      return NextResponse.json({ mutual: [], theyWantMine: [], theyHaveMine: [] });
    }

    const [othersWantMine, othersOwnWanted] = await Promise.all([
      myOwnedIds.length
        ? prisma.userCard.findMany({
            where: { cardId: { in: myOwnedIds }, status: "wanted", userId: { not: session.sub } },
            select: { userId: true, card: { select: cardSelect }, user: { select: { username: true, avatar: true } } },
          })
        : [],
      myWantedIds.length
        ? prisma.userCard.findMany({
            where: { cardId: { in: myWantedIds }, status: "owned", userId: { not: session.sub } },
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

    return NextResponse.json({ mutual, theyWantMine, theyHaveMine });
  } catch (e) {
    console.error("Erreur GET /api/users/me/matches :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
