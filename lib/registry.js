import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { rankRegistry } from "@/lib/registryRank";
import { POINTS_PER_COMPLETED_COLLECTION } from "@/lib/participation";

// Registre des collections : qui possède combien de références de chaque série, qui l'a
// complétée et quand. Données déclaratives (chacun coche ses cartes), déjà publiques sur
// les profils ; seuls le pseudo et l'avatar des membres sont renvoyés.

// Références distinctes possédées par membre et par collection (les variantes d'effet d'un
// même numéro ne comptent qu'une fois), avec la date de la dernière carte cochée.
// Une seule requête groupée, quel que soit le nombre de membres.
async function ownedRows(collectionId) {
  if (collectionId) {
    return prisma.$queryRaw`
      SELECT uc."userId" AS "userId", c."collectionId" AS "collectionId",
             COUNT(DISTINCT c.numero)::int AS owned, MAX(uc."createdAt") AS "lastAt"
      FROM "UserCard" uc JOIN "Card" c ON c.id = uc."cardId"
      WHERE uc.status = 'owned' AND c."collectionId" = ${collectionId}
      GROUP BY uc."userId", c."collectionId"`;
  }
  return prisma.$queryRaw`
    SELECT uc."userId" AS "userId", c."collectionId" AS "collectionId",
           COUNT(DISTINCT c.numero)::int AS owned, MAX(uc."createdAt") AS "lastAt"
    FROM "UserCard" uc JOIN "Card" c ON c.id = uc."cardId"
    WHERE uc.status = 'owned'
    GROUP BY uc."userId", c."collectionId"`;
}

// Date à laquelle chaque membre a complété chaque collection : le dernier événement
// « collection complétée » du fil d'activité (clé `${userId}:${collectionId}`).
async function completionDates(where) {
  const events = await prisma.activityEvent.findMany({
    where: { type: "collection_completed", userId: { not: null }, collectionId: { not: null }, ...where },
    select: { userId: true, collectionId: true, createdAt: true },
  });
  const dates = new Map();
  for (const e of events) {
    const key = `${e.userId}:${e.collectionId}`;
    if (!dates.has(key) || dates.get(key) < e.createdAt) dates.set(key, e.createdAt);
  }
  return dates;
}

async function usersById(ids) {
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, username: true, avatar: true },
  });
  return new Map(users.map((u) => [u.id, { username: u.username, avatar: u.avatar }]));
}

// Vignette d'une collection : première carte scannée (tri naturel), sinon la couverture.
export async function collectionPreviews(collectionIds) {
  if (collectionIds.length === 0) return new Map();
  const collections = await prisma.collection.findMany({
    where: { id: { in: collectionIds } },
    select: { id: true, cover: true, cards: { where: { image: { not: null } }, select: { numero: true, image: true } } },
  });
  return new Map(
    collections.map((col) => {
      const first = [...col.cards].filter((c) => c.image).sort(naturalSortByNumero)[0];
      return [col.id, first?.image || col.cover || null];
    })
  );
}

function toEntries(rows, users, dates) {
  return rows
    .filter((r) => users.has(r.userId))
    .map((r) => ({
      user: users.get(r.userId),
      owned: Number(r.owned),
      lastAt: r.lastAt,
      completedAt: dates.get(`${r.userId}:${r.collectionId}`) || r.lastAt,
    }));
}

// Registre complet d'une collection (null si elle n'existe pas).
export async function getCollectionRegistry(collectionId) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { id: true, nom: true, total: true, pays: true },
  });
  if (!collection) return null;

  const [rows, dates, previews] = await Promise.all([
    ownedRows(collectionId),
    completionDates({ collectionId }),
    collectionPreviews([collectionId]),
  ]);
  const users = await usersById(rows.map((r) => r.userId));
  const registry = rankRegistry(toEntries(rows, users, dates), collection.total);

  return {
    collection: { ...collection, previewImage: previews.get(collectionId) || null },
    completionPoints: POINTS_PER_COMPLETED_COLLECTION,
    ...registry,
  };
}

const MAX_IN_PROGRESS = 10;

// Palmarès du classement : les collections complétées (et par qui, dans l'ordre d'arrivée),
// puis celles qui ne le sont pas encore avec le membre en tête.
export async function getPalmares() {
  const collections = await prisma.collection.findMany({
    where: { total: { gt: 0 } },
    select: { id: true, nom: true, pays: true, total: true },
  });
  if (collections.length === 0) return { done: [], inProgress: [] };

  const [rows, dates, previews] = await Promise.all([
    ownedRows(),
    completionDates({}),
    collectionPreviews(collections.map((c) => c.id)),
  ]);
  const users = await usersById(rows.map((r) => r.userId));

  const rowsByCollection = new Map();
  for (const r of rows) {
    if (!rowsByCollection.has(r.collectionId)) rowsByCollection.set(r.collectionId, []);
    rowsByCollection.get(r.collectionId).push(r);
  }

  const items = collections.map((col) => {
    const registry = rankRegistry(toEntries(rowsByCollection.get(col.id) || [], users, dates), col.total);
    const leader = registry.ranking[0];
    return {
      collection: { ...col, previewImage: previews.get(col.id) || null },
      completed: registry.completed.map((e) => ({ user: e.user, completedAt: e.completedAt })),
      leader: registry.completedCount === 0 && leader ? { user: leader.user, owned: leader.owned } : null,
    };
  });

  const latest = (item) => Math.max(...item.completed.map((c) => new Date(c.completedAt).getTime()));
  const done = items
    .filter((i) => i.completed.length > 0)
    .sort((a, b) => b.completed.length - a.completed.length || latest(b) - latest(a));
  const inProgress = items
    .filter((i) => i.completed.length === 0 && i.leader)
    .sort((a, b) => b.leader.owned / b.collection.total - a.leader.owned / a.collection.total)
    .slice(0, MAX_IN_PROGRESS);

  return { done, inProgress };
}

// Collections complétées par un membre, pour ses badges de profil (ids issus de
// computeParticipation, déjà calculés avec la même règle).
export async function getCompletedCollections(collectionIds) {
  if (!collectionIds?.length) return [];
  const [collections, previews] = await Promise.all([
    prisma.collection.findMany({ where: { id: { in: collectionIds } }, select: { id: true, nom: true, total: true } }),
    collectionPreviews(collectionIds),
  ]);
  return collections
    .map((c) => ({ ...c, previewImage: previews.get(c.id) || null }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}
