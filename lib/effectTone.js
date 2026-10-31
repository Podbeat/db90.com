// Associe chaque effet / prisme à une teinte stable (1 à 6) pour colorer son étiquette sur
// les vignettes : le même effet garde toujours la même couleur, sans liste à maintenir à la
// main quand un nouvel effet apparaît. "Commune" (ou vide) reste neutre (0).
export function effectTone(name) {
  const value = (name || "").trim().toLowerCase();
  if (!value || value === "commune") return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return (hash % 6) + 1;
}
