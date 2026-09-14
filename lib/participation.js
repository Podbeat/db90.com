const { prisma } = require("./db");

const POINTS_PER_CARD = 1;
const POINTS_PER_COMPLETED_COLLECTION = 25;
const POINTS_PER_APPROVED_SCAN = 5;
const POINTS_PER_APPROVED_COLLECTION_PROPOSAL = 100;

/**
 * Calcule le score de participation d'un utilisateur (le sien via /api/users/me/participation,
 * ou celui de n'importe quel membre affiché sur son profil public) : base pour un futur
 * classement et d'éventuels badges.
 */
async function computeParticipation(userId) {
  const [ownedCount, approvedSubmissions, approvedCollectionProposals, ownedEntries] = await Promise.all([
    prisma.userCard.count({ where: { userId, status: "owned" } }),
    prisma.cardSubmission.count({ where: { userId, status: "approved" } }),
    prisma.collectionSubmission.count({ where: { userId, status: "approved" } }),
    prisma.userCard.findMany({
      where: { userId, status: "owned" },
      select: { card: { select: { collectionId: true } } },
    }),
  ]);

  const countsByCollection = new Map();
  for (const e of ownedEntries) {
    const id = e.card.collectionId;
    countsByCollection.set(id, (countsByCollection.get(id) || 0) + 1);
  }

  const collectionIds = [...countsByCollection.keys()];
  const collections = collectionIds.length
    ? await prisma.collection.findMany({
        where: { id: { in: collectionIds } },
        select: { id: true, total: true },
      })
    : [];
  const collectionById = new Map(collections.map((c) => [c.id, c]));

  let completedCollections = 0;
  for (const [id, count] of countsByCollection) {
    const col = collectionById.get(id);
    // Une collection ne compte comme "complétée" que si son total réel (éditorial) est
    // connu et atteint — pas de bonus basé sur un simple total de secours qui pourrait
    // encore grandir (série en cours de catalogage).
    if (col?.total && count >= col.total) completedCollections += 1;
  }

  const ownedPoints = ownedCount * POINTS_PER_CARD;
  const completionBonus = completedCollections * POINTS_PER_COMPLETED_COLLECTION;
  const contributionPoints = approvedSubmissions * POINTS_PER_APPROVED_SCAN;
  const collectionProposalPoints = approvedCollectionProposals * POINTS_PER_APPROVED_COLLECTION_PROPOSAL;

  return {
    totalPoints: ownedPoints + completionBonus + contributionPoints + collectionProposalPoints,
    ownedCount,
    ownedPoints,
    completedCollections,
    completionBonus,
    approvedSubmissions,
    contributionPoints,
    approvedCollectionProposals,
    collectionProposalPoints,
    pointsPerCard: POINTS_PER_CARD,
    pointsPerCompletedCollection: POINTS_PER_COMPLETED_COLLECTION,
    pointsPerApprovedScan: POINTS_PER_APPROVED_SCAN,
    pointsPerApprovedCollectionProposal: POINTS_PER_APPROVED_COLLECTION_PROPOSAL,
  };
}

module.exports = { computeParticipation };
