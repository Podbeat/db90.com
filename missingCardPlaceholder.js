// Visuel de remplacement affiché à la place du scan quand une carte n'a pas encore
// d'image (`card.image` vide) : un style "avis de recherche" plutôt qu'un simple
// rectangle vide, avec le numéro/personnage de la carte et un appel à contribution.
// Généré en SVG (léger, net à toutes les tailles) et encodé en data URI, comme
// l'était déjà l'ancien placeholder minimal qu'il remplace dans les 3 endroits où
// il apparaît (catalogue, fiche carte, page de collection).

function escapeXml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]
  ));
}

// Tronque les noms de personnage trop longs pour ne pas déborder du visuel (240px de large).
function truncate(str, max = 22) {
  const s = String(str || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Construit l'URL (data URI SVG) du visuel "recherchée" pour une carte donnée.
 * `card` : { numero, personnage }. `t` : objet de traduction courant (cardWantedLabel,
 * cardWantedCta), pour rester cohérent avec les 4 langues du site.
 */
export function missingCardPlaceholder(card, t) {
  const numero = escapeXml(card?.numero || "");
  const personnage = escapeXml(truncate(card?.personnage));
  const label = escapeXml(t?.cardWantedLabel || "Wanted");
  const cta = escapeXml(t?.cardWantedCta || "");

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 336'>
    <rect width='240' height='336' fill='#141f38'/>
    <rect x='9' y='9' width='222' height='318' fill='none' stroke='#f2711c' stroke-width='2' stroke-dasharray='7 5'/>
    <text x='120' y='44' font-family='Arial, sans-serif' font-size='19' font-weight='900' letter-spacing='3' fill='#e0b04a' text-anchor='middle'>${label.toUpperCase()}</text>
    <circle cx='120' cy='148' r='52' fill='none' stroke='#5c7099' stroke-width='2'/>
    <text x='120' y='170' font-family='Arial, sans-serif' font-size='60' font-weight='900' fill='#5c7099' text-anchor='middle'>?</text>
    <text x='120' y='240' font-family='Arial, sans-serif' font-size='16' font-weight='700' fill='#eef2fa' text-anchor='middle'>${numero}</text>
    <text x='120' y='259' font-family='Arial, sans-serif' font-size='11' fill='#8ea3c4' text-anchor='middle'>${personnage}</text>
    <text x='120' y='306' font-family='Arial, sans-serif' font-size='10.5' font-weight='700' fill='#f2711c' text-anchor='middle'>${cta}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
