import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Classement public : top collectionneurs (nombre de cartes possédées) et top
// contributeurs (scans validés). Requêtes groupées pour rester efficace même avec
// beaucoup de membres, plutôt que de recalculer la participation de chacun un par un.
export async function GET() {
  try {
    const [topOwners, topContributors] = await Promise.all([
      prisma.userCard.groupBy({
        by: ["userId"],
        where: { status: "owned" },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
      prisma.cardSubmission.groupBy({
        by: ["userId"],
        where: { status: "approved" },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
    ]);

    const userIds = [...new Set([...topOwners.map((o) => o.userId), ...topContributors.map((c) => c.userId)])];
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, avatar: true } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      topCollectors: topOwners
        .map((o) => ({ user: userById.get(o.userId), count: o._count.userId }))
        .filter((o) => o.user),
      topContributors: topContributors
        .map((c) => ({ user: userById.get(c.userId), count: c._count.userId }))
        .filter((c) => c.user),
    });
  } catch (e) {
    console.error("Erreur GET /api/leaderboard :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
