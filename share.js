// Logique de partage réutilisée par ShareButton (fiche carte) et ShareIconButton
// (vignettes) : Web Share API si le navigateur la propose, sinon copie du lien dans le
// presse-papier. Renvoie true si un partage/une copie a effectivement eu lieu.
export async function shareUrl(url, title) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, url });
      return true;
    } catch (e) {
      // L'utilisateur a annulé le partage, ou l'API a échoué : rien à faire.
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (e) {
    return false;
  }
}
