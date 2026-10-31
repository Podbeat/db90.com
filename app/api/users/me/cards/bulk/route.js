import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { checkAndAwardBadges } from "@/lib/badgeNotifications";

const MAX_UPDATES = 500;
const STATUSES = new Set(["owned", "wanted", null]);

// Change d'un coup le statut de plusieurs cartes (« Cocher en lot » sur une page de
// collection, et son annulation). Corps : { updates: [{ cardId, status }] }, status valant
// "owned", "wanted" ou null pour retirer la carte du suivi.
//
// Seules les cartes dont le statut change réellement sont touchées, et la réponse renvoie
// leur statut d'avant (`previous`) : renvoyé tel quel, il annule l'action.
// Mêmes effets que le changement carte par carte : collection complétée dans le fil
// d'activité, alerte d'échange gagnant-gagnant, badges.
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const userId = session.sub;

    const body = await request.json().catch(() => null);
    const updates = Array.isArray(body?.updates) ? body.updates : null;
    if (!updates || updates.length === 0) return NextResponse.json({ error: "Aucune carte." }, { status: 400 });
    if (updates.length > MAX_UPDATES) return NextResponse.json({ error: "Trop de cartes à la fois." }, { status: 400 });

    // Une seule entrée par carte (la dernière l'emporte), statuts valides uniquement.
    const wanted = new Map();
    for (const u of updates) {
      if (!u || typeof u.cardId !== "string" || !STATUSES.has(u.status ?? null)) {
        return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
      }
      wanted.set(u.cardId, u.status ?? null);
    }
    const cardIds = [...wanted.keys()];

    const [cards, existing] = await Promise.all([
      prisma.card.findMany({ where: { id: { in: cardIds } }, select: { id: true, collectionId: true } }),
      prisma.userCard.findMany({ where: { userId, cardId: { in: cardIds } }, select: { cardId: true, status: true } }),
    ]);
    if (cards.length !== cardIds.length) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

    const before = new Map(existing.map((e) => [e.cardId, e.status]));
    const changes = cardIds
      .filter((id) => (before.get(id) ?? null) !== wanted.get(id))
      .map((id) => ({ cardId: id, status: wanted.get(id), previous: before.get(id) ?? null }));
    if (changes.length === 0) return NextResponse.json({ ok: true, changed: 0, previous: [] });

    const collectionOf = new Map(cards.map((c) => [c.id, c.collectionId]));
    const touchedCollections = [...new Set(changes.map((c) => collectionOf.get(c.cardId)))];
    const ownedBefore = await ownedCountByCollection(userId, touchedCollections);

    // Une carte qui change de statut est retirée puis recréée : sa date reflète le moment
    // où elle a pris son statut actuel (utile au palmarès des collections complètes).
    await prisma.$transaction([
      prisma.userCard.deleteMany({ where: { userId, cardId: { in: changes.map((c) => c.cardId) } } }),
      prisma.userCard.createMany({
        data: changes.filter((c) => c.status).map((c) => ({ userId, cardId: c.cardId, status: c.status })),
      }),
    ]);

    await recordCompletedCollections(userId, touchedCollections, ownedBefore);
    await notifyNewMutualMatches(userId, changes.filter((c) => c.status));
    if (changes.some((c) => c.status === "owned")) await checkAndAwardBadges(userId);

    return NextResponse.json({
      ok: true,
      changed: changes.length,
      previous: changes.map((c) => ({ cardId: c.cardId, status: c.previous })),
    });
  } catch (e) {
    console.error("Erreur POST /api/users/me/cards/bulk :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

async function ownedCountByCollection(userId, collectionIds) {
  const rows = await prisma.userCard.findMany({
    where: { userId, status: "owned", card: { collectionId: { in: collectionIds } } },
    select: { card: { select: { collectionId: true } } },
  });
  const counts = new Map(collectionIds.map((id) => [id, 0]));
  for (const r of rows) counts.set(r.card.collectionId, (counts.get(r.card.collectionId) || 0) + 1);
  return counts;
}

// Fil d'activité : une collection n'est annoncée « complétée » qu'au moment où elle le
// devient, comme pour le changement carte par carte.
async function recordCompletedCollections(userId, collectionIds, ownedBefore) {
  try {
    const [collections, ownedAfter] = await Promise.all([
      prisma.collection.findMany({ where: { id: { in: collectionIds }, total: { not: null } }, select: { id: true, total: true } }),
      ownedCountByCollection(userId, collectionIds),
    ]);
    const completed = collections.filter(
      (c) => c.total > 0 && (ownedBefore.get(c.id) || 0) < c.total && (ownedAfter.get(c.id) || 0) >= c.total
    );
    if (completed.length) {
      await prisma.activityEvent.createMany({
        data: completed.map((c) => ({ type: "collection_completed", userId, collectionId: c.id })),
      });
    }
  } catch (e) {
    console.error("Erreur fil d'activité (cocher en lot) :", e);
  }
}

// Alerte d'échange gagnant-gagnant : un membre qui a ce que je viens de chercher (ou
// cherche ce que je viens de marquer possédé) ET avec qui l'échange marche dans l'autre
// sens. Une seule alerte par membre concerné, quel que soit le nombre de cartes cochées.
async function notifyNewMutualMatches(userId, changes) {
  try {
    if (changes.length === 0) return;
    const newWanted = changes.filter((c) => c.status === "wanted").map((c) => c.cardId);
    const newOwned = changes.filter((c) => c.status === "owned").map((c) => c.cardId);

    const candidates = await prisma.userCard.findMany({
      where: {
        userId: { not: userId },
        OR: [
          newWanted.length ? { cardId: { in: newWanted }, status: "owned" } : null,
          newOwned.length ? { cardId: { in: newOwned }, status: "wanted" } : null,
        ].filter(Boolean),
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (candidates.length === 0) return;

    const mine = await prisma.userCard.findMany({ where: { userId }, select: { cardId: true, status: true } });
    const myWanted = new Set(mine.filter((c) => c.status === "wanted").map((c) => c.cardId));
    const myOwned = new Set(mine.filter((c) => c.status === "owned").map((c) => c.cardId));

    // Une seule requête pour tous les membres concernés, quel que soit leur nombre.
    const theirs = await prisma.userCard.findMany({
      where: {
        userId: { in: candidates.map((c) => c.userId) },
        OR: [
          { status: "owned", cardId: { in: [...myWanted] } },
          { status: "wanted", cardId: { in: [...myOwned] } },
        ],
      },
      select: { userId: true, status: true },
    });
    const hasMyWanted = new Set(theirs.filter((c) => c.status === "owned").map((c) => c.userId));
    const wantsMyOwned = new Set(theirs.filter((c) => c.status === "wanted").map((c) => c.userId));
    const matched = candidates.map((c) => c.userId).filter((id) => hasMyWanted.has(id) && wantsMyOwned.has(id));
    if (matched.length === 0) return;

    await prisma.notification.createMany({
      data: [{ userId, type: "trade_match" }, ...matched.map((id) => ({ userId: id, type: "trade_match" }))],
    });
  } catch (e) {
    console.error("Erreur alertes d'échange (cocher en lot) :", e);
  }
}
