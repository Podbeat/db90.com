// Statut d'une carte pour un membre, tel qu'il est affiché et envoyé par les pages :
//   "owned"  : je l'ai (je la garde) ;
//   "trade"  : je l'ai et je peux l'échanger (« À l'échange ») ;
//   "wanted" : je la recherche ;
//   null     : pas suivie.
// En base, "trade" est une carte possédée avec forTrade = true (UserCard.status reste
// "owned", si bien qu'elle compte partout comme possédée : progression, points, registre).
// Les échanges possibles ne croisent que les cartes "trade" avec les cartes "wanted".

export const CARD_STATUSES = ["owned", "trade", "wanted"];

export function displayStatus(entry) {
  if (!entry) return null;
  return entry.status === "owned" && entry.forTrade ? "trade" : entry.status;
}

export function storedStatus(status) {
  return status === "trade" ? { status: "owned", forTrade: true } : { status, forTrade: false };
}

export const isOwnedStatus = (status) => status === "owned" || status === "trade";

// Filtre Prisma des cartes mises à l'échange.
export const FOR_TRADE_WHERE = { status: "owned", forTrade: true };
