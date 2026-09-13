import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

const POINTS_PER_CARD = 1;
const POINTS_PER_COMPLETED_COLLECTION = 25;
const POINTS_PER_APPROVED_SCAN = 5;

// Calcule le score de participation de l'utilisateur connecté : base pour un futur
// classement et d'éventuels badges. Le détail est renvoyé pour pouvoir l'afficher
// (nombre de cartes, collections complétées, scans acceptés), pas seulement le total.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const [ownedCount, approvedSubmissions, ownedEntries] = await Promise.all([
      prisma.userCard.count({ where: { userId: session.sub, status: "owned" } }),
      prisma.cardSubmission.count({ where: { userId: session.sub, status: "approved" } }),
      prisma.userCard.findMany({
        where: { userId: session.sub, status: "owned" },
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

    return NextResponse.json({
      totalPoints: ownedPoints + completionBonus + contributionPoints,
      ownedCount,
      ownedPoints,
      completedCollections,
      completionBonus,
      approvedSubmissions,
      contributionPoints,
      pointsPerCard: POINTS_PER_CARD,
      pointsPerCompletedCollection: POINTS_PER_COMPLETED_COLLECTION,
      pointsPerApprovedScan: POINTS_PER_APPROVED_SCAN,
    });
  } catch (e) {
    console.error("Erreur GET /api/users/me/participation :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
