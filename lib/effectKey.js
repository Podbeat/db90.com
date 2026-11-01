// Utilisable côté navigateur comme côté serveur (aucun accès à la base).
// Clé de comparaison pour repérer les doublons probables : sans accents, sans majuscules, sans
// ponctuation ni pluriel final (« Feu d'Artifice » = « Feu d'artifices »).
export function effectKey(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/(s|x)$/, "") : w))
    .join(" ");
}
