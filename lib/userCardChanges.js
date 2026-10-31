import { prisma } from "@/lib/db";
import { checkAndAwardBadges } from "@/lib/badgeNotifications";
import { ownedReferencesByCollection } from "@/lib/completion";

// Change le statut de plusieurs cartes d'un membre (« Cocher en lot », annulation, mise à
// jour de la collection après un échange reçu).
//
// `wanted` : Map cardId → "owned" | "wanted" | null (null retire la carte du suivi). Les
// cartes doivent exister (à vérifier avant). Seules celles dont le statut change sont
// touchées ; renvoie ces changements avec le statut d'avant (`previous`), qui permet
// d'annuler. Mêmes effets que carte par carte : collection complétée dans le fil
// d'activité, alerte d'échange gagnant-gagnant (sauf `notifyMatches: false`), badges.
export async function applyStatusChanges(userId, wanted, { notifyMatches = true } = {}) {
  const cardIds = [...wanted.keys()];
  if (cardIds.length === 0) return [];

  const [cards, existing] = await Promise.all([
    prisma.card.findMany({ where: { id: { in: cardIds } }, select: { id: true, collectionId: true } }),
    prisma.userCard.findMany({ where: { userId, cardId: { in: cardIds } }, select: { cardId: true, status: true } }),
  ]);
  const collectionOf = new Map(cards.map((c) => [c.id, c.collectionId]));
  const before = new Map(existing.map((e) => [e.cardId, e.status]));
  const changes = cardIds
    .filter((id) => collectionOf.has(id) && (before.get(id) ?? null) !== wanted.get(id))
    .map((id) => ({ cardId: id, status: wanted.get(id), previous: before.get(id) ?? null }));
  if (changes.length === 0) return [];

  const touchedCollections = [...new Set(changes.map((c) => collectionOf.get(c.cardId)))];
  const ownedBefore = await ownedReferencesByCollection(userId, touchedCollections);

  // Une carte qui change de statut est retirée puis recréée : sa date reflète le moment
  // où elle a pris son statut actuel (utile au palmarès des collections complètes).
  await prisma.$transaction([
    prisma.userCard.deleteMany({ where: { userId, cardId: { in: changes.map((c) => c.cardId) } } }),
    prisma.userCard.createMany({
      data: changes.filter((c) => c.status).map((c) => ({ userId, cardId: c.cardId, status: c.status })),
    }),
  ]);

  await recordCompletedCollections(userId, touchedCollections, ownedBefore);
  if (notifyMatches) await notifyNewMutualMatches(userId, changes.filter((c) => c.status));
  if (changes.some((c) => c.status === "owned")) await checkAndAwardBadges(userId);
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
    console.error("Erreur alertes d'échange (changement de statut groupé) :", e);
  }
}
