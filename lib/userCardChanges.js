import { prisma } from "@/lib/db";
import { checkAndAwardBadges } from "@/lib/badgeNotifications";
import { ownedReferencesByCollection } from "@/lib/completion";
import { displayStatus, isOwnedStatus, storedStatus, FOR_TRADE_WHERE } from "@/lib/cardStatus";

// Change le statut de plusieurs cartes d'un membre (« Cocher en lot », annulation, mise à
// jour de la collection après un échange reçu).
//
// `wanted` : Map cardId → "owned" | "trade" | "wanted" | null (voir lib/cardStatus.js ; null
// retire la carte du suivi). Les cartes doivent exister (à vérifier avant). Seules celles
// dont le statut change sont touchées ; renvoie ces changements avec le statut d'avant
// (`previous`), qui permet d'annuler. Mêmes effets que carte par carte : collection
// complétée dans le fil d'activité, alerte d'échange gagnant-gagnant (sauf
// `notifyMatches: false`), badges.
export async function applyStatusChanges(userId, wanted, { notifyMatches = true } = {}) {
  const cardIds = [...wanted.keys()];
  if (cardIds.length === 0) return [];

  const [cards, existing] = await Promise.all([
    prisma.card.findMany({ where: { id: { in: cardIds } }, select: { id: true, collectionId: true } }),
    prisma.userCard.findMany({
      where: { userId, cardId: { in: cardIds } },
      select: { cardId: true, status: true, forTrade: true },
    }),
  ]);
  const collectionOf = new Map(cards.map((c) => [c.id, c.collectionId]));
  const before = new Map(existing.map((e) => [e.cardId, displayStatus(e)]));
  const changes = cardIds
    .filter((id) => collectionOf.has(id) && (before.get(id) ?? null) !== wanted.get(id))
    .map((id) => ({ cardId: id, status: wanted.get(id), previous: before.get(id) ?? null }));
  if (changes.length === 0) return [];

  const touchedCollections = [...new Set(changes.map((c) => collectionOf.get(c.cardId)))];
  const ownedBefore = await ownedReferencesByCollection(userId, touchedCollections);

  // Passer de « Je l'ai » à « À l'échange » (ou l'inverse) ne change que la disponibilité :
  // la carte garde sa date. Les autres changements retirent puis recréent la ligne, pour
  // que sa date reflète le moment où elle a pris son statut actuel (palmarès).
  const onlyTradeFlag = (c) => isOwnedStatus(c.status) && isOwnedStatus(c.previous);
  const toggled = changes.filter(onlyTradeFlag);
  const replaced = changes.filter((c) => !onlyTradeFlag(c));
  await prisma.$transaction([
    ...[true, false].map((forTrade) =>
      prisma.userCard.updateMany({
        where: { userId, cardId: { in: toggled.filter((c) => (c.status === "trade") === forTrade).map((c) => c.cardId) } },
        data: { forTrade },
      })
    ),
    prisma.userCard.deleteMany({ where: { userId, cardId: { in: replaced.map((c) => c.cardId) } } }),
    prisma.userCard.createMany({
      data: replaced.filter((c) => c.status).map((c) => ({ userId, cardId: c.cardId, ...storedStatus(c.status) })),
    }),
  ]);

  await recordCompletedCollections(userId, touchedCollections, ownedBefore);
  if (notifyMatches) await notifyNewMutualMatches(userId, changes);
  if (changes.some((c) => isOwnedStatus(c.status) && !isOwnedStatus(c.previous))) await checkAndAwardBadges(userId);
  return changes;
}

// Fil d'activité : une collection n'est annoncée « complétée » qu'au moment où elle le
// devient (chaque numéro possédé, voir lib/completion.js), comme carte par carte.
async function recordCompletedCollections(userId, collectionIds, ownedBefore) {
  try {
    const [collections, ownedAfter] = await Promise.all([
      prisma.collection.findMany({ where: { id: { in: collectionIds }, total: { not: null } }, select: { id: true, total: true } }),
      ownedReferencesByCollection(userId, collectionIds),
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
    console.error("Erreur fil d'activité (changement de statut groupé) :", e);
  }
}

// Alerte d'échange gagnant-gagnant : un membre qui a mis à l'échange ce que je viens de
// chercher (ou cherche ce que je viens de mettre à l'échange) ET avec qui l'échange marche
// dans l'autre sens. Une seule alerte par membre concerné, quel que soit le nombre de
// cartes cochées. `changes` : [{ cardId, status, previous? }] (statuts de lib/cardStatus.js).
export async function notifyNewMutualMatches(userId, changes) {
  try {
    const newWanted = changes.filter((c) => c.status === "wanted" && c.previous !== "wanted").map((c) => c.cardId);
    const newForTrade = changes.filter((c) => c.status === "trade" && c.previous !== "trade").map((c) => c.cardId);
    if (newWanted.length === 0 && newForTrade.length === 0) return;

    const candidates = await prisma.userCard.findMany({
      where: {
        userId: { not: userId },
        OR: [
          newWanted.length ? { cardId: { in: newWanted }, ...FOR_TRADE_WHERE } : null,
          newForTrade.length ? { cardId: { in: newForTrade }, status: "wanted" } : null,
        ].filter(Boolean),
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (candidates.length === 0) return;

    const mine = await prisma.userCard.findMany({ where: { userId }, select: { cardId: true, status: true, forTrade: true } });
    const myWanted = new Set(mine.filter((c) => c.status === "wanted").map((c) => c.cardId));
    const myForTrade = new Set(mine.filter((c) => displayStatus(c) === "trade").map((c) => c.cardId));

    // Une seule requête pour tous les membres concernés, quel que soit leur nombre.
    const theirs = await prisma.userCard.findMany({
      where: {
        userId: { in: candidates.map((c) => c.userId) },
        OR: [
          { ...FOR_TRADE_WHERE, cardId: { in: [...myWanted] } },
          { status: "wanted", cardId: { in: [...myForTrade] } },
        ],
      },
      select: { userId: true, status: true },
    });
    const offersMyWanted = new Set(theirs.filter((c) => c.status === "owned").map((c) => c.userId));
    const wantsMyForTrade = new Set(theirs.filter((c) => c.status === "wanted").map((c) => c.userId));
    const matched = candidates.map((c) => c.userId).filter((id) => offersMyWanted.has(id) && wantsMyForTrade.has(id));
    if (matched.length === 0) return;

    await prisma.notification.createMany({
      data: [{ userId, type: "trade_match" }, ...matched.map((id) => ({ userId: id, type: "trade_match" }))],
    });
  } catch (e) {
    console.error("Erreur alertes d'échange (changement de statut groupé) :", e);
  }
}
