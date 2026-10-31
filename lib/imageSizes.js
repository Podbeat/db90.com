// Attribut `sizes` des vignettes de cartes passées par next/image.
//
// Chaque couple (image, largeur) transformé par Vercel compte dans le quota gratuit de
// 5 000 transformations par 30 jours. Les grilles de cartes (accueil, collections, profils)
// utilisent cette valeur depuis le début, donc les largeurs qu'elle produit sont déjà en
// cache pour la plupart des cartes. Les autres vignettes (Marché, boutique, couvertures,
// notifications…) reprennent exactement la même valeur pour retomber sur ces largeurs
// déjà calculées, même si elles s'affichent plus petit, au lieu de charger le scan
// complet de 900 px.
//
// ⚠️ Modifier cette valeur fait recalculer de nouvelles largeurs pour toutes les cartes.
export const CARD_GRID_SIZES = "(max-width: 640px) 45vw, 220px";

// Même principe pour les couvertures de collections (page Collections, puis Ma collection
// et Mes recherchées).
export const COLLECTION_COVER_SIZES = "(max-width: 640px) 90vw, 300px";
