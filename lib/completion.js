const { prisma } = require("./db");

// Une collection est « complète » quand le membre possède au moins une carte de chaque
// référence (numéro) de la série : les variantes d'effet ou de prisme d'un même numéro ne
// comptent qu'une fois. Même règle partout : points, badges, fil d'activité, registre.

// Nombre de références distinctes possédées par un membre, par collection
// (Map collectionId → nombre). Avec `collectionIds`, se limite à ces collections et renvoie
// 0 pour celles où il n'a rien.
async function ownedReferencesByCollection(userId, collectionIds) {
  const rows = await prisma.userCard.findMany({
    where: {
      userId,
      status: "owned",
      ...(collectionIds ? { card: { collectionId: { in: collectionIds } } } : {}),
    },
    select: { card: { select: { collectionId: true, numero: true } } },
  });

  const numerosByCollection = new Map();
  for (const { card } of rows) {
    if (!numerosByCollection.has(card.collectionId)) numerosByCollection.set(card.collectionId, new Set());
    numerosByCollection.get(card.collectionId).add(card.numero);
  }

  const counts = new Map();
  for (const id of collectionIds || []) counts.set(id, 0);
  for (const [id, numeros] of numerosByCollection) counts.set(id, numeros.size);
  return counts;
}

module.exports = { ownedReferencesByCollection };
