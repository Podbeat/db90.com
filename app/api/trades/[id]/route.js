import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { applyStatusChanges } from "@/lib/userCardChanges";
import { TRADE_INCLUDE, notifyTrade, traderStats, tradeView } from "@/lib/trades";

// Un échange n'est visible que par ses deux participants (sinon : introuvable).
async function loadTrade(id, me) {
  const trade = await prisma.trade.findUnique({ where: { id }, include: TRADE_INCLUDE });
  if (!trade || (trade.proposerId !== me && trade.recipientId !== me)) return null;
  return trade;
}

async function detail(trade, me) {
  const view = tradeView(trade, me);
  const [stats, myRating] = await Promise.all([
    traderStats([view.partner.id]),
    prisma.userRating.findUnique({
      where: { raterId_targetId: { raterId: me, targetId: view.partner.id } },
      select: { positive: true, comment: true },
    }),
  ]);
  return { ...view, partnerStats: stats.get(view.partner.id), myRating };
}

export async function GET(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const { id } = await params;
    const trade = await loadTrade(id, session.sub);
    if (!trade) return NextResponse.json({ error: "Échange introuvable." }, { status: 404 });
    return NextResponse.json(await detail(trade, session.sub));
  } catch (e) {
    console.error("Erreur GET /api/trades/[id] :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

const conflict = (error) => NextResponse.json({ error }, { status: 409 });

// Faire avancer un échange. Corps : { action, … } avec action parmi :
//  - "accept" / "decline" : la personne qui a reçu la proposition y répond ;
//  - "cancel" : retirer sa proposition, ou annuler un échange accepté tant que personne n'a
//    envoyé ni reçu de cartes ;
//  - "sent" : j'ai envoyé mes cartes ;
//  - "received" : j'ai reçu les cartes, avec en option { addReceived, removeGiven } pour
//    mettre à jour ma collection et { rating: { positive, comment } } pour noter l'autre.
// Chaque transition ne s'applique que depuis l'état attendu (updateMany conditionnel), pour
// rester juste si les deux membres agissent en même temps.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const me = session.sub;
    const { id } = await params;
    const trade = await loadTrade(id, me);
    if (!trade) return NextResponse.json({ error: "Échange introuvable." }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const iAmProposer = trade.proposerId === me;
    const partnerId = iAmProposer ? trade.recipientId : trade.proposerId;
    const mine = iAmProposer
      ? { sent: "proposerSentAt", received: "proposerReceivedAt" }
      : { sent: "recipientSentAt", received: "recipientReceivedAt" };
    const theirs = iAmProposer
      ? { sent: "recipientSentAt", received: "recipientReceivedAt" }
      : { sent: "proposerSentAt", received: "proposerReceivedAt" };
    const now = new Date();

    switch (body?.action) {
      case "accept":
      case "decline": {
        if (iAmProposer) return NextResponse.json({ error: "Seul le destinataire peut répondre." }, { status: 403 });
        const accept = body.action === "accept";
        const { count } = await prisma.trade.updateMany({
          where: { id, status: "proposed" },
          data: accept ? { status: "accepted", acceptedAt: now } : { status: "declined", closedAt: now },
        });
        if (count === 0) return conflict("Cette proposition n'est plus en attente.");
        await notifyTrade(partnerId, id, accept ? "trade_accepted" : "trade_declined");
        break;
      }

      case "cancel": {
        const nothingMoved =
          !trade.proposerSentAt && !trade.recipientSentAt && !trade.proposerReceivedAt && !trade.recipientReceivedAt;
        const allowed = (trade.status === "proposed" && iAmProposer) || (trade.status === "accepted" && nothingMoved);
        if (!allowed) return conflict("Cet échange ne peut plus être annulé.");
        const { count } = await prisma.trade.updateMany({
          where: {
            id,
            status: trade.status,
            proposerSentAt: null,
            recipientSentAt: null,
            proposerReceivedAt: null,
            recipientReceivedAt: null,
          },
          data: { status: "cancelled", closedAt: now },
        });
        if (count === 0) return conflict("Cet échange ne peut plus être annulé.");
        await notifyTrade(partnerId, id, "trade_cancelled");
        break;
      }

      case "sent": {
        const { count } = await prisma.trade.updateMany({
          where: { id, status: "accepted", [mine.sent]: null },
          data: { [mine.sent]: now },
        });
        if (count === 0) return conflict("Envoi déjà indiqué, ou échange pas encore accepté.");
        await notifyTrade(partnerId, id, "trade_sent");
        break;
      }

      case "received": {
        const { count } = await prisma.trade.updateMany({
          where: { id, status: "accepted", [mine.received]: null },
          data: { [mine.received]: now },
        });
        if (count === 0) return conflict("Réception déjà confirmée, ou échange pas encore accepté.");

        // Mise à jour de la collection, seulement si le membre l'a demandée.
        const view = tradeView(trade, me);
        const changes = new Map();
        if (body.addReceived) for (const card of view.iReceive) changes.set(card.id, "owned");
        if (body.removeGiven) {
          const owned = await prisma.userCard.findMany({
            where: { userId: me, status: "owned", cardId: { in: view.iGive.map((c) => c.id) } },
            select: { cardId: true },
          });
          for (const { cardId } of owned) changes.set(cardId, null);
        }
        if (changes.size) await applyStatusChanges(me, changes, { notifyMatches: false });

        // Note de l'autre membre (un seul avis par membre noté, mis à jour s'il existe).
        const rating = body.rating;
        if (rating && typeof rating.positive === "boolean") {
          const comment = typeof rating.comment === "string" ? rating.comment.trim().slice(0, 500) : "";
          const existing = await prisma.userRating.findUnique({
            where: { raterId_targetId: { raterId: me, targetId: partnerId } },
            select: { id: true },
          });
          await prisma.userRating.upsert({
            where: { raterId_targetId: { raterId: me, targetId: partnerId } },
            update: { positive: rating.positive, comment: comment || null },
            create: { raterId: me, targetId: partnerId, positive: rating.positive, comment: comment || null },
          });
          if (!existing) await prisma.notification.create({ data: { userId: partnerId, type: "rating_received" } });
        }

        // Les deux ont reçu : l'échange est terminé.
        const finished = await prisma.trade.updateMany({
          where: { id, status: "accepted", [theirs.received]: { not: null }, [mine.received]: { not: null } },
          data: { status: "completed", closedAt: now },
        });
        await notifyTrade(partnerId, id, finished.count ? "trade_completed" : "trade_received");
        break;
      }

      default:
        return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    const updated = await loadTrade(id, me);
    return NextResponse.json(await detail(updated, me));
  } catch (e) {
    console.error("Erreur POST /api/trades/[id] :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
