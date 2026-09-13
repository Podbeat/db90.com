import { prisma } from "@/lib/db";
import { computeParticipation } from "@/lib/participation";
import { getBadgeIds } from "@/lib/badges";

/**
 * Recalcule les badges d'un membre et notifie chaque badge tout juste débloqué depuis le
 * dernier appel. Appelé après toute action qui pourrait en débloquer un (carte marquée
 * possédée, scan validé, collection complétée) — jamais destructif, ne fait qu'ajouter.
 */
export async function checkAndAwardBadges(userId) {
  try {
    const participation = await computeParticipation(userId);
    const currentIds = getBadgeIds(participation);
    if (currentIds.length === 0) return;

    const already = await prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } });
    const alreadyIds = new Set(already.map((b) => b.badgeId));
    const newIds = currentIds.filter((id) => !alreadyIds.has(id));
    if (newIds.length === 0) return;

    await prisma.userBadge.createMany({
      data: newIds.map((badgeId) => ({ userId, badgeId })),
    });
    await prisma.notification.createMany({
      data: newIds.map(() => ({ userId, type: "badge_earned" })),
    });
  } catch (e) {
    // Best-effort : un souci ici ne doit jamais faire échouer l'action qui l'a déclenché.
    console.error("Erreur checkAndAwardBadges :", e);
  }
}
