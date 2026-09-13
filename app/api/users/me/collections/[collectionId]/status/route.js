import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Applique un statut ("owned" ou "wanted") à TOUTES les cartes d'une collection d'un coup
// pour l'utilisateur connecté, pour éviter d'avoir à le faire carte par carte. status: null
// retire la collection entière du suivi (utile pour annuler une action groupée).
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { collectionId } = await params;
    const { status } = await request.json();
    if (status !== null && status !== "owned" && status !== "wanted") {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const cards = await prisma.card.findMany({
      where: { collectionId },
      select: { id: true },
    });
    const cardIds = cards.map((c) => c.id);
    if (cardIds.length === 0) return NextResponse.json({ ok: true, count: 0 });

    if (status === null) {
      await prisma.userCard.deleteMany({ where: { userId: session.sub, cardId: { in: cardIds } } });
      return NextResponse.json({ ok: true, count: cardIds.length, status: null });
    }

    await prisma.$transaction(
      cardIds.map((cardId) =>
        prisma.userCard.upsert({
          where: { userId_cardId: { userId: session.sub, cardId } },
          update: { status },
          create: { userId: session.sub, cardId, status },
        })
      )
    );

    return NextResponse.json({ ok: true, count: cardIds.length, status });
  } catch (e) {
    console.error("Erreur POST /api/users/me/collections/[collectionId]/status :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
