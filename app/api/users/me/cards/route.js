import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { checkAndAwardBadges } from "@/lib/badgeNotifications";

// Liste les cartes suivies par l'utilisateur connecté, groupées par statut, avec les infos
// nécessaires pour les afficher (image, collection...) — utilisé par la page "Mon compte".
// Avec ?cardId=... : renvoie uniquement le statut de cette carte précise (utilisé sur la
// fiche carte, pour afficher "Je l'ai" / "Je la recherche" sans tout recharger).
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("cardId");
    if (cardId) {
      const entry = await prisma.userCard.findUnique({
        where: { userId_cardId: { userId: session.sub, cardId } },
      });
      return NextResponse.json({ status: entry?.status || null });
    }

    const entries = await prisma.userCard.findMany({
      where: { userId: session.sub },
      include: { card: { include: { collection: { select: { id: true, nom: true } }, personnagePrincipal: true } } },
    });

    const owned = entries.filter((e) => e.status === "owned").map((e) => e.card).sort(naturalSortByNumero);
    const wanted = entries.filter((e) => e.status === "wanted").map((e) => e.card).sort(naturalSortByNumero);

    return NextResponse.json({ owned, wanted });
  } catch (e) {
    console.error("Erreur GET /api/users/me/cards :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Définit le statut d'une carte pour l'utilisateur connecté : "owned", "wanted", ou null
// pour retirer la carte de son suivi. Une carte ne peut avoir qu'un seul statut à la fois
// (le passer à "owned" alors qu'elle était "wanted" la fait simplement changer de liste).
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { cardId, status } = await request.json();
    if (!cardId) return NextResponse.json({ error: "Carte manquante." }, { status: 400 });
    if (status !== null && status !== "owned" && status !== "wanted") {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    if (status === null) {
      await prisma.userCard.deleteMany({ where: { userId: session.sub, cardId } });
      return NextResponse.json({ ok: true, status: null });
    }

    const existing = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId: session.sub, cardId } },
      select: { status: true },
    });
    const wasAlreadyOwned = existing?.status === "owned";
    const statusChanged = existing?.status !== status;

    const entry = await prisma.userCard.upsert({
      where: { userId_cardId: { userId: session.sub, cardId } },
      update: { status },
      create: { userId: session.sub, cardId, status },
    });

    // Fil d'activité : on ne loggue une "collection complétée" qu'au moment précis où elle
    // le devient (cette carte manquait juste avant), pas à chaque nouvelle visite d'une
    // collection déjà complète.
    if (status === "owned" && !wasAlreadyOwned) {
      const card = await prisma.card.findUnique({ where: { id: cardId }, select: { collectionId: true } });
      const collection = await prisma.collection.findUnique({ where: { id: card.collectionId }, select: { total: true } });
      if (collection?.total) {
        const ownedCount = await prisma.userCard.count({
          where: { userId: session.sub, status: "owned", card: { collectionId: card.collectionId } },
        });
        if (ownedCount === collection.total) {
          await prisma.activityEvent.create({
            data: { type: "collection_completed", userId: session.sub, collectionId: card.collectionId },
          });
        }
      }
    }

    // Prévient les deux membres dès qu'un échange gagnant-gagnant vient d'apparaître grâce
    // à ce changement précis : quelqu'un qui a ce que je viens d'indiquer chercher, et qui
    // cherche justement quelque chose que je possède (ou l'inverse). Portée volontairement
    // limitée aux membres concernés par CETTE carte, pour rester rapide.
    if (statusChanged && (status === "wanted" || status === "owned")) {
      const oppositeStatus = status === "wanted" ? "owned" : "wanted";
      const candidates = await prisma.userCard.findMany({
        where: { cardId, status: oppositeStatus, userId: { not: session.sub } },
        select: { userId: true },
      });

      for (const candidate of candidates) {
        const [myWanted, theirOwned] = await Promise.all([
          prisma.userCard.findMany({ where: { userId: session.sub, status: "wanted" }, select: { cardId: true } }),
          prisma.userCard.findMany({ where: { userId: candidate.userId, status: "owned" }, select: { cardId: true } }),
        ]);
        const theirOwnedIds = new Set(theirOwned.map((c) => c.cardId));
        const hasReverseMatch = myWanted.some((w) => theirOwnedIds.has(w.cardId));
        if (hasReverseMatch) {
          await prisma.notification.createMany({
            data: [
              { userId: session.sub, type: "trade_match" },
              { userId: candidate.userId, type: "trade_match" },
            ],
          });
        }
      }
    }

    if (status === "owned") await checkAndAwardBadges(session.sub);

    return NextResponse.json({ ok: true, status: entry.status });
  } catch (e) {
    console.error("Erreur POST /api/users/me/cards :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
