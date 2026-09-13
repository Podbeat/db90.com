// Badges calculés à la volée à partir des données de participation déjà chargées (aucune
// table dédiée) — base pour un futur système de badges plus riche si besoin.
export function computeBadges(participation, t) {
  if (!participation) return [];
  const badges = [];
  if (participation.approvedSubmissions >= 1) badges.push({ id: "first_scan", label: t.badgeFirstScan });
  if (participation.ownedCount >= 50) badges.push({ id: "collector_50", label: t.badgeCollector50 });
  if (participation.ownedCount >= 100) badges.push({ id: "collector_100", label: t.badgeCollector100 });
  if (participation.ownedCount >= 500) badges.push({ id: "collector_500", label: t.badgeCollector500 });
  if (participation.completedCollections >= 1) badges.push({ id: "first_completion", label: t.badgeFirstCompletion });
  if (participation.completedCollections >= 3) badges.push({ id: "collector_multi", label: t.badgeCollectorMulti });
  return badges;
}
