import { effectTone } from "@/lib/effectTone";

// Bas des vignettes de cartes (accueil, page de collection, profil). Le numéro est posé sur le
// visuel, en bas à gauche ; sous le visuel ne reste qu'une ligne : la collection, et l'effet
// s'il tient à côté (sinon il est masqué, voir .meta-line). Le personnage se lit sur la fiche.

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
      <div className="meta-line">
        {collection && <span className="card-collection">{collection}</span>}
        {rarete && <span className="rarity-tag" data-tone={effectTone(rarete)}>{rarete}</span>}
      </div>
    </div>
  );
}
