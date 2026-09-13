import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { recordCoteSnapshot } from "@/lib/cote";

const CONDITIONS = ["Satisfaisant", "Bon état", "Très bon état", "Neuve"];

// Liste publique des annonces d'une carte (qui l'achète, qui la vend), avec le pseudo et
// l'avatar des membres — jamais leur e-mail, qui reste privé (voir contact-seller).
export async function GET(request, { params }) {
  try {
    const { id: cardId } = await params;
    const listings = await prisma.cardListing.findMany({
      where: { cardId },
      include: { user: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      sellers: listings.filter((l) => l.type === "seller"),
      buyers: listings.filter((l) => l.type === "buyer"),
    });
  } catch (e) {
    console.error("Erreur GET /api/cards/[id]/listings :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Crée ou remplace l'annonce de l'utilisateur connecté pour cette carte (une seule à la
// fois : changer d'avis remplace l'annonce précédente plutôt que d'en cumuler plusieurs).
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id: cardId } = await params;
    const body = await request.json();
    const { type, condition, price } = body;

    if (type !== "buyer" && type !== "seller") {
      return NextResponse.json({ error: "Type d'annonce invalide." }, { status: 400 });
    }
    if (type === "seller" && condition && !CONDITIONS.includes(condition)) {
      return NextResponse.json({ error: "État invalide." }, { status: 400 });
    }

    const existing = await prisma.cardListing.findUnique({
      where: { cardId_userId: { cardId, userId: session.sub } },
    });
    const becomesNewSaleListing = type === "seller" && existing?.type !== "seller";

    const listing = await prisma.cardListing.upsert({
      where: { cardId_userId: { cardId, userId: session.sub } },
      update: {
        type,
        condition: type === "seller" ? condition || null : null,
        price: type === "seller" && price ? parseFloat(price) : null,
      },
      create: {
        cardId,
        userId: session.sub,
        type,
        condition: type === "seller" ? condition || null : null,
        price: type === "seller" && price ? parseFloat(price) : null,
      },
    });

    // Prévient les membres qui recherchent cette carte, mais seulement au moment où elle
    // passe réellement en vente (pas à chaque modification du prix/état ensuite).
    if (becomesNewSaleListing) {
      const interested = await prisma.userCard.findMany({
        where: { cardId, status: "wanted", userId: { not: session.sub } },
        select: { userId: true },
      });
      if (interested.length > 0) {
        await prisma.notification.createMany({
          data: interested.map((i) => ({ userId: i.userId, type: "card_for_sale", cardId })),
        });
      }
    }

    await recordCoteSnapshot(cardId);

    return NextResponse.json(listing);
  } catch (e) {
    console.error("Erreur POST /api/cards/[id]/listings :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Retire l'annonce de l'utilisateur connecté pour cette carte.
export async function DELETE(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id: cardId } = await params;
    await prisma.cardListing.deleteMany({ where: { cardId, userId: session.sub } });
    await recordCoteSnapshot(cardId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/cards/[id]/listings :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
