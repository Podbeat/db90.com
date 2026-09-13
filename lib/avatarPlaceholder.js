// Avatar par défaut quand l'utilisateur n'a pas encore uploadé de photo : un badge rond
// avec son initiale, plutôt qu'un simple carré vide. Généré en SVG (data URI), comme les
// autres visuels de secours du site (missingCardPlaceholder).
export function avatarPlaceholder(name) {
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect width='64' height='64' rx='32' fill='#1a2c4d'/>
    <text x='32' y='43' font-family='Arial, sans-serif' font-size='28' font-weight='900' fill='#e0b04a' text-anchor='middle'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
