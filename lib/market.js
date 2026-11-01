// Marché : éléments partagés par /api/market (vue publique) et /api/market/me (« Pour toi »).

export const LISTING_CONDITIONS = ["Neuve", "Très bon état", "Bon état", "Satisfaisant"];

// Ce qu'une fiche-annonce affiche : la carte (visuel, numéro, collection) et le membre.
export const listingInclude = {
  card: {
    select: {
      id: true,
      numero: true,
      image: true,
      personnagePrincipal: { select: { id: true, name: true } },
      collection: { select: { id: true, nom: true, pays: true } },
    },
  },
  user: { select: { username: true, avatar: true } },
};

// Filtres combinables ; `exclude` retire un filtre pour calculer les choix encore possibles
// dans ce filtre-là (facettes) ou les compteurs par type.
export function marketWhere({ type, collectionId, personnage, pays, condition, exclude }) {
  const clauses = [];
  if (type && type !== "all" && exclude !== "type") clauses.push({ type });
  if (collectionId && collectionId !== "all" && exclude !== "collection") clauses.push({ card: { collectionId } });
  if (personnage && personnage !== "all" && exclude !== "personnage") {
    clauses.push({
      OR: [
        { card: { personnagePrincipalId: personnage } },
        { card: { personnagesSecondaires: { some: { characterId: personnage } } } },
      ],
    });
  }
  if (pays && pays !== "all" && exclude !== "pays") clauses.push({ card: { collection: { pays } } });
  if (condition && LISTING_CONDITIONS.includes(condition) && exclude !== "condition") clauses.push({ condition });
  return clauses.length ? { AND: clauses } : {};
}
