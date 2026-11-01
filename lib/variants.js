// Une même carte (même numéro dans une collection) peut exister en plusieurs effets / prismes :
// chaque version est une carte à part entière (statuts, annonces, fiche). Ces fonctions les
// regroupent par numéro, dans un ordre stable partagé par la page de collection et la fiche :
// d'abord les versions qui ont un visuel, puis la plus ancienne (la référence d'origine) en tête.

const time = (c) => (c.createdAt ? new Date(c.createdAt).getTime() : 0);

export function orderVariants(cards) {
  return [...cards].sort(
    (a, b) => (a.image ? 0 : 1) - (b.image ? 0 : 1) || time(a) - time(b) || String(a.id).localeCompare(String(b.id))
  );
}

// `cards` doit déjà être trié par numéro (naturalSortByNumero) : l'ordre des groupes le suit.
export function groupByNumero(cards) {
  const groups = [];
  const byNumero = new Map();
  for (const card of cards) {
    let group = byNumero.get(card.numero);
    if (!group) {
      group = { numero: card.numero, cards: [] };
      byNumero.set(card.numero, group);
      groups.push(group);
    }
    group.cards.push(card);
  }
  for (const group of groups) group.cards = orderVariants(group.cards);
  return groups;
}
