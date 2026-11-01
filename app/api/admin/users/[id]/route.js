import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/admin/users/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

// Fiche d'un membre pour l'administration : cartes suivies, contributions, avis reçus et
// signalements le concernant.
export async function GET(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, emailVerified: true, avatar: true, bio: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    const [cards, submissions, ratings, listings, messagesSent, reports, lastCard] = await Promise.all([
      prisma.userCard.groupBy({ by: ["status"], where: { userId: id }, _count: { _all: true } }),
      prisma.cardSubmission.groupBy({ by: ["status"], where: { userId: id }, _count: { _all: true } }),
      prisma.userRating.findMany({
        where: { targetId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { positive: true, comment: true, createdAt: true, rater: { select: { username: true } } },
      }),
      prisma.cardListing.count({ where: { userId: id } }),
      prisma.message.count({ where: { senderId: id } }),
      prisma.userReport.findMany({
        where: { reportedUserId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, message: true, status: true, createdAt: true, reporterUser: { select: { username: true } } },
      }),
      prisma.userCard.findFirst({ where: { userId: id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);
    const byStatus = (rows) => Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
    return NextResponse.json({
      user,
      cards: byStatus(cards),
      submissions: byStatus(submissions),
      ratings,
      listings,
      messagesSent,
      reports,
      lastCardAt: lastCard?.createdAt || null,
    });
  } catch (e) {
    console.error("Erreur GET /api/admin/users/[id] :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
