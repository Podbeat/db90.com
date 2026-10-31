import { prisma } from "@/lib/db";

// Échanges suivis entre membres (voir le modèle Trade) : éléments communs aux routes.

export const OPEN_TRADE_STATUSES = ["proposed", "accepted"];
export const MAX_TRADE_CARDS = 30;

export const TRADE_CARD_SELECT = {
  id: true,
  numero: true,
  image: true,
  personnagePrincipal: { select: { name: true } },
  collection: { select: { id: true, nom: true } },
};

export const TRADE_INCLUDE = {
  proposer: { select: { id: true, username: true, avatar: true } },
  recipient: { select: { id: true, username: true, avatar: true } },
  items: { select: { cardId: true, fromProposer: true, card: { select: TRADE_CARD_SELECT } } },
};

const byCollectionThenNumero = (a, b) =>
  (a.collection?.nom || "").localeCompare(b.collection?.nom || "") ||
  (a.numero || "").localeCompare(b.numero || "", undefined, { numeric: true });

export function sortTradeCards(cards) {
  return [...cards].sort(byCollectionThenNumero);
}

// Un échange vu par l'un des deux membres : ce qu'il donne, ce qu'il reçoit, où en est
// chacun. `meId` doit être l'un des deux participants.
export function tradeView(trade, meId) {
  const iAmProposer = trade.proposerId === meId;
  const partner = iAmProposer ? trade.recipient : trade.proposer;
  const iGiveIt = (item) => item.fromProposer === iAmProposer;
  return {
    id: trade.id,
    status: trade.status,
    role: iAmProposer ? "proposer" : "recipient",
    partner: { id: partner.id, username: partner.username, avatar: partner.avatar },
    iGive: sortTradeCards(trade.items.filter(iGiveIt).map((i) => i.card)),
    iReceive: sortTradeCards(trade.items.filter((i) => !iGiveIt(i)).map((i) => i.card)),
    message: trade.message,
    createdAt: trade.createdAt,
    acceptedAt: trade.acceptedAt,
    closedAt: trade.closedAt,
    mySentAt: iAmProposer ? trade.proposerSentAt : trade.recipientSentAt,
    partnerSentAt: iAmProposer ? trade.recipientSentAt : trade.proposerSentAt,
    myReceivedAt: iAmProposer ? trade.proposerReceivedAt : trade.recipientReceivedAt,
    partnerReceivedAt: iAmProposer ? trade.recipientReceivedAt : trade.proposerReceivedAt,
  };
}

// Ce qui inspire confiance chez un membre : avis positifs reçus et échanges terminés.
export async function traderStats(userIds) {
  const ids = [...new Set(userIds)];
  const stats = new Map(ids.map((id) => [id, { positiveRatings: 0, completedTrades: 0 }]));
  if (ids.length === 0) return stats;
  const [ratings, asProposer, asRecipient] = await Promise.all([
    prisma.userRating.groupBy({ by: ["targetId"], where: { targetId: { in: ids }, positive: true }, _count: { _all: true } }),
    prisma.trade.groupBy({ by: ["proposerId"], where: { proposerId: { in: ids }, status: "completed" }, _count: { _all: true } }),
    prisma.trade.groupBy({ by: ["recipientId"], where: { recipientId: { in: ids }, status: "completed" }, _count: { _all: true } }),
  ]);
  for (const r of ratings) stats.get(r.targetId).positiveRatings = r._count._all;
  for (const r of asProposer) stats.get(r.proposerId).completedTrades += r._count._all;
  for (const r of asRecipient) stats.get(r.recipientId).completedTrades += r._count._all;
  return stats;
}

// Les deux membres ne se sont pas bloqués (dans un sens ou dans l'autre).
export async function eitherBlocked(userA, userB) {
  const block = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

// Notification liée à un échange (best-effort : ne fait jamais échouer l'action).
export async function notifyTrade(userId, tradeId, type) {
  try {
    await prisma.notification.create({ data: { userId, tradeId, type } });
  } catch (e) {
    console.error(`Erreur notification ${type} :`, e);
  }
}
