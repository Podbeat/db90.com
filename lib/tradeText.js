// Petits textes des échanges, sans accès à la base (utilisables côté navigateur).

// « il y a 2 h », « il y a 3 j »…
export function timeAgo(date, t) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return t.agoNow;
  if (minutes < 60) return t.agoMinutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.agoHours(hours);
  return t.agoDays(Math.floor(hours / 24));
}

// « A », « A et B », « A, B et C ».
export function joinNames(names, t) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} ${t.listAnd} ${names[names.length - 1]}`;
}

export function cardName(card, t) {
  return card.personnagePrincipal?.name || card.numero || t.noCharacterAssigned;
}

// Prochaine étape d'un échange accepté, du point de vue du membre connecté.
export function nextStep(trade, t) {
  const partner = trade.partner.username;
  if (!trade.mySentAt) return { text: t.tradeNextSend, mine: true };
  if (!trade.myReceivedAt) return trade.partnerSentAt ? { text: t.tradeNextConfirm, mine: true } : { text: t.tradeNextWaitSend(partner), mine: false };
  return { text: t.tradeNextWaitConfirm(partner), mine: false };
}
