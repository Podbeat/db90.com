import { effectTone } from "@/lib/effectTone";

// Bas des vignettes de cartes (accueil, profil). Le numéro est posé sur le visuel, en bas à
// gauche ; sous le visuel, deux lignes fines : la collection à gauche, puis l'effet à droite.
// Le personnage se lit sur la fiche de la carte. La page d'une collection n'utilise que la
// pastille du numéro : le prisme y est annoncé une fois au-dessus de la grille.

// Pastille du numéro, à placer dans le conteneur du visuel (.card-tile-media).
export function CardNumBadge({ numero }) {
  if (!numero) return null;
  return <span className="card-num-badge">n°{numero}</span>;
}

// `collection` peut être omis (page d'une collection : le nom serait répété sur chaque carte).
export default function CardTileMeta({ collection, rarete }) {
  if (!collection && !rarete) return null;
  return (
    <div className="meta meta-compact">
      {collection && <span className="card-collection">{collection}</span>}
      {rarete && <span className="rarity-tag" data-tone={effectTone(rarete)}>{rarete}</span>}
    </div>
  );
}
