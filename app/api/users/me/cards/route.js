import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { checkAndAwardBadges } from "@/lib/badgeNotifications";
import { ownedReferencesByCollection } from "@/lib/completion";
import { notifyNewMutualMatches } from "@/lib/userCardChanges";
import { CARD_STATUSES, displayStatus, isOwnedStatus, storedStatus } from "@/lib/cardStatus";

// Liste les cartes suivies par l'utilisateur connecté, groupées par statut, avec les infos
// nécessaires pour les afficher (image, collection...) — utilisé par la page "Mon compte".
// Les cartes possédées portent `forTrade` (true si « À l'échange »).
// Avec ?cardId=... : renvoie uniquement le statut de cette carte précise (utilisé sur la
// fiche carte) : "owned", "trade", "wanted" ou null (voir lib/cardStatus.js).
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("cardId");
    if (cardId) {
      const entry = await prisma.userCard.findUnique({
        where: { userId_cardId: { userId: session.sub, cardId } },
        select: { status: true, forTrade: true },
      });
      return NextResponse.json({ status: displayStatus(entry) });
    }

    const entries = await prisma.userCard.findMany({
      where: { userId: session.sub },
      include: { card: { include: { collection: { select: { id: true, nom: true } }, personnagePrincipal: true } } },
    });

    const owned = entries
      .filter((e) => e.status === "owned")
      .map((e) => ({ ...e.card, forTrade: e.forTrade }))
      .sort(naturalSortByNumero);
    const wanted = entries.filter((e) => e.status === "wanted").map((e) => e.card).sort(naturalSortByNumero);

    return NextResponse.json({ owned, wanted });
  } catch (e) {
    console.error("Erreur GET /api/users/me/cards :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

// Définit le statut d'une carte pour l'utilisateur connecté : "owned" (je l'ai), "trade"
// (je l'ai et je peux l'échanger), "wanted" (je la recherche) ou null pour la retirer de son
// suivi. Une carte n'a qu'un statut à la fois.
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { cardId, status } = await request.json();
    if (!cardId) return NextResponse.json({ error: "Carte manquante." }, { status: 400 });
    if (status !== null && !CARD_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    if (status === null) {
      await prisma.userCard.deleteMany({ where: { userId: session.sub, cardId } });
      return NextResponse.json({ ok: true, status: null });
    }

    const existing = await prisma.userCard.findUnique({
      where: { userId_cardId: { userId: session.sub, cardId } },
      select: { status: true, forTrade: true },
    });
    const previous = displayStatus(existing);
    const wasAlreadyOwned = isOwnedStatus(previous);

    const entry = await prisma.userCard.upsert({
      where: { userId_cardId: { userId: session.sub, cardId } },
      update: storedStatus(status),
      create: { userId: session.sub, cardId, ...storedStatus(status) },
    });

    // Fil d'activité : on ne loggue une "collection complétée" qu'au moment précis où elle
    // le devient (chaque numéro possédé, voir lib/completion.js) : une variante d'un numéro
    // déjà possédé, ou le passage de « Je l'ai » à « À l'échange », ne fait rien franchir.
    if (isOwnedStatus(status) && !wasAlreadyOwned) {
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        select: { collectionId: true, numero: true, collection: { select: { total: true } } },
      });
      const total = card?.collection?.total;
      if (total) {
        const [references, sameNumeroAlreadyOwned] = await Promise.all([
          ownedReferencesByCollection(session.sub, [card.collectionId]),
          prisma.userCard.count({
            where: {
              userId: session.sub,
              status: "owned",
              cardId: { not: cardId },
              card: { collectionId: card.collectionId, numero: card.numero },
            },
          }),
        ]);
        const after = references.get(card.collectionId) || 0;
        const before = sameNumeroAlreadyOwned > 0 ? after : after - 1;
        if (before < total && after >= total) {
          await prisma.activityEvent.create({
            data: { type: "collection_completed", userId: session.sub, collectionId: card.collectionId },
          });
        }
      }
    }

    // Alerte d'échange gagnant-gagnant quand une carte passe « recherchée » ou « à
    // l'échange » (lib/userCardChanges.js).
    await notifyNewMutualMatches(session.sub, [{ cardId, status, previous }]);

    if (isOwnedStatus(status) && !wasAlreadyOwned) await checkAndAwardBadges(session.sub);

    return NextResponse.json({ ok: true, status: displayStatus(entry) });
  } catch (e) {
    console.error("Erreur POST /api/users/me/cards :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
