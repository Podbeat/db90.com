import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Avis publics reçus par ce membre (comptage positif/négatif + derniers commentaires).
export async function GET(request, { params }) {
  try {
    const { username } = await params;
    const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    const ratings = await prisma.userRating.findMany({
      where: { targetId: target.id },
      orderBy: { createdAt: "desc" },
      include: { rater: { select: { username: true, avatar: true } } },
    });

    const positiveCount = ratings.filter((r) => r.positive).length;
    const negativeCount = ratings.length - positiveCount;

    return NextResponse.json({ ratings, positiveCount, negativeCount });
  } catch (e) {
    console.error("Erreur GET /api/users/[username]/ratings :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

// Donner (ou remplacer) son avis sur ce membre. Un seul avis par (auteur, cible) : le
// refaire met simplement à jour le précédent.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    if (target.id === session.sub) return NextResponse.json({ error: "Vous ne pouvez pas vous noter vous-même." }, { status: 400 });

    const { positive, comment } = await request.json();
    if (typeof positive !== "boolean") return NextResponse.json({ error: "Avis invalide." }, { status: 400 });

    // Empêche les faux avis (positifs pour se mettre en valeur, négatifs pour nuire) en
    // exigeant qu'il y ait eu au moins un message échangé avec ce membre au préalable.
    const priorContact = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: session.sub, recipientId: target.id },
          { senderId: target.id, recipientId: session.sub },
        ],
      },
      select: { id: true },
    });
    if (!priorContact) {
      return NextResponse.json(
        { error: "Vous devez avoir échangé au moins un message avec ce membre avant de pouvoir le noter." },
        { status: 403 }
      );
    }

    const isNewRating = !(await prisma.userRating.findUnique({
      where: { raterId_targetId: { raterId: session.sub, targetId: target.id } },
      select: { id: true },
    }));

    const rating = await prisma.userRating.upsert({
      where: { raterId_targetId: { raterId: session.sub, targetId: target.id } },
      update: { positive, comment: comment || null },
      create: { raterId: session.sub, targetId: target.id, positive, comment: comment || null },
    });

    if (isNewRating) {
      await prisma.notification.create({
        data: { userId: target.id, type: "rating_received" },
      });
    }

    return NextResponse.json(rating);
  } catch (e) {
    console.error("Erreur POST /api/users/[username]/ratings :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
