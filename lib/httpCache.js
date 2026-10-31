// Cache CDN (Vercel) des réponses publiques, identiques pour tous les visiteurs.
//
// Le CDN répond à la place de la fonction pendant `sMaxAge` secondes, puis sert encore
// l'ancienne version jusqu'à `staleWhileRevalidate` secondes, le temps de la rafraîchir en
// arrière-plan. Chaque réponse servie par le CDN est un appel de fonction en moins sur le
// quota Vercel (1 million par mois en gratuit), et une réponse plus rapide.
//
// ⚠️ Jamais sur une réponse qui dépend du visiteur connecté : le CDN la resservirait telle
// quelle à tout le monde. Jamais non plus sur une réponse d'erreur.
//
// Les pages d'administration ajoutent ?fresh=1 (FRESH_PARAM) pour voir leurs propres
// modifications immédiatement : la réponse n'est alors pas mise en cache.
export const FRESH_PARAM = "fresh";

export function publicCacheHeaders(request, { sMaxAge = 60, staleWhileRevalidate = 600 } = {}) {
  if (request && new URL(request.url).searchParams.has(FRESH_PARAM)) {
    return { "Cache-Control": "no-store" };
  }
  return { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}` };
}
