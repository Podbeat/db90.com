// Badges calculés à la volée à partir des données de participation déjà chargées (aucune
// table dédiée pour leur définition) — base pour un futur système de badges plus riche.
// getBadgeIds() est la logique pure, réutilisée à la fois pour l'affichage (avec libellés
// traduits, voir computeBadges) et côté serveur pour détecter un nouveau badge à notifier
// (voir lib/badgeNotifications.js), sans dépendre des traductions.
export function getBadgeIds(participation) {
  if (!participation) return [];
  const ids = [];
  if (participation.approvedSubmissions >= 1) ids.push("first_scan");
  if (participation.ownedCount >= 50) ids.push("collector_50");
  if (participation.ownedCount >= 100) ids.push("collector_100");
  if (participation.ownedCount >= 500) ids.push("collector_500");
  if (participation.completedCollections >= 1) ids.push("first_completion");
  if (participation.completedCollections >= 3) ids.push("collector_multi");
  return ids;
}

const BADGE_LABEL_KEYS = {
  first_scan: "badgeFirstScan",
  collector_50: "badgeCollector50",
  collector_100: "badgeCollector100",
  collector_500: "badgeCollector500",
  first_completion: "badgeFirstCompletion",
  collector_multi: "badgeCollectorMulti",
};

export function computeBadges(participation, t) {
  return getBadgeIds(participation).map((id) => ({ id, label: t[BADGE_LABEL_KEYS[id]] }));
}
